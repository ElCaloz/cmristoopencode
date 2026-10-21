begin;

create extension if not exists pgtap with schema extensions;
grant usage on schema extensions to authenticated, anon;
grant execute on all functions in schema extensions to authenticated, anon;
set local search_path = public, extensions, pg_temp;

select plan(41);

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
    'a1111111-eeee-4eee-8eee-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'kds-owner-a@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Kds Owner A"}'
  ),
  (
    'a2222222-eeee-4eee-8eee-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'kds-owner-b@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Kds Owner B"}'
  ),
  (
    'a3333333-eeee-4eee-8eee-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'kds-waiter-a@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Kds Waiter A"}'
  ),
  (
    'a4444444-eeee-4eee-8eee-444444444444',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'kds-kitchen-a@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Kds Kitchen A"}'
  ),
  (
    'a5555555-eeee-4eee-8eee-555555555555',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'kds-host-a@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Kds Host A"}'
  ),
  (
    'a6666666-eeee-4eee-8eee-666666666666',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'kds-platform@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Kds Platform"}'
  );

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a1111111-eeee-4eee-8eee-111111111111', 'role', 'authenticated')::text,
  true
);
select lives_ok(
  $$select public.create_organization('Kds Org A', 'kds-org-a', 'Ristorante Kds A')$$,
  'owner A can create an organization'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a2222222-eeee-4eee-8eee-222222222222', 'role', 'authenticated')::text,
  true
);
select lives_ok(
  $$select public.create_organization('Kds Org B', 'kds-org-b', 'Ristorante Kds B')$$,
  'owner B can create an organization'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

select id as org_a from public.organizations where slug = 'kds-org-a' \gset
select id as org_b from public.organizations where slug = 'kds-org-b' \gset
select id as restaurant_a from public.restaurants where organization_id = :'org_a' and slug = 'main' \gset
select id as restaurant_b from public.restaurants where organization_id = :'org_b' and slug = 'main' \gset

insert into public.memberships (user_id, organization_id, restaurant_id, role_id)
select 'a3333333-eeee-4eee-8eee-333333333333', :'org_a', :'restaurant_a', r.id
from public.roles r
where r.key = 'waiter';

insert into public.memberships (user_id, organization_id, restaurant_id, role_id)
select 'a4444444-eeee-4eee-8eee-444444444444', :'org_a', :'restaurant_a', r.id
from public.roles r
where r.key = 'kitchen';

insert into public.memberships (user_id, organization_id, restaurant_id, role_id)
select 'a5555555-eeee-4eee-8eee-555555555555', :'org_a', :'restaurant_a', r.id
from public.roles r
where r.key = 'host';

insert into public.platform_admins (user_id)
values ('a6666666-eeee-4eee-8eee-666666666666');

insert into public.floor_areas (organization_id, restaurant_id, name)
values (:'org_a', :'restaurant_a', 'Sala KDS'), (:'org_b', :'restaurant_b', 'Sala KDS B');

insert into public.restaurant_tables (organization_id, restaurant_id, area_id, name, seats)
select :'org_a', :'restaurant_a', a.id, t.name, t.seats
from public.floor_areas a
cross join (values ('T1', 4), ('T2', 2)) as t(name, seats)
where a.restaurant_id = :'restaurant_a';

insert into public.restaurant_tables (organization_id, restaurant_id, name, seats)
values (:'org_b', :'restaurant_b', 'TB', 2);

insert into public.menu_categories (organization_id, restaurant_id, name)
values (:'org_a', :'restaurant_a', 'KDS'), (:'org_b', :'restaurant_b', 'KDS');

insert into public.menu_items (organization_id, restaurant_id, category_id, name, price_cents, is_available)
select :'org_a', :'restaurant_a', c.id, 'Bruschetta KDS', 650, true
from public.menu_categories c
where c.restaurant_id = :'restaurant_a';

insert into public.menu_items (organization_id, restaurant_id, category_id, name, price_cents, is_available)
select :'org_a', :'restaurant_a', c.id, 'Tagliere KDS', 400, true
from public.menu_categories c
where c.restaurant_id = :'restaurant_a';

insert into public.menu_items (organization_id, restaurant_id, category_id, name, price_cents, is_available)
select :'org_b', :'restaurant_b', c.id, 'Piatto KDS B', 500, true
from public.menu_categories c
where c.restaurant_id = :'restaurant_b';

select id as table_1 from public.restaurant_tables where restaurant_id = :'restaurant_a' and name = 'T1' \gset
select id as table_2 from public.restaurant_tables where restaurant_id = :'restaurant_a' and name = 'T2' \gset
select id as table_b from public.restaurant_tables where restaurant_id = :'restaurant_b' \gset
select id as item_1 from public.menu_items where restaurant_id = :'restaurant_a' and name = 'Bruschetta KDS' \gset
select id as item_2 from public.menu_items where restaurant_id = :'restaurant_a' and name = 'Tagliere KDS' \gset
select id as item_b from public.menu_items where restaurant_id = :'restaurant_b' \gset

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a3333333-eeee-4eee-8eee-333333333333', 'role', 'authenticated')::text,
  true
);
select lives_ok(
  format($$select public.open_order(%L, %L, 2, 'KDS conto 1')$$, :'restaurant_a', :'table_1'),
  'the waiter can open an order'
);
select lives_ok(
  format(
    $$select public.add_order_items(%L, %L::jsonb)$$,
    (select id from public.orders where restaurant_id = :'restaurant_a' and status = 'open'),
    format(
      '[{"menu_item_id": "%s", "quantity": 2}, {"menu_item_id": "%s", "quantity": 1, "note": "senza cipolla"}]',
      :'item_1',
      :'item_1'
    )
  ),
  'the waiter can add two lines to the order'
);

