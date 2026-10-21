-- Sprint 3 — Palmari, parte 2a: PIN operatore, sessioni operatore, heartbeat
-- dispositivo e board del palmare (sola lettura).
-- La logica di autorizzazione vive nel database (regola 6): i PIN sono hashati
-- con bcrypt (pgcrypto), le sessioni sono token monouso salvati solo come hash,
-- i tentativi sono limitati con blocco temporaneo (D-031).

create table public.operator_pins (
  membership_id uuid primary key
    references public.memberships (id) on delete cascade,
  pin_hash text not null,
  failed_attempts integer not null default 0
    check (failed_attempts between 0 and 10),
  locked_until timestamptz,
  set_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.operator_sessions (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices (id) on delete cascade,
  membership_id uuid not null
    references public.memberships (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  token_hash text not null unique
    check (token_hash ~ '^[0-9a-f]{64}$'),
  issued_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  constraint operator_sessions_expiry_check check (expires_at > issued_at)
);

create unique index operator_sessions_one_open_per_device_idx
  on public.operator_sessions (device_id)
  where revoked_at is null;
create index operator_sessions_membership_idx
  on public.operator_sessions (membership_id, revoked_at);

create trigger operator_pins_set_updated_at before update on public.operator_pins
  for each row execute function public.set_updated_at();

alter table public.operator_pins enable row level security;
alter table public.operator_sessions enable row level security;
-- Nessuna policy: gli hash dei PIN e i token di sessione non sono mai
-- leggibili dall'API (overview e operazioni passano da RPC dedicati).

create or replace function public._operator_token_hash(p_token text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    raise exception 'Token non valido.' using errcode = '28000';
  end if;
  return extensions.digest(p_token, 'sha256');
end;
$$;

create or replace function public._operator_membership_allowed(
  p_membership_id uuid,
  p_organization_id uuid,
  p_restaurant_id uuid
)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1
    from public.memberships m
    join public.role_permissions rp on rp.role_id = m.role_id
    join public.permissions p on p.id = rp.permission_id
    where m.id = p_membership_id
      and m.status = 'active'
      and m.organization_id = p_organization_id
      and (m.restaurant_id is null or m.restaurant_id = p_restaurant_id)
      and p.key = 'orders.manage'
  );
$$;

create or replace function public.set_operator_pin(
  p_membership_id uuid,
  p_pin text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_membership public.memberships;
begin
  if v_user is null then
    raise exception 'Autenticazione richiesta.' using errcode = '42501';
  end if;

  if p_pin is null or p_pin !~ '^[0-9]{4,6}$' then
    raise exception 'Il PIN deve avere da 4 a 6 cifre.' using errcode = '23514';
  end if;

  select * into v_membership
  from public.memberships
  where id = p_membership_id;

  if not found then
    raise exception 'Membro non trovato.' using errcode = 'P0002';
  end if;

  if v_membership.user_id <> v_user
    and not public.auth_has_permission(v_membership.organization_id, 'devices.manage')
  then
    raise exception 'Permesso devices.manage richiesto.' using errcode = '42501';
  end if;

  insert into public.operator_pins (
    membership_id,
    pin_hash,
    failed_attempts,
    locked_until,
    set_by
  )
  values (
    p_membership_id,
    extensions.crypt(p_pin, extensions.gen_salt('bf')),
    0,
    null,
    v_user
  )
  on conflict (membership_id) do update
  set pin_hash = excluded.pin_hash,
      failed_attempts = 0,
      locked_until = null,
      set_by = excluded.set_by;

  update public.operator_sessions
  set revoked_at = now()
  where membership_id = p_membership_id
    and revoked_at is null;
end;
$$;

create or replace function public.clear_operator_pin(
  p_membership_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_membership public.memberships;
  v_deleted integer;
begin
  if v_user is null then
    raise exception 'Autenticazione richiesta.' using errcode = '42501';
  end if;

  select * into v_membership
  from public.memberships
  where id = p_membership_id;

  if not found then
    raise exception 'Membro non trovato.' using errcode = 'P0002';
  end if;

  if v_membership.user_id <> v_user
    and not public.auth_has_permission(v_membership.organization_id, 'devices.manage')
  then
    raise exception 'Permesso devices.manage richiesto.' using errcode = '42501';
  end if;

  delete from public.operator_pins where membership_id = p_membership_id;
  get diagnostics v_deleted = row_count;

  update public.operator_sessions
  set revoked_at = now()
  where membership_id = p_membership_id
    and revoked_at is null;

  return v_deleted > 0;
end;
$$;

create or replace function public.operator_pins_overview(
  p_restaurant_id uuid
)
returns table (
  membership_id uuid,
  user_id uuid,
  full_name text,
  email text,
  role_key text,
  role_name text,
  status text,
  has_pin boolean,
  locked_until timestamptz,
  pin_updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_organization_id uuid;
begin
  if v_user is null then
    raise exception 'Autenticazione richiesta.' using errcode = '42501';
  end if;

  if not public.auth_has_permission_for_restaurant(p_restaurant_id, 'devices.manage') then
    raise exception 'Permesso devices.manage richiesto.' using errcode = '42501';
  end if;

  select r.organization_id into v_organization_id
  from public.restaurants r
  where r.id = p_restaurant_id;

  if v_organization_id is null then
    raise exception 'Ristorante non trovato.' using errcode = 'P0002';
  end if;

  return query
  select
    m.id,
    m.user_id,
    pr.full_name,
    pr.email,
    ro.key,
    ro.name,
    m.status,
    op.membership_id is not null,
    op.locked_until,
    op.updated_at
  from public.memberships m
  join public.profiles pr on pr.id = m.user_id
  join public.roles ro on ro.id = m.role_id
  left join public.operator_pins op on op.membership_id = m.id
  where m.organization_id = v_organization_id
    and (m.restaurant_id is null or m.restaurant_id = p_restaurant_id)
    and m.status <> 'suspended'
  order by pr.full_name, ro.name;
end;
$$;

create or replace function public.device_heartbeat(
  p_device_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_device public.devices;
  v_restaurant public.restaurants;
begin
  select * into v_device
  from public.devices
  where token_hash = public._operator_token_hash(p_device_token)
    and revoked_at is null
  for update;

  if not found or v_device.status not in ('active', 'offline') then
    raise exception 'Dispositivo non riconosciuto.' using errcode = '28000';
  end if;

  update public.devices
  set last_seen_at = now(),
      status = 'active'
  where id = v_device.id;

  select * into v_restaurant
  from public.restaurants
  where id = v_device.restaurant_id;

  return jsonb_build_object(
    'device_id', v_device.id,
    'device_name', v_device.name,
    'device_type', v_device.device_type,
    'restaurant_id', v_device.restaurant_id,
    'restaurant_name', v_restaurant.name
  );
end;
$$;

create or replace function public.palmare_operators(
  p_device_token text
)
returns table (
  membership_id uuid,
  full_name text,
  role_key text,
  role_name text,
  locked_until timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_device public.devices;
begin
  select * into v_device
  from public.devices
  where token_hash = public._operator_token_hash(p_device_token)
    and revoked_at is null;

  if not found or v_device.status not in ('active', 'offline') then
    raise exception 'Dispositivo non riconosciuto.' using errcode = '28000';
  end if;

  return query
  select
    m.id,
    pr.full_name,
    ro.key,
    ro.name,
    op.locked_until
  from public.memberships m
  join public.profiles pr on pr.id = m.user_id
  join public.roles ro on ro.id = m.role_id
  join public.operator_pins op on op.membership_id = m.id
  where m.organization_id = v_device.organization_id
    and (m.restaurant_id is null or m.restaurant_id = v_device.restaurant_id)
    and m.status = 'active'
    and exists (
      select 1
      from public.role_permissions rp
      join public.permissions p on p.id = rp.permission_id
      where rp.role_id = m.role_id
        and p.key = 'orders.manage'
    )
  order by pr.full_name;
end;
$$;

create or replace function public.verify_operator_pin(
  p_device_token text,
  p_membership_id uuid,
  p_pin text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_device public.devices;
  v_pin public.operator_pins;
  v_operator record;
  v_restaurant public.restaurants;
  v_token text;
  v_expires timestamptz;
  v_max_attempts constant integer := 5;
  v_lock_interval constant interval := interval '5 minutes';
  v_session_duration constant interval := interval '12 hours';
begin
  select * into v_device
  from public.devices
  where token_hash = public._operator_token_hash(p_device_token)
    and revoked_at is null
  for update;

  if not found then
    raise exception 'Dispositivo non riconosciuto.' using errcode = '28000';
  end if;

  if v_device.status in ('blocked', 'revoked', 'pending', 'authorized') then
    raise exception 'Dispositivo non attivo.' using errcode = '23514';
  end if;

  if p_pin is null or p_pin !~ '^[0-9]{4,6}$' then
    raise exception 'PIN non valido.' using errcode = '28000';
  end if;

  if not public._operator_membership_allowed(
    p_membership_id,
    v_device.organization_id,
    v_device.restaurant_id
  ) then
    raise exception 'Operatore non abilitato su questo dispositivo.' using errcode = '28000';
  end if;

  select m.id, pr.full_name, ro.key as role_key
  into v_operator
  from public.memberships m
  join public.profiles pr on pr.id = m.user_id
  join public.roles ro on ro.id = m.role_id
  where m.id = p_membership_id;

  select * into v_pin
  from public.operator_pins
  where membership_id = p_membership_id
  for update;

  if not found then
    raise exception 'PIN non impostato per questo operatore.' using errcode = '28000';
  end if;

  if v_pin.locked_until is not null and v_pin.locked_until > now() then
    raise exception 'PIN bloccato per troppi tentativi. Riprova tra qualche minuto.'
      using errcode = '28000';
  end if;

  if extensions.crypt(p_pin, v_pin.pin_hash) <> v_pin.pin_hash then
    if v_pin.failed_attempts + 1 >= v_max_attempts then
      update public.operator_pins
      set failed_attempts = 0,
          locked_until = now() + v_lock_interval
      where membership_id = p_membership_id;
    else
      update public.operator_pins
      set failed_attempts = v_pin.failed_attempts + 1
      where membership_id = p_membership_id;
    end if;

    raise exception 'PIN non valido.' using errcode = '28000';
  end if;

  update public.operator_pins
  set failed_attempts = 0,
      locked_until = null
  where membership_id = p_membership_id;

  update public.operator_sessions
  set revoked_at = now()
  where device_id = v_device.id
    and revoked_at is null;

  v_token := extensions.encode(extensions.gen_random_bytes(32), 'hex');
  v_expires := now() + v_session_duration;

  insert into public.operator_sessions (
    device_id,
    membership_id,
    restaurant_id,
    token_hash,
    expires_at
  )
  values (
    v_device.id,
    p_membership_id,
    v_device.restaurant_id,
    extensions.digest(v_token, 'sha256'),
    v_expires
  );

  update public.devices
  set last_seen_at = now(),
      status = 'active'
  where id = v_device.id;

  select * into v_restaurant
  from public.restaurants
  where id = v_device.restaurant_id;

  return jsonb_build_object(
    'session_token', v_token,
    'expires_at', v_expires,
    'operator_full_name', v_operator.full_name,
    'role_key', v_operator.role_key,
    'device_name', v_device.name,
    'restaurant_name', v_restaurant.name
  );
end;
$$;

create or replace function public.operator_session_context(
  p_session_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session public.operator_sessions;
  v_device public.devices;
  v_operator record;
  v_restaurant public.restaurants;
  v_inactivity constant interval := interval '15 minutes';
begin
  select * into v_session
  from public.operator_sessions
  where token_hash = public._operator_token_hash(p_session_token)
  for update;

  if not found or v_session.revoked_at is not null then
    raise exception 'Sessione non valida. Inserisci il PIN.' using errcode = '28000';
  end if;

  if v_session.expires_at <= now() then
    update public.operator_sessions
    set revoked_at = now()
    where id = v_session.id;
    raise exception 'Sessione scaduta. Inserisci di nuovo il PIN.' using errcode = '28000';
  end if;

  if v_session.last_seen_at < now() - v_inactivity then
    update public.operator_sessions
    set revoked_at = now()
    where id = v_session.id;
    raise exception 'Sessione scaduta per inattività. Inserisci di nuovo il PIN.'
      using errcode = '28000';
  end if;

  select * into v_device
  from public.devices
  where id = v_session.device_id;

  if not found or v_device.revoked_at is not null
    or v_device.status not in ('active', 'offline')
  then
    update public.operator_sessions
    set revoked_at = now()
    where id = v_session.id;
    raise exception 'Dispositivo non attivo. Sessione chiusa.' using errcode = '28000';
  end if;

  select m.id as membership_id, pr.full_name, ro.key as role_key
  into v_operator
  from public.memberships m
  join public.profiles pr on pr.id = m.user_id
  join public.roles ro on ro.id = m.role_id
  where m.id = v_session.membership_id;

  if not found then
    raise exception 'Sessione non valida. Inserisci il PIN.' using errcode = '28000';
  end if;

  select * into v_restaurant
  from public.restaurants
  where id = v_session.restaurant_id;

  update public.operator_sessions
  set last_seen_at = now()
  where id = v_session.id;

  return jsonb_build_object(
    'membership_id', v_operator.membership_id,
    'operator_full_name', v_operator.full_name,
    'role_key', v_operator.role_key,
    'device_id', v_device.id,
    'device_name', v_device.name,
    'device_status', v_device.status,
    'restaurant_id', v_session.restaurant_id,
    'restaurant_name', v_restaurant.name,
    'issued_at', v_session.issued_at,
    'expires_at', v_session.expires_at,
    'last_seen_at', now()
  );
end;
$$;

create or replace function public.operator_logout(
  p_session_token text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_updated integer;
begin
  update public.operator_sessions
  set revoked_at = now()
  where token_hash = public._operator_token_hash(p_session_token)
    and revoked_at is null;

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

create or replace function public.palmare_board(
  p_session_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_context jsonb;
  v_restaurant_id uuid;
  v_areas jsonb;
  v_loose_tables jsonb;
begin
  v_context := public.operator_session_context(p_session_token);
  v_restaurant_id := (v_context ->> 'restaurant_id')::uuid;

  select coalesce(jsonb_agg(area_json order by area_name), '[]'::jsonb)
  into v_areas
  from (
    select
      a.name as area_name,
      jsonb_build_object(
        'id', a.id,
        'name', a.name,
        'tables', coalesce((
          select jsonb_agg(table_json order by table_name)
          from (
            select
              t.name as table_name,
              jsonb_build_object(
                'id', t.id,
                'name', t.name,
                'seats', t.seats,
                'order', (
                  select jsonb_build_object(
                    'id', o.id,
                    'guests', o.guests,
                    'opened_at', o.opened_at,
                    'total_cents', coalesce((
                      select sum(oi.quantity * oi.unit_price_cents)
                      from public.order_items oi
                      where oi.order_id = o.id
                        and oi.status <> 'cancelled'
                    ), 0),
                    'active_count', (
                      select count(*)
                      from public.order_items oi
                      where oi.order_id = o.id
                        and oi.status in ('pending', 'preparing')
                    ),
                    'ready_count', (
                      select count(*)
                      from public.order_items oi
                      where oi.order_id = o.id
                        and oi.status = 'ready'
                    ),
                    'items', coalesce((
                      select jsonb_agg(jsonb_build_object(
                        'id', oi.id,
                        'name', oi.name,
                        'quantity', oi.quantity,
                        'unit_price_cents', oi.unit_price_cents,
                        'status', oi.status,
                        'note', oi.note
                      ) order by oi.created_at)
                      from public.order_items oi
                      where oi.order_id = o.id
                        and oi.status <> 'cancelled'
                    ), '[]'::jsonb)
                  )
                  from public.orders o
                  where o.table_id = t.id
                    and o.status = 'open'
                  limit 1
                )
              ) as table_json
            from public.restaurant_tables t
            where t.area_id = a.id
              and t.is_active
          ) tables_sorted
        ), '[]'::jsonb)
      ) as area_json
    from public.floor_areas a
    where a.restaurant_id = v_restaurant_id
  ) area_rows;

  select coalesce(jsonb_agg(table_json order by table_name), '[]'::jsonb)
  into v_loose_tables
  from (
    select
      t.name as table_name,
      jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'seats', t.seats,
        'order', (
          select jsonb_build_object(
            'id', o.id,
            'guests', o.guests,
            'opened_at', o.opened_at,
            'total_cents', coalesce((
              select sum(oi.quantity * oi.unit_price_cents)
              from public.order_items oi
              where oi.order_id = o.id
                and oi.status <> 'cancelled'
            ), 0),
            'active_count', (
              select count(*)
              from public.order_items oi
              where oi.order_id = o.id
                and oi.status in ('pending', 'preparing')
            ),
            'ready_count', (
              select count(*)
              from public.order_items oi
              where oi.order_id = o.id
                and oi.status = 'ready'
            ),
            'items', coalesce((
              select jsonb_agg(jsonb_build_object(
                'id', oi.id,
                'name', oi.name,
                'quantity', oi.quantity,
                'unit_price_cents', oi.unit_price_cents,
                'status', oi.status,
                'note', oi.note
              ) order by oi.created_at)
              from public.order_items oi
              where oi.order_id = o.id
                and oi.status <> 'cancelled'
            ), '[]'::jsonb)
          )
          from public.orders o
          where o.table_id = t.id
            and o.status = 'open'
          limit 1
        )
      ) as table_json
    from public.restaurant_tables t
    where t.restaurant_id = v_restaurant_id
      and t.area_id is null
      and t.is_active
  ) loose_rows;

  return v_context || jsonb_build_object(
    'areas', v_areas,
    'loose_tables', v_loose_tables
  );
end;
$$;

revoke execute on function public._operator_token_hash(text) from public, anon, authenticated;
revoke execute on function public._operator_membership_allowed(uuid, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.set_operator_pin(uuid, text) from public, anon;
revoke execute on function public.clear_operator_pin(uuid) from public, anon;
revoke execute on function public.operator_pins_overview(uuid) from public, anon;
revoke execute on function public.device_heartbeat(text) from public;
revoke execute on function public.palmare_operators(text) from public;
revoke execute on function public.verify_operator_pin(text, uuid, text) from public;
revoke execute on function public.operator_session_context(text) from public;
revoke execute on function public.operator_logout(text) from public;
revoke execute on function public.palmare_board(text) from public;

grant execute on function public.set_operator_pin(uuid, text) to authenticated, service_role;
grant execute on function public.clear_operator_pin(uuid) to authenticated, service_role;
grant execute on function public.operator_pins_overview(uuid) to authenticated, service_role;
grant execute on function public.device_heartbeat(text) to anon, authenticated, service_role;
grant execute on function public.palmare_operators(text) to anon, authenticated, service_role;
grant execute on function public.verify_operator_pin(text, uuid, text) to anon, authenticated, service_role;
grant execute on function public.operator_session_context(text) to anon, authenticated, service_role;
grant execute on function public.operator_logout(text) to anon, authenticated, service_role;
grant execute on function public.palmare_board(text) to anon, authenticated, service_role;
