create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  restaurant_id uuid not null,
  supplier_id uuid not null,
  order_number text not null check (char_length(order_number) between 5 and 40),
  status text not null default 'draft' check (status in ('draft', 'ordered', 'received', 'cancelled')),
  expected_on date,
  notes text not null default '' check (char_length(notes) <= 500),
  receipt_note text not null default '' check (char_length(receipt_note) <= 500),
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 120),
  created_by uuid references public.profiles (id) on delete set null,
  ordered_at timestamptz,
  received_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint purchase_orders_restaurant_organization_fkey
    foreign key (restaurant_id, organization_id)
    references public.restaurants (id, organization_id)
    on delete cascade,
  constraint purchase_orders_supplier_fkey
    foreign key (supplier_id, restaurant_id)
    references public.suppliers (id, restaurant_id)
    on delete restrict,
  constraint purchase_orders_restaurant_number_key unique (restaurant_id, order_number),
  constraint purchase_orders_restaurant_idempotency_key unique (restaurant_id, idempotency_key),
  constraint purchase_orders_id_restaurant_key unique (id, restaurant_id)
);

create table public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  restaurant_id uuid not null,
  purchase_order_id uuid not null,
  inventory_item_id uuid,
  item_name text not null check (char_length(btrim(item_name)) between 1 and 120),
  unit text not null check (char_length(btrim(unit)) between 1 and 12),
  quantity_milli bigint not null check (quantity_milli between 1 and 1000000000000),
  received_quantity_milli bigint not null default 0
    check (received_quantity_milli between 0 and quantity_milli),
  unit_cost_cents bigint not null check (unit_cost_cents between 0 and 100000000),
  created_at timestamptz not null default now(),
  constraint purchase_order_items_order_fkey
    foreign key (purchase_order_id, restaurant_id)
    references public.purchase_orders (id, restaurant_id)
    on delete cascade,
  constraint purchase_order_items_inventory_item_fkey
    foreign key (inventory_item_id, restaurant_id)
    references public.inventory_items (id, restaurant_id)
    on delete set null (inventory_item_id),
  constraint purchase_order_items_order_item_key unique (purchase_order_id, inventory_item_id)
);

create index purchase_orders_restaurant_created_idx
  on public.purchase_orders (restaurant_id, created_at desc);
create index purchase_orders_restaurant_status_idx
  on public.purchase_orders (restaurant_id, status, expected_on);
create index purchase_orders_supplier_idx
  on public.purchase_orders (supplier_id, created_at desc);
create index purchase_order_items_order_idx
  on public.purchase_order_items (purchase_order_id, item_name);
create index purchase_order_items_inventory_item_idx
  on public.purchase_order_items (inventory_item_id, restaurant_id);

create trigger purchase_orders_set_updated_at before update on public.purchase_orders
  for each row execute function public.set_updated_at();

alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;

create policy purchase_orders_select on public.purchase_orders
  for select to authenticated
  using (
    public.auth_has_permission_for_restaurant(restaurant_id, 'inventory.manage')
    or public.auth_has_permission_for_restaurant(restaurant_id, 'reports.read')
    or public.auth_is_platform_admin()
  );

create policy purchase_order_items_select on public.purchase_order_items
  for select to authenticated
  using (
    public.auth_has_permission_for_restaurant(restaurant_id, 'inventory.manage')
    or public.auth_has_permission_for_restaurant(restaurant_id, 'reports.read')
    or public.auth_is_platform_admin()
  );

