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
    '11111111-eeee-4eee-8eee-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'pos-owner-a@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Pos Owner A"}'
  ),
  (
    '22222222-eeee-4eee-8eee-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'pos-owner-b@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Pos Owner B"}'
  ),
  (
    '33333333-eeee-4eee-8eee-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'pos-waiter-a@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Pos Waiter A"}'
  ),
  (
    '44444444-eeee-4eee-8eee-444444444444',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'pos-platform@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Pos Platform"}'
  ),
  (
    '55555555-eeee-4eee-8eee-555555555555',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'pos-kitchen-a@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Pos Kitchen A"}'
  );

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-eeee-4eee-8eee-111111111111', 'role', 'authenticated')::text,
  true
);
select lives_ok(
  $$select public.create_organization('Pos Org A', 'pos-org-a', 'Ristorante Pos A')$$,
  'owner A can create an organization'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '22222222-eeee-4eee-8eee-222222222222', 'role', 'authenticated')::text,
  true
);
select lives_ok(
  $$select public.create_organization('Pos Org B', 'pos-org-b', 'Ristorante Pos B')$$,
  'owner B can create an organization'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

select id as org_a from public.organizations where slug = 'pos-org-a' \gset
select id as org_b from public.organizations where slug = 'pos-org-b' \gset
select id as restaurant_a from public.restaurants where organization_id = :'org_a' and slug = 'main' \gset
select id as restaurant_b from public.restaurants where organization_id = :'org_b' and slug = 'main' \gset

insert into public.memberships (user_id, organization_id, restaurant_id, role_id)
select '33333333-eeee-4eee-8eee-333333333333', :'org_a', :'restaurant_a', r.id
from public.roles r
where r.key = 'waiter';

insert into public.memberships (user_id, organization_id, restaurant_id, role_id)
select '55555555-eeee-4eee-8eee-555555555555', :'org_a', :'restaurant_a', r.id
from public.roles r
where r.key = 'kitchen';

insert into public.platform_admins (user_id)
values ('44444444-eeee-4eee-8eee-444444444444');

insert into public.floor_areas (organization_id, restaurant_id, name)
values (:'org_a', :'restaurant_a', 'Sala POS'), (:'org_b', :'restaurant_b', 'Sala POS B');

insert into public.restaurant_tables (organization_id, restaurant_id, area_id, name, seats)
select :'org_a', :'restaurant_a', a.id, t.name, t.seats
from public.floor_areas a
cross join (values ('T1', 4), ('T2', 2), ('T3', 6), ('T4', 4)) as t(name, seats)
where a.restaurant_id = :'restaurant_a';

update public.restaurant_tables
set is_active = false
where restaurant_id = :'restaurant_a' and name = 'T4';

insert into public.restaurant_tables (organization_id, restaurant_id, name, seats)
values (:'org_b', :'restaurant_b', 'TB', 2);

insert into public.menu_categories (organization_id, restaurant_id, name)
values (:'org_a', :'restaurant_a', 'POS'), (:'org_b', :'restaurant_b', 'POS');

insert into public.menu_items (organization_id, restaurant_id, category_id, name, price_cents, is_available)
select :'org_a', :'restaurant_a', c.id, 'Bruschetta POS', 650, true
from public.menu_categories c
where c.restaurant_id = :'restaurant_a';

insert into public.menu_items (organization_id, restaurant_id, category_id, name, price_cents, is_available)
select :'org_a', :'restaurant_a', c.id, 'Tagliere POS', 400, true
from public.menu_categories c
where c.restaurant_id = :'restaurant_a';

insert into public.menu_items (organization_id, restaurant_id, category_id, name, price_cents, is_available)
select :'org_a', :'restaurant_a', c.id, 'Esaurito POS', 100, false
from public.menu_categories c
where c.restaurant_id = :'restaurant_a';

insert into public.menu_items (organization_id, restaurant_id, category_id, name, price_cents, is_available)
select :'org_b', :'restaurant_b', c.id, 'Piatto B', 500, true
from public.menu_categories c
where c.restaurant_id = :'restaurant_b';

select id as table_1 from public.restaurant_tables where restaurant_id = :'restaurant_a' and name = 'T1' \gset
select id as table_2 from public.restaurant_tables where restaurant_id = :'restaurant_a' and name = 'T2' \gset
select id as table_3 from public.restaurant_tables where restaurant_id = :'restaurant_a' and name = 'T3' \gset
select id as table_4 from public.restaurant_tables where restaurant_id = :'restaurant_a' and name = 'T4' \gset
select id as table_b from public.restaurant_tables where restaurant_id = :'restaurant_b' \gset
select id as item_1 from public.menu_items where restaurant_id = :'restaurant_a' and name = 'Bruschetta POS' \gset
select id as item_2 from public.menu_items where restaurant_id = :'restaurant_a' and name = 'Tagliere POS' \gset
select id as item_3 from public.menu_items where restaurant_id = :'restaurant_a' and name = 'Esaurito POS' \gset
select id as item_b from public.menu_items where restaurant_id = :'restaurant_b' \gset

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-eeee-4eee-8eee-111111111111', 'role', 'authenticated')::text,
  true
);

