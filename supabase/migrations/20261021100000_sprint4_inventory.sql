create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  restaurant_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  category text not null default '' check (char_length(category) <= 80),
  email text not null default '' check (char_length(email) <= 160),
  phone text not null default '' check (char_length(phone) <= 40),
  notes text not null default '' check (char_length(notes) <= 500),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint suppliers_restaurant_organization_fkey
    foreign key (restaurant_id, organization_id)
    references public.restaurants (id, organization_id)
    on delete cascade,
  constraint suppliers_restaurant_name_key unique (restaurant_id, name),
  constraint suppliers_id_restaurant_key unique (id, restaurant_id)
);

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  restaurant_id uuid not null,
  supplier_id uuid,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  sku text not null default '' check (char_length(sku) <= 60),
  category text not null default 'Generale' check (char_length(btrim(category)) between 1 and 80),
  unit text not null default 'pz' check (char_length(btrim(unit)) between 1 and 12),
  quantity_milli bigint not null default 0 check (quantity_milli between 0 and 1000000000000),
  min_quantity_milli bigint not null default 0 check (min_quantity_milli between 0 and 1000000000000),
  cost_per_unit_cents bigint not null default 0 check (cost_per_unit_cents between 0 and 100000000),
  lot text not null default '' check (char_length(lot) <= 60),
  expires_on date,
  location text not null default '' check (char_length(location) <= 80),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_items_restaurant_organization_fkey
    foreign key (restaurant_id, organization_id)
    references public.restaurants (id, organization_id)
    on delete cascade,
  constraint inventory_items_supplier_fkey
    foreign key (supplier_id, restaurant_id)
    references public.suppliers (id, restaurant_id)
    on delete restrict,
  constraint inventory_items_restaurant_name_key unique (restaurant_id, name),
  constraint inventory_items_id_restaurant_key unique (id, restaurant_id)
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  restaurant_id uuid not null,
  item_id uuid not null,
  kind text not null check (kind in ('load', 'unload', 'waste', 'adjustment')),
  quantity_delta_milli bigint not null check (quantity_delta_milli <> 0),
  quantity_after_milli bigint not null check (quantity_after_milli >= 0),
  reason text not null default '' check (char_length(reason) <= 120),
  note text not null default '' check (char_length(note) <= 300),
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 120),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint inventory_movements_item_restaurant_fkey
    foreign key (item_id, restaurant_id)
    references public.inventory_items (id, restaurant_id)
    on delete restrict,
  constraint inventory_movements_restaurant_idempotency_key
    unique (restaurant_id, idempotency_key)
);

create index suppliers_restaurant_idx
  on public.suppliers (restaurant_id, is_active, name);
create index inventory_items_restaurant_idx
  on public.inventory_items (restaurant_id, is_active, name);
create index inventory_items_low_stock_idx
  on public.inventory_items (restaurant_id, quantity_milli, min_quantity_milli);
create index inventory_movements_item_created_idx
  on public.inventory_movements (item_id, created_at desc);
create index inventory_movements_restaurant_created_idx
  on public.inventory_movements (restaurant_id, created_at desc);

create trigger suppliers_set_updated_at before update on public.suppliers
  for each row execute function public.set_updated_at();
create trigger inventory_items_set_updated_at before update on public.inventory_items
  for each row execute function public.set_updated_at();

create or replace function public.inventory_items_guard_quantity()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.quantity_milli is distinct from old.quantity_milli
    and coalesce(current_setting('app.inventory_movement', true), '') <> 'on' then
    raise exception 'Le giacenze si modificano solo tramite movimenti.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger inventory_items_guard_quantity
  before update on public.inventory_items
  for each row execute function public.inventory_items_guard_quantity();

alter table public.suppliers enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_movements enable row level security;

create policy suppliers_select on public.suppliers
  for select to authenticated
  using (
    public.auth_has_permission_for_restaurant(restaurant_id, 'inventory.manage')
    or public.auth_has_permission_for_restaurant(restaurant_id, 'reports.read')
    or public.auth_is_platform_admin()
  );

create policy suppliers_insert on public.suppliers
  for insert to authenticated
  with check (public.auth_has_permission_for_restaurant(restaurant_id, 'inventory.manage'));

create policy suppliers_update on public.suppliers
  for update to authenticated
  using (public.auth_has_permission_for_restaurant(restaurant_id, 'inventory.manage'))
  with check (public.auth_has_permission_for_restaurant(restaurant_id, 'inventory.manage'));

