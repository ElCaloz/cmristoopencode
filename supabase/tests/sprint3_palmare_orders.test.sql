begin;

create extension if not exists pgtap with schema extensions;
grant usage on schema extensions to authenticated, anon;
grant execute on all functions in schema extensions to authenticated, anon;
set local search_path = public, extensions, pg_temp;

select plan(58);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data
)
values
  (
    'a1111111-eeee-4eee-8eee-a11111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'palm-owner-a@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Palm Owner A"}'
  ),
  (
    'a2222222-eeee-4eee-8eee-a22222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'palm-waiter-a@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Palm Waiter A"}'
  ),
  (
    'a3333333-eeee-4eee-8eee-a33333333333',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'palm-owner-b@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Palm Owner B"}'
  );

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a1111111-eeee-4eee-8eee-a11111111111', 'role', 'authenticated')::text,
  true
);
select public.create_organization('Palm Org A', 'palm-org-a', 'Ristorante Palm A');

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a3333333-eeee-4eee-8eee-a33333333333', 'role', 'authenticated')::text,
  true
);
select public.create_organization('Palm Org B', 'palm-org-b', 'Ristorante Palm B');

reset role;
select set_config('request.jwt.claims', '{}', true);

select id as org_a from public.organizations where slug = 'palm-org-a' \gset
select id as org_b from public.organizations where slug = 'palm-org-b' \gset
select id as restaurant_a from public.restaurants
  where organization_id = :'org_a' and slug = 'main' \gset
select id as restaurant_b from public.restaurants
  where organization_id = :'org_b' and slug = 'main' \gset

insert into public.memberships (user_id, organization_id, restaurant_id, role_id)
select 'a2222222-eeee-4eee-8eee-a22222222222', :'org_a', :'restaurant_a', r.id
from public.roles r
where r.key = 'waiter';

select id as owner_a_membership from public.memberships
  where user_id = 'a1111111-eeee-4eee-8eee-a11111111111' and organization_id = :'org_a' \gset
select id as waiter_a_membership from public.memberships
  where user_id = 'a2222222-eeee-4eee-8eee-a22222222222' \gset
select id as owner_b_membership from public.memberships
  where user_id = 'a3333333-eeee-4eee-8eee-a33333333333' \gset

insert into public.floor_areas (organization_id, restaurant_id, name)
values (:'org_a', :'restaurant_a', 'Sala Palm');

select id as area_a from public.floor_areas
  where restaurant_id = :'restaurant_a' and name = 'Sala Palm' \gset

insert into public.restaurant_tables (organization_id, restaurant_id, area_id, name, seats)
values
  (:'org_a', :'restaurant_a', :'area_a', 'M1 Palm', 4),
  (:'org_a', :'restaurant_a', :'area_a', 'M2 Palm', 2),
  (:'org_a', :'restaurant_a', null, 'M3 Palm', 6);

insert into public.restaurant_tables (organization_id, restaurant_id, name, seats)
values (:'org_b', :'restaurant_b', 'MB Palm', 4);

select id as table_1 from public.restaurant_tables
  where restaurant_id = :'restaurant_a' and name = 'M1 Palm' \gset
select id as table_2 from public.restaurant_tables
  where restaurant_id = :'restaurant_a' and name = 'M2 Palm' \gset
select id as table_3 from public.restaurant_tables
  where restaurant_id = :'restaurant_a' and name = 'M3 Palm' \gset
select id as table_b from public.restaurant_tables
  where restaurant_id = :'restaurant_b' and name = 'MB Palm' \gset

insert into public.menu_categories (organization_id, restaurant_id, name)
values
  (:'org_a', :'restaurant_a', 'Cucina Palm'),
  (:'org_b', :'restaurant_b', 'Cucina B Palm');

select id as cat_a from public.menu_categories
  where restaurant_id = :'restaurant_a' and name = 'Cucina Palm' \gset
select id as cat_b from public.menu_categories
  where restaurant_id = :'restaurant_b' and name = 'Cucina B Palm' \gset

insert into public.menu_items (organization_id, restaurant_id, category_id, name, price_cents, is_available)
values
  (:'org_a', :'restaurant_a', :'cat_a', 'Lasagna Palm', 950, true),
  (:'org_a', :'restaurant_a', :'cat_a', 'Acqua Palm', 250, true),
  (:'org_a', :'restaurant_a', :'cat_a', 'Esaurito Palm', 500, false),
  (:'org_a', :'restaurant_a', null, 'Caffè Palm', 120, true),
  (:'org_b', :'restaurant_b', :'cat_b', 'Pizza B Palm', 700, true);

