begin;

create extension if not exists pgtap with schema extensions;
grant usage on schema extensions to authenticated, anon;
grant execute on all functions in schema extensions to authenticated, anon;
set local search_path = public, extensions, pg_temp;

select plan(23);

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
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'inventory-owner-a@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Inventory Owner A"}'
  ),
  (
    'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'inventory-owner-b@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Inventory Owner B"}'
  ),
  (
    'cccccccc-3333-4333-8333-cccccccccccc',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'inventory-warehouse-a@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Inventory Warehouse A"}'
  ),
  (
    'dddddddd-4444-4444-8444-dddddddddddd',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'inventory-cashier-a@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Inventory Cashier A"}'
  ),
  (
    'eeeeeeee-5555-4555-8555-eeeeeeeeeeee',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'inventory-platform@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Inventory Platform"}'
  );

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', 'role', 'authenticated')::text,
  true
);
select lives_ok(
  $$select public.create_organization('Inventory Org A', 'inventory-org-a', 'Ristorante Inventory A')$$,
  'owner A can create an organization'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb', 'role', 'authenticated')::text,
  true
);
select lives_ok(
  $$select public.create_organization('Inventory Org B', 'inventory-org-b', 'Ristorante Inventory B')$$,
  'owner B can create an organization'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

select id as org_a from public.organizations where slug = 'inventory-org-a' \gset
select id as org_b from public.organizations where slug = 'inventory-org-b' \gset
select id as restaurant_a from public.restaurants where organization_id = :'org_a' and slug = 'main' \gset
select id as restaurant_b from public.restaurants where organization_id = :'org_b' and slug = 'main' \gset

insert into public.memberships (user_id, organization_id, restaurant_id, role_id)
select 'cccccccc-3333-4333-8333-cccccccccccc', :'org_a', :'restaurant_a', r.id
from public.roles r
where r.key = 'warehouse';

insert into public.memberships (user_id, organization_id, restaurant_id, role_id)
select 'dddddddd-4444-4444-8444-dddddddddddd', :'org_a', :'restaurant_a', r.id
from public.roles r
where r.key = 'cashier';

insert into public.platform_admins (user_id)
values ('eeeeeeee-5555-4555-8555-eeeeeeeeeeee');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', 'role', 'authenticated')::text,
  true
);

select lives_ok(
  format(
    $$insert into public.suppliers (organization_id, restaurant_id, name, category, email)
      values (%L, %L, 'Ortofrutta Inventory', 'Ortofrutta', 'ordini@inventory-a.test')$$,
    :'org_a',
    :'restaurant_a'
  ),
  'owner A can create a supplier'
);

select id as supplier_a from public.suppliers where restaurant_id = :'restaurant_a' \gset

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb', 'role', 'authenticated')::text,
  true
);
select throws_ok(
  format(
    $$insert into public.suppliers (organization_id, restaurant_id, name)
      values (%L, %L, 'Fornitore intruso')$$,
    :'org_b',
    :'restaurant_a'
  ),
  '42501',
  null,
  'owner B cannot create a supplier for restaurant A'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', 'role', 'authenticated')::text,
  true
);

select public.create_inventory_item(
  :'restaurant_a',
  'Mozzarella Inventory',
  'MOZ-INV-1',
  'Latticini',
  'kg',
  10000,
  3000,
  950,
  :'supplier_a',
  'LOT-INV-1',
  null::date,
  'Frigo 1',
  'inventory-create-a-001'
) as item_a \gset

select ok(char_length(:'item_a') > 0, 'owner A can create an inventory item with opening stock');

select is(
  (select quantity_milli from public.inventory_items where id = :'item_a'),
  10000::bigint,
  'the initial quantity is stored in thousandths'
);

select is(
  (public.record_inventory_movement(
    :'item_a', 'load', 2000, '', '', 'inventory-load-a-001'
  )->>'quantity_after_milli')::bigint,
  12000::bigint,
  'a load increases the stock'
);

select is(
  (public.record_inventory_movement(
    :'item_a', 'load', 2000, '', '', 'inventory-load-a-001'
  )->>'quantity_after_milli')::bigint,
  12000::bigint,
  'replaying the same idempotency key does not double the stock'
);