create policy suppliers_delete on public.suppliers
  for delete to authenticated
  using (public.auth_has_permission_for_restaurant(restaurant_id, 'inventory.manage'));

create policy inventory_items_select on public.inventory_items
  for select to authenticated
  using (
    public.auth_has_permission_for_restaurant(restaurant_id, 'inventory.manage')
    or public.auth_has_permission_for_restaurant(restaurant_id, 'reports.read')
    or public.auth_is_platform_admin()
  );

create policy inventory_items_update on public.inventory_items
  for update to authenticated
  using (public.auth_has_permission_for_restaurant(restaurant_id, 'inventory.manage'))
  with check (public.auth_has_permission_for_restaurant(restaurant_id, 'inventory.manage'));

create policy inventory_movements_select on public.inventory_movements
  for select to authenticated
  using (
    public.auth_has_permission_for_restaurant(restaurant_id, 'inventory.manage')
    or public.auth_has_permission_for_restaurant(restaurant_id, 'reports.read')
    or public.auth_is_platform_admin()
  );

create or replace function public.create_inventory_item(
  p_restaurant_id uuid,
  p_name text,
  p_sku text,
  p_category text,
  p_unit text,
  p_quantity_milli bigint,
  p_min_quantity_milli bigint,
  p_cost_per_unit_cents bigint,
  p_supplier_id uuid,
  p_lot text,
  p_expires_on date,
  p_location text,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_org uuid;
  v_item_id uuid;
  v_existing_item uuid;
begin
  if v_user is null then
    raise exception 'Autenticazione richiesta.' using errcode = '42501';
  end if;

  if not public.auth_has_permission_for_restaurant(p_restaurant_id, 'inventory.manage') then
    raise exception 'Permesso inventory.manage richiesto.' using errcode = '42501';
  end if;

  if char_length(coalesce(p_idempotency_key, '')) < 8
    or char_length(p_idempotency_key) > 120 then
    raise exception 'Chiave di idempotenza non valida.' using errcode = '23514';
  end if;

  select r.organization_id into v_org
  from public.restaurants r
  where r.id = p_restaurant_id;

  if v_org is null then
    raise exception 'Ristorante non trovato.' using errcode = 'P0002';
  end if;

  select m.item_id into v_existing_item
  from public.inventory_movements m
  where m.restaurant_id = p_restaurant_id
    and m.idempotency_key = p_idempotency_key;

  if v_existing_item is not null then
    return v_existing_item;
  end if;

  insert into public.inventory_items (
    organization_id,
    restaurant_id,
    supplier_id,
    name,
    sku,
    category,
    unit,
    quantity_milli,
    min_quantity_milli,
    cost_per_unit_cents,
    lot,
    expires_on,
    location
  )
  values (
    v_org,
    p_restaurant_id,
    p_supplier_id,
    p_name,
    coalesce(p_sku, ''),
    coalesce(p_category, 'Generale'),
    coalesce(p_unit, 'pz'),
    0,
    p_min_quantity_milli,
    p_cost_per_unit_cents,
    coalesce(p_lot, ''),
    p_expires_on,
    coalesce(p_location, '')
  )
  returning id into v_item_id;

  if p_quantity_milli > 0 then
    perform set_config('app.inventory_movement', 'on', true);
    update public.inventory_items
    set quantity_milli = p_quantity_milli
    where id = v_item_id;
    perform set_config('app.inventory_movement', 'off', true);

    insert into public.inventory_movements (
      organization_id,
      restaurant_id,
      item_id,
      kind,
      quantity_delta_milli,
      quantity_after_milli,
      reason,
      note,
      idempotency_key,
      created_by
    )
    values (
      v_org,
      p_restaurant_id,
      v_item_id,
      'load',
      p_quantity_milli,
      p_quantity_milli,
      'opening',
      'Giacenza iniziale',
      p_idempotency_key,
      v_user
    );
  end if;

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
    v_org,
    p_restaurant_id,
    v_user,
    'inventory.item_created',
    'inventory_item',
    v_item_id::text,
    jsonb_build_object(
      'name', p_name,
      'initial_quantity_milli', p_quantity_milli,
      'unit', p_unit
    )
  );

  return v_item_id;
end;
$$;

