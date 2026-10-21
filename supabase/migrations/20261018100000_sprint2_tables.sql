create table public.floor_areas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  restaurant_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint floor_areas_restaurant_organization_fkey
    foreign key (restaurant_id, organization_id)
    references public.restaurants (id, organization_id)
    on delete cascade,
  constraint floor_areas_restaurant_name_key unique (restaurant_id, name),
  constraint floor_areas_id_restaurant_key unique (id, restaurant_id)
);

create table public.restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  restaurant_id uuid not null,
  area_id uuid,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  seats integer not null check (seats between 1 and 50),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurant_tables_restaurant_organization_fkey
    foreign key (restaurant_id, organization_id)
    references public.restaurants (id, organization_id)
    on delete cascade,
  constraint restaurant_tables_area_restaurant_fkey
    foreign key (area_id, restaurant_id)
    references public.floor_areas (id, restaurant_id)
    on delete set null (area_id),
  constraint restaurant_tables_restaurant_name_key unique (restaurant_id, name)
);

create index floor_areas_restaurant_idx
  on public.floor_areas (restaurant_id, sort_order, name);
create index restaurant_tables_restaurant_idx
  on public.restaurant_tables (restaurant_id, area_id, sort_order, name);
create index restaurant_tables_area_idx
  on public.restaurant_tables (area_id, restaurant_id);

create trigger floor_areas_set_updated_at before update on public.floor_areas
  for each row execute function public.set_updated_at();
create trigger restaurant_tables_set_updated_at before update on public.restaurant_tables
  for each row execute function public.set_updated_at();

alter table public.floor_areas enable row level security;
alter table public.restaurant_tables enable row level security;

create policy floor_areas_select on public.floor_areas
  for select to authenticated
  using (
    restaurant_id in (select public.auth_restaurant_ids())
    or public.auth_is_platform_admin()
  );

create policy floor_areas_insert on public.floor_areas
  for insert to authenticated
  with check (public.auth_has_permission_for_restaurant(restaurant_id, 'reservations.manage'));

create policy floor_areas_update on public.floor_areas
  for update to authenticated
  using (public.auth_has_permission_for_restaurant(restaurant_id, 'reservations.manage'))
  with check (public.auth_has_permission_for_restaurant(restaurant_id, 'reservations.manage'));

create policy floor_areas_delete on public.floor_areas
  for delete to authenticated
  using (public.auth_has_permission_for_restaurant(restaurant_id, 'reservations.manage'));

create policy restaurant_tables_select on public.restaurant_tables
  for select to authenticated
  using (
    restaurant_id in (select public.auth_restaurant_ids())
    or public.auth_is_platform_admin()
  );

create policy restaurant_tables_insert on public.restaurant_tables
  for insert to authenticated
  with check (public.auth_has_permission_for_restaurant(restaurant_id, 'reservations.manage'));

create policy restaurant_tables_update on public.restaurant_tables
  for update to authenticated
  using (public.auth_has_permission_for_restaurant(restaurant_id, 'reservations.manage'))
  with check (public.auth_has_permission_for_restaurant(restaurant_id, 'reservations.manage'));

create policy restaurant_tables_delete on public.restaurant_tables
  for delete to authenticated
  using (public.auth_has_permission_for_restaurant(restaurant_id, 'reservations.manage'));