select id as item_lasagna from public.menu_items
  where restaurant_id = :'restaurant_a' and name = 'Lasagna Palm' \gset
select id as item_acqua from public.menu_items
  where restaurant_id = :'restaurant_a' and name = 'Acqua Palm' \gset
select id as item_esaurito from public.menu_items
  where restaurant_id = :'restaurant_a' and name = 'Esaurito Palm' \gset
select id as item_other from public.menu_items
  where restaurant_id = :'restaurant_b' and name = 'Pizza B Palm' \gset

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a2222222-eeee-4eee-8eee-a22222222222', 'role', 'authenticated')::text,
  true
);
select public.set_operator_pin(:'waiter_a_membership', '1357');

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a3333333-eeee-4eee-8eee-a33333333333', 'role', 'authenticated')::text,
  true
);
select public.set_operator_pin(:'owner_b_membership', '2468');
select public.create_device(:'restaurant_b', 'Palmare Palm B') ->> 'pairing_code' as code_b \gset

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a1111111-eeee-4eee-8eee-a11111111111', 'role', 'authenticated')::text,
  true
);
select public.create_device(:'restaurant_a', 'Palmare Palm 1') ->> 'pairing_code' as code_1 \gset

reset role;
select set_config('request.jwt.claims', '{}', true);

select id as device_1 from public.devices
  where restaurant_id = :'restaurant_a' and name = 'Palmare Palm 1' \gset

set local role anon;
select set_config('request.jwt.claims', '{}', true);

select public.claim_device_pairing(:'code_1', 'palmare-test') ->> 'token' as token_1 \gset
select public.claim_device_pairing(:'code_b', 'palmare-test') ->> 'token' as token_b \gset

select public.verify_operator_pin(:'token_1', :'waiter_a_membership', '1357') as login_1 \gset
select (:'login_1')::jsonb ->> 'session_token' as session_1 \gset
select public.verify_operator_pin(:'token_b', :'owner_b_membership', '2468') as login_b \gset
select (:'login_b')::jsonb ->> 'session_token' as session_b \gset

-- A. I core privati non sono eseguibili né da anon né da authenticated.
select throws_ok(
  format($$select public._order_open_core(%L, null, 2, '', null)$$, :'restaurant_a'),
  '42501',
  null,
  'anon cannot execute the private order core'
);
select throws_ok(
  $$select public._order_add_items_core(gen_random_uuid(), '[]'::jsonb)$$,
  '42501',
  null,
  'anon cannot execute the private items core'
);

reset role;
select set_config('request.jwt.claims', '{}', true);
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a1111111-eeee-4eee-8eee-a11111111111', 'role', 'authenticated')::text,
  true
);
select throws_ok(
  format($$select public._order_open_core(%L, null, 2, '', null)$$, :'restaurant_a'),
  '42501',
  null,
  'even an owner cannot execute the private order core'
);

reset role;
select set_config('request.jwt.claims', '{}', true);
set local role anon;
select set_config('request.jwt.claims', '{}', true);

-- B. Menu del palmare (sessione operatore, sola lettura).
select throws_ok(
  $$select public.palamare_menu(repeat('c', 64))$$,
  '28000',
  null,
  'an unknown session token cannot read the palmare menu'
);
select throws_ok(
  $$select public.palamare_menu('not-a-token')$$,
  '28000',
  null,
  'a malformed session token cannot read the palmare menu'
);

select public.palamare_menu(:'session_1') as menu_1 \gset

