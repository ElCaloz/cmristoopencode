do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'restaurant_tables_id_restaurant_key'
      and conrelid = 'public.restaurant_tables'::regclass
  ) then
    alter table public.restaurant_tables
      add constraint restaurant_tables_id_restaurant_key unique (id, restaurant_id);
  end if;
end;
$$;

create table public.restaurant_opening_hours (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  restaurant_id uuid not null,
  weekday smallint not null check (weekday between 1 and 7),
  opens_at time not null,
  closes_at time not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurant_opening_hours_restaurant_organization_fkey
    foreign key (restaurant_id, organization_id)
    references public.restaurants (id, organization_id)
    on delete cascade,
  constraint restaurant_opening_hours_time_check check (opens_at < closes_at),
  constraint restaurant_opening_hours_restaurant_weekday_start_key
    unique (restaurant_id, weekday, opens_at)
);

create table public.restaurant_closed_dates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  restaurant_id uuid not null,
  closed_on date not null,
  reason text check (reason is null or char_length(reason) <= 200),
  created_at timestamptz not null default now(),
  constraint restaurant_closed_dates_restaurant_organization_fkey
    foreign key (restaurant_id, organization_id)
    references public.restaurants (id, organization_id)
    on delete cascade,
  constraint restaurant_closed_dates_restaurant_date_key
    unique (restaurant_id, closed_on)
);

