alter table public.restaurant_tables
  add constraint restaurant_tables_id_restaurant_key unique (id, restaurant_id);

alter table public.menu_items
  add constraint menu_items_id_restaurant_key unique (id, restaurant_id);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  restaurant_id uuid not null,
  table_id uuid,
  status text not null default 'open' check (status in ('open', 'paid', 'cancelled')),
  guests integer check (guests between 1 and 50),
  note text not null default '' check (char_length(note) <= 300),
  opened_by uuid not null references auth.users (id),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_restaurant_organization_fkey
    foreign key (restaurant_id, organization_id)
    references public.restaurants (id, organization_id)
    on delete cascade,
  constraint orders_table_restaurant_fkey
    foreign key (table_id, restaurant_id)
    references public.restaurant_tables (id, restaurant_id)
    on delete set null (table_id),
  constraint orders_closed_at_check
    check ((status = 'open') = (closed_at is null)),
  constraint orders_id_restaurant_key unique (id, restaurant_id)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  restaurant_id uuid not null,
  order_id uuid not null,
  menu_item_id uuid,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  unit_price_cents bigint not null check (unit_price_cents between 0 and 100000000),
  quantity integer not null default 1 check (quantity between 1 and 99),
  note text not null default '' check (char_length(note) <= 200),
  status text not null default 'pending'
    check (status in ('pending', 'preparing', 'ready', 'served', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_items_order_restaurant_fkey
    foreign key (order_id, restaurant_id)
    references public.orders (id, restaurant_id)
    on delete cascade,
  constraint order_items_menu_item_restaurant_fkey
    foreign key (menu_item_id, restaurant_id)
    references public.menu_items (id, restaurant_id)
    on delete set null (menu_item_id)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  restaurant_id uuid not null,
  order_id uuid not null,
  method text not null check (method in ('cash', 'card', 'other')),
  amount_cents bigint not null check (amount_cents between 1 and 100000000),
  tip_cents bigint not null default 0 check (tip_cents between 0 and 10000000),
  idempotency_key text not null
    check (char_length(idempotency_key) between 8 and 120),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  constraint payments_order_restaurant_fkey
    foreign key (order_id, restaurant_id)
    references public.orders (id, restaurant_id)
    on delete restrict,
  constraint payments_restaurant_idempotency_key
    unique (restaurant_id, idempotency_key)
);

create unique index orders_one_open_per_table_idx
  on public.orders (restaurant_id, table_id)
  where status = 'open' and table_id is not null;

create index orders_restaurant_status_idx
  on public.orders (restaurant_id, status, opened_at);
create index order_items_order_idx
  on public.order_items (order_id, status);
create index order_items_kitchen_idx
  on public.order_items (restaurant_id, status, created_at);
create index payments_order_idx
  on public.payments (order_id, created_at);

create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
create trigger order_items_set_updated_at before update on public.order_items
  for each row execute function public.set_updated_at();

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;

create policy orders_select on public.orders
  for select to authenticated
  using (
    restaurant_id in (select public.auth_restaurant_ids())
    or public.auth_is_platform_admin()
  );

create policy order_items_select on public.order_items
  for select to authenticated
  using (
    restaurant_id in (select public.auth_restaurant_ids())
    or public.auth_is_platform_admin()
  );

create policy payments_select on public.payments
  for select to authenticated
  using (
    restaurant_id in (select public.auth_restaurant_ids())
    or public.auth_is_platform_admin()
  );

create or replace function public.open_order(
  p_restaurant_id uuid,
  p_table_id uuid,
  p_guests integer,
  p_note text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_order_id uuid;
begin
  if v_user is null then
    raise exception 'Autenticazione richiesta.' using errcode = '42501';
  end if;

  if not public.auth_has_permission_for_restaurant(p_restaurant_id, 'pos.operate') then
    raise exception 'Permesso pos.operate richiesto.' using errcode = '42501';
  end if;

  if p_guests is not null and (p_guests < 1 or p_guests > 50) then
    raise exception 'Numero di coperti non valido.' using errcode = '23514';
  end if;

  if char_length(coalesce(p_note, '')) > 300 then
    raise exception 'Nota troppo lunga.' using errcode = '23514';
  end if;

  if p_table_id is not null and not exists (
    select 1
    from public.restaurant_tables t
    where t.id = p_table_id
      and t.restaurant_id = p_restaurant_id
      and t.is_active
  ) then
    raise exception 'Tavolo non valido o non attivo.' using errcode = '23503';
  end if;

  insert into public.orders (
    organization_id,
    restaurant_id,
    table_id,
    guests,
    note,
    opened_by
  )
  select r.organization_id, r.id, p_table_id, p_guests, coalesce(p_note, ''), v_user
  from public.restaurants r
  where r.id = p_restaurant_id
  returning id into v_order_id;

  if v_order_id is null then
    raise exception 'Ristorante non trovato.' using errcode = '23503';
  end if;

  return v_order_id;
end;
$$;

create or replace function public.add_order_items(
  p_order_id uuid,
  p_items jsonb
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_order public.orders;
  v_item jsonb;
  v_menu public.menu_items;
  v_quantity integer;
  v_note text;
  v_existing_id uuid;
  v_existing_quantity integer;
  v_count integer := 0;
begin
  if v_user is null then
    raise exception 'Autenticazione richiesta.' using errcode = '42501';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Conto non trovato.' using errcode = 'P0002';
  end if;

  if v_order.status <> 'open' then
    raise exception 'Il conto non è aperto.' using errcode = '23514';
  end if;

  if not public.auth_has_permission_for_restaurant(v_order.restaurant_id, 'pos.operate') then
    raise exception 'Permesso pos.operate richiesto.' using errcode = '42501';
  end if;

  if p_items is null
    or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) = 0
    or jsonb_array_length(p_items) > 50 then
    raise exception 'Elenco prodotti non valido.' using errcode = '23514';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    if (v_item ? 'menu_item_id') is not true then
      raise exception 'Prodotto non valido.' using errcode = '23514';
    end if;

    select * into v_menu
    from public.menu_items m
    where m.id = (v_item ->> 'menu_item_id')::uuid
      and m.restaurant_id = v_order.restaurant_id;

    if not found then
      raise exception 'Prodotto non trovato nel menu di questo ristorante.'
        using errcode = '23503';
    end if;

    if not v_menu.is_available then
      raise exception 'Il prodotto è esaurito.' using errcode = '23514';
    end if;

    v_quantity := coalesce((v_item ->> 'quantity')::integer, 1);

    if v_quantity < 1 or v_quantity > 99 then
      raise exception 'Quantità non valida.' using errcode = '23514';
    end if;

    v_note := btrim(coalesce(v_item ->> 'note', ''));

    if char_length(v_note) > 200 then
      raise exception 'Nota riga troppo lunga.' using errcode = '23514';
    end if;

    select i.id, i.quantity
    into v_existing_id, v_existing_quantity
    from public.order_items i
    where i.order_id = p_order_id
      and i.menu_item_id = v_menu.id
      and i.status = 'pending'
      and i.note = v_note
    limit 1;

    if v_existing_id is not null then
      if v_existing_quantity + v_quantity > 99 then
        raise exception 'Quantità massima superata per una riga.' using errcode = '23514';
      end if;

      update public.order_items
      set quantity = v_existing_quantity + v_quantity
      where id = v_existing_id;
    else
      insert into public.order_items (
        organization_id,
        restaurant_id,
        order_id,
        menu_item_id,
        name,
        unit_price_cents,
        quantity,
        note
      )
      values (
        v_order.organization_id,
        v_order.restaurant_id,
        p_order_id,
        v_menu.id,
        v_menu.name,
        v_menu.price_cents,
        v_quantity,
        v_note
      );
    end if;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

create or replace function public.cancel_order_item(p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_item public.order_items;
  v_order public.orders;
begin
  if v_user is null then
    raise exception 'Autenticazione richiesta.' using errcode = '42501';
  end if;

  select * into v_item
  from public.order_items
  where id = p_item_id;

  if not found then
    raise exception 'Riga non trovata.' using errcode = 'P0002';
  end if;

  select * into v_order
  from public.orders
  where id = v_item.order_id
  for update;

  if not found then
    raise exception 'Conto non trovato.' using errcode = 'P0002';
  end if;

  if not public.auth_has_permission_for_restaurant(v_order.restaurant_id, 'pos.operate') then
    raise exception 'Permesso pos.operate richiesto.' using errcode = '42501';
  end if;

  if v_order.status <> 'open' then
    raise exception 'Il conto non è aperto.' using errcode = '23514';
  end if;

  if v_item.status = 'cancelled' then
    return;
  end if;

  update public.order_items
  set status = 'cancelled'
  where id = p_item_id;
end;
$$;

create or replace function public.pay_order(
  p_order_id uuid,
  p_method text,
  p_amount_cents bigint,
  p_tip_cents bigint,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_order public.orders;
  v_existing public.payments;
  v_total bigint;
  v_paid bigint;
begin
  if v_user is null then
    raise exception 'Autenticazione richiesta.' using errcode = '42501';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Conto non trovato.' using errcode = 'P0002';
  end if;

  if not public.auth_has_permission_for_restaurant(v_order.restaurant_id, 'pos.operate') then
    raise exception 'Permesso pos.operate richiesto.' using errcode = '42501';
  end if;

  select * into v_existing
  from public.payments
  where restaurant_id = v_order.restaurant_id
    and idempotency_key = p_idempotency_key;

  if found then
    if v_existing.order_id <> p_order_id then
      raise exception 'Chiave di idempotenza già usata per un altro conto.'
        using errcode = '23505';
    end if;

    select coalesce(sum(i.unit_price_cents * i.quantity), 0)
    into v_total
    from public.order_items i
    where i.order_id = p_order_id
      and i.status <> 'cancelled';

    select coalesce(sum(p.amount_cents), 0)
    into v_paid
    from public.payments p
    where p.order_id = p_order_id;

    return jsonb_build_object(
      'order_id', p_order_id,
      'status', v_order.status,
      'total_cents', v_total,
      'paid_cents', v_paid,
      'replayed', true
    );
  end if;

  if v_order.status <> 'open' then
    raise exception 'Il conto non è aperto.' using errcode = '23514';
  end if;

  if p_method not in ('cash', 'card', 'other') then
    raise exception 'Metodo di pagamento non valido.' using errcode = '23514';
  end if;

  if p_amount_cents is null or p_amount_cents <= 0 or p_amount_cents > 100000000 then
    raise exception 'Importo non valido.' using errcode = '23514';
  end if;

  if p_tip_cents is null or p_tip_cents < 0 or p_tip_cents > 10000000 then
    raise exception 'Mancia non valida.' using errcode = '23514';
  end if;

  if char_length(coalesce(p_idempotency_key, '')) < 8 then
    raise exception 'Chiave di idempotenza non valida.' using errcode = '23514';
  end if;

  select coalesce(sum(i.unit_price_cents * i.quantity), 0)
  into v_total
  from public.order_items i
  where i.order_id = p_order_id
    and i.status <> 'cancelled';

  if v_total <= 0 then
    raise exception 'Il conto non ha righe da incassare.' using errcode = '23514';
  end if;

  select coalesce(sum(p.amount_cents), 0)
  into v_paid
  from public.payments p
  where p.order_id = p_order_id;

  if v_paid + p_amount_cents > v_total then
    raise exception 'L''importo supera il totale residuo.' using errcode = '23514';
  end if;

  insert into public.payments (
    organization_id,
    restaurant_id,
    order_id,
    method,
    amount_cents,
    tip_cents,
    idempotency_key,
    created_by
  )
  values (
    v_order.organization_id,
    v_order.restaurant_id,
    p_order_id,
    p_method,
    p_amount_cents,
    p_tip_cents,
    p_idempotency_key,
    v_user
  );

  v_paid := v_paid + p_amount_cents;

  if v_paid = v_total then
    update public.orders
    set status = 'paid', closed_at = now()
    where id = p_order_id;
  end if;

  return jsonb_build_object(
    'order_id', p_order_id,
    'status', case when v_paid = v_total then 'paid' else 'open' end,
    'total_cents', v_total,
    'paid_cents', v_paid,
    'replayed', false
  );
end;
$$;

create or replace function public.void_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_order public.orders;
begin
  if v_user is null then
    raise exception 'Autenticazione richiesta.' using errcode = '42501';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Conto non trovato.' using errcode = 'P0002';
  end if;

  if not public.auth_has_permission_for_restaurant(v_order.restaurant_id, 'pos.operate') then
    raise exception 'Permesso pos.operate richiesto.' using errcode = '42501';
  end if;

  if v_order.status <> 'open' then
    raise exception 'Solo i conti aperti possono essere annullati.' using errcode = '23514';
  end if;

  if exists (select 1 from public.payments p where p.order_id = p_order_id) then
    raise exception 'Il conto ha pagamenti registrati e non può essere annullato.'
      using errcode = '23514';
  end if;

  update public.orders
  set status = 'cancelled', closed_at = now()
  where id = p_order_id;
end;
$$;

revoke execute on function public.open_order(uuid, uuid, integer, text) from public, anon;
revoke execute on function public.add_order_items(uuid, jsonb) from public, anon;
revoke execute on function public.cancel_order_item(uuid) from public, anon;
revoke execute on function public.pay_order(uuid, text, bigint, bigint, text) from public, anon;
revoke execute on function public.void_order(uuid) from public, anon;

grant execute on function public.open_order(uuid, uuid, integer, text) to authenticated, service_role;
grant execute on function public.add_order_items(uuid, jsonb) to authenticated, service_role;
grant execute on function public.cancel_order_item(uuid) to authenticated, service_role;
grant execute on function public.pay_order(uuid, text, bigint, bigint, text) to authenticated, service_role;
grant execute on function public.void_order(uuid) to authenticated, service_role;
