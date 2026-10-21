-- Sprint 3 — Palmari, parte 2b: presa in carico dei tavoli e invio comande
-- dal palmare. La logica di apertura conto e di aggiunta righe è estratta in
-- funzioni core private, riusate sia dalle RPC del POS (utente autenticato)
-- sia dalle RPC del palmare (sessione operatore): validazioni, copia dei
-- prezzi dal menu e fusione delle righe restano in un solo punto (regola 6).

create or replace function public._order_open_core(
  p_restaurant_id uuid,
  p_table_id uuid,
  p_guests integer,
  p_note text,
  p_actor uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id uuid;
begin
  if p_actor is null then
    raise exception 'Operatore non valido.' using errcode = '23514';
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
  select r.organization_id, r.id, p_table_id, p_guests, coalesce(p_note, ''), p_actor
  from public.restaurants r
  where r.id = p_restaurant_id
  returning id into v_order_id;

  if v_order_id is null then
    raise exception 'Ristorante non trovato.' using errcode = '23503';
  end if;

  return v_order_id;
end;
$$;

create or replace function public._order_add_items_core(
  p_order_id uuid,
  p_items jsonb
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders;
  v_item jsonb;
  v_menu public.menu_items;
  v_quantity integer;
  v_note text;
  v_existing_id uuid;
  v_existing_quantity integer;
  v_count integer := 0;
begin
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

-- open_order e add_order_items mantengono firma e permessi: ora delegano ai core.
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
begin
  if v_user is null then
    raise exception 'Autenticazione richiesta.' using errcode = '42501';
  end if;

  if not public.auth_has_permission_for_restaurant(p_restaurant_id, 'pos.operate') then
    raise exception 'Permesso pos.operate richiesto.' using errcode = '42501';
  end if;

  return public._order_open_core(p_restaurant_id, p_table_id, p_guests, p_note, v_user);
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
  v_restaurant_id uuid;
begin
  if v_user is null then
    raise exception 'Autenticazione richiesta.' using errcode = '42501';
  end if;

  select o.restaurant_id into v_restaurant_id
  from public.orders o
  where o.id = p_order_id;

  if v_restaurant_id is null then
    raise exception 'Conto non trovato.' using errcode = 'P0002';
  end if;

  if not public.auth_has_permission_for_restaurant(v_restaurant_id, 'pos.operate') then
    raise exception 'Permesso pos.operate richiesto.' using errcode = '42501';
  end if;

  return public._order_add_items_core(p_order_id, p_items);
end;
$$;

create or replace function public.palamare_menu(
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
  v_categories jsonb;
  v_uncategorized jsonb;
begin
  v_context := public.operator_session_context(p_session_token);
  v_restaurant_id := (v_context ->> 'restaurant_id')::uuid;

  select coalesce(jsonb_agg(cat_json order by cat_name), '[]'::jsonb)
  into v_categories
  from (
    select
      c.name as cat_name,
      jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'items', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', i.id,
            'name', i.name,
            'price_cents', i.price_cents
          ) order by i.name)
          from public.menu_items i
          where i.category_id = c.id
            and i.is_available
        ), '[]'::jsonb)
      ) as cat_json
    from public.menu_categories c
    where c.restaurant_id = v_restaurant_id
  ) category_rows;

  select jsonb_build_object(
    'id', null,
    'name', 'Senza categoria',
    'items', coalesce(jsonb_agg(jsonb_build_object(
      'id', i.id,
      'name', i.name,
      'price_cents', i.price_cents
    ) order by i.name), '[]'::jsonb)
  )
  into v_uncategorized
  from public.menu_items i
  where i.restaurant_id = v_restaurant_id
    and i.category_id is null
    and i.is_available
  having count(i.id) > 0;

  if v_uncategorized is not null then
    v_categories := v_categories || jsonb_build_array(v_uncategorized);
  end if;

  return jsonb_build_object('categories', v_categories);
end;
$$;