select id as order_1 from public.orders
where restaurant_id = :'restaurant_a' and table_id = :'table_1' and status = 'open' \gset
select id as row_1 from public.order_items
where order_id = :'order_1' and note = '' \gset
select id as row_2 from public.order_items
where order_id = :'order_1' and note = 'senza cipolla' \gset

select lives_ok(
  format($$select public.set_order_item_status(%L, 'preparing')$$, :'row_1'),
  'a waiter can move a pending line to preparing'
);
select is(
  (select status from public.order_items where id = :'row_1'),
  'preparing',
  'the line status is preparing'
);
select is(
  public.set_order_item_status(:'row_1', 'preparing')->>'changed',
  'false',
  'repeating the same status is an idempotent no-op'
);
select is(
  (select status from public.order_items where id = :'row_1'),
  'preparing',
  'the no-op call leaves the status unchanged'
);
select throws_ok(
  format($$select public.set_order_item_status(%L, 'ready')$$, :'row_2'),
  '23514',
  null,
  'skipping the preparing step is rejected'
);
select throws_ok(
  format($$select public.set_order_item_status(%L, 'served')$$, :'row_2'),
  '23514',
  null,
  'jumping from pending to served is rejected'
);
select is(
  public.set_order_item_status(:'row_2', 'preparing')->>'changed',
  'true',
  'a forward transition reports changed=true'
);
select is(
  (select status from public.order_items where id = :'row_2'),
  'preparing',
  'the second line is preparing too'
);
select throws_ok(
  format($$select public.set_order_item_status(%L, 'pending')$$, :'row_2'),
  '23514',
  null,
  'moving a line backwards is rejected'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a4444444-eeee-4eee-8eee-444444444444', 'role', 'authenticated')::text,
  true
);
select lives_ok(
  format($$select public.set_order_item_status(%L, 'ready')$$, :'row_2'),
  'a kitchen user can mark a line as ready'
);
select is(
  (select status from public.order_items where id = :'row_2'),
  'ready',
  'the line status is ready'
);
select lives_ok(
  format($$select public.set_order_item_status(%L, 'ready')$$, :'row_1'),
  'the kitchen can finish the first line too'
);
select is(
  (select status from public.order_items where id = :'row_1'),
  'ready',
  'the first line is ready'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a3333333-eeee-4eee-8eee-333333333333', 'role', 'authenticated')::text,
  true
);
select lives_ok(
  format($$select public.set_order_item_status(%L, 'served')$$, :'row_1'),
  'the waiter can mark a ready line as served'
);
select is(
  (select status from public.order_items where id = :'row_1'),
  'served',
  'the line status is served'
);
select is(
  public.set_order_item_status(:'row_1', 'served')->>'changed',
  'false',
  'replaying the served transition is an idempotent no-op'
);
select throws_ok(
  format($$select public.set_order_item_status(%L, 'ready')$$, :'row_1'),
  '23514',
  null,
  'a served line cannot be reopened'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a1111111-eeee-4eee-8eee-111111111111', 'role', 'authenticated')::text,
  true
);
select throws_ok(
  $$select public.set_order_item_status('00000000-0000-4000-8000-000000000000', 'preparing')$$,
  'P0002',
  null,
  'an unknown line is rejected'
);
select throws_ok(
  format($$select public.set_order_item_status(%L, 'esploso')$$, :'row_2'),
  '22023',
  null,
  'an invalid status value is rejected'
);