select lives_ok(
  format(
    $$select public.open_order(%L, %L, 2, 'Compleanno')$$,
    :'restaurant_a',
    :'table_1'
  ),
  'owner A can open an order on a free table'
);

select throws_ok(
  format($$select public.open_order(%L, %L, 0, '')$$, :'restaurant_a', :'table_1'),
  '23514',
  null,
  'an order with zero guests is rejected'
);

select throws_ok(
  format($$select public.open_order(%L, %L, 2, '')$$, :'restaurant_a', :'table_1'),
  '23505',
  null,
  'a table can have only one open order'
);

select throws_ok(
  format($$select public.open_order(%L, %L, 2, '')$$, :'restaurant_a', :'table_4'),
  '23503',
  null,
  'an order cannot be opened on an inactive table'
);

select throws_ok(
  format($$select public.open_order(%L, %L, 2, '')$$, :'restaurant_a', :'table_b'),
  '23503',
  null,
  'an order cannot use a table of another restaurant'
);

select id as order_1 from public.orders
where restaurant_id = :'restaurant_a' and status = 'open' \gset

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '22222222-eeee-4eee-8eee-222222222222', 'role', 'authenticated')::text,
  true
);
select throws_ok(
  format($$select public.open_order(%L, %L, 2, '')$$, :'restaurant_a', :'table_2'),
  '42501',
  null,
  'owner B cannot open an order for restaurant A'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '55555555-eeee-4eee-8eee-555555555555', 'role', 'authenticated')::text,
  true
);
select throws_ok(
  format($$select public.open_order(%L, %L, 2, '')$$, :'restaurant_a', :'table_2'),
  '42501',
  null,
  'a kitchen user without pos.operate cannot open an order'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-eeee-4eee-8eee-111111111111', 'role', 'authenticated')::text,
  true
);

select lives_ok(
  format(
    $$select public.add_order_items(%L, %L::jsonb)$$,
    :'order_1',
    format('[{"menu_item_id": "%s", "quantity": 2}]', :'item_1')
  ),
  'owner A can add items to an open order'
);

select is(
  (select unit_price_cents from public.order_items where order_id = :'order_1'),
  650::bigint,
  'the item price is snapshotted from the database menu'
);
select is(
  (select name from public.order_items where order_id = :'order_1'),
  'Bruschetta POS',
  'the item name is snapshotted from the database menu'
);

select lives_ok(
  format(
    $$select public.add_order_items(%L, %L::jsonb)$$,
    :'order_1',
    format('[{"menu_item_id": "%s", "quantity": 1}]', :'item_1')
  ),
  'adding the same pending item merges the line'
);
select is(
  (select quantity from public.order_items where order_id = :'order_1'),
  3,
  'the merged line quantity is summed'
);

select throws_ok(
  format(
    $$select public.add_order_items(%L, %L::jsonb)$$,
    :'order_1',
    format('[{"menu_item_id": "%s", "quantity": 1}]', :'item_3')
  ),
  '23514',
  null,
  'an unavailable menu item cannot be added'
);

select throws_ok(
  format(
    $$select public.add_order_items(%L, %L::jsonb)$$,
    :'order_1',
    format('[{"menu_item_id": "%s", "quantity": 1}]', :'item_b')
  ),
  '23503',
  null,
  'an item of another restaurant cannot be added'
);

select throws_ok(
  format(
    $$select public.add_order_items(%L, %L::jsonb)$$,
    :'order_1',
    format('[{"menu_item_id": "%s", "quantity": 0}]', :'item_2')
  ),
  '23514',
  null,
  'a zero quantity is rejected'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '22222222-eeee-4eee-8eee-222222222222', 'role', 'authenticated')::text,
  true
);
select throws_ok(
  format(
    $$select public.add_order_items(%L, %L::jsonb)$$,
    :'order_1',
    format('[{"menu_item_id": "%s", "quantity": 1}]', :'item_b')
  ),
  '42501',
  null,
  'owner B cannot add items to an order of restaurant A'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-eeee-4eee-8eee-111111111111', 'role', 'authenticated')::text,
  true
);