create or replace function public.palamare_open_order(
  p_session_token text,
  p_table_id uuid,
  p_guests integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_context jsonb;
  v_restaurant_id uuid;
  v_organization_id uuid;
  v_membership_id uuid;
  v_actor uuid;
  v_order_id uuid;
  v_table_name text;
begin
  v_context := public.operator_session_context(p_session_token);
  v_restaurant_id := (v_context ->> 'restaurant_id')::uuid;
  v_membership_id := (v_context ->> 'membership_id')::uuid;

  select r.organization_id into v_organization_id
  from public.restaurants r
  where r.id = v_restaurant_id;

  if not public._operator_membership_allowed(
    v_membership_id,
    v_organization_id,
    v_restaurant_id
  ) then
    raise exception 'Operatore non abilitato a inviare comande.' using errcode = '28000';
  end if;

  if p_table_id is null then
    raise exception 'Tavolo richiesto.' using errcode = '23514';
  end if;

  select t.name into v_table_name
  from public.restaurant_tables t
  where t.id = p_table_id
    and t.restaurant_id = v_restaurant_id;

  if not found then
    raise exception 'Tavolo non valido o non attivo.' using errcode = '23503';
  end if;

  if exists (
    select 1
    from public.orders o
    where o.table_id = p_table_id
      and o.status = 'open'
  ) then
    raise exception 'Il tavolo ha già un conto aperto.' using errcode = '23514';
  end if;

  select m.user_id into v_actor
  from public.memberships m
  where m.id = v_membership_id;

  v_order_id := public._order_open_core(
    v_restaurant_id,
    p_table_id,
    p_guests,
    '',
    v_actor
  );

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
    v_actor,
    'palmare.order_opened',
    'order',
    v_order_id::text,
    jsonb_build_object(
      'table_id', p_table_id,
      'table_name', v_table_name,
      'guests', p_guests,
      'device_id', v_context ->> 'device_id',
      'membership_id', v_membership_id
    )
  );

  return jsonb_build_object(
    'order_id', v_order_id,
    'table_id', p_table_id,
    'table_name', v_table_name,
    'guests', p_guests
  );
end;
$$;

create or replace function public.palamare_add_order_items(
  p_session_token text,
  p_order_id uuid,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_context jsonb;
  v_restaurant_id uuid;
  v_organization_id uuid;
  v_membership_id uuid;
  v_actor uuid;
  v_order_restaurant uuid;
  v_count integer;
begin
  v_context := public.operator_session_context(p_session_token);
  v_restaurant_id := (v_context ->> 'restaurant_id')::uuid;
  v_membership_id := (v_context ->> 'membership_id')::uuid;

  select r.organization_id into v_organization_id
  from public.restaurants r
  where r.id = v_restaurant_id;

  if not public._operator_membership_allowed(
    v_membership_id,
    v_organization_id,
    v_restaurant_id
  ) then
    raise exception 'Operatore non abilitato a inviare comande.' using errcode = '28000';
  end if;

  select o.restaurant_id into v_order_restaurant
  from public.orders o
  where o.id = p_order_id;

  if v_order_restaurant is null or v_order_restaurant <> v_restaurant_id then
    raise exception 'Conto non trovato.' using errcode = '23503';
  end if;

  v_count := public._order_add_items_core(p_order_id, p_items);

  select m.user_id into v_actor
  from public.memberships m
  where m.id = v_membership_id;

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
    v_actor,
    'palmare.items_added',
    'order',
    p_order_id::text,
    jsonb_build_object(
      'items', v_count,
      'device_id', v_context ->> 'device_id',
      'membership_id', v_membership_id
    )
  );

  return jsonb_build_object(
    'order_id', p_order_id,
    'count', v_count
  );
end;
$$;

revoke execute on function public._order_open_core(uuid, uuid, integer, text, uuid)
  from public, anon, authenticated;
revoke execute on function public._order_add_items_core(uuid, jsonb)
  from public, anon, authenticated;

revoke execute on function public.palamare_menu(text) from public;
revoke execute on function public.palamare_open_order(text, uuid, integer) from public;
revoke execute on function public.palamare_add_order_items(text, uuid, jsonb) from public;

grant execute on function public.palamare_menu(text) to anon, authenticated, service_role;
grant execute on function public.palamare_open_order(text, uuid, integer) to anon, authenticated, service_role;
grant execute on function public.palamare_add_order_items(text, uuid, jsonb) to anon, authenticated, service_role;