update public.order_items set status = 'served' where id = :'row_2';
select is(
  (select status from public.order_items where id = :'row_2'),
  'ready',
  'direct line updates have no effect'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a5555555-eeee-4eee-8eee-555555555555', 'role', 'authenticated')::text,
  true
);
select throws_ok(
  format($$select public.set_order_item_status(%L, 'served')$$, :'row_2'),
  '42501',
  null,
  'a host without kitchen or pos permissions cannot update lines'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a2222222-eeee-4eee-8eee-222222222222', 'role', 'authenticated')::text,
  true
);
select lives_ok(
  format($$select public.open_order(%L, %L, 2, '')$$, :'restaurant_b', :'table_b'),
  'owner B can open an order in its restaurant'
);
select id as order_b from public.orders
where restaurant_id = :'restaurant_b' and status = 'open' \gset
select lives_ok(
  format(
    $$select public.add_order_items(%L, %L::jsonb)$$,
    :'order_b',
    format('[{"menu_item_id": "%s", "quantity": 1}]', :'item_b')
  ),
  'owner B can add a line in its restaurant'
);
select id as row_b from public.order_items where order_id = :'order_b' \gset

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a4444444-eeee-4eee-8eee-444444444444', 'role', 'authenticated')::text,
  true
);
select throws_ok(
  format($$select public.set_order_item_status(%L, 'preparing')$$, :'row_b'),
  '42501',
  null,
  'the kitchen of tenant A cannot touch lines of tenant B'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a2222222-eeee-4eee-8eee-222222222222', 'role', 'authenticated')::text,
  true
);
select throws_ok(
  format($$select public.set_order_item_status(%L, 'served')$$, :'row_2'),
  '42501',
  null,
  'owner B cannot update lines of restaurant A'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a3333333-eeee-4eee-8eee-333333333333', 'role', 'authenticated')::text,
  true
);
select lives_ok(
  format($$select public.open_order(%L, %L, 2, 'KDS conto 2')$$, :'restaurant_a', :'table_2'),
  'the waiter opens a second order'
);
select id as order_2 from public.orders
where restaurant_id = :'restaurant_a' and table_id = :'table_2' and status = 'open' \gset
select lives_ok(
  format(
    $$select public.add_order_items(%L, %L::jsonb)$$,
    :'order_2',
    format('[{"menu_item_id": "%s", "quantity": 1}]', :'item_2')
  ),
  'the waiter adds a line to the second order'
);
select id as row_3 from public.order_items where order_id = :'order_2' \gset
select lives_ok(
  format($$select public.pay_order(%L, 'cash', 400, 0, 'kds-pay-2')$$, :'order_2'),
  'the waiter takes the payment of the second order'
);
select throws_ok(
  format($$select public.set_order_item_status(%L, 'preparing')$$, :'row_3'),
  '23514',
  null,
  'lines of a closed order cannot be updated'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a2222222-eeee-4eee-8eee-222222222222', 'role', 'authenticated')::text,
  true
);
select is(
  (select count(*) from public.order_items where restaurant_id = :'restaurant_a'),
  0::bigint,
  'owner B cannot read order lines of restaurant A'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a3333333-eeee-4eee-8eee-333333333333', 'role', 'authenticated')::text,
  true
);
select ok(
  (select count(*) from public.order_items) > 0,
  'the waiter can read the order lines of its restaurant'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a4444444-eeee-4eee-8eee-444444444444', 'role', 'authenticated')::text,
  true
);
select ok(
  (select count(*) from public.order_items) > 0,
  'the kitchen can read the order lines of its restaurant'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a6666666-eeee-4eee-8eee-666666666666', 'role', 'authenticated')::text,
  true
);
select is(
  (select count(*) from public.order_items),
  4::bigint,
  'the platform admin sees order lines of every tenant'
);
select throws_ok(
  format($$select public.set_order_item_status(%L, 'preparing')$$, :'row_2'),
  '42501',
  null,
  'the platform admin cannot operate the KDS of a tenant'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

set local role anon;
select set_config('request.jwt.claims', '{}', true);
select throws_ok(
  format($$select public.set_order_item_status(%L, 'preparing')$$, :'row_2'),
  '42501',
  null,
  'anonymous users cannot update order lines'
);
select is(
  (select count(*) from public.order_items),
  0::bigint,
  'anonymous users cannot read order lines'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a1111111-eeee-4eee-8eee-111111111111', 'role', 'authenticated')::text,
  true
);
select is(
  public.set_order_item_status(:'row_2', 'served')->>'order_id',
  :'order_1',
  'the response reports the owning order'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

select * from finish();
rollback;