create or replace function public.save_purchase_order(
  p_restaurant_id uuid,
  p_order_id uuid,
  p_supplier_id uuid,
  p_expected_on date,
  p_notes text,
  p_items jsonb,
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
  v_order public.purchase_orders;
  v_order_id uuid;
  v_key text := coalesce(p_idempotency_key, '');
  v_notes text := coalesce(p_notes, '');
  v_item jsonb;
  v_item_id uuid;
  v_item_name text;
  v_item_unit text;
  v_quantity_milli bigint;
  v_unit_cost_cents bigint;
  v_sequence integer;
  v_order_number text;
begin
  if v_user is null then
    raise exception 'Autenticazione richiesta.' using errcode = '42501';
  end if;

  if not public.auth_has_permission_for_restaurant(p_restaurant_id, 'inventory.manage') then
    raise exception 'Permesso inventory.manage richiesto.' using errcode = '42501';
  end if;

  select r.organization_id into v_org
  from public.restaurants r
  where r.id = p_restaurant_id;

  if v_org is null then
    raise exception 'Ristorante non trovato.' using errcode = 'P0002';
  end if;

  if p_supplier_id is null
    or not exists (
      select 1
      from public.suppliers s
      where s.id = p_supplier_id
        and s.restaurant_id = p_restaurant_id
    ) then
    raise exception 'Fornitore non trovato.' using errcode = 'P0002';
  end if;

  if char_length(v_notes) > 500 then
    raise exception 'Le note sono troppo lunghe.' using errcode = '23514';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'L ordine richiede almeno una riga.' using errcode = '23514';
  end if;

  if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then
    raise exception 'Inserisci da 1 a 50 righe.' using errcode = '23514';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) as item
    group by item->>'inventory_item_id'
    having count(*) > 1
  ) then
    raise exception 'Lo stesso articolo compare piu volte nell ordine.' using errcode = '23514';
  end if;

  if p_order_id is null then
    if char_length(v_key) < 8 or char_length(v_key) > 120 then
      raise exception 'Chiave di idempotenza non valida.' using errcode = '23514';
    end if;

    perform pg_advisory_xact_lock(
      hashtext('purchase-orders:' || p_restaurant_id::text || ':' || current_date::text)::bigint
    );

    select * into v_order
    from public.purchase_orders
    where restaurant_id = p_restaurant_id
      and idempotency_key = v_key;

    if found then
      return v_order.id;
    end if;

    select count(*) + 1 into v_sequence
    from public.purchase_orders
    where restaurant_id = p_restaurant_id
      and order_number like 'PO-' || to_char(current_date, 'YYYYMMDD') || '-%';

    v_order_number := 'PO-' || to_char(current_date, 'YYYYMMDD') || '-' || lpad(v_sequence::text, 4, '0');

    insert into public.purchase_orders (
      organization_id,
      restaurant_id,
      supplier_id,
      order_number,
      status,
      expected_on,
      notes,
      idempotency_key,
      created_by
    )
    values (
      v_org,
      p_restaurant_id,
      p_supplier_id,
      v_order_number,
      'draft',
      p_expected_on,
      v_notes,
      v_key,
      v_user
    )
    returning * into v_order;

    v_order_id := v_order.id;
  else
    select * into v_order
    from public.purchase_orders
    where id = p_order_id
      and restaurant_id = p_restaurant_id
    for update;

    if not found then
      raise exception 'Ordine non trovato.' using errcode = 'P0002';
    end if;

    if v_order.status <> 'draft' then
      raise exception 'Solo le bozze possono essere modificate.' using errcode = '23514';
    end if;

    update public.purchase_orders
    set supplier_id = p_supplier_id,
        expected_on = p_expected_on,
        notes = v_notes
    where id = v_order.id;

    delete from public.purchase_order_items
    where purchase_order_id = v_order.id;

    v_order_id := v_order.id;
    v_order_number := v_order.order_number;
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    begin
      v_item_id := (v_item->>'inventory_item_id')::uuid;
      v_quantity_milli := (v_item->>'quantity_milli')::bigint;
      v_unit_cost_cents := (v_item->>'unit_cost_cents')::bigint;
    exception
      when others then
        raise exception 'Riga ordine non valida.' using errcode = '23514';
    end;

    if v_item_id is null
      or v_quantity_milli is null
      or v_quantity_milli < 1
      or v_quantity_milli > 1000000000000
      or v_unit_cost_cents is null
      or v_unit_cost_cents < 0
      or v_unit_cost_cents > 100000000 then
      raise exception 'Quantita o costo non validi.' using errcode = '23514';
    end if;

    select i.name, i.unit into v_item_name, v_item_unit
    from public.inventory_items i
    where i.id = v_item_id
      and i.restaurant_id = p_restaurant_id
      and i.is_active;

    if v_item_name is null then
      raise exception 'Articolo non trovato o non attivo.' using errcode = 'P0002';
    end if;

    insert into public.purchase_order_items (
      organization_id,
      restaurant_id,
      purchase_order_id,
      inventory_item_id,
      item_name,
      unit,
      quantity_milli,
      unit_cost_cents
    )
    values (
      v_org,
      p_restaurant_id,
      v_order_id,
      v_item_id,
      v_item_name,
      v_item_unit,
      v_quantity_milli,
      v_unit_cost_cents
    );
  end loop;

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
    case when p_order_id is null then 'purchasing.order_created' else 'purchasing.order_updated' end,
    'purchase_order',
    v_order_id::text,
    jsonb_build_object(
      'order_number', v_order_number,
      'supplier_id', p_supplier_id,
      'items', jsonb_array_length(p_items),
      'status', 'draft'
    )
  );

  return v_order_id;
