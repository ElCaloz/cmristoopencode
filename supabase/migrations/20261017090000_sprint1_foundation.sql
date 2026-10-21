create extension if not exists pgcrypto with schema extensions;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  billing_email text,
  status text not null default 'trialing' check (status in ('trialing', 'active', 'suspended', 'canceled')),
  trial_ends_at timestamptz not null default now() + interval '30 days',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  currency char(3) not null default 'EUR',
  timezone text not null default 'Europe/Rome',
  status text not null default 'active' check (status in ('active', 'paused', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurants_organization_slug_key unique (organization_id, slug),
  constraint restaurants_id_organization_key unique (id, organization_id)
);

create table public.restaurant_locations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  address_line text,
  city text,
  postal_code text,
  country char(2) not null default 'IT',
  phone text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index restaurant_locations_one_primary_idx
  on public.restaurant_locations (restaurant_id)
  where is_primary;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  locale text not null default 'it-IT',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  is_system boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  permission_id uuid not null references public.permissions (id) on delete cascade,
  primary key (role_id, permission_id)
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  restaurant_id uuid,
  role_id uuid not null references public.roles (id),
  status text not null default 'active' check (status in ('invited', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint memberships_user_org_restaurant_key unique nulls not distinct (user_id, organization_id, restaurant_id),
  constraint memberships_restaurant_organization_fkey
    foreign key (restaurant_id, organization_id)
    references public.restaurants (id, organization_id)
    on delete cascade
);

create table public.restaurant_settings (
  restaurant_id uuid primary key references public.restaurants (id) on delete cascade,
  service_charge_bps integer not null default 0 check (service_charge_bps between 0 and 10000),
  prices_include_tax boolean not null default true,
  tax_rate_bps integer not null default 1000 check (tax_rate_bps between 0 and 10000),
  receipt_footer text,
  updated_at timestamptz not null default now()
);

create table public.platform_admins (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete restrict,
  restaurant_id uuid references public.restaurants (id) on delete set null,
  actor_user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index memberships_user_idx on public.memberships (user_id);
create index memberships_organization_idx on public.memberships (organization_id);
create index memberships_restaurant_idx on public.memberships (restaurant_id);
create index restaurants_organization_idx on public.restaurants (organization_id);
create index restaurant_locations_restaurant_idx on public.restaurant_locations (restaurant_id);
create index role_permissions_role_idx on public.role_permissions (role_id);
create index audit_logs_organization_created_idx on public.audit_logs (organization_id, created_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_user_id);
create index audit_logs_restaurant_idx on public.audit_logs (restaurant_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_set_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();
create trigger restaurants_set_updated_at before update on public.restaurants
  for each row execute function public.set_updated_at();
create trigger restaurant_locations_set_updated_at before update on public.restaurant_locations
  for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger memberships_set_updated_at before update on public.memberships
  for each row execute function public.set_updated_at();
create trigger restaurant_settings_set_updated_at before update on public.restaurant_settings
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.create_restaurant_settings()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.restaurant_settings (restaurant_id)
  values (new.id)
  on conflict (restaurant_id) do nothing;
  return new;
end;
$$;

create trigger restaurants_create_settings after insert on public.restaurants
  for each row execute function public.create_restaurant_settings();

create or replace function public.auth_is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = (select auth.uid())
  );
$$;

create or replace function public.auth_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.organization_id
  from public.memberships m
  where m.user_id = (select auth.uid())
    and m.status = 'active';
$$;

create or replace function public.auth_restaurant_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select r.id
  from public.restaurants r
  where exists (
    select 1
    from public.memberships m
    where m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.organization_id = r.organization_id
      and (m.restaurant_id is null or m.restaurant_id = r.id)
  );
$$;

create or replace function public.auth_has_permission(
  p_organization_id uuid,
  p_permission text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.memberships m
    join public.role_permissions rp on rp.role_id = m.role_id
    join public.permissions p on p.id = rp.permission_id
    where m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.organization_id = p_organization_id
      and m.restaurant_id is null
      and p.key = p_permission
  );
$$;

create or replace function public.auth_has_permission_for_restaurant(
  p_restaurant_id uuid,
  p_permission text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.restaurants r
    join public.memberships m on m.organization_id = r.organization_id
    join public.role_permissions rp on rp.role_id = m.role_id
    join public.permissions p on p.id = rp.permission_id
    where r.id = p_restaurant_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and (m.restaurant_id is null or m.restaurant_id = r.id)
      and p.key = p_permission
  );
$$;

create or replace function public.auth_shares_org_with(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.memberships mine
    join public.memberships theirs on theirs.organization_id = mine.organization_id
    where mine.user_id = (select auth.uid())
      and mine.status = 'active'
      and theirs.user_id = p_profile_id
      and theirs.status = 'active'
  );
$$;

create or replace function public.create_organization(
  p_name text,
  p_slug text,
  p_restaurant_name text
)
returns table (new_organization_id uuid, new_restaurant_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_slug text := lower(btrim(p_slug));
  v_owner_role_id uuid;
  v_organization_id uuid;
  v_restaurant_id uuid;
  v_billing_email text;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if p_name is null or char_length(btrim(p_name)) < 2 then
    raise exception 'invalid organization name' using errcode = '22023';
  end if;

  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'invalid organization slug' using errcode = '22023';
  end if;

  if p_restaurant_name is null or char_length(btrim(p_restaurant_name)) < 2 then
    raise exception 'invalid restaurant name' using errcode = '22023';
  end if;

  select id into v_owner_role_id from public.roles where key = 'owner';
  select email into v_billing_email from public.profiles where id = v_user_id;

  insert into public.organizations (name, slug, billing_email)
  values (btrim(p_name), v_slug, v_billing_email)
  returning id into v_organization_id;

  insert into public.restaurants (organization_id, name, slug)
  values (v_organization_id, btrim(p_restaurant_name), 'main')
  returning id into v_restaurant_id;

  insert into public.memberships (user_id, organization_id, role_id)
  values (v_user_id, v_organization_id, v_owner_role_id);

  insert into public.audit_logs (
    organization_id,
    restaurant_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    v_organization_id,
    v_restaurant_id,
    v_user_id,
    'organization.created',
    'organization',
    v_organization_id::text,
    jsonb_build_object('name', btrim(p_name), 'slug', v_slug)
  );

  return query select v_organization_id, v_restaurant_id;
end;
$$;

alter table public.organizations enable row level security;
alter table public.restaurants enable row level security;
alter table public.restaurant_locations enable row level security;
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.memberships enable row level security;
alter table public.restaurant_settings enable row level security;
alter table public.platform_admins enable row level security;
alter table public.audit_logs enable row level security;

create policy organizations_select on public.organizations
  for select to authenticated
  using (id in (select public.auth_org_ids()) or public.auth_is_platform_admin());

create policy organizations_update on public.organizations
  for update to authenticated
  using (public.auth_has_permission(id, 'organization.manage'))
  with check (public.auth_has_permission(id, 'organization.manage'));

create policy restaurants_select on public.restaurants
  for select to authenticated
  using (id in (select public.auth_restaurant_ids()) or public.auth_is_platform_admin());

create policy restaurants_insert on public.restaurants
  for insert to authenticated
  with check (public.auth_has_permission(organization_id, 'restaurant.manage'));

create policy restaurants_update on public.restaurants
  for update to authenticated
  using (public.auth_has_permission(organization_id, 'restaurant.manage'))
  with check (public.auth_has_permission(organization_id, 'restaurant.manage'));

create policy restaurants_delete on public.restaurants
  for delete to authenticated
  using (public.auth_has_permission(organization_id, 'restaurant.manage'));

create policy restaurant_locations_select on public.restaurant_locations
  for select to authenticated
  using (
    restaurant_id in (select public.auth_restaurant_ids())
    or public.auth_is_platform_admin()
  );

create policy restaurant_locations_insert on public.restaurant_locations
  for insert to authenticated
  with check (public.auth_has_permission_for_restaurant(restaurant_id, 'restaurant.manage'));

create policy restaurant_locations_update on public.restaurant_locations
  for update to authenticated
  using (public.auth_has_permission_for_restaurant(restaurant_id, 'restaurant.manage'))
  with check (public.auth_has_permission_for_restaurant(restaurant_id, 'restaurant.manage'));

create policy restaurant_locations_delete on public.restaurant_locations
  for delete to authenticated
  using (public.auth_has_permission_for_restaurant(restaurant_id, 'restaurant.manage'));

create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or public.auth_shares_org_with(id)
    or public.auth_is_platform_admin()
  );

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy roles_select on public.roles
  for select to authenticated
  using (true);

create policy permissions_select on public.permissions
  for select to authenticated
  using (true);

create policy role_permissions_select on public.role_permissions
  for select to authenticated
  using (true);

create policy memberships_select on public.memberships
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.auth_has_permission(organization_id, 'members.manage')
    or public.auth_is_platform_admin()
  );

create policy memberships_insert on public.memberships
  for insert to authenticated
  with check (public.auth_has_permission(organization_id, 'members.manage'));

create policy memberships_update on public.memberships
  for update to authenticated
  using (public.auth_has_permission(organization_id, 'members.manage'))
  with check (public.auth_has_permission(organization_id, 'members.manage'));

create policy memberships_delete on public.memberships
  for delete to authenticated
  using (public.auth_has_permission(organization_id, 'members.manage'));

create policy restaurant_settings_select on public.restaurant_settings
  for select to authenticated
  using (
    restaurant_id in (select public.auth_restaurant_ids())
    or public.auth_is_platform_admin()
  );

create policy restaurant_settings_insert on public.restaurant_settings
  for insert to authenticated
  with check (public.auth_has_permission_for_restaurant(restaurant_id, 'settings.manage'));

create policy restaurant_settings_update on public.restaurant_settings
  for update to authenticated
  using (public.auth_has_permission_for_restaurant(restaurant_id, 'settings.manage'))
  with check (public.auth_has_permission_for_restaurant(restaurant_id, 'settings.manage'));

create policy restaurant_settings_delete on public.restaurant_settings
  for delete to authenticated
  using (public.auth_has_permission_for_restaurant(restaurant_id, 'settings.manage'));

create policy platform_admins_select_self on public.platform_admins
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy audit_logs_select on public.audit_logs
  for select to authenticated
  using (
    public.auth_has_permission(organization_id, 'audit.read')
    or public.auth_is_platform_admin()
  );

create policy audit_logs_insert on public.audit_logs
  for insert to authenticated
  with check (
    actor_user_id = (select auth.uid())
    and organization_id in (select public.auth_org_ids())
  );

revoke execute on function public.auth_is_platform_admin() from public, anon;
revoke execute on function public.auth_org_ids() from public, anon;
revoke execute on function public.auth_restaurant_ids() from public, anon;
revoke execute on function public.auth_has_permission(uuid, text) from public, anon;
revoke execute on function public.auth_has_permission_for_restaurant(uuid, text) from public, anon;
revoke execute on function public.auth_shares_org_with(uuid) from public, anon;
revoke execute on function public.create_organization(text, text, text) from public, anon;

grant execute on function public.auth_is_platform_admin() to authenticated, service_role;
grant execute on function public.auth_org_ids() to authenticated, service_role;
grant execute on function public.auth_restaurant_ids() to authenticated, service_role;
grant execute on function public.auth_has_permission(uuid, text) to authenticated, service_role;
grant execute on function public.auth_has_permission_for_restaurant(uuid, text) to authenticated, service_role;
grant execute on function public.auth_shares_org_with(uuid) to authenticated, service_role;
grant execute on function public.create_organization(text, text, text) to authenticated, service_role;

insert into public.permissions (key, description) values
  ('organization.manage', 'Gestire dati e impostazioni dell''organizzazione'),
  ('restaurant.manage', 'Gestire ristoranti e sedi'),
  ('members.manage', 'Gestire membri e ruoli'),
  ('settings.manage', 'Gestire le impostazioni del ristorante'),
  ('audit.read', 'Consultare il registro attività'),
  ('menu.manage', 'Gestire menu, prodotti e prezzi'),
  ('pos.operate', 'Operare sulla cassa POS'),
  ('kitchen.operate', 'Operare sul Kitchen Display System'),
  ('orders.manage', 'Gestire comande e ordini'),
  ('reservations.manage', 'Gestire prenotazioni e sala'),
  ('customers.manage', 'Gestire clienti e consensi'),
  ('inventory.manage', 'Gestire magazzino e fornitori'),
  ('reports.read', 'Consultare report e statistiche'),
  ('staff.manage', 'Gestire personale e turni'),
  ('devices.manage', 'Gestire palmari e dispositivi'),
  ('billing.manage', 'Gestire abbonamento e fatturazione')
on conflict (key) do nothing;

insert into public.roles (key, name, description) values
  ('owner', 'Proprietario', 'Accesso completo all''organizzazione'),
  ('admin', 'Amministratore', 'Accesso operativo completo'),
  ('manager', 'Responsabile', 'Gestione operativa di ristoranti e staff'),
  ('cashier', 'Cassiere', 'Cassa, ordini e clienti'),
  ('waiter', 'Cameriere', 'Sala e comande'),
  ('kitchen', 'Cucina', 'Comande e Kitchen Display'),
  ('warehouse', 'Magazzino', 'Scorte e fornitori'),
  ('host', 'Receptionist', 'Prenotazioni, sala e clienti'),
  ('accountant', 'Commercialista', 'Report, audit e fatturazione in sola lettura'),
  ('marketing', 'Marketing', 'Clienti, consensi e report')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.key in ('owner', 'admin')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key = any (array[
  'restaurant.manage',
  'members.manage',
  'settings.manage',
  'audit.read',
  'menu.manage',
  'pos.operate',
  'kitchen.operate',
  'orders.manage',
  'reservations.manage',
  'customers.manage',
  'inventory.manage',
  'reports.read',
  'staff.manage',
  'devices.manage'
])
where r.key = 'manager'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key = any (array[
  'pos.operate',
  'orders.manage',
  'customers.manage',
  'reports.read'
])
where r.key = 'cashier'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key = any (array['pos.operate', 'orders.manage'])
where r.key = 'waiter'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key = any (array['kitchen.operate', 'orders.manage'])
where r.key = 'kitchen'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key = any (array['inventory.manage', 'reports.read'])
where r.key = 'warehouse'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key = any (array['reservations.manage', 'customers.manage', 'orders.manage'])
where r.key = 'host'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key = any (array['reports.read', 'audit.read', 'billing.manage'])
where r.key = 'accountant'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key = any (array['customers.manage', 'reports.read'])
where r.key = 'marketing'
on conflict do nothing;