select lives_ok(
  format(
    $$select public.add_order_items(%L, %L::jsonb)$$,
    :'order_1',
    format('[{"menu_item_id": "%s", "quantity": 1}]', :'item_2')
  ),
  'owner A can add a second line'
);

select id as line_2 from public.order_items
where order_id = :'order_1' and name = 'Tagliere POS' \gset

select lives_ok(
  format($$select public.cancel_order_item(%L)$$, :'line_2'),
  'owner A can cancel an order line'
);
select lives_ok(
  format($$select public.cancel_order_item(%L)$$, :'line_2'),
  'cancelling an already cancelled line is idempotent'
);
select is(
  (select status from public.order_items where id = :'line_2'),
  'cancelled',
  'the cancelled line is marked as cancelled'
);

select public.pay_order(:'order_1', 'cash', 1000, 0, 'pay-order1-1') as pay_partial \gset
select is(
  (:'pay_partial'::jsonb) ->> 'status',
  'open',
  'a partial payment keeps the order open'
);
select is(
  (:'pay_partial'::jsonb) ->> 'total_cents',
  '1950',
  'the total excludes cancelled lines'
);
select is(
  (:'pay_partial'::jsonb) ->> 'paid_cents',
  '1000',
  'the partial payment is recorded'
);

select is(
  (public.pay_order(:'order_1', 'cash', 1000, 0, 'pay-order1-1') ->> 'replayed'),
  'true',
  'replaying the same idempotency key does not charge twice'
);

select throws_ok(
  format(
    $$select public.pay_order(%L, 'card', 1000, 0, 'pay-order1-2')$$,
    :'order_1'
  ),
  '23514',
  null,
  'an amount above the remaining total is rejected'
);

select throws_ok(
  format(
    $$select public.pay_order(%L, 'bitcoin', 950, 0, 'pay-order1-bad')$$,
    :'order_1'
  ),
  '23514',
  null,
  'an unsupported payment method is rejected'
);

select public.pay_order(:'order_1', 'card', 950, 200, 'pay-order1-3') as pay_final \gset
select is(
  (:'pay_final'::jsonb) ->> 'status',
  'paid',
  'paying the remaining total closes the order'
);

select is(
  (select status from public.orders where id = :'order_1'),
  'paid',
  'the stored order status becomes paid'
);
select ok(
  (select closed_at from public.orders where id = :'order_1') is not null,
  'the paid order gets a closing timestamp'
);

select throws_ok(
  format(
    $$select public.add_order_items(%L, %L::jsonb)$$,
    :'order_1',
    format('[{"menu_item_id": "%s", "quantity": 1}]', :'item_1')
  ),
  '23514',
  null,
  'items cannot be added to a paid order'
);

select throws_ok(
  format($$select public.void_order(%L)$$, :'order_1'),
  '23514',
  null,
  'a paid order cannot be voided'
);

select lives_ok(
  format($$select public.open_order(%L, %L, 4, '')$$, :'restaurant_a', :'table_2'),
  'owner A can open a second order on another table'
);
select id as order_2 from public.orders
where restaurant_id = :'restaurant_a' and table_id = :'table_2' and status = 'open' \gset
select lives_ok(
  format(
    $$select public.add_order_items(%L, %L::jsonb)$$,
    :'order_2',
    format('[{"menu_item_id": "%s", "quantity": 1}]', :'item_1')
  ),
  'owner A can add items to the second order'
);
select public.pay_order(:'order_2', 'cash', 100, 0, 'pay-order2-1');
select throws_ok(
  format($$select public.void_order(%L)$$, :'order_2'),
  '23514',
  null,
  'an order with registered payments cannot be voided'
);

select lives_ok(
  format($$select public.open_order(%L, %L, 2, '')$$, :'restaurant_a', :'table_3'),
  'owner A can open an order to void'
);
select id as order_3 from public.orders
where restaurant_id = :'restaurant_a' and table_id = :'table_3' and status = 'open' \gset
select lives_ok(
  format(
    $$select public.add_order_items(%L, %L::jsonb)$$,
    :'order_3',
    format('[{"menu_item_id": "%s", "quantity": 1}]', :'item_2')
  ),
  'owner A can add items to the order to void'
);
select lives_ok(
  format($$select public.void_order(%L)$$, :'order_3'),
  'owner A can void an order without payments'
);
select is(
  (select status from public.orders where id = :'order_3'),
  'cancelled',
  'the voided order is marked as cancelled'
);
select ok(
  (select closed_at from public.orders where id = :'order_3') is not null,
  'the voided order gets a closing timestamp'
);

