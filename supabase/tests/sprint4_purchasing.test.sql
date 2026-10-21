begin;

create extension if not exists pgtap with schema extensions;
grant usage on schema extensions to authenticated, anon;
grant execute on all functions in schema extensions to authenticated, anon;
set local search_path = public, extensions, pg_temp;

select plan(61);

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
    '11111111-aaaa-4aaa-8aaa-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'purchase-owner-a@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Purchase Owner A"}'
  ),
  (
    '22222222-bbbb-4bbb-8bbb-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'purchase-owner-b@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Purchase Owner B"}'
  ),
  (
    '33333333-cccc-4ccc-8ccc-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'purchase-cashier-a@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Purchase Cashier A"}'
  ),
  (
    '44444444-dddd-4ddd-8ddd-444444444444',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'purchase-warehouse-a@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Purchase Warehouse A"}'
  ),
  (
    '55555555-eeee-4eee-8eee-555555555555',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'purchase-accountant-a@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Purchase Accountant A"}'
  ),
  (
    '66666666-ffff-4fff-8fff-666666666666',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'purchase-platform@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Purchase Platform"}'
  );

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-aaaa-4aaa-8aaa-111111111111', 'role', 'authenticated')::text,
  true
);
select lives_ok(
  $$select public.create_organization('Purchase Org A', 'purchase-org-a', 'Ristorante Purchase A')$$,
  'owner A can create an organization'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '22222222-bbbb-4bbb-8bbb-222222222222', 'role', 'authenticated')::text,
  true
);
select lives_ok(
  $$select public.create_organization('Purchase Org B', 'purchase-org-b', 'Ristorante Purchase B')$$,
  'owner B can create an organization'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

select id as org_a from public.organizations where slug = 'purchase-org-a' \gset
select id as org_b from public.organizations where slug = 'purchase-org-b' \gset
select id as restaurant_a from public.restaurants where organization_id = :'org_a' and slug = 'main' \gset
select id as restaurant_b from public.restaurants where organization_id = :'org_b' and slug = 'main' \gset

insert into public.memberships (user_id, organization_id, restaurant_id, role_id)
select '33333333-cccc-4ccc-8ccc-333333333333', :'org_a', :'restaurant_a', r.id
from public.roles r
where r.key = 'cashier';

insert into public.memberships (user_id, organization_id, restaurant_id, role_id)
select '44444444-dddd-4ddd-8ddd-444444444444', :'org_a', :'restaurant_a', r.id
from public.roles r
where r.key = 'warehouse';

insert into public.memberships (user_id, organization_id, restaurant_id, role_id)
select '55555555-eeee-4eee-8eee-555555555555', :'org_a', :'restaurant_a', r.id
from public.roles r
where r.key = 'accountant';

insert into public.platform_admins (user_id)
values ('66666666-ffff-4fff-8fff-666666666666');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-aaaa-4aaa-8aaa-111111111111', 'role', 'authenticated')::text,
  true
);

select lives_ok(
  format(
    $$insert into public.suppliers (organization_id, restaurant_id, name, category, email)
      values (%L, %L, 'Ortofrutta Purchase', 'Ortofrutta', 'ordini@purchase-a.test')$$,
    :'org_a',
    :'restaurant_a'
  ),
  'owner A can create a supplier'
);
select id as supplier_a from public.suppliers where restaurant_id = :'restaurant_a' \gset

select public.create_inventory_item(
  :'restaurant_a',
  'Pomodoro Purchase',
  'POM-PUR-1',
  'Verdura',
  'kg',
  10000,
  5000,
  250,
  :'supplier_a',
  '',
  null::date,
  'Frigo Purchase',
  'purchase-item-a-001'
) as item_a \gset
select ok(char_length(:'item_a') > 0, 'owner A can create the first inventory item');

select public.create_inventory_item(
  :'restaurant_a',
  'Basilico Purchase',
  'BAS-PUR-1',
  'Verdura',
  'kg',
  2000,
  1000,
  100,
  :'supplier_a',
  '',
  null::date,
  'Frigo Purchase',
  'purchase-item-a-002'
) as item_a2 \gset
select ok(char_length(:'item_a2') > 0, 'owner A can create the second inventory item');

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '22222222-bbbb-4bbb-8bbb-222222222222', 'role', 'authenticated')::text,
  true
);