select is(
  (public.record_inventory_movement(
    :'item_a', 'unload', -3000, '', '', 'inventory-unload-a-001'
  )->>'quantity_after_milli')::bigint,
  9000::bigint,
  'an unload decreases the stock'
);

select throws_ok(
  format(
    $$select public.record_inventory_movement(%L, 'unload', -99999000, '', '', 'inventory-insufficient-a')$$,
    :'item_a'
  ),
  '23514',
  null,
  'an unload cannot make the stock negative'
);

select throws_ok(
  format(
    $$select public.record_inventory_movement(%L, 'waste', -1000, '', '', 'inventory-waste-no-reason-a')$$,
    :'item_a'
  ),
  '23514',
  null,
  'waste requires a valid reason'
);

select is(
  (public.record_inventory_movement(
    :'item_a', 'waste', -1000, 'expiry', 'Scaduto', 'inventory-waste-a-001'
  )->>'quantity_after_milli')::bigint,
  8000::bigint,
  'a waste movement with a reason decreases the stock'
);

select throws_ok(
  format(
    $$update public.inventory_items set quantity_milli = 1 where id = %L$$,
    :'item_a'
  ),
  '42501',
  null,
  'stock cannot be changed with a direct update'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'dddddddd-4444-4444-8444-dddddddddddd', 'role', 'authenticated')::text,
  true
);
select throws_ok(
  format(
    $$select public.create_inventory_item(%L, 'Intruso', '', 'Generale', 'pz', 1000, 0, 100, null, '', null::date, '', 'inventory-cashier-create-a')$$,
    :'restaurant_a'
  ),
  '42501',
  null,
  'a cashier cannot create an inventory item'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb', 'role', 'authenticated')::text,
  true
);
select is(
  (select count(*) from public.inventory_items),
  0::bigint,
  'owner B cannot see restaurant A inventory'
);

select throws_ok(
  format(
    $$select public.record_inventory_movement(%L, 'load', 1000, '', '', 'inventory-cross-tenant-a')$$,
    :'item_a'
  ),
  '42501',
  null,
  'owner B cannot record a movement on restaurant A inventory'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'dddddddd-4444-4444-8444-dddddddddddd', 'role', 'authenticated')::text,
  true
);
select is(
  (select count(*) from public.inventory_movements),
  0::bigint,
  'a cashier cannot read the stock movement ledger'
);

update public.suppliers set name = 'Cambio intruso' where id = :'supplier_a';

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', 'role', 'authenticated')::text,
  true
);
select is(
  (select name from public.suppliers where id = :'supplier_a'),
  'Ortofrutta Inventory',
  'a cashier cannot update a supplier'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'cccccccc-3333-4333-8333-cccccccccccc', 'role', 'authenticated')::text,
  true
);
select is(
  (public.record_inventory_movement(
    :'item_a', 'load', 1000, '', '', 'inventory-load-warehouse-a'
  )->>'quantity_after_milli')::bigint,
  9000::bigint,
  'the warehouse role can record a movement'
);

select is(
  (select count(*) from public.inventory_items),
  1::bigint,
  'the warehouse role can read inventory'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', 'role', 'authenticated')::text,
  true
);
select throws_ok(
  format(
    $$insert into public.suppliers (organization_id, restaurant_id, name)
      values (%L, %L, 'Ortofrutta Inventory')$$,
    :'org_a',
    :'restaurant_a'
  ),
  '23505',
  null,
  'duplicate supplier names are rejected in the same restaurant'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'eeeeeeee-5555-4555-8555-eeeeeeeeeeee', 'role', 'authenticated')::text,
  true
);
select is(
  (select count(*) from public.inventory_items where id = :'item_a'),
  1::bigint,
  'the platform admin can read inventory'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', 'role', 'authenticated')::text,
  true
);
select ok(
  (select count(*) from public.audit_logs where action = 'inventory.movement_recorded') >= 4,
  'stock movements are written to the audit log'
);

select * from finish();
rollback;