select is(
  jsonb_array_length((:'menu_1')::jsonb -> 'categories'),
  2,
  'the palmare menu lists the category and the uncategorized bucket'
);
select is(
  jsonb_array_length((:'menu_1')::jsonb -> 'categories' -> 0 -> 'items'),
  2,
  'only available items are listed'
);
select ok(
  position('Esaurito Palm' in (:'menu_1')::jsonb::text) = 0,
  'an unavailable item never appears in the palmare menu'
);
select is(
  (
    select (item ->> 'price_cents')::bigint
    from jsonb_array_elements((:'menu_1')::jsonb -> 'categories' -> 0 -> 'items') as item
    where item ->> 'name' = 'Lasagna Palm'
  ),
  950::bigint,
  'the menu reports the price in cents'
);
select is(
  (:'menu_1')::jsonb -> 'categories' -> 1 ->> 'name',
  'Senza categoria',
  'items without a category are grouped at the end'
);
select is(
  jsonb_array_length((:'menu_1')::jsonb -> 'categories' -> 1 -> 'items'),
  1,
  'the uncategorized bucket contains the uncategorized item'
);

-- C. Apertura conto dal palmare.
select public.palamare_open_order(:'session_1', :'table_1', 2) as open_1 \gset

select matches(
  (:'open_1')::jsonb ->> 'order_id',
  '^[0-9a-f-]{36}$',
  'a waiter can open an order from the palmare'
);
select is(
  (:'open_1')::jsonb ->> 'table_name',
  'M1 Palm',
  'the response reports the table'
);
select is(
  (:'open_1')::jsonb ->> 'guests',
  '2',
  'the response reports the guests'
);

select (:'open_1')::jsonb ->> 'order_id' as order_1 \gset

reset role;
select set_config('request.jwt.claims', '{}', true);

select is(
  (select status from public.orders where id = :'order_1'),
  'open',
  'the palmare order is stored as open'
);
select is(
  (select opened_by from public.orders where id = :'order_1'),
  'a2222222-eeee-4eee-8eee-a22222222222'::uuid,
  'the order records the user behind the operator session'
);
select is(
  (select restaurant_id from public.orders where id = :'order_1'),
  :'restaurant_a'::uuid,
  'the order belongs to the device restaurant'
);
select is(
  (
    select count(*)
    from public.audit_logs
    where action = 'palmare.order_opened'
      and entity_id = :'order_1'
  ),
  1::bigint,
  'opening the order is written to the audit log'
);

set local role anon;
select set_config('request.jwt.claims', '{}', true);

select throws_ok(
  format($$select public.palamare_open_order(%L, %L, 2)$$, :'session_1', :'table_1'),
  '23514',
  null,
  'a table with an open order cannot be reopened'
);
select throws_ok(
  format($$select public.palamare_open_order(%L, %L, 0)$$, :'session_1', :'table_2'),
  '23514',
  null,
  'zero guests are rejected'
);
select throws_ok(
  format($$select public.palamare_open_order(%L, %L, 51)$$, :'session_1', :'table_2'),
  '23514',
  null,
  'more than fifty guests are rejected'
);
select throws_ok(
  format($$select public.palamare_open_order(%L, null, 2)$$, :'session_1'),
  '23514',
  null,
  'the table is required from the palmare'
);
select throws_ok(
  format($$select public.palamare_open_order(%L, %L, 2)$$, :'session_1', :'table_b'),
  '23503',
  null,
  'a table of another restaurant cannot be opened'
);

-- D. Invio comande dal palmare.
select public.palamare_add_order_items(
  :'session_1',
  :'order_1',
  format('[{"menu_item_id": "%s", "quantity": 2}, {"menu_item_id": "%s", "quantity": 1}]', :'item_lasagna', :'item_acqua')::jsonb
) as add_1 \gset