end;
$$;

create or replace function public.mark_purchase_order_ordered(p_order_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_order public.purchase_orders;
begin
  if v_user is null then
    raise exception 'Autenticazione richiesta.' using errcode = '42501';
  end if;

  select * into v_order
  from public.purchase_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Ordine non trovato.' using errcode = 'P0002';
  end if;

  if not public.auth_has_permission_for_restaurant(v_order.restaurant_id, 'inventory.manage') then
    raise exception 'Permesso inventory.manage richiesto.' using errcode = '42501';
  end if;

  if v_order.status = 'ordered' then
    return 'ordered';
  end if;

  if v_order.status <> 'draft' then
    raise exception 'Solo una bozza puo essere segnata come ordinata.' using errcode = '23514';
  end if;

  update public.purchase_orders
  set status = 'ordered',
      ordered_at = now()
  where id = v_order.id;

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
    v_order.organization_id,
    v_order.restaurant_id,
    v_user,
    'purchasing.order_ordered',
    'purchase_order',
    v_order.id::text,
    jsonb_build_object('order_number', v_order.order_number)
  );

  return 'ordered';
end;
$$;

create or replace function public.cancel_purchase_order(p_order_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_order public.purchase_orders;
begin
  if v_user is null then
    raise exception 'Autenticazione richiesta.' using errcode = '42501';
  end if;

  select * into v_order
  from public.purchase_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Ordine non trovato.' using errcode = 'P0002';
  end if;

  if not public.auth_has_permission_for_restaurant(v_order.restaurant_id, 'inventory.manage') then
    raise exception 'Permesso inventory.manage richiesto.' using errcode = '42501';
  end if;

  if v_order.status = 'cancelled' then
    return 'cancelled';
  end if;

  if v_order.status = 'received' then
    raise exception 'Un ordine ricevuto non puo essere annullato.' using errcode = '23514';
  end if;

  update public.purchase_orders
  set status = 'cancelled',
      cancelled_at = now()
  where id = v_order.id;

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
    v_order.organization_id,
    v_order.restaurant_id,
    v_user,
    'purchasing.order_cancelled',
    'purchase_order',
    v_order.id::text,
    jsonb_build_object('order_number', v_order.order_number)
  );

  return 'cancelled';
end;
$$;