select lives_ok(
  format(
    $$insert into public.suppliers (organization_id, restaurant_id, name)
      values (%L, %L, 'Ortofrutta Purchase B')$$,
    :'org_b',
    :'restaurant_b'
  ),
  'owner B can create a supplier'
);
select id as supplier_b from public.suppliers where restaurant_id = :'restaurant_b' \gset

select public.create_inventory_item(
  :'restaurant_b',
  'Pomodoro Purchase B',
  'POM-PUR-B',
  'Verdura',
  'kg',
  1000,
  0,
  200,
  :'supplier_b',
  '',
  null::date,
  '',
  'purchase-item-b-001'
) as item_b \gset
select ok(char_length(:'item_b') > 0, 'owner B can create an inventory item');

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-aaaa-4aaa-8aaa-111111111111', 'role', 'authenticated')::text,
  true
);

select public.save_purchase_order(
  :'restaurant_a',
  null::uuid,
  :'supplier_a',
  current_date + 2,
  'Nota acquisto A',
  jsonb_build_array(
    jsonb_build_object(
      'inventory_item_id', :'item_a',
      'quantity_milli', 10000,
      'unit_cost_cents', 250
    ),
    jsonb_build_object(
      'inventory_item_id', :'item_a2',
      'quantity_milli', 2000,
      'unit_cost_cents', 100
    )
  ),
  'purchase-order-a-001'
) as order_a \gset

select ok(char_length(:'order_a') > 0, 'owner A can create a draft purchase order');
select order_number as order_number_a from public.purchase_orders where id = :'order_a' \gset
select matches(
  (select order_number from public.purchase_orders where id = :'order_a'),
  '^PO-[0-9]{8}-[0-9]{4}$',
  'the order number is generated automatically'
);
select is(
  (select notes from public.purchase_orders where id = :'order_a'),
  'Nota acquisto A',
  'notes are stored on the purchase order'
);
select is(
  (select expected_on from public.purchase_orders where id = :'order_a'),
  current_date + 2,
  'the expected date is stored on the purchase order'
);
select is(
  (select count(*) from public.purchase_order_items where purchase_order_id = :'order_a'),
  2::bigint,
  'the purchase order has the requested lines'
);
select is(
  (select item_name from public.purchase_order_items where purchase_order_id = :'order_a' and inventory_item_id = :'item_a'),
  'Pomodoro Purchase',
  'the order item keeps the product snapshot'
);
select is(
  (select status from public.purchase_orders where id = :'order_a'),
  'draft',
  'a new purchase order starts as draft'
);
select is(
  public.save_purchase_order(
    :'restaurant_a',
    null::uuid,
    :'supplier_a',
    current_date + 2,
    'Nota acquisto A',
    jsonb_build_array(
      jsonb_build_object(
        'inventory_item_id', :'item_a',
        'quantity_milli', 10000,
        'unit_cost_cents', 250
      ),
      jsonb_build_object(
        'inventory_item_id', :'item_a2',
        'quantity_milli', 2000,
        'unit_cost_cents', 100
      )
    ),
    'purchase-order-a-001'
  ),
  :'order_a'::uuid,
  'replaying the same idempotency key returns the same order'
);

select throws_ok(
  format(
    $$select public.save_purchase_order(%L, null, %L, null, '', '[]'::jsonb, 'purchase-empty-a')$$,
    :'restaurant_a',
    :'supplier_a'
  ),
  '23514',
  null,
  'an order with no lines is rejected'
);

select throws_ok(
  format(
    $$select public.save_purchase_order(%L, null, %L, null, '', %L::jsonb, 'purchase-duplicate-a')$$,
    :'restaurant_a',
    :'supplier_a',
    jsonb_build_array(
      jsonb_build_object('inventory_item_id', :'item_a', 'quantity_milli', 1000, 'unit_cost_cents', 250),
      jsonb_build_object('inventory_item_id', :'item_a', 'quantity_milli', 1000, 'unit_cost_cents', 250)
    )::text
  ),
  '23514',
  null,
  'the same item cannot appear twice in an order'
);