create table public.receptionist_settings (
  restaurant_id uuid primary key references public.restaurants (id) on delete cascade,
  is_enabled boolean not null default false,
  display_name text check (display_name is null or char_length(btrim(display_name)) between 1 and 120),
  greeting text check (greeting is null or char_length(greeting) <= 500),
  language text not null default 'it' check (language in ('it', 'en')),
  voice text not null default 'marin' check (char_length(btrim(voice)) between 1 and 40),
  model text not null default 'gpt-realtime-2.1' check (char_length(btrim(model)) between 1 and 80),
  inbound_phone_number text unique check (
    inbound_phone_number is null
    or inbound_phone_number ~ '^\+[1-9][0-9]{6,14}$'
  ),
  transfer_phone text check (
    transfer_phone is null
    or transfer_phone ~ '^\+[1-9][0-9]{6,14}$'
  ),
  max_call_seconds integer not null default 300 check (max_call_seconds between 60 and 1800),
  max_daily_calls integer not null default 100 check (max_daily_calls between 1 and 2000),
  monthly_budget_cents bigint not null default 0 check (monthly_budget_cents >= 0),
  reservation_duration_minutes integer not null default 90 check (reservation_duration_minutes between 30 and 240),
  max_party_size integer not null default 8 check (max_party_size between 1 and 50),
  min_notice_minutes integer not null default 60 check (min_notice_minutes between 0 and 10080),
  max_days_ahead integer not null default 60 check (max_days_ahead between 1 and 365),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.receptionist_calls (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  restaurant_id uuid not null,
  provider text not null default 'livekit' check (char_length(btrim(provider)) between 1 and 40),
  provider_call_id text not null check (char_length(btrim(provider_call_id)) between 1 and 200),
  room_name text check (room_name is null or char_length(room_name) <= 200),
  direction text not null default 'inbound' check (direction in ('inbound', 'outbound')),
  from_phone text check (from_phone is null or char_length(from_phone) <= 30),
  to_phone text check (to_phone is null or char_length(to_phone) <= 30),
  status text not null default 'in_progress' check (
    status in ('in_progress', 'completed', 'failed', 'transferred', 'abandoned')
  ),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  summary text check (summary is null or char_length(summary) <= 2000),
  error_code text check (error_code is null or char_length(error_code) <= 120),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint receptionist_calls_restaurant_organization_fkey
    foreign key (restaurant_id, organization_id)
    references public.restaurants (id, organization_id)
    on delete cascade,
  constraint receptionist_calls_provider_call_key unique (provider, provider_call_id),
  constraint receptionist_calls_id_restaurant_organization_key
    unique (id, restaurant_id, organization_id)
);

create table public.receptionist_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  restaurant_id uuid not null,
  call_id uuid not null,
  role text not null check (role in ('caller', 'assistant', 'system', 'tool')),
  content text not null check (char_length(btrim(content)) between 1 and 4000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint receptionist_messages_call_fkey
    foreign key (call_id, restaurant_id, organization_id)
    references public.receptionist_calls (id, restaurant_id, organization_id)
    on delete cascade
);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  restaurant_id uuid not null,
  table_id uuid,
  customer_name text not null check (char_length(btrim(customer_name)) between 2 and 120),
  customer_phone text not null check (char_length(btrim(customer_phone)) between 5 and 30),
  customer_email text check (
    customer_email is null
    or customer_email ~* '^[^@]+@[^@]+\.[^@]+$'
  ),
  party_size integer not null check (party_size between 1 and 50),
  reservation_date date not null,
  reservation_time time not null,
  duration_minutes integer not null default 90 check (duration_minutes between 30 and 240),
  status text not null default 'pending' check (
    status in ('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show')
  ),
  source text not null default 'dashboard' check (
    source in ('dashboard', 'phone_ai', 'phone_manual', 'web')
  ),
  notes text check (notes is null or char_length(notes) <= 1000),
  idempotency_key text check (
    idempotency_key is null or char_length(idempotency_key) between 1 and 120
  ),
  call_id uuid,
  created_by uuid references public.profiles (id) on delete set null,
  confirmed_at timestamptz,
  seated_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text check (
    cancellation_reason is null or char_length(cancellation_reason) <= 500
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reservations_restaurant_organization_fkey
    foreign key (restaurant_id, organization_id)
    references public.restaurants (id, organization_id)
    on delete cascade,
  constraint reservations_table_fkey
    foreign key (table_id, restaurant_id)
    references public.restaurant_tables (id, restaurant_id)
    on delete set null (table_id),
  constraint reservations_call_fkey
    foreign key (call_id, restaurant_id, organization_id)
    references public.receptionist_calls (id, restaurant_id, organization_id)
    on delete set null (call_id),
  constraint reservations_restaurant_idempotency_key
    unique (restaurant_id, idempotency_key)
);

create index restaurant_opening_hours_restaurant_idx
  on public.restaurant_opening_hours (restaurant_id, weekday, opens_at);
create index restaurant_closed_dates_restaurant_idx
  on public.restaurant_closed_dates (restaurant_id, closed_on);
create index receptionist_calls_restaurant_started_idx
  on public.receptionist_calls (restaurant_id, started_at desc);
create index receptionist_messages_call_idx
  on public.receptionist_messages (call_id, created_at);
create index reservations_restaurant_date_idx
  on public.reservations (restaurant_id, reservation_date, reservation_time);
create index reservations_restaurant_status_idx
  on public.reservations (restaurant_id, status, reservation_date);
create index reservations_call_idx
  on public.reservations (call_id);
create index reservations_customer_phone_idx
  on public.reservations (restaurant_id, customer_phone);

create trigger restaurant_opening_hours_set_updated_at
  before update on public.restaurant_opening_hours
  for each row execute function public.set_updated_at();
create trigger receptionist_settings_set_updated_at
  before update on public.receptionist_settings
  for each row execute function public.set_updated_at();
create trigger receptionist_calls_set_updated_at
  before update on public.receptionist_calls
  for each row execute function public.set_updated_at();
create trigger reservations_set_updated_at
  before update on public.reservations
  for each row execute function public.set_updated_at();

create or replace function public.create_receptionist_settings()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.receptionist_settings (restaurant_id)
  values (new.id)
  on conflict (restaurant_id) do nothing;
  return new;
end;
$$;

create trigger restaurants_create_receptionist_settings
  after insert on public.restaurants
  for each row execute function public.create_receptionist_settings();

insert into public.receptionist_settings (restaurant_id)
select id from public.restaurants
on conflict (restaurant_id) do nothing;

insert into public.permissions (key, description)
values ('receptionist.manage', 'Configurare il receptionist AI, orari e telefonate')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key = 'receptionist.manage'
where r.key in ('owner', 'admin', 'manager')
on conflict do nothing;

alter table public.restaurant_opening_hours enable row level security;
alter table public.restaurant_closed_dates enable row level security;
alter table public.receptionist_settings enable row level security;
alter table public.receptionist_calls enable row level security;
alter table public.receptionist_messages enable row level security;
alter table public.reservations enable row level security;

create policy restaurant_opening_hours_select on public.restaurant_opening_hours
  for select to authenticated
  using (
    restaurant_id in (select public.auth_restaurant_ids())
    or public.auth_is_platform_admin()
  );

create policy restaurant_opening_hours_insert on public.restaurant_opening_hours
  for insert to authenticated
  with check (public.auth_has_permission_for_restaurant(restaurant_id, 'receptionist.manage'));

create policy restaurant_opening_hours_update on public.restaurant_opening_hours
  for update to authenticated
  using (public.auth_has_permission_for_restaurant(restaurant_id, 'receptionist.manage'))
  with check (public.auth_has_permission_for_restaurant(restaurant_id, 'receptionist.manage'));

create policy restaurant_opening_hours_delete on public.restaurant_opening_hours
  for delete to authenticated
  using (public.auth_has_permission_for_restaurant(restaurant_id, 'receptionist.manage'));

create policy restaurant_closed_dates_select on public.restaurant_closed_dates
  for select to authenticated
  using (
    restaurant_id in (select public.auth_restaurant_ids())
    or public.auth_is_platform_admin()
  );

create policy restaurant_closed_dates_insert on public.restaurant_closed_dates
  for insert to authenticated
  with check (public.auth_has_permission_for_restaurant(restaurant_id, 'receptionist.manage'));

create policy restaurant_closed_dates_update on public.restaurant_closed_dates
  for update to authenticated
  using (public.auth_has_permission_for_restaurant(restaurant_id, 'receptionist.manage'))
  with check (public.auth_has_permission_for_restaurant(restaurant_id, 'receptionist.manage'));

create policy restaurant_closed_dates_delete on public.restaurant_closed_dates
  for delete to authenticated
  using (public.auth_has_permission_for_restaurant(restaurant_id, 'receptionist.manage'));

create policy receptionist_settings_select on public.receptionist_settings
  for select to authenticated
  using (
    restaurant_id in (select public.auth_restaurant_ids())
    or public.auth_is_platform_admin()
  );

create policy receptionist_settings_insert on public.receptionist_settings
  for insert to authenticated
  with check (public.auth_has_permission_for_restaurant(restaurant_id, 'receptionist.manage'));

create policy receptionist_settings_update on public.receptionist_settings
  for update to authenticated
  using (public.auth_has_permission_for_restaurant(restaurant_id, 'receptionist.manage'))
  with check (public.auth_has_permission_for_restaurant(restaurant_id, 'receptionist.manage'));

create policy receptionist_settings_delete on public.receptionist_settings
  for delete to authenticated
  using (public.auth_has_permission_for_restaurant(restaurant_id, 'receptionist.manage'));

create policy receptionist_calls_select on public.receptionist_calls
  for select to authenticated
  using (
    public.auth_has_permission_for_restaurant(restaurant_id, 'receptionist.manage')
    or public.auth_has_permission_for_restaurant(restaurant_id, 'reservations.manage')
    or public.auth_is_platform_admin()
  );

create policy receptionist_messages_select on public.receptionist_messages
  for select to authenticated
  using (
    public.auth_has_permission_for_restaurant(restaurant_id, 'receptionist.manage')
    or public.auth_has_permission_for_restaurant(restaurant_id, 'reservations.manage')
    or public.auth_is_platform_admin()
  );

create policy reservations_select on public.reservations
  for select to authenticated
  using (
    public.auth_has_permission_for_restaurant(restaurant_id, 'reservations.manage')
    or public.auth_has_permission_for_restaurant(restaurant_id, 'receptionist.manage')
    or public.auth_is_platform_admin()
  );

revoke insert, update, delete on public.reservations from authenticated, anon;
revoke insert, update, delete on public.receptionist_calls from authenticated, anon;
revoke insert, update, delete on public.receptionist_messages from authenticated, anon;

create or replace function public.receptionist_can_reserve(p_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    public.auth_is_platform_admin()
    or (
      (select auth.uid()) is not null
      and (
        public.auth_has_permission_for_restaurant(p_restaurant_id, 'reservations.manage')
        or public.auth_has_permission_for_restaurant(p_restaurant_id, 'receptionist.manage')
      )
    )
    or (
      (select auth.uid()) is null
      and coalesce((select auth.role()), '') = 'service_role'
    );
$$;

create or replace function public.receptionist_can_manage(p_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    public.auth_is_platform_admin()
    or (
      (select auth.uid()) is not null
      and public.auth_has_permission_for_restaurant(p_restaurant_id, 'receptionist.manage')
    )
    or (
      (select auth.uid()) is null
      and coalesce((select auth.role()), '') = 'service_role'
    );
$$;

create or replace function public.receptionist_reservation_rule(
  p_restaurant_id uuid,
  p_reservation_date date,
  p_reservation_time time,
  p_party_size integer,
  p_duration_minutes integer default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_timezone text;
  v_default_duration integer := 90;
  v_max_party integer := 8;
  v_min_notice integer := 60;
  v_max_days integer := 60;
  v_duration integer;
  v_today date;
  v_now_time time;
  v_start_minute integer;
  v_end_minute integer;
  v_weekday integer;
  v_has_hours boolean := false;
  v_hours_match boolean := false;
  v_capacity integer := 0;
  v_used integer := 0;
  v_seats_left integer := 0;
begin
  select r.timezone into v_timezone
  from public.restaurants r
  where r.id = p_restaurant_id;

  if v_timezone is null then
    return jsonb_build_object('available', false, 'reason', 'restaurant_not_found', 'seats_left', 0);
  end if;

  select
    coalesce(s.reservation_duration_minutes, 90),
    coalesce(s.max_party_size, 8),
    coalesce(s.min_notice_minutes, 60),
    coalesce(s.max_days_ahead, 60)
  into v_default_duration, v_max_party, v_min_notice, v_max_days
  from (select 1) as anchor
  left join public.receptionist_settings s on s.restaurant_id = p_restaurant_id;

  if p_reservation_date is null or p_reservation_time is null then
    return jsonb_build_object('available', false, 'reason', 'invalid_datetime', 'seats_left', 0);
  end if;

  if p_party_size is null or p_party_size < 1 then
    return jsonb_build_object('available', false, 'reason', 'invalid_party_size', 'seats_left', 0);
  end if;

  if p_party_size > v_max_party then
    return jsonb_build_object('available', false, 'reason', 'party_too_large', 'seats_left', 0);
  end if;

  v_duration := coalesce(p_duration_minutes, v_default_duration);

  if v_duration < 30 or v_duration > 240 then
    return jsonb_build_object('available', false, 'reason', 'invalid_duration', 'seats_left', 0);
  end if;

  v_today := (now() at time zone v_timezone)::date;
  v_now_time := (now() at time zone v_timezone)::time;
  v_start_minute := (extract(epoch from p_reservation_time) / 60)::integer;

  if p_reservation_date < v_today then
    return jsonb_build_object('available', false, 'reason', 'date_in_past', 'seats_left', 0);
  end if;

  if p_reservation_date > v_today + v_max_days then
    return jsonb_build_object('available', false, 'reason', 'date_too_far', 'seats_left', 0);
  end if;

  if p_reservation_date = v_today
    and v_start_minute < ((extract(epoch from v_now_time) / 60)::integer + v_min_notice)
  then
    return jsonb_build_object('available', false, 'reason', 'too_late_notice', 'seats_left', 0);
  end if;

  if exists (
    select 1
    from public.restaurant_closed_dates d
    where d.restaurant_id = p_restaurant_id
      and d.closed_on = p_reservation_date
  ) then
    return jsonb_build_object('available', false, 'reason', 'closed_date', 'seats_left', 0);
  end if;

  v_end_minute := v_start_minute + v_duration;

  if v_end_minute > 1440 then
    return jsonb_build_object('available', false, 'reason', 'outside_opening_hours', 'seats_left', 0);
  end if;

  v_weekday := extract(isodow from p_reservation_date)::integer;

  select exists (
    select 1
    from public.restaurant_opening_hours h
    where h.restaurant_id = p_restaurant_id
      and h.is_active
  ) into v_has_hours;

  if v_has_hours then
    select exists (
      select 1
      from public.restaurant_opening_hours h
      where h.restaurant_id = p_restaurant_id
        and h.is_active
        and h.weekday = v_weekday
        and v_start_minute >= (extract(epoch from h.opens_at) / 60)::integer
        and v_end_minute <= (extract(epoch from h.closes_at) / 60)::integer
    ) into v_hours_match;

    if not v_hours_match then
      return jsonb_build_object('available', false, 'reason', 'outside_opening_hours', 'seats_left', 0);
    end if;
  end if;

  select coalesce(sum(t.seats), 0)::integer into v_capacity
  from public.restaurant_tables t
  where t.restaurant_id = p_restaurant_id
    and t.is_active;

  if v_capacity <= 0 then
    return jsonb_build_object('available', false, 'reason', 'no_capacity', 'seats_left', 0);
  end if;

  select coalesce(sum(r.party_size), 0)::integer into v_used
  from public.reservations r
  where r.restaurant_id = p_restaurant_id
    and r.reservation_date = p_reservation_date
    and r.status in ('pending', 'confirmed', 'seated')
    and ((extract(epoch from r.reservation_time) / 60)::integer < v_end_minute)
    and (v_start_minute < ((extract(epoch from r.reservation_time) / 60)::integer + r.duration_minutes));

  v_seats_left := greatest(v_capacity - v_used, 0);

  if v_used + p_party_size > v_capacity then
    return jsonb_build_object(
      'available', false,
      'reason', 'insufficient_capacity',
      'seats_left', v_seats_left
    );
  end if;

  return jsonb_build_object(
    'available', true,
    'reason', null,
    'seats_left', greatest(v_capacity - v_used - p_party_size, 0)
  );
end;
$$;

create or replace function public.check_reservation_availability(
  p_restaurant_id uuid,
  p_reservation_date date,
  p_reservation_time time,
  p_party_size integer,
  p_duration_minutes integer default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.receptionist_can_reserve(p_restaurant_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return public.receptionist_reservation_rule(
    p_restaurant_id,
    p_reservation_date,
    p_reservation_time,
    p_party_size,
    p_duration_minutes
  );
end;
$$;

create or replace function public.create_reservation(
  p_restaurant_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_party_size integer,
  p_reservation_date date,
  p_reservation_time time,
  p_customer_email text default null,
  p_duration_minutes integer default null,
  p_source text default 'dashboard',
  p_notes text default null,
  p_idempotency_key text default null,
  p_call_id uuid default null,
  p_confirm boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_source text := coalesce(p_source, 'dashboard');
  v_name text := nullif(btrim(coalesce(p_customer_name, '')), '');
  v_phone text := nullif(btrim(coalesce(p_customer_phone, '')), '');
  v_email text := nullif(btrim(coalesce(p_customer_email, '')), '');
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
  v_key text := nullif(btrim(coalesce(p_idempotency_key, '')), '');
  v_duration integer;
  v_rule jsonb;
  v_status text;
  v_id uuid;
  v_existing public.reservations%rowtype;
  v_organization_id uuid;
begin
  if not public.receptionist_can_reserve(p_restaurant_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if v_source not in ('dashboard', 'phone_ai', 'phone_manual', 'web') then
    raise exception 'invalid_source' using errcode = '22023';
  end if;

  if v_source = 'phone_ai' and p_confirm then
    raise exception 'ai_confirmation_not_allowed' using errcode = '22023';
  end if;

  if v_source = 'phone_ai' and p_call_id is null then
    raise exception 'call_required' using errcode = '22023';
  end if;

  if v_name is null or char_length(v_name) < 2 or char_length(v_name) > 120 then
    raise exception 'invalid_customer_name' using errcode = '22023';
  end if;

  if v_phone is null or char_length(v_phone) < 5 or char_length(v_phone) > 30 then
    raise exception 'invalid_customer_phone' using errcode = '22023';
  end if;

  if v_email is not null and v_email !~* '^[^@]+@[^@]+\.[^@]+$' then
    raise exception 'invalid_customer_email' using errcode = '22023';
  end if;

  if v_notes is not null and char_length(v_notes) > 1000 then
    raise exception 'notes_too_long' using errcode = '22023';
  end if;

  if v_key is not null and char_length(v_key) > 120 then
    raise exception 'invalid_idempotency_key' using errcode = '22023';
  end if;

  if p_call_id is not null and not exists (
    select 1
    from public.receptionist_calls c
    where c.id = p_call_id
      and c.restaurant_id = p_restaurant_id
  ) then
    raise exception 'call_not_found' using errcode = '22023';
  end if;

  if v_key is not null then
    select * into v_existing
    from public.reservations r
    where r.restaurant_id = p_restaurant_id
      and r.idempotency_key = v_key;

    if found then
      return jsonb_build_object(
        'reservation_id', v_existing.id,
        'status', v_existing.status,
        'created', false
      );
    end if;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_restaurant_id::text || ':' || p_reservation_date::text)::bigint);

  if v_key is not null then
    select * into v_existing
    from public.reservations r
    where r.restaurant_id = p_restaurant_id
      and r.idempotency_key = v_key;

    if found then
      return jsonb_build_object(
        'reservation_id', v_existing.id,
        'status', v_existing.status,
        'created', false
      );
    end if;
  end if;

  v_rule := public.receptionist_reservation_rule(
    p_restaurant_id,
    p_reservation_date,
    p_reservation_time,
    p_party_size,
    p_duration_minutes
  );

  if not coalesce((v_rule ->> 'available')::boolean, false) then
    raise exception 'reservation_unavailable: %', coalesce(v_rule ->> 'reason', 'unknown')
      using errcode = 'P0001';
  end if;

  v_duration := coalesce(
    p_duration_minutes,
    (select s.reservation_duration_minutes from public.receptionist_settings s where s.restaurant_id = p_restaurant_id),
    90
  );

  select r.organization_id into v_organization_id
  from public.restaurants r
  where r.id = p_restaurant_id;

  v_status := case when p_confirm then 'confirmed' else 'pending' end;

  insert into public.reservations (
    organization_id,
    restaurant_id,
    customer_name,
    customer_phone,
    customer_email,
    party_size,
    reservation_date,
    reservation_time,
    duration_minutes,
    status,
    source,
    notes,
    idempotency_key,
    call_id,
    created_by,
    confirmed_at
  )
  values (
    v_organization_id,
    p_restaurant_id,
    v_name,
    v_phone,
    v_email,
    p_party_size,
    p_reservation_date,
    p_reservation_time,
    v_duration,
    v_status,
    v_source,
    v_notes,
    v_key,
    p_call_id,
    (select auth.uid()),
    case when p_confirm then now() else null end
  )
  returning id into v_id;

  return jsonb_build_object(
    'reservation_id', v_id,
    'status', v_status,
    'created', true
  );
end;
$$;

create or replace function public.set_reservation_status(
  p_reservation_id uuid,
  p_status text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reservation public.reservations%rowtype;
  v_allowed boolean := false;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  select * into v_reservation
  from public.reservations r
  where r.id = p_reservation_id
  for update;

  if not found then
    raise exception 'reservation_not_found' using errcode = 'P0002';
  end if;

  if not public.receptionist_can_reserve(v_reservation.restaurant_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_status not in ('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;

  if v_reason is not null and char_length(v_reason) > 500 then
    raise exception 'reason_too_long' using errcode = '22023';
  end if;

  if v_reservation.status = p_status then
    return jsonb_build_object(
      'reservation_id', v_reservation.id,
      'status', v_reservation.status,
      'changed', false
    );
  end if;

  v_allowed := case
    when v_reservation.status = 'pending' and p_status in ('confirmed', 'cancelled') then true
    when v_reservation.status = 'confirmed' and p_status in ('seated', 'completed', 'cancelled', 'no_show') then true
    when v_reservation.status = 'seated' and p_status in ('completed', 'cancelled') then true
    else false
  end;

  if not v_allowed then
    raise exception 'invalid_status_transition' using errcode = '22023';
  end if;

  update public.reservations
  set
    status = p_status,
    confirmed_at = case when p_status = 'confirmed' then coalesce(confirmed_at, now()) else confirmed_at end,
    seated_at = case when p_status = 'seated' then coalesce(seated_at, now()) else seated_at end,
    completed_at = case when p_status = 'completed' then now() else completed_at end,
    cancelled_at = case when p_status = 'cancelled' then now() else cancelled_at end,
    cancellation_reason = case when p_status = 'cancelled' then v_reason else cancellation_reason end
  where id = p_reservation_id;

  return jsonb_build_object(
    'reservation_id', p_reservation_id,
    'status', p_status,
    'changed', true
  );
end;
$$;

create or replace function public.update_reservation_notes(
  p_reservation_id uuid,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reservation public.reservations%rowtype;
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
begin
  select * into v_reservation
  from public.reservations r
  where r.id = p_reservation_id
  for update;

  if not found then
    raise exception 'reservation_not_found' using errcode = 'P0002';
  end if;

  if not public.receptionist_can_reserve(v_reservation.restaurant_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if v_notes is not null and char_length(v_notes) > 1000 then
    raise exception 'notes_too_long' using errcode = '22023';
  end if;

  update public.reservations
  set notes = v_notes
  where id = p_reservation_id;

  return jsonb_build_object('reservation_id', p_reservation_id, 'updated', true);
end;
$$;

create or replace function public.resolve_receptionist_tenant(p_to_phone text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_phone text := regexp_replace(coalesce(p_to_phone, ''), '[^0-9+]', '', 'g');
  v_record record;
begin
  if coalesce((select auth.role()), '') <> 'service_role'
    and not public.auth_is_platform_admin()
  then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if v_phone !~ '^\+[1-9][0-9]{6,14}$' then
    return jsonb_build_object('found', false, 'reason', 'invalid_phone');
  end if;

  select
    r.id as restaurant_id,
    r.organization_id,
    r.name as restaurant_name,
    r.timezone,
    s.is_enabled,
    s.display_name,
    s.greeting,
    s.language,
    s.voice,
    s.model,
    s.transfer_phone,
    s.max_call_seconds,
    s.max_daily_calls,
    s.monthly_budget_cents,
    s.reservation_duration_minutes,
    s.max_party_size,
    s.min_notice_minutes,
    s.max_days_ahead
  into v_record
  from public.receptionist_settings s
  join public.restaurants r on r.id = s.restaurant_id
  where s.inbound_phone_number = v_phone;

  if not found then
    return jsonb_build_object('found', false, 'reason', 'unknown_number');
  end if;

  return jsonb_build_object(
    'found', true,
    'restaurantId', v_record.restaurant_id,
    'organizationId', v_record.organization_id,
    'restaurantName', v_record.restaurant_name,
    'timezone', v_record.timezone,
    'isEnabled', v_record.is_enabled,
    'displayName', v_record.display_name,
    'greeting', v_record.greeting,
    'language', v_record.language,
    'voice', v_record.voice,
    'model', v_record.model,
    'transferPhone', v_record.transfer_phone,
    'maxCallSeconds', v_record.max_call_seconds,
    'maxDailyCalls', v_record.max_daily_calls,
    'monthlyBudgetCents', v_record.monthly_budget_cents,
    'reservationDurationMinutes', v_record.reservation_duration_minutes,
    'maxPartySize', v_record.max_party_size,
    'minNoticeMinutes', v_record.min_notice_minutes,
    'maxDaysAhead', v_record.max_days_ahead
  );
end;
$$;

create or replace function public.begin_receptionist_call(
  p_provider_call_id text,
  p_to_phone text,
  p_from_phone text default null,
  p_room_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tenant jsonb;
  v_restaurant_id uuid;
  v_organization_id uuid;
  v_timezone text;
  v_max_daily_calls integer;
  v_day_start timestamptz;
  v_call public.receptionist_calls%rowtype;
  v_calls_today integer;
  v_provider_call_id text := nullif(btrim(coalesce(p_provider_call_id, '')), '');
begin
  if coalesce((select auth.role()), '') <> 'service_role'
    and not public.auth_is_platform_admin()
  then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if v_provider_call_id is null or char_length(v_provider_call_id) > 200 then
    raise exception 'invalid_provider_call_id' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('receptionist-call:' || v_provider_call_id)::bigint);

  select * into v_call
  from public.receptionist_calls c
  where c.provider = 'livekit'
    and c.provider_call_id = v_provider_call_id;

  if found then
    return jsonb_build_object(
      'callId', v_call.id,
      'restaurantId', v_call.restaurant_id,
      'organizationId', v_call.organization_id,
      'status', v_call.status,
      'created', false
    );
  end if;

  v_tenant := public.resolve_receptionist_tenant(p_to_phone);

  if not coalesce((v_tenant ->> 'found')::boolean, false) then
    raise exception 'tenant_not_found' using errcode = 'P0002';
  end if;

  if not coalesce((v_tenant ->> 'isEnabled')::boolean, false) then
    raise exception 'receptionist_disabled' using errcode = 'P0001';
  end if;

  v_restaurant_id := (v_tenant ->> 'restaurantId')::uuid;
  v_organization_id := (v_tenant ->> 'organizationId')::uuid;
  v_timezone := v_tenant ->> 'timezone';
  v_max_daily_calls := coalesce((v_tenant ->> 'maxDailyCalls')::integer, 100);
  v_day_start := ((now() at time zone v_timezone)::date)::timestamp at time zone v_timezone;

  select count(*)::integer into v_calls_today
  from public.receptionist_calls c
  where c.restaurant_id = v_restaurant_id
    and c.started_at >= v_day_start;

  if v_calls_today >= v_max_daily_calls then
    raise exception 'daily_call_limit_reached' using errcode = 'P0001';
  end if;

  insert into public.receptionist_calls (
    organization_id,
    restaurant_id,
    provider,
    provider_call_id,
    room_name,
    from_phone,
    to_phone,
    status
  )
  values (
    v_organization_id,
    v_restaurant_id,
    'livekit',
    v_provider_call_id,
    nullif(btrim(coalesce(p_room_name, '')), ''),
    nullif(btrim(coalesce(p_from_phone, '')), ''),
    nullif(btrim(coalesce(p_to_phone, '')), ''),
    'in_progress'
  )
  returning * into v_call;

  return jsonb_build_object(
    'callId', v_call.id,
    'restaurantId', v_restaurant_id,
    'organizationId', v_organization_id,
    'status', v_call.status,
    'created', true
  );
end;
$$;

create or replace function public.end_receptionist_call(
  p_provider_call_id text,
  p_status text default 'completed',
  p_summary text default null,
  p_duration_seconds integer default null,
  p_error_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_call public.receptionist_calls%rowtype;
  v_summary text := nullif(btrim(coalesce(p_summary, '')), '');
begin
  if coalesce((select auth.role()), '') <> 'service_role'
    and not public.auth_is_platform_admin()
  then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_status not in ('completed', 'failed', 'transferred', 'abandoned') then
    raise exception 'invalid_call_status' using errcode = '22023';
  end if;

  if v_summary is not null and char_length(v_summary) > 2000 then
    raise exception 'summary_too_long' using errcode = '22023';
  end if;

  if p_duration_seconds is not null and p_duration_seconds < 0 then
    raise exception 'invalid_duration' using errcode = '22023';
  end if;

  select * into v_call
  from public.receptionist_calls c
  where c.provider = 'livekit'
    and c.provider_call_id = p_provider_call_id
  for update;

  if not found then
    raise exception 'call_not_found' using errcode = 'P0002';
  end if;

  if v_call.status <> 'in_progress' then
    return jsonb_build_object('callId', v_call.id, 'status', v_call.status, 'changed', false);
  end if;

  update public.receptionist_calls
  set
    status = p_status,
    ended_at = now(),
    duration_seconds = coalesce(
      p_duration_seconds,
      greatest(0, extract(epoch from (now() - v_call.started_at))::integer)
    ),
    summary = coalesce(v_summary, summary),
    error_code = nullif(btrim(coalesce(p_error_code, '')), '')
  where id = v_call.id;

  return jsonb_build_object('callId', v_call.id, 'status', p_status, 'changed', true);
end;
$$;

create or replace function public.add_receptionist_message(
  p_provider_call_id text,
  p_role text,
  p_content text,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_call public.receptionist_calls%rowtype;
  v_content text := nullif(btrim(coalesce(p_content, '')), '');
  v_id uuid;
begin
  if coalesce((select auth.role()), '') <> 'service_role'
    and not public.auth_is_platform_admin()
  then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_role not in ('caller', 'assistant', 'system', 'tool') then
    raise exception 'invalid_message_role' using errcode = '22023';
  end if;

  if v_content is null or char_length(v_content) > 4000 then
    raise exception 'invalid_message_content' using errcode = '22023';
  end if;

  select * into v_call
  from public.receptionist_calls c
  where c.provider = 'livekit'
    and c.provider_call_id = p_provider_call_id;

  if not found then
    raise exception 'call_not_found' using errcode = 'P0002';
  end if;

  insert into public.receptionist_messages (
    organization_id,
    restaurant_id,
    call_id,
    role,
    content,
    metadata
  )
  values (
    v_call.organization_id,
    v_call.restaurant_id,
    v_call.id,
    p_role,
    v_content,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return jsonb_build_object('messageId', v_id, 'callId', v_call.id);
end;
$$;

revoke execute on function public.receptionist_can_reserve(uuid) from public, anon, authenticated;
revoke execute on function public.receptionist_can_manage(uuid) from public, anon, authenticated;
revoke execute on function public.receptionist_reservation_rule(uuid, date, time, integer, integer) from public, anon, authenticated;
revoke execute on function public.check_reservation_availability(uuid, date, time, integer, integer) from public, anon;
revoke execute on function public.create_reservation(uuid, text, text, integer, date, time, text, integer, text, text, text, uuid, boolean) from public, anon;
revoke execute on function public.set_reservation_status(uuid, text, text) from public, anon;
revoke execute on function public.update_reservation_notes(uuid, text) from public, anon;
revoke execute on function public.resolve_receptionist_tenant(text) from public, anon, authenticated;
revoke execute on function public.begin_receptionist_call(text, text, text, text) from public, anon, authenticated;
revoke execute on function public.end_receptionist_call(text, text, text, integer, text) from public, anon, authenticated;
revoke execute on function public.add_receptionist_message(text, text, text, jsonb) from public, anon, authenticated;

grant execute on function public.check_reservation_availability(uuid, date, time, integer, integer) to authenticated, service_role;
grant execute on function public.create_reservation(uuid, text, text, integer, date, time, text, integer, text, text, text, uuid, boolean) to authenticated, service_role;
grant execute on function public.set_reservation_status(uuid, text, text) to authenticated, service_role;
grant execute on function public.update_reservation_notes(uuid, text) to authenticated, service_role;
grant execute on function public.resolve_receptionist_tenant(text) to service_role;
grant execute on function public.begin_receptionist_call(text, text, text, text) to service_role;
grant execute on function public.end_receptionist_call(text, text, text, integer, text) to service_role;
grant execute on function public.add_receptionist_message(text, text, text, jsonb) to service_role;
