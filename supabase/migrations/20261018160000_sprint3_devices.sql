create table public.devices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  restaurant_id uuid not null,
  device_type text not null default 'palmare'
    check (device_type in ('palmare', 'pos', 'kds', 'printer', 'other')),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  status text not null default 'pending'
    check (status in ('pending', 'authorized', 'active', 'offline', 'revoked', 'blocked')),
  platform text not null default '' check (char_length(platform) <= 40),
  token_hash text check (token_hash ~ '^[0-9a-f]{64}$'),
  token_issued_at timestamptz,
  last_seen_at timestamptz,
  pairing_expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint devices_restaurant_organization_fkey
    foreign key (restaurant_id, organization_id)
    references public.restaurants (id, organization_id)
    on delete cascade,
  constraint devices_id_restaurant_key unique (id, restaurant_id),
  constraint devices_token_pair_check
    check ((token_hash is null) = (token_issued_at is null)),
  constraint devices_revoked_at_check
    check ((status = 'revoked') = (revoked_at is not null))
);

create table public.device_pairings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  restaurant_id uuid not null,
  device_id uuid not null,
  code_hash text not null check (code_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  revoked_at timestamptz,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  constraint device_pairings_device_restaurant_fkey
    foreign key (device_id, restaurant_id)
    references public.devices (id, restaurant_id)
    on delete cascade,
  constraint device_pairings_lifecycle_check
    check (consumed_at is null or revoked_at is null)
);

create index devices_restaurant_type_status_idx
  on public.devices (restaurant_id, device_type, status);

create unique index device_pairings_code_hash_key
  on public.device_pairings (code_hash);
create unique index device_pairings_open_per_device_idx
  on public.device_pairings (device_id)
  where consumed_at is null and revoked_at is null;
create index device_pairings_device_idx
  on public.device_pairings (device_id, created_at desc);

create trigger devices_set_updated_at before update on public.devices
  for each row execute function public.set_updated_at();

alter table public.devices enable row level security;
alter table public.device_pairings enable row level security;

create policy devices_select on public.devices
  for select to authenticated
  using (
    restaurant_id in (select public.auth_restaurant_ids())
    or public.auth_is_platform_admin()
  );

create or replace function public.device_limit()
returns integer
language sql
immutable
set search_path = public, pg_temp
as $$
  select 4;
$$;

create or replace function public.device_pairing_generate_code(p_length integer default 8)
returns text
language plpgsql
volatile
set search_path = public, pg_temp
as $$
declare
  v_alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  v_bytes bytea;
  v_code text := '';
  i integer;
begin
  if p_length is null or p_length < 4 or p_length > 32 then
    raise exception 'Lunghezza codice non valida.' using errcode = '22023';
  end if;

  v_bytes := extensions.gen_random_bytes(p_length);

  for i in 0..p_length - 1 loop
    v_code := v_code || substr(v_alphabet, 1 + (get_byte(v_bytes, i) % 32), 1);
  end loop;

  return v_code;
end;
$$;

create or replace function public.device_pairing_issue_internal(
  p_device_id uuid,
  p_user uuid
)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_device public.devices;
  v_code text;
  v_hash text;
  v_expires timestamptz := now() + interval '15 minutes';
  v_attempt integer;
begin
  select * into v_device
  from public.devices
  where id = p_device_id;

  if not found then
    raise exception 'Dispositivo non trovato.' using errcode = 'P0002';
  end if;

  update public.device_pairings
  set revoked_at = now()
  where device_id = p_device_id
    and consumed_at is null
    and revoked_at is null;

  for v_attempt in 1..5 loop
    v_code := public.device_pairing_generate_code(8);
    v_hash := encode(extensions.digest(v_code, 'sha256'), 'hex');

    begin
      insert into public.device_pairings (
        organization_id,
        restaurant_id,
        device_id,
        code_hash,
        expires_at,
        created_by
      )
      values (
        v_device.organization_id,
        v_device.restaurant_id,
        v_device.id,
        v_hash,
        v_expires,
        p_user
      );
      exit;
    exception
      when unique_violation then
        if v_attempt = 5 then
          raise;
        end if;
    end;
  end loop;

  update public.devices
  set pairing_expires_at = v_expires
  where id = p_device_id;

  return jsonb_build_object(
    'device_id', p_device_id,
    'pairing_code', v_code,
    'pairing_expires_at', v_expires
  );
end;
$$;