select throws_ok(
  format(
    $$select public.save_purchase_order(%L, null, %L, null, '', %L::jsonb, 'purchase-zero-a')$$,
    :'restaurant_a',
    :'supplier_a',
    jsonb_build_array(
      jsonb_build_object('inventory_item_id', :'item_a', 'quantity_milli', 0, 'unit_cost_cents', 250)
    )::text
  ),
  '23514',
  null,
  'a zero quantity is rejected'
);

select throws_ok(
  format(
    $$select public.save_purchase_order(%L, null, %L, null, '', %L::jsonb, 'purchase-cross-supplier-a')$$,
    :'restaurant_a',
    :'supplier_b',
    jsonb_build_array(
      jsonb_build_object('inventory_item_id', :'item_a', 'quantity_milli', 1000, 'unit_cost_cents', 250)
    )::text
  ),
  'P0002',
  null,
  'another tenant supplier cannot be used'
);

select throws_ok(
  format(
    $$insert into public.purchase_orders (
        organization_id, restaurant_id, supplier_id, order_number, idempotency_key
      ) values (%L, %L, %L, 'PO-DIRECT-1', 'purchase-direct-insert-a')$$,
    :'org_a',
    :'restaurant_a',
    :'supplier_a'
  ),
  '42501',
  null,
  'direct purchase order inserts are denied'
);

select is_empty(
  format(
    $$update public.purchase_orders set notes = 'Cambio' where id = %L returning id$$,
    :'order_a'
  ),
  'direct purchase order updates are denied'
);

select throws_ok(
  format(
    $$insert into public.purchase_order_items (
        organization_id, restaurant_id, purchase_order_id, inventory_item_id,
        item_name, unit, quantity_milli, unit_cost_cents
      ) values (%L, %L, %L, %L, 'Intruso', 'kg', 1000, 100)$$,
    :'org_a',
    :'restaurant_a',
    :'order_a',
    :'item_a'
  ),
  '42501',
  null,
  'direct purchase order item inserts are denied'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '22222222-bbbb-4bbb-8bbb-222222222222', 'role', 'authenticated')::text,
  true
);
select is(
  (select count(*) from public.purchase_orders),
  0::bigint,
  'owner B cannot read orders from another tenant'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '33333333-cccc-4ccc-8ccc-333333333333', 'role', 'authenticated')::text,
  true
);
select is(
  (select count(*) from public.purchase_orders),
  1::bigint,
  'a cashier can read purchase orders through reports.read'
);
select throws_ok(
  format(
    $$select public.save_purchase_order(%L, null, %L, null, '', %L::jsonb, 'purchase-cashier-a')$$,
    :'restaurant_a',
    :'supplier_a',
    jsonb_build_array(
      jsonb_build_object('inventory_item_id', :'item_a', 'quantity_milli', 1000, 'unit_cost_cents', 250)
    )::text
  ),
  '42501',
  null,
  'a cashier cannot create a purchase order'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '55555555-eeee-4eee-8eee-555555555555', 'role', 'authenticated')::text,
  true
);
select is(
  (select count(*) from public.purchase_orders),
  1::bigint,
  'the accountant can read purchase orders'
);
select is(
  (select count(*) from public.purchase_order_items),
  2::bigint,
  'the accountant can read purchase order lines'
);
select throws_ok(
  format(
    $$select public.save_purchase_order(%L, null, %L, null, '', %L::jsonb, 'purchase-accountant-a')$$,
    :'restaurant_a',
    :'supplier_a',
    jsonb_build_array(
      jsonb_build_object('inventory_item_id', :'item_a', 'quantity_milli', 1000, 'unit_cost_cents', 250)
    )::text
  ),
  '42501',
  null,
  'the accountant cannot create a purchase order'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '66666666-ffff-4fff-8fff-666666666666', 'role', 'authenticated')::text,
  true
);
select is(
  (select count(*) from public.purchase_orders),
  1::bigint,
  'the platform admin can read purchase orders'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-aaaa-4aaa-8aaa-111111111111', 'role', 'authenticated')::text,
  true
);