select is(
  (:'add_1')::jsonb ->> 'count',
  '2',
  'the palmare can send two lines at once'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

select is(
  (
    select quantity from public.order_items
    where order_id = :'order_1' and menu_item_id = :'item_lasagna'
  ),
  2,
  'the sent quantity is stored'
);
select is(
  (
    select unit_price_cents from public.order_items
    where order_id = :'order_1' and menu_item_id = :'item_lasagna'
  ),
  950::bigint,
  'the price is snapshotted from the database menu'
);
select is(
  (
    select name from public.order_items
    where order_id = :'order_1' and menu_item_id = :'item_acqua'
  ),
  'Acqua Palm',
  'the item name is snapshotted from the database menu'
);

set local role anon;
select set_config('request.jwt.claims', '{}', true);

select lives_ok(
  format(
    $$select public.palamare_add_order_items(%L, %L, format('[{"menu_item_id": "%%s", "quantity": 1}]', %L)::jsonb)$$,
    :'session_1',
    :'order_1',
    :'item_lasagna'
  ),
  'sending the same pending item merges the line'
);
select throws_ok(
  format(
    $$select public.palamare_add_order_items(%L, %L, format('[{"menu_item_id": "%%s", "quantity": 1}]', %L)::jsonb)$$,
    :'session_1',
    :'order_1',
    :'item_esaurito'
  ),
  '23514',
  null,
  'an unavailable item cannot be sent from the palmare'
);
select throws_ok(
  format(
    $$select public.palamare_add_order_items(%L, %L, format('[{"menu_item_id": "%%s", "quantity": 1}]', %L)::jsonb)$$,
    :'session_1',
    :'order_1',
    :'item_other'
  ),
  '23503',
  null,
  'an item of another restaurant cannot be sent'
);
select throws_ok(
  format(
    $$select public.palamare_add_order_items(%L, %L, format('[{"menu_item_id": "%%s", "quantity": 0}]', %L)::jsonb)$$,
    :'session_1',
    :'order_1',
    :'item_acqua'
  ),
  '23514',
  null,
  'a zero quantity is rejected'
);
select throws_ok(
  format(
    $$select public.palamare_add_order_items(%L, %L, format('[{"menu_item_id": "%%s", "quantity": 100}]', %L)::jsonb)$$,
    :'session_1',
    :'order_1',
    :'item_acqua'
  ),
  '23514',
  null,
  'a quantity over ninety-nine is rejected'
);
select throws_ok(
  format($$select public.palamare_add_order_items(%L, %L, '[]'::jsonb)$$, :'session_1', :'order_1'),
  '23514',
  null,
  'an empty item list is rejected'
);
select throws_ok(
  format($$select public.palamare_add_order_items(%L, %L, '"nope"'::jsonb)$$, :'session_1', :'order_1'),
  '23514',
  null,
  'a non array payload is rejected'
);
select throws_ok(
  format(
    $$select public.palamare_add_order_items(%L, %L, '[{"menu_item_id": "00000000-0000-4000-8000-000000000000"}]'::jsonb)$$,
    :'session_1',
    :'order_1'
  ),
  '23503',
  null,
  'an unknown menu item is rejected'
);
select throws_ok(
  format(
    $$select public.palamare_add_order_items(%L, '00000000-0000-4000-8000-000000000000'::uuid, '[]'::jsonb)$$,
    :'session_1'
  ),
  '23503',
  null,
  'an unknown order is rejected'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

select is(
  (select quantity from public.order_items where order_id = :'order_1' and menu_item_id = :'item_lasagna'),
  3,
  'the merged line quantity is summed'
);
select is(
  (
    select count(*)
    from public.audit_logs
    where action = 'palmare.items_added'
      and entity_id = :'order_1'
  ),
  2::bigint,
  'successful sends are written to the audit log'
);

-- E. Isolamento tra tenant: la sessione di B non tocca il ristorante A.
set local role anon;
select set_config('request.jwt.claims', '{}', true);

select matches(
  :'session_b'::text,
  '^[0-9a-f]{64}$',
  'the second tenant login returns a session token'
);
select throws_ok(
  format($$select public.palamare_open_order(%L, %L, 2)$$, :'session_b', :'table_1'),
  '23503',
  null,
  'a session of another restaurant cannot open this table'
);
select throws_ok(
  format($$select public.palamare_add_order_items(%L, %L, '[]'::jsonb)$$, :'session_b', :'order_1'),
  '23503',
  null,
  'a session of another restaurant cannot add items to this order'
);

select public.palamare_menu(:'session_b') as menu_b \gset
select is(
  jsonb_array_length((:'menu_b')::jsonb -> 'categories'),
  1,
  'the palmare menu is scoped to the session restaurant'
);

-- F. Difesa in profondità: il membro sospeso perde subito la scrittura.
reset role;
select set_config('request.jwt.claims', '{}', true);

update public.memberships
set status = 'suspended'
where id = :'waiter_a_membership';

set local role anon;
select set_config('request.jwt.claims', '{}', true);

select throws_ok(
  format(
    $$select public.palamare_add_order_items(%L, %L, format('[{"menu_item_id": "%%s", "quantity": 1}]', %L)::jsonb)$$,
    :'session_1',
    :'order_1',
    :'item_acqua'
  ),
  '28000',
  null,
  'a suspended member cannot send items even with a valid session'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

update public.memberships
set status = 'active'
where id = :'waiter_a_membership';

set local role anon;
select set_config('request.jwt.claims', '{}', true);

select lives_ok(
  format(
    $$select public.palamare_add_order_items(%L, %L, format('[{"menu_item_id": "%%s", "quantity": 1}]', %L)::jsonb)$$,
    :'session_1',
    :'order_1',
    :'item_acqua'
  ),
  'the reactivated member can send items again'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

select is(
  (
    select count(*)
    from public.audit_logs
    where action = 'palmare.items_added'
      and entity_id = :'order_1'
  ),
  3::bigint,
  'the refused attempt left no audit trace while the valid one did'
);

-- G. Le RPC del POS condividono lo stesso core.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a1111111-eeee-4eee-8eee-a11111111111', 'role', 'authenticated')::text,
  true
);

select public.open_order(:'restaurant_a', :'table_2', 2, '') as order_2 \gset

reset role;
select set_config('request.jwt.claims', '{}', true);

select ok(
  :'order_2' is not null,
  'the POS still opens orders through the shared core'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a1111111-eeee-4eee-8eee-a11111111111', 'role', 'authenticated')::text,
  true
);

select is(
  public.add_order_items(
    :'order_2',
    format('[{"menu_item_id": "%s", "quantity": 1}]', :'item_lasagna')::jsonb
  ),
  1,
  'the POS still adds items through the shared core'
);

reset role;
select set_config('request.jwt.claims', '{}', true);
set local role anon;
select set_config('request.jwt.claims', '{}', true);

select is(
  ((public.palamare_add_order_items(
    :'session_1',
    :'order_2',
    format('[{"menu_item_id": "%s", "quantity": 1}]', :'item_lasagna')::jsonb
  )) ->> 'count')::integer,
  1,
  'the palmare can add to an order opened by the POS'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

select is(
  (select quantity from public.order_items where order_id = :'order_2' and menu_item_id = :'item_lasagna'),
  2,
  'the shared pending line is merged across POS and palmare'
);

-- H. Conto chiuso: nessuna scrittura dal palmare.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a1111111-eeee-4eee-8eee-a11111111111', 'role', 'authenticated')::text,
  true
);

select lives_ok(
  format($$select public.void_order(%L)$$, :'order_1'),
  'the POS can close the order opened from the palmare'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

select is(
  (select status from public.orders where id = :'order_1'),
  'cancelled',
  'the closed order is cancelled'
);

set local role anon;
select set_config('request.jwt.claims', '{}', true);

select throws_ok(
  format(
    $$select public.palamare_add_order_items(%L, %L, format('[{"menu_item_id": "%%s", "quantity": 1}]', %L)::jsonb)$$,
    :'session_1',
    :'order_1',
    :'item_acqua'
  ),
  '23514',
  null,
  'items cannot be sent to a closed order'
);

-- I. Apertura con coperti nulli (tavolo senza coperti) e conteggio finale.
select lives_ok(
  format($$select public.palamare_open_order(%L, %L, null)$$, :'session_1', :'table_3'),
  'the palmare can open an order without guests'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

select is(
  (
    select guests from public.orders
    where table_id = :'table_3' and status = 'open'
  ),
  null::integer,
  'the guests remain null when not provided'
);
select is(
  (
    select count(*) from public.orders
    where restaurant_id = :'restaurant_a' and status = 'open'
  ),
  2::bigint,
  'the open orders of the restaurant are the expected ones'
);

-- J. Dispositivo bloccato: la sessione operatore si chiude.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a1111111-eeee-4eee-8eee-a11111111111', 'role', 'authenticated')::text,
  true
);

select lives_ok(
  format($$select public.set_device_status(%L, 'block')$$, :'device_1'),
  'the owner can block the device'
);

reset role;
select set_config('request.jwt.claims', '{}', true);
set local role anon;
select set_config('request.jwt.claims', '{}', true);

select throws_ok(
  format($$select public.palamare_open_order(%L, %L, 2)$$, :'session_1', :'table_2'),
  '28000',
  null,
  'a blocked device can no longer order from the palmare'
);
select throws_ok(
  format($$select public.palamare_menu(%L)$$, :'session_1'),
  '28000',
  null,
  'a blocked device can no longer read the palmare menu'
);

select * from finish();

rollback;