create or replace function public.create_device(
  p_restaurant_id uuid,
  p_name text,
  p_device_type text default 'palmare',
  p_platform text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_organization_id uuid;
  v_name text := btrim(coalesce(p_name, ''));
  v_type text := coalesce(p_device_type, 'palmare');
  v_platform text := btrim(coalesce(p_platform, ''));
  v_device_id uuid;
  v_created_at timestamptz;
  v_in_use integer := 0;
  v_limit integer := public.device_limit();
  v_pairing jsonb;
begin
  if v_user is null then
    raise exception 'Autenticazione richiesta.' using errcode = '42501';
  end if;

  if not public.auth_has_permission_for_restaurant(p_restaurant_id, 'devices.manage') then
    raise exception 'Permesso devices.manage richiesto.' using errcode = '42501';
  end if;

  if char_length(v_name) < 1 or char_length(v_name) > 80 then
    raise exception 'Nome dispositivo non valido.' using errcode = '23514';
  end if;

  if v_type not in ('palmare', 'pos', 'kds', 'printer', 'other') then
    raise exception 'Tipo dispositivo non valido.' using errcode = '23514';
  end if;

  if char_length(v_platform) > 40 then
    raise exception 'Piattaforma troppo lunga.' using errcode = '23514';
  end if;

  select r.organization_id into v_organization_id
  from public.restaurants r
  where r.id = p_restaurant_id
  for update;

  if not found then
    raise exception 'Ristorante non trovato.' using errcode = '23503';
  end if;

  if v_type = 'palmare' then
    select count(*) into v_in_use
    from public.devices d
    where d.restaurant_id = p_restaurant_id
      and d.device_type = 'palmare'
      and d.status <> 'revoked';

    if v_in_use >= v_limit then
      raise exception
        'Limite di % palmari raggiunto: revoca un dispositivo per sostituirlo.', v_limit
        using errcode = '23514';
    end if;
  end if;

  insert into public.devices (
    organization_id,
    restaurant_id,
    device_type,
    name,
    platform,
    created_by
  )
  values (
    v_organization_id,
    p_restaurant_id,
    v_type,
    v_name,
    v_platform,
    v_user
  )
  returning id, created_at into v_device_id, v_created_at;

  v_pairing := public.device_pairing_issue_internal(v_device_id, v_user);

  return jsonb_build_object(
    'device_id', v_device_id,
    'status', 'pending',
    'device_type', v_type,
    'name', v_name,
    'created_at', v_created_at,
    'pairing_code', v_pairing ->> 'pairing_code',
    'pairing_expires_at', v_pairing -> 'pairing_expires_at',
    'palmari_in_use', case when v_type = 'palmare' then v_in_use + 1 end,
    'palmari_limit', v_limit
  );
end;
$$;

create or replace function public.reissue_device_pairing(p_device_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_device public.devices;
  v_pairing jsonb;
begin
  if v_user is null then
    raise exception 'Autenticazione richiesta.' using errcode = '42501';
  end if;

  select * into v_device
  from public.devices
  where id = p_device_id
  for update;

  if not found then
    raise exception 'Dispositivo non trovato.' using errcode = 'P0002';
  end if;

  if not public.auth_has_permission_for_restaurant(v_device.restaurant_id, 'devices.manage') then
    raise exception 'Permesso devices.manage richiesto.' using errcode = '42501';
  end if;

  if v_device.status = 'revoked' then
    raise exception 'Dispositivo revocato: crea un nuovo dispositivo.' using errcode = '23514';
  end if;

  if v_device.status = 'blocked' then
    raise exception 'Dispositivo bloccato: sbloccalo prima di generare un nuovo codice.'
      using errcode = '23514';
  end if;

  v_pairing := public.device_pairing_issue_internal(v_device.id, v_user);

  return jsonb_build_object(
    'device_id', v_device.id,
    'status', v_device.status,
    'pairing_code', v_pairing ->> 'pairing_code',
    'pairing_expires_at', v_pairing -> 'pairing_expires_at'
  );
end;
$$;

create or replace function public.set_device_status(
  p_device_id uuid,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_action text := lower(btrim(coalesce(p_action, '')));
  v_device public.devices;
  v_status text;
begin
  if v_user is null then
    raise exception 'Autenticazione richiesta.' using errcode = '42501';
  end if;

  if v_action not in ('block', 'unblock', 'revoke') then
    raise exception 'Azione non valida.' using errcode = '22023';
  end if;

  select * into v_device
  from public.devices
  where id = p_device_id
  for update;

  if not found then
    raise exception 'Dispositivo non trovato.' using errcode = 'P0002';
  end if;

  if not public.auth_has_permission_for_restaurant(v_device.restaurant_id, 'devices.manage') then
    raise exception 'Permesso devices.manage richiesto.' using errcode = '42501';
  end if;

  v_status := v_device.status;

  if v_action = 'revoke' then
    if v_device.status = 'revoked' then
      return jsonb_build_object(
        'device_id', v_device.id,
        'previous_status', v_device.status,
        'status', 'revoked',
        'changed', false
      );
    end if;

    update public.device_pairings
    set revoked_at = now()
    where device_id = v_device.id
      and consumed_at is null
      and revoked_at is null;

    update public.devices
    set status = 'revoked',
        revoked_at = now(),
        token_hash = null,
        token_issued_at = null,
        pairing_expires_at = null
    where id = v_device.id;

    v_status := 'revoked';
  elsif v_action = 'block' then
    if v_device.status = 'revoked' then
      raise exception 'Dispositivo già revocato.' using errcode = '23514';
    end if;

    if v_device.status = 'blocked' then
      return jsonb_build_object(
        'device_id', v_device.id,
        'previous_status', v_device.status,
        'status', 'blocked',
        'changed', false
      );
    end if;

    update public.device_pairings
    set revoked_at = now()
    where device_id = v_device.id
      and consumed_at is null
      and revoked_at is null;

    update public.devices
    set status = 'blocked',
        token_hash = null,
        token_issued_at = null,
        pairing_expires_at = null
    where id = v_device.id;

    v_status := 'blocked';
  else
    if v_device.status <> 'blocked' then
      raise exception 'Solo un dispositivo bloccato può essere sbloccato.' using errcode = '23514';
    end if;

    update public.devices
    set status = 'authorized'
    where id = v_device.id;

    v_status := 'authorized';
  end if;

  return jsonb_build_object(
    'device_id', v_device.id,
    'previous_status', v_device.status,
    'status', v_status,
    'changed', true
  );
end;
$$;

create or replace function public.claim_device_pairing(
  p_code text,
  p_platform text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_code text := replace(replace(upper(btrim(coalesce(p_code, ''))), ' ', ''), '-', '');
  v_hash text;
  v_pairing public.device_pairings;
  v_device public.devices;
  v_token text;
  v_platform text := left(btrim(coalesce(p_platform, '')), 40);
begin
  if char_length(v_code) <> 8 or v_code !~ '^[0-9A-HJKMNP-TV-Z]{8}$' then
    raise exception 'Codice non valido o scaduto.' using errcode = '28000';
  end if;

  v_hash := encode(extensions.digest(v_code, 'sha256'), 'hex');

  select * into v_pairing
  from public.device_pairings
  where code_hash = v_hash
  for update;

  if not found
    or v_pairing.consumed_at is not null
    or v_pairing.revoked_at is not null
    or v_pairing.expires_at <= now() then
    raise exception 'Codice non valido o scaduto.' using errcode = '28000';
  end if;

  select * into v_device
  from public.devices
  where id = v_pairing.device_id
  for update;

  if not found then
    raise exception 'Codice non valido o scaduto.' using errcode = '28000';
  end if;

  if v_device.status = 'revoked' then
    raise exception 'Dispositivo revocato.' using errcode = '23514';
  end if;

  if v_device.status = 'blocked' then
    raise exception 'Dispositivo bloccato.' using errcode = '23514';
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  update public.device_pairings
  set consumed_at = now()
  where id = v_pairing.id;

  update public.devices
  set status = 'active',
      platform = case when v_platform <> '' then v_platform else platform end,
      token_hash = encode(extensions.digest(v_token, 'sha256'), 'hex'),
      token_issued_at = now(),
      last_seen_at = now(),
      pairing_expires_at = null
  where id = v_device.id;

  return jsonb_build_object(
    'device_id', v_device.id,
    'organization_id', v_device.organization_id,
    'restaurant_id', v_device.restaurant_id,
    'name', v_device.name,
    'device_type', v_device.device_type,
    'status', 'active',
    'platform', case when v_platform <> '' then v_platform else v_device.platform end,
    'token', v_token,
    'claimed_at', now()
  );
end;
$$;

revoke execute on function public.device_limit() from public, anon;
revoke execute on function public.device_pairing_generate_code(integer) from public, anon, authenticated;
revoke execute on function public.device_pairing_issue_internal(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.create_device(uuid, text, text, text) from public, anon;
revoke execute on function public.reissue_device_pairing(uuid) from public, anon;
revoke execute on function public.set_device_status(uuid, text) from public, anon;
revoke execute on function public.claim_device_pairing(text, text) from public, anon;

grant execute on function public.device_limit() to authenticated, service_role;
grant execute on function public.create_device(uuid, text, text, text) to authenticated, service_role;
grant execute on function public.reissue_device_pairing(uuid) to authenticated, service_role;
grant execute on function public.set_device_status(uuid, text) to authenticated, service_role;
grant execute on function public.claim_device_pairing(text, text) to anon, authenticated, service_role;