select lives_ok(
  format($$select public.open_order(%L, %L, 2, '')$$, :'restaurant_a', :'table_1'),
  'the paid table is free for a new order'
);
select id as order_4 from public.orders
where restaurant_id = :'restaurant_a' and table_id = :'table_1' and status = 'open' \gset
select throws_ok(
  format(
    $$select public.pay_order(%L, 'cash', 100, 0, 'pay-order4-empty')$$,
    :'order_4'
  ),
  '23514',
  null,
  'an empty order cannot be paid'
);
select lives_ok(
  format($$select public.void_order(%L)$$, :'order_4'),
  'the empty order can be voided'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '22222222-eeee-4eee-8eee-222222222222', 'role', 'authenticated')::text,
  true
);
select is(
  (select count(*) from public.orders where restaurant_id = :'restaurant_a'),
  0::bigint,
  'owner B cannot read orders of restaurant A'
);
select is(
  (select count(*) from public.order_items where restaurant_id = :'restaurant_a'),
  0::bigint,
  'owner B cannot read order items of restaurant A'
);
select is(
  (select count(*) from public.payments where restaurant_id = :'restaurant_a'),
  0::bigint,
  'owner B cannot read payments of restaurant A'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '33333333-eeee-4eee-8eee-333333333333', 'role', 'authenticated')::text,
  true
);
select ok(
  (select count(*) from public.orders) > 0,
  'the waiter can read the orders of its restaurant'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '55555555-eeee-4eee-8eee-555555555555', 'role', 'authenticated')::text,
  true
);
select throws_ok(
  format(
    $$select public.pay_order(%L, 'cash', 50, 0, 'pay-kitchen-1')$$,
    :'order_2'
  ),
  '42501',
  null,
  'a kitchen user cannot take payments'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-eeee-4eee-8eee-111111111111', 'role', 'authenticated')::text,
  true
);
select throws_ok(
  format(
    $$insert into public.payments (organization_id, restaurant_id, order_id, method, amount_cents, idempotency_key, created_by)
      values (%L, %L, %L, 'cash', 1, 'direct-pay-01', %L)$$,
    :'org_a',
    :'restaurant_a',
    :'order_2',
    '11111111-eeee-4eee-8eee-111111111111'
  ),
  '42501',
  null,
  'payments cannot be inserted directly, only through pay_order'
);
select throws_ok(
  format(
    $$insert into public.order_items (organization_id, restaurant_id, order_id, name, unit_price_cents, quantity)
      values (%L, %L, %L, 'Riga diretta', 100, 1)$$,
    :'org_a',
    :'restaurant_a',
    :'order_2'
  ),
  '42501',
  null,
  'order items cannot be inserted directly, only through add_order_items'
);

update public.orders set status = 'paid' where id = :'order_2';
select is(
  (select status from public.orders where id = :'order_2'),
  'open',
  'direct order updates have no effect'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '44444444-eeee-4eee-8eee-444444444444', 'role', 'authenticated')::text,
  true
);
select is(
  (select count(*) from public.orders),
  4::bigint,
  'the platform admin sees orders of every tenant'
);
select is(
  (select count(*) from public.payments),
  3::bigint,
  'the platform admin sees payments of every tenant'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

set local role anon;
select set_config('request.jwt.claims', '{}', true);
select is(
  (select count(*) from public.orders),
  0::bigint,
  'anonymous users cannot read orders'
);
select throws_ok(
  format($$select public.open_order(%L, %L, 2, '')$$, :'restaurant_a', :'table_3'),
  '42501',
  null,
  'anonymous users cannot open orders'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-eeee-4eee-8eee-111111111111', 'role', 'authenticated')::text,
  true
);
select throws_ok(
  format(
    $$select public.pay_order(%L, 'cash', 50, 0, 'pay-order1-1')$$,
    :'order_2'
  ),
  '23505',
  null,
  'an idempotency key of another order cannot be reused'
);
select throws_ok(
  format(
    $$select public.open_order(%L, %L, 2, repeat('x', 301))$$,
    :'restaurant_a',
    :'table_3'
  ),
  '23514',
  null,
  'an overlong order note is rejected'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

select * from finish();
rollback;
