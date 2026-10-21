-- Fix Sprint 3 parte 2a:
-- 1) _operator_token_hash restituisce l'hash esadecimale (encode di digest);
-- 2) verify_operator_pin committa i tentativi falliti: un'eccezione annullerebbe
--    l'incremento, quindi il PIN errato torna con status invalid_pin (il blocco
--    scatta al quinto tentativo, D-031) e il successo con status ok;
-- 3) operator_session_context non tenta piu' revoche che verrebbero annullate
--    dall'eccezione: la sessione scaduta o inattiva resta comunque rifiutata.

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
  return encode(extensions.digest(p_token, 'sha256'), 'hex');
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

      return jsonb_build_object(
        'status', 'invalid_pin',
        'failed_attempts', v_max_attempts,
        'locked', true
      );
    end if;

    update public.operator_pins
    set failed_attempts = v_pin.failed_attempts + 1
    where membership_id = p_membership_id;

    return jsonb_build_object(
      'status', 'invalid_pin',
      'failed_attempts', v_pin.failed_attempts + 1,
      'locked', false
    );
  end if;

  update public.operator_pins
  set failed_attempts = 0,
      locked_until = null
  where membership_id = p_membership_id;

  update public.operator_sessions
  set revoked_at = now()
  where device_id = v_device.id
    and revoked_at is null;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
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
    public._operator_token_hash(v_token),
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
    'status', 'ok',
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
    raise exception 'Sessione scaduta. Inserisci di nuovo il PIN.' using errcode = '28000';
  end if;

  if v_session.last_seen_at < now() - v_inactivity then
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
