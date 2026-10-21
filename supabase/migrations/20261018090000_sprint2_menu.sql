create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  restaurant_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_categories_restaurant_organization_fkey
    foreign key (restaurant_id, organization_id)
    references public.restaurants (id, organization_id)
    on delete cascade,
  constraint menu_categories_restaurant_name_key unique (restaurant_id, name),
  constraint menu_categories_id_restaurant_key unique (id, restaurant_id)
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  restaurant_id uuid not null,
  category_id uuid,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 500),
  price_cents bigint not null check (price_cents between 0 and 100000000),
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_items_restaurant_organization_fkey
    foreign key (restaurant_id, organization_id)
    references public.restaurants (id, organization_id)
    on delete cascade,
  constraint menu_items_category_restaurant_fkey
    foreign key (category_id, restaurant_id)
    references public.menu_categories (id, restaurant_id)
    on delete set null (category_id)
);

create index menu_categories_restaurant_idx
  on public.menu_categories (restaurant_id, sort_order, name);
create index menu_items_restaurant_idx
  on public.menu_items (restaurant_id, category_id, sort_order, name);
create index menu_items_category_idx
  on public.menu_items (category_id, restaurant_id);

create trigger menu_categories_set_updated_at before update on public.menu_categories
  for each row execute function public.set_updated_at();
create trigger menu_items_set_updated_at before update on public.menu_items
  for each row execute function public.set_updated_at();

alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;

create policy menu_categories_select on public.menu_categories
  for select to authenticated
  using (
    restaurant_id in (select public.auth_restaurant_ids())
    or public.auth_is_platform_admin()
  );

create policy menu_categories_insert on public.menu_categories
  for insert to authenticated
  with check (public.auth_has_permission_for_restaurant(restaurant_id, 'menu.manage'));

create policy menu_categories_update on public.menu_categories
  for update to authenticated
  using (public.auth_has_permission_for_restaurant(restaurant_id, 'menu.manage'))
  with check (public.auth_has_permission_for_restaurant(restaurant_id, 'menu.manage'));

create policy menu_categories_delete on public.menu_categories
  for delete to authenticated
  using (public.auth_has_permission_for_restaurant(restaurant_id, 'menu.manage'));

create policy menu_items_select on public.menu_items
  for select to authenticated
  using (
    restaurant_id in (select public.auth_restaurant_ids())
    or public.auth_is_platform_admin()
  );

create policy menu_items_insert on public.menu_items
  for insert to authenticated
  with check (public.auth_has_permission_for_restaurant(restaurant_id, 'menu.manage'));

create policy menu_items_update on public.menu_items
  for update to authenticated
  using (public.auth_has_permission_for_restaurant(restaurant_id, 'menu.manage'))
  with check (public.auth_has_permission_for_restaurant(restaurant_id, 'menu.manage'));

create policy menu_items_delete on public.menu_items
  for delete to authenticated
  using (public.auth_has_permission_for_restaurant(restaurant_id, 'menu.manage'));