create or replace function public.record_inventory_movement(
  p_item_id uuid,
  p_kind text,
  p_quantity_delta_milli bigint,
  p_reason text,
  p_note text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_item public.inventory_items;
  v_existing public.inventory_movements;
  v_after bigint;
begin
  if v_user is null then
    raise exception 'Autenticazione richiesta.' using errcode = '42501';
  end if;

  select * into v_item
  from public.inventory_items
  where id = p_item_id
  for update;

  if not found then
    raise exception 'Articolo non trovato.' using errcode = 'P0002';
  end if;

  if not public.auth_has_permission_for_restaurant(v_item.restaurant_id, 'inventory.manage') then
    raise exception 'Permesso inventory.manage richiesto.' using errcode = '42501';
  end if;

  if char_length(coalesce(p_idempotency_key, '')) < 8
    or char_length(p_idempotency_key) > 120 then
    raise exception 'Chiave di idempotenza non valida.' using errcode = '23514';
  end if;

  select * into v_existing
  from public.inventory_movements
  where restaurant_id = v_item.restaurant_id
    and idempotency_key = p_idempotency_key;

  if found then
    if v_existing.item_id <> p_item_id
      or v_existing.kind <> p_kind
      or v_existing.quantity_delta_milli <> p_quantity_delta_milli then
      raise exception 'Chiave di idempotenza gia usata per un altro movimento.'
        using errcode = '23505';
    end if;

    return jsonb_build_object(
      'movement_id', v_existing.id,
      'quantity_after_milli', v_existing.quantity_after_milli,
      'duplicate', true
    );
  end if;

  if p_kind not in ('load', 'unload', 'waste', 'adjustment') then
    raise exception 'Tipo di movimento non valido.' using errcode = '23514';
  end if;

  if p_kind = 'load' and p_quantity_delta_milli <= 0 then
    raise exception 'Il carico richiede una quantita positiva.' using errcode = '23514';
  end if;

  if p_kind in ('unload', 'waste') and p_quantity_delta_milli >= 0 then
    raise exception 'Lo scarico richiede una quantita negativa.' using errcode = '23514';
  end if;

  if p_kind = 'adjustment' and p_quantity_delta_milli = 0 then
    raise exception 'La rettifica deve essere diversa da zero.' using errcode = '23514';
  end if;

  if p_kind = 'waste'
    and coalesce(p_reason, '') not in ('expiry', 'error', 'damage', 'return', 'overproduction', 'other') then
    raise exception 'Indica una motivazione valida per lo spreco.' using errcode = '23514';
  end if;

  v_after := v_item.quantity_milli + p_quantity_delta_milli;

  if v_after < 0 then
    raise exception 'La giacenza non puo diventare negativa.' using errcode = '23514';
  end if;

  perform set_config('app.inventory_movement', 'on', true);
  update public.inventory_items
  set quantity_milli = v_after
  where id = p_item_id;
  perform set_config('app.inventory_movement', 'off', true);

  insert into public.inventory_movements (
    organization_id,
    restaurant_id,
    item_id,
    kind,
    quantity_delta_milli,
    quantity_after_milli,
    reason,
    note,
    idempotency_key,
    created_by
  )
  values (
    v_item.organization_id,
    v_item.restaurant_id,
    p_item_id,
    p_kind,
    p_quantity_delta_milli,
    v_after,
    coalesce(p_reason, ''),
    coalesce(p_note, ''),
    p_idempotency_key,
    v_user
  )
  returning * into v_existing;

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
    v_item.organization_id,
    v_item.restaurant_id,
    v_user,
    'inventory.movement_recorded',
    'inventory_movement',
    v_existing.id::text,
    jsonb_build_object(
      'item_id', p_item_id,
      'kind', p_kind,
      'quantity_delta_milli', p_quantity_delta_milli,
      'quantity_after_milli', v_after,
      'reason', coalesce(p_reason, '')
    )
  );

  return jsonb_build_object(
    'movement_id', v_existing.id,
    'quantity_after_milli', v_after,
    'duplicate', false
  );
end;
$$;

revoke execute on function public.create_inventory_item(
  uuid, text, text, text, text, bigint, bigint, bigint, uuid, text, date, text, text
) from public, anon;
revoke execute on function public.record_inventory_movement(
  uuid, text, bigint, text, text, text
) from public, anon;

grant execute on function public.create_inventory_item(
  uuid, text, text, text, text, bigint, bigint, bigint, uuid, text, date, text, text
) to authenticated, service_role;
grant execute on function public.record_inventory_movement(
  uuid, text, bigint, text, text, text
) to authenticated, service_role;