create or replace function public.receive_purchase_order(
  p_order_id uuid,
  p_items jsonb,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_order public.purchase_orders;
  v_order_item public.purchase_order_items;
  v_inventory_item public.inventory_items;
  v_line jsonb;
  v_quantity_milli bigint;
  v_quantity_after bigint;
  v_note text := coalesce(p_note, '');
  v_ordered_total_milli bigint;
  v_received_total_milli bigint;
  v_discrepancy_count integer;
begin
  if v_user is null then
    raise exception 'Autenticazione richiesta.' using errcode = '42501';
  end if;

  select * into v_order
  from public.purchase_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Ordine non trovato.' using errcode = 'P0002';
  end if;

  if not public.auth_has_permission_for_restaurant(v_order.restaurant_id, 'inventory.manage') then
    raise exception 'Permesso inventory.manage richiesto.' using errcode = '42501';
  end if;

  if v_order.status = 'received' then
    return jsonb_build_object('duplicate', true, 'status', 'received');
  end if;

  if v_order.status <> 'ordered' then
    raise exception 'Solo un ordine ordinato puo essere ricevuto.' using errcode = '23514';
  end if;

  if char_length(v_note) > 500 then
    raise exception 'Le note di ricezione sono troppo lunghe.' using errcode = '23514';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Indica le quantita ricevute.' using errcode = '23514';
  end if;

  if jsonb_array_length(p_items) > 50 then
    raise exception 'Troppe righe di ricezione.' using errcode = '23514';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) as item
    group by item->>'item_id'
    having count(*) > 1
  ) then
    raise exception 'La stessa riga compare piu volte nella ricezione.' using errcode = '23514';
  end if;

  for v_line in select * from jsonb_array_elements(p_items)
  loop
    begin
      select * into v_order_item
      from public.purchase_order_items
      where id = (v_line->>'item_id')::uuid
        and purchase_order_id = v_order.id
      for update;

      v_quantity_milli := (v_line->>'quantity_milli')::bigint;
    exception
      when others then
        raise exception 'Riga di ricezione non valida.' using errcode = '23514';
    end;

    if not found or v_quantity_milli is null then
      raise exception 'Riga ordine non trovata.' using errcode = 'P0002';
    end if;

    if v_quantity_milli < 0 or v_quantity_milli > v_order_item.quantity_milli then
      raise exception 'La quantita ricevuta supera quella ordinata.' using errcode = '23514';
    end if;

    update public.purchase_order_items
    set received_quantity_milli = v_quantity_milli
    where id = v_order_item.id;

    if v_quantity_milli > 0 then
      if v_order_item.inventory_item_id is null then
        raise exception 'Articolo non piu disponibile in magazzino.' using errcode = 'P0002';
      end if;

      select * into v_inventory_item
      from public.inventory_items
      where id = v_order_item.inventory_item_id
        and restaurant_id = v_order.restaurant_id
      for update;

      if not found then
        raise exception 'Articolo non trovato in magazzino.' using errcode = 'P0002';
      end if;

      v_quantity_after := v_inventory_item.quantity_milli + v_quantity_milli;

      if v_quantity_after > 1000000000000 then
        raise exception 'La giacenza supera il limite consentito.' using errcode = '23514';
      end if;

      perform set_config('app.inventory_movement', 'on', true);
      update public.inventory_items
      set quantity_milli = v_quantity_after,
          cost_per_unit_cents = v_order_item.unit_cost_cents
      where id = v_inventory_item.id;
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
        v_order.organization_id,
        v_order.restaurant_id,
        v_inventory_item.id,
        'load',
        v_quantity_milli,
        v_quantity_after,
        'purchase_order',
        'Ricezione ordine ' || v_order.order_number,
        'purchase-order:' || v_order.id::text || ':' || v_order_item.id::text,
        v_user
      );
    end if;
  end loop;

  select
    coalesce(sum(quantity_milli), 0),
    coalesce(sum(received_quantity_milli), 0),
    count(*) filter (where received_quantity_milli < quantity_milli)
  into v_ordered_total_milli, v_received_total_milli, v_discrepancy_count
  from public.purchase_order_items
  where purchase_order_id = v_order.id;

  if v_received_total_milli <= 0 then
    raise exception 'Registra almeno una quantita ricevuta.' using errcode = '23514';
  end if;

  update public.purchase_orders
  set status = 'received',
      received_at = now(),
      receipt_note = v_note
  where id = v_order.id;

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
    v_order.organization_id,
    v_order.restaurant_id,
    v_user,
    'purchasing.order_received',
    'purchase_order',
    v_order.id::text,
    jsonb_build_object(
      'order_number', v_order.order_number,
      'ordered_milli', v_ordered_total_milli,
      'received_milli', v_received_total_milli,
      'discrepancies', v_discrepancy_count
    )
  );

  return jsonb_build_object(
    'duplicate', false,
    'status', 'received',
    'ordered_milli', v_ordered_total_milli,
    'received_milli', v_received_total_milli,
    'discrepancies', v_discrepancy_count
  );
end;
$$;

revoke execute on function public.save_purchase_order(
  uuid, uuid, uuid, date, text, jsonb, text
) from public, anon;
revoke execute on function public.mark_purchase_order_ordered(uuid) from public, anon;
revoke execute on function public.cancel_purchase_order(uuid) from public, anon;
revoke execute on function public.receive_purchase_order(uuid, jsonb, text) from public, anon;

grant execute on function public.save_purchase_order(
  uuid, uuid, uuid, date, text, jsonb, text
) to authenticated, service_role;
grant execute on function public.mark_purchase_order_ordered(uuid) to authenticated, service_role;
grant execute on function public.cancel_purchase_order(uuid) to authenticated, service_role;
grant execute on function public.receive_purchase_order(uuid, jsonb, text) to authenticated, service_role;