select public.save_purchase_order(
  :'restaurant_a',
  :'order_a',
  :'supplier_a',
  current_date + 5,
  'Nota aggiornata',
  jsonb_build_array(
    jsonb_build_object(
      'inventory_item_id', :'item_a',
      'quantity_milli', 8000,
      'unit_cost_cents', 300
    )
  ),
  ''
) as updated_order_a \gset
select is(:'updated_order_a'::uuid, :'order_a'::uuid, 'updating a draft returns the same order id');
select is(
  (select count(*) from public.purchase_order_items where purchase_order_id = :'order_a'),
  1::bigint,
  'updating a draft replaces its lines'
);
select is(
  (select quantity_milli from public.purchase_order_items where purchase_order_id = :'order_a'),
  8000::bigint,
  'the updated quantity is stored in thousandths'
);
select is(
  (select unit_cost_cents from public.purchase_order_items where purchase_order_id = :'order_a'),
  300::bigint,
  'the updated unit cost is stored in cents'
);
select is(
  (select notes from public.purchase_orders where id = :'order_a'),
  'Nota aggiornata',
  'the updated notes are stored'
);
select is(
  (select order_number from public.purchase_orders where id = :'order_a'),
  (select order_number from public.purchase_orders where id = :'order_a'),
  'the order number is preserved during the update'
);

select is(
  public.mark_purchase_order_ordered(:'order_a'),
  'ordered',
  'owner A can mark a draft as ordered'
);
select is(
  public.mark_purchase_order_ordered(:'order_a'),
  'ordered',
  'marking an already ordered purchase order is idempotent'
);
select throws_ok(
  format(
    $$select public.save_purchase_order(%L, %L, %L, null, '', %L::jsonb, '')$$,
    :'restaurant_a',
    :'order_a',
    :'supplier_a',
    jsonb_build_array(
      jsonb_build_object('inventory_item_id', :'item_a', 'quantity_milli', 1000, 'unit_cost_cents', 250)
    )::text
  ),
  '23514',
  null,
  'an ordered purchase order cannot be edited'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '33333333-cccc-4ccc-8ccc-333333333333', 'role', 'authenticated')::text,
  true
);
select throws_ok(
  format(
    $$select public.receive_purchase_order(%L, %L::jsonb, '')$$,
    :'order_a',
    jsonb_build_array(
      jsonb_build_object('item_id', (select id from public.purchase_order_items where purchase_order_id = :'order_a'), 'quantity_milli', 8000)
    )::text
  ),
  '42501',
  null,
  'a cashier cannot receive a purchase order'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '22222222-bbbb-4bbb-8bbb-222222222222', 'role', 'authenticated')::text,
  true
);
select throws_ok(
  format(
    $$select public.receive_purchase_order(%L, '[]'::jsonb, '')$$,
    :'order_a'
  ),
  '42501',
  null,
  'owner B cannot receive another tenant order'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-aaaa-4aaa-8aaa-111111111111', 'role', 'authenticated')::text,
  true
);

select id as order_line_a
from public.purchase_order_items
where purchase_order_id = :'order_a' \gset

select throws_ok(
  format(
    $$select public.receive_purchase_order(%L, %L::jsonb, '')$$,
    :'order_a',
    jsonb_build_array(
      jsonb_build_object('item_id', :'order_line_a', 'quantity_milli', 9000)
    )::text
  ),
  '23514',
  null,
  'a receipt cannot exceed the ordered quantity'
);

select throws_ok(
  format(
    $$select public.receive_purchase_order(%L, %L::jsonb, '')$$,
    :'order_a',
    jsonb_build_array(
      jsonb_build_object('item_id', '99999999-9999-4999-8999-999999999999', 'quantity_milli', 1000)
    )::text
  ),
  'P0002',
  null,
  'a receipt must reference an order line'
);

select is(
  (public.receive_purchase_order(
    :'order_a',
    jsonb_build_array(
      jsonb_build_object('item_id', :'order_line_a', 'quantity_milli', 6000)
    ),
    'Consegna parziale'
  )->>'duplicate')::boolean,
  false,
  'owner A can receive an ordered purchase order'
);
select is(
  (select status from public.purchase_orders where id = :'order_a'),
  'received',
  'the purchase order becomes received'
);
select is(
  (select received_quantity_milli from public.purchase_order_items where id = :'order_line_a'),
  6000::bigint,
  'the received quantity is stored'
);
select is(
  (select quantity_milli from public.inventory_items where id = :'item_a'),
  16000::bigint,
  'receiving an order increases the inventory quantity'
);
select is(
  (select cost_per_unit_cents from public.inventory_items where id = :'item_a'),
  300::bigint,
  'receiving an order updates the inventory cost'
);
select ok(
  (select count(*) from public.inventory_movements
   where restaurant_id = :'restaurant_a'
     and item_id = :'item_a'
     and reason = 'purchase_order'
     and quantity_delta_milli = 6000) >= 1,
  'receiving an order writes a linked stock movement'
);
select is(
  (public.receive_purchase_order(
    :'order_a',
    jsonb_build_array(
      jsonb_build_object('item_id', :'order_line_a', 'quantity_milli', 6000)
    ),
    ''
  )->>'duplicate')::boolean,
  true,
  'replaying the receipt is idempotent'
);
select is(
  (select quantity_milli from public.inventory_items where id = :'item_a'),
  16000::bigint,
  'replaying the receipt does not double the stock'
);
select throws_ok(
  format($$select public.cancel_purchase_order(%L)$$, :'order_a'),
  '23514',
  null,
  'a received purchase order cannot be cancelled'
);

select public.save_purchase_order(
  :'restaurant_a',
  null::uuid,
  :'supplier_a',
  null::date,
  '',
  jsonb_build_array(
    jsonb_build_object(
      'inventory_item_id', :'item_a2',
      'quantity_milli', 2000,
      'unit_cost_cents', 100
    )
  ),
  'purchase-order-a-002'
) as order_a2 \gset
select isnt(
  (select order_number from public.purchase_orders where id = :'order_a2'),
  (select order_number from public.purchase_orders where id = :'order_a'),
  'a second order receives a different number'
);
select is(
  public.cancel_purchase_order(:'order_a2'),
  'cancelled',
  'a draft purchase order can be cancelled'
);
select is(
  public.cancel_purchase_order(:'order_a2'),
  'cancelled',
  'cancelling an already cancelled order is idempotent'
);
select throws_ok(
  format($$select public.mark_purchase_order_ordered(%L)$$, :'order_a2'),
  '23514',
  null,
  'a cancelled order cannot be marked as ordered'
);
select throws_ok(
  format($$select public.receive_purchase_order(%L, '[]'::jsonb, '')$$, :'order_a2'),
  '23514',
  null,
  'a cancelled order cannot be received'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '44444444-dddd-4ddd-8ddd-444444444444', 'role', 'authenticated')::text,
  true
);
select ok(
  char_length(
    public.save_purchase_order(
      :'restaurant_a',
      null::uuid,
      :'supplier_a',
      null::date,
      'Ordine magazziniere',
      jsonb_build_array(
        jsonb_build_object(
          'inventory_item_id', :'item_a2',
          'quantity_milli', 1000,
          'unit_cost_cents', 100
        )
      ),
      'purchase-order-warehouse-a'
    )::text
  ) > 0,
  'the warehouse role can create a purchase order'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

select ok(
  (select count(*) from public.audit_logs where action = 'purchasing.order_created') >= 3,
  'creating purchase orders writes audit entries'
);
select ok(
  (select count(*) from public.audit_logs where action = 'purchasing.order_updated') >= 1,
  'updating a purchase order writes an audit entry'
);
select ok(
  (select count(*) from public.audit_logs where action = 'purchasing.order_received') >= 1,
  'receiving a purchase order writes an audit entry'
);
select ok(
  (select count(*) from public.audit_logs where action = 'purchasing.order_cancelled') >= 1,
  'cancelling a purchase order writes an audit entry'
);

select * from finish();
rollback;
