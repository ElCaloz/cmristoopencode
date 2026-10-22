begin;

create extension if not exists pgtap with schema extensions;
grant usage on schema extensions to authenticated, anon;
grant execute on all functions in schema extensions to authenticated, anon;
set local search_path = public, extensions, pg_temp;

select plan(77);

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
    '11111111-7111-4111-8111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'sprint7-owner-a@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Sprint7 Owner A"}'
  ),
  (
    '22222222-7222-4222-8222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'sprint7-owner-b@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Sprint7 Owner B"}'
  ),
  (
    '33333333-7333-4333-8333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'sprint7-marketing-a@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Sprint7 Marketing A"}'
  ),
  (
    '44444444-7444-4444-8444-444444444444',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'sprint7-warehouse-a@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Sprint7 Warehouse A"}'
  ),
  (
    '55555555-7555-4555-8555-555555555555',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'sprint7-platform@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Sprint7 Platform"}'
  );

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-7111-4111-8111-111111111111', 'role', 'authenticated')::text,
  true
);
select public.create_organization('Sprint7 Org A', 'sprint7-org-a', 'Ristorante Sprint7 A');

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '22222222-7222-4222-8222-222222222222', 'role', 'authenticated')::text,
  true
);
select public.create_organization('Sprint7 Org B', 'sprint7-org-b', 'Ristorante Sprint7 B');

reset role;
select set_config('request.jwt.claims', '{}', true);

select id as org_a from public.organizations where slug = 'sprint7-org-a' \gset
select id as org_b from public.organizations where slug = 'sprint7-org-b' \gset
select id as restaurant_a from public.restaurants where organization_id = :'org_a' and slug = 'main' \gset
select id as restaurant_b from public.restaurants where organization_id = :'org_b' and slug = 'main' \gset

insert into public.memberships (user_id, organization_id, restaurant_id, role_id)
select '33333333-7333-4333-8333-333333333333', :'org_a', :'restaurant_a', r.id
from public.roles r
where r.key = 'marketing';

insert into public.memberships (user_id, organization_id, restaurant_id, role_id)
select '44444444-7444-4444-8444-444444444444', :'org_a', :'restaurant_a', r.id
from public.roles r
where r.key = 'warehouse';

insert into public.platform_admins (user_id)
values ('55555555-7555-4555-8555-555555555555');

select id as membership_marketing
from public.memberships
where user_id = '33333333-7333-4333-8333-333333333333' \gset

-- Dati operativi della sede A creati dal proprietario.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-7111-4111-8111-111111111111', 'role', 'authenticated')::text,
  true
);

insert into public.menu_categories (organization_id, restaurant_id, name)
values (:'org_a', :'restaurant_a', 'Sprint7 cucine')
returning id as category_a \gset

insert into public.menu_items (organization_id, restaurant_id, category_id, name, price_cents)
values (:'org_a', :'restaurant_a', :'category_a', 'Pizza Sprint7', 1000)
returning id as item_a \gset

insert into public.menu_items (organization_id, restaurant_id, category_id, name, price_cents, is_available)
values (:'org_a', :'restaurant_a', :'category_a', 'Pasta Sprint7 esaurita', 1200, false)
returning id as item_off \gset

insert into public.restaurant_public_links (organization_id, restaurant_id, token, kind, label, allow_ordering)
values (:'org_a', :'restaurant_a', 'sprint7-token-aaaaaaaaaaaaaaaaaaaa', 'menu', 'Link Sprint7', true)
returning id as link_a \gset

insert into public.restaurant_public_links (organization_id, restaurant_id, token, kind, label, allow_ordering)
values (:'org_a', :'restaurant_a', 'sprint7-token-cccccccccccccccccccc', 'menu', 'Link sola lettura', false);

insert into public.restaurant_public_links (organization_id, restaurant_id, token, kind, label, allow_ordering, is_active)
values (:'org_a', :'restaurant_a', 'sprint7-token-dddddddddddddddddddd', 'menu', 'Link spento', true, false);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '22222222-7222-4222-8222-222222222222', 'role', 'authenticated')::text,
  true
);

insert into public.restaurant_public_links (organization_id, restaurant_id, token, kind, label, allow_ordering)
values (:'org_b', :'restaurant_b', 'sprint7-token-bbbbbbbbbbbbbbbbbbbbbb', 'menu', 'Link Sprint7 B', true);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-7111-4111-8111-111111111111', 'role', 'authenticated')::text,
  true
);

insert into public.restaurant_settings (restaurant_id, inbound_phone, receipt_footer)
values (:'restaurant_a', '+393339999999', 'Grazie Sprint7')
on conflict (restaurant_id) do update
  set inbound_phone = excluded.inbound_phone,
      receipt_footer = excluded.receipt_footer;

insert into public.customers (organization_id, restaurant_id, first_name, last_name, phone)
values (:'org_a', :'restaurant_a', 'Maria', 'Sprint7', '+393330000001')
returning id as customer_phone \gset

insert into public.customers (organization_id, restaurant_id, first_name, last_name, email)
values (:'org_a', :'restaurant_a', 'Luigi', 'Sprint7', 'sprint7-cliente@example.test')
returning id as customer_email \gset

insert into public.marketing_campaigns (organization_id, restaurant_id, name, channel, body, segment)
values (:'org_a', :'restaurant_a', 'Campagna Sprint7', 'email', 'Benvenuti da Sprint7', 'all')
returning id as campaign_a \gset

insert into public.printer_profiles (organization_id, restaurant_id, name, station, connection, paper_width)
values (:'org_a', :'restaurant_a', 'Sprint7 scontrino', 'receipt', 'file', 80)
returning id as printer_a \gset

insert into public.print_jobs (organization_id, restaurant_id, printer_id, job_type, payload, idempotency_key)
values (
  :'org_a', :'restaurant_a', :'printer_a', 'receipt',
  '{"kind":"receipt","orderNumber":"PROVA"}'::jsonb,
  'sprint7-print-0001'
)
returning id as job_a \gset

reset role;

select public.set_integration_secret('local_service', 'sprint7-local-secret-0123456789abcdef');
select public.set_integration_secret('stripe', 'sprint7-stripe-secret-0123456789abcdef');
select public.set_integration_secret('twilio', 'sprint7-twilio-secret-0123456789abcdef');

-- ---------------------------------------------------------------------------
-- Segreti delle integrazioni: solo hash SHA-256
-- ---------------------------------------------------------------------------

select is(
  public.check_integration_secret('local_service', 'sprint7-local-secret-0123456789abcdef'),
  true,
  'check_integration_secret accepts the configured server secret'
);

select is(
  public.check_integration_secret('local_service', 'sprint7-wrong-secret-00000000'),
  false,
  'check_integration_secret rejects a wrong secret'
);

select throws_ok(
  $$select public.set_integration_secret('local_service', 'short')$$,
  '22023',
  null,
  'set_integration_secret rejects secrets shorter than 16 characters'
);

select is(
  (
    select count(*)::int
    from public.integration_secrets
    where provider = 'local_service'
      and char_length(secret_hash) = 64
      and secret_hash <> 'sprint7-local-secret-0123456789abcdef'
  ),
  1,
  'integration_secrets stores only sha-256 hashes'
);

-- ---------------------------------------------------------------------------
-- Menu pubblico token-only
-- ---------------------------------------------------------------------------

select is(
  (select public.get_public_menu('sprint7-token-aaaaaaaaaaaaaaaaaaaa') #>> '{restaurant,name}'),
  'Ristorante Sprint7 A',
  'get_public_menu returns the restaurant for a valid token'
);

select is(
  (select public.get_public_menu('sprint7-token-aaaaaaaaaaaaaaaaaaaa') -> 'link' ->> 'allow_ordering')::boolean,
  true,
  'the public menu reports ordering enabled'
);

select throws_ok(
  $$select public.get_public_menu('short')$$,
  '22023',
  null,
  'get_public_menu rejects short tokens'
);

select throws_ok(
  $$select public.get_public_menu('sprint7-token-zzzzzzzzzzzzzzzzzzzzzz')$$,
  'P0002',
  null,
  'get_public_menu rejects unknown tokens'
);

select throws_ok(
  $$select public.get_public_menu('sprint7-token-dddddddddddddddddddd')$$,
  'P0002',
  null,
  'get_public_menu rejects deactivated links'
);

set local role anon;
select set_config('request.jwt.claims', '{}', true);

select ok(
  (select public.get_public_menu('sprint7-token-aaaaaaaaaaaaaaaaaaaa') ? 'categories'),
  'anon can read the public menu payload'
);

-- ---------------------------------------------------------------------------
-- Invio ordine online da link pubblico
-- ---------------------------------------------------------------------------

select public.submit_online_order(
  'sprint7-token-aaaaaaaaaaaaaaaaaaaa',
  jsonb_build_object(
    'customer_name', 'Mario Sprint7',
    'email', 'sprint7-cliente@example.test',
    'phone', '',
    'fulfillment', 'pickup',
    'notes', 'Senza cipolla',
    'marketing_email', true,
    'marketing_sms', false,
    'idempotency_key', 'sprint7-order-0001',
    'items', jsonb_build_array(
      jsonb_build_object('menu_item_id', :'item_a', 'quantity', 2, 'note', '')
    )
  )
) as order_a \gset

reset role;

select is(
  (:'order_a'::jsonb ->> 'total_cents')::bigint,
  2000::bigint,
  'the order total is computed from database prices'
);

select is(
  (:'order_a'::jsonb ->> 'duplicate')::boolean,
  false,
  'the first submission is not a duplicate'
);

select is(
  char_length(:'order_a'::jsonb ->> 'order_number'),
  8,
  'the order number is the short reference'
);

select is(
  (
    select unit_price_cents
    from public.online_order_items
    where online_order_id = (:'order_a'::jsonb ->> 'order_id')::uuid
    limit 1
  ),
  1000::bigint,
  'online order items keep the menu price from the database'
);

select is(
  (
    select count(*)::int
    from public.customers
    where id = :'customer_email'::uuid
      and marketing_email
      and consent_at is not null
  ),
  1,
  'the customer is merged with marketing consent recorded'
);

set local role anon;
select set_config('request.jwt.claims', '{}', true);

select public.submit_online_order(
  'sprint7-token-aaaaaaaaaaaaaaaaaaaa',
  jsonb_build_object(
    'customer_name', 'Mario Sprint7',
    'email', 'sprint7-cliente@example.test',
    'phone', '',
    'fulfillment', 'pickup',
    'notes', 'Senza cipolla',
    'marketing_email', true,
    'marketing_sms', false,
    'idempotency_key', 'sprint7-order-0001',
    'items', jsonb_build_array(
      jsonb_build_object('menu_item_id', :'item_a', 'quantity', 2, 'note', '')
    )
  )
) as order_a2 \gset

reset role;

select is(
  (:'order_a2'::jsonb ->> 'duplicate')::boolean,
  true,
  'a replayed idempotency key is recognized as duplicate'
);

select is(
  (:'order_a2'::jsonb ->> 'order_id')::text,
  (:'order_a'::jsonb ->> 'order_id')::text,
  'the replay returns the original order id'
);

select is(
  (
    select count(*)::int
    from public.online_orders
    where restaurant_id = :'restaurant_a'::uuid
      and idempotency_key = 'sprint7-order-0001'
  ),
  1,
  'only one order row exists for the idempotency key'
);

set local role anon;
select set_config('request.jwt.claims', '{}', true);

select throws_ok(
  format(
    $$select public.submit_online_order('sprint7-token-cccccccccccccccccccc', %L)$$,
    jsonb_build_object(
      'customer_name', 'Mario Sprint7',
      'email', 'sprint7-readonly@example.test',
      'fulfillment', 'pickup',
      'idempotency_key', 'sprint7-order-ro01',
      'items', jsonb_build_array(
        jsonb_build_object('menu_item_id', :'item_a', 'quantity', 1)
      )
    )
  ),
  '42501',
  null,
  'a read-only link rejects online orders'
);

select throws_ok(
  format(
    $$select public.submit_online_order('sprint7-token-dddddddddddddddddddd', %L)$$,
    jsonb_build_object(
      'customer_name', 'Mario Sprint7',
      'email', 'sprint7-offline@example.test',
      'fulfillment', 'pickup',
      'idempotency_key', 'sprint7-order-off1',
      'items', jsonb_build_array(
        jsonb_build_object('menu_item_id', :'item_a', 'quantity', 1)
      )
    )
  ),
  'P0002',
  null,
  'a deactivated link rejects online orders'
);

select throws_ok(
  format(
    $$select public.submit_online_order('sprint7-token-aaaaaaaaaaaaaaaaaaaa', %L)$$,
    jsonb_build_object(
      'customer_name', 'Mario Sprint7',
      'email', 'sprint7-esaurito@example.test',
      'fulfillment', 'pickup',
      'idempotency_key', 'sprint7-order-off2',
      'items', jsonb_build_array(
        jsonb_build_object('menu_item_id', :'item_off', 'quantity', 1)
      )
    )
  ),
  '23514',
  null,
  'an unavailable menu item is rejected'
);

select throws_ok(
  format(
    $$select public.submit_online_order('sprint7-token-aaaaaaaaaaaaaaaaaaaa', %L)$$,
    jsonb_build_object(
      'customer_name', 'Mario Sprint7',
      'email', 'sprint7-inesistente@example.test',
      'fulfillment', 'pickup',
      'idempotency_key', 'sprint7-order-miss',
      'items', jsonb_build_array(
        jsonb_build_object('menu_item_id', '99999999-9999-9999-9999-999999999999', 'quantity', 1)
      )
    )
  ),
  '23503',
  null,
  'an unknown menu item is rejected'
);

select throws_ok(
  format(
    $$select public.submit_online_order('sprint7-token-aaaaaaaaaaaaaaaaaaaa', %L)$$,
    jsonb_build_object(
      'customer_name', 'Mario Sprint7',
      'email', 'sprint7-vuoto@example.test',
      'fulfillment', 'pickup',
      'idempotency_key', 'sprint7-order-empty',
      'items', jsonb_build_array()
    )
  ),
  '23514',
  null,
  'an empty cart is rejected'
);

select throws_ok(
  format(
    $$select public.submit_online_order('sprint7-token-aaaaaaaaaaaaaaaaaaaa', %L)$$,
    jsonb_build_object(
      'customer_name', 'Mario Sprint7',
      'email', '',
      'phone', '',
      'fulfillment', 'pickup',
      'idempotency_key', 'sprint7-order-nocontact',
      'items', jsonb_build_array(
        jsonb_build_object('menu_item_id', :'item_a', 'quantity', 1)
      )
    )
  ),
  '23514',
  null,
  'an order without email or phone is rejected'
);

reset role;

insert into public.online_orders (organization_id, restaurant_id, customer_name, email, idempotency_key)
select
  :'org_a', :'restaurant_a', 'Rate Limit Sprint7', 'rate-limit@example.test',
  'sprint7-rate-' || g
from generate_series(1, 10) g;

set local role anon;
select set_config('request.jwt.claims', '{}', true);

select throws_ok(
  format(
    $$select public.submit_online_order('sprint7-token-aaaaaaaaaaaaaaaaaaaa', %L)$$,
    jsonb_build_object(
      'customer_name', 'Rate Limit Sprint7',
      'email', 'rate-limit@example.test',
      'fulfillment', 'pickup',
      'idempotency_key', 'sprint7-order-rate1',
      'items', jsonb_build_array(
        jsonb_build_object('menu_item_id', :'item_a', 'quantity', 1)
      )
    )
  ),
  '23514',
  null,
  'the anti-abuse rate limit blocks too many orders from the same contact'
);

reset role;

-- ---------------------------------------------------------------------------
-- Conferma ordine online, comanda POS e stati
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-7111-4111-8111-111111111111', 'role', 'authenticated')::text,
  true
);

select public.confirm_online_order((:'order_a'::jsonb ->> 'order_id')::uuid) as pos_order \gset

select public.confirm_online_order((:'order_a'::jsonb ->> 'order_id')::uuid) as pos_order2 \gset

reset role;

select is(
  (select count(*)::int from public.orders where id = :'pos_order'::uuid),
  1,
  'confirm_online_order creates a real POS order'
);

select is(
  (select status from public.online_orders where id = (:'order_a'::jsonb ->> 'order_id')::uuid),
  'confirmed',
  'the online order is confirmed'
);

select is(
  (select source from public.orders where id = :'pos_order'::uuid),
  'online',
  'the POS order keeps the online source'
);

select is(
  (select count(*)::int from public.order_items where order_id = :'pos_order'::uuid),
  1,
  'the POS order receives the kitchen items'
);

select is(
  (select visits from public.customers where id = :'customer_email'::uuid),
  1,
  'customer visits are updated on confirmation'
);

select is(
  :'pos_order2'::uuid,
  :'pos_order'::uuid,
  'confirming again returns the same POS order (idempotent)'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-7111-4111-8111-111111111111', 'role', 'authenticated')::text,
  true
);

select public.update_online_order_status((:'order_a'::jsonb ->> 'order_id')::uuid, 'preparing');

reset role;

select is(
  (select status from public.online_orders where id = (:'order_a'::jsonb ->> 'order_id')::uuid),
  'preparing',
  'the online order status transitions are applied'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-7111-4111-8111-111111111111', 'role', 'authenticated')::text,
  true
);

select public.set_online_order_payment_status((:'order_a'::jsonb ->> 'order_id')::uuid, 'paid');

reset role;

select is(
  (select payment_status from public.online_orders where id = (:'order_a'::jsonb ->> 'order_id')::uuid),
  'paid',
  'the payment status can be registered on the online order'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '22222222-7222-4222-8222-222222222222', 'role', 'authenticated')::text,
  true
);

select throws_ok(
  format(
    $$select public.confirm_online_order(%L::uuid)$$,
    (:'order_a'::jsonb ->> 'order_id')
  ),
  '42501',
  null,
  'owner B cannot confirm the online orders of restaurant A'
);

select throws_ok(
  format(
    $$select public.set_online_order_payment_status(%L::uuid, 'paid')$$,
    (:'order_a'::jsonb ->> 'order_id')
  ),
  '42501',
  null,
  'owner B cannot change the payment status of restaurant A orders'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-7111-4111-8111-111111111111', 'role', 'authenticated')::text,
  true
);

select throws_ok(
  format(
    $$select public.update_online_order_status(%L::uuid, 'bogus')$$,
    (:'order_a'::jsonb ->> 'order_id')
  ),
  '22023',
  null,
  'an invalid online order status is rejected'
);

reset role;

-- ---------------------------------------------------------------------------
-- Fidelizzazione
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-7111-4111-8111-111111111111', 'role', 'authenticated')::text,
  true
);

select is(
  public.record_loyalty_transaction(
    :'customer_email'::uuid, 50, 'Benvenuto Sprint7', 'sprint7-loyalty-0001'
  ),
  50,
  'the owner can record loyalty points'
);

select public.record_loyalty_transaction(
  :'customer_email'::uuid, 50, 'Benvenuto Sprint7', 'sprint7-loyalty-0001'
) as loyalty_replay \gset

reset role;

select is(
  (select loyalty_points from public.customers where id = :'customer_email'::uuid),
  50,
  'customer balance follows the loyalty transactions'
);

select is(
  :'loyalty_replay'::int,
  50,
  'a replayed idempotency key does not change the balance'
);

select is(
  (select count(*)::int from public.loyalty_transactions where customer_id = :'customer_email'::uuid),
  1,
  'only one loyalty transaction is stored per idempotency key'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-7111-4111-8111-111111111111', 'role', 'authenticated')::text,
  true
);

select throws_ok(
  format(
    $$select public.record_loyalty_transaction(%L::uuid, -1000, 'Sconto Sprint7', 'sprint7-loyalty-0002')$$,
    :'customer_email'
  ),
  '23514',
  null,
  'loyalty points cannot bring the balance below zero'
);

select throws_ok(
  format(
    $$select public.record_loyalty_transaction(%L::uuid, 0, 'Zero Sprint7', 'sprint7-loyalty-0003')$$,
    :'customer_email'
  ),
  '23514',
  null,
  'zero loyalty points are rejected'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '33333333-7333-4333-8333-333333333333', 'role', 'authenticated')::text,
  true
);

select is(
  public.record_loyalty_transaction(
    :'customer_email'::uuid, 25, 'Premio Sprint7', 'sprint7-loyalty-0004'
  ),
  75,
  'the marketing role can record loyalty points'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '22222222-7222-4222-8222-222222222222', 'role', 'authenticated')::text,
  true
);

select throws_ok(
  format(
    $$select public.record_loyalty_transaction(%L::uuid, 10, 'Intruso Sprint7', 'sprint7-loyalty-0005')$$,
    :'customer_email'
  ),
  '42501',
  null,
  'owner B cannot record loyalty points for restaurant A customers'
);

reset role;

-- ---------------------------------------------------------------------------
-- Marketing e inbox messaggi
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '33333333-7333-4333-8333-333333333333', 'role', 'authenticated')::text,
  true
);

select is(
  (select count(*)::int from public.marketing_campaigns where restaurant_id = :'restaurant_a'::uuid),
  1,
  'the marketing role can read the campaigns'
);

select lives_ok(
  format(
    $$insert into public.marketing_campaigns (organization_id, restaurant_id, name, channel, body, segment)
      values (%L, %L, 'Campagna Sprint7 2', 'email', 'Seconda campagna', 'all')$$,
    :'org_a',
    :'restaurant_a'
  ),
  'the marketing role can create campaigns'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '22222222-7222-4222-8222-222222222222', 'role', 'authenticated')::text,
  true
);

select is(
  (select count(*)::int from public.marketing_campaigns where restaurant_id = :'restaurant_a'::uuid),
  0,
  'owner B cannot read the campaigns of restaurant A'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '44444444-7444-4444-8444-444444444444', 'role', 'authenticated')::text,
  true
);

select is(
  (select count(*)::int from public.customers where restaurant_id = :'restaurant_a'::uuid),
  0,
  'the warehouse role cannot read the customers'
);

reset role;

select public.record_inbound_message(
  'twilio', 'sprint7-twilio-secret-0123456789abcdef', 'sms',
  '+393330000001', '+393339999999', 'Vorrei prenotare per stasera', 'SM-SPRINT7-1'
) as message_a \gset

select is(
  (
    select count(*)::int
    from public.customer_messages
    where id = :'message_a'::uuid
      and customer_id = :'customer_phone'::uuid
      and direction = 'inbound'
      and status = 'received'
  ),
  1,
  'inbound messages are stored and linked to the customer'
);

select throws_ok(
  $$select public.record_inbound_message('twilio', 'sprint7-wrong-secret-00000000', 'sms', '+393330000001', '+393339999999', 'Intruso', 'SM-SPRINT7-2')$$,
  '42501',
  null,
  'inbound messages with a wrong server secret are rejected'
);

select ok(
  (
    select public.record_inbound_message(
      'twilio', 'sprint7-twilio-secret-0123456789abcdef', 'sms',
      '+393330000001', '+390000000000', 'Fuori sede', 'SM-SPRINT7-3'
    ) is null
  ),
  'an inbound message to an unconfigured number returns null'
);

select public.update_message_status_by_provider(
  'twilio', 'sprint7-twilio-secret-0123456789abcdef', 'SM-SPRINT7-1', 'delivered', null
);

select is(
  (select status from public.customer_messages where id = :'message_a'::uuid),
  'delivered',
  'the provider can update the message delivery status'
);

select throws_ok(
  $$select public.update_message_status_by_provider('twilio', 'sprint7-wrong-secret-00000000', 'SM-SPRINT7-1', 'failed', 'boom')$$,
  '42501',
  null,
  'message status updates with a wrong server secret are rejected'
);

-- ---------------------------------------------------------------------------
-- Turni del personale
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-7111-4111-8111-111111111111', 'role', 'authenticated')::text,
  true
);

select lives_ok(
  format(
    $$insert into public.staff_shifts (organization_id, restaurant_id, membership_id, starts_at, ends_at)
      values (%L, %L, %L, now() + interval '1 day', now() + interval '1 day 8 hours')$$,
    :'org_a',
    :'restaurant_a',
    :'membership_marketing'
  ),
  'the owner can schedule a staff shift'
);

select throws_ok(
  format(
    $$insert into public.staff_shifts (organization_id, restaurant_id, membership_id, starts_at, ends_at)
      values (%L, %L, %L, now() + interval '2 day', now() + interval '2 day - 1 hour')$$,
    :'org_a',
    :'restaurant_a',
    :'membership_marketing'
  ),
  '23514',
  null,
  'a shift cannot end before it starts'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '22222222-7222-4222-8222-222222222222', 'role', 'authenticated')::text,
  true
);

select is(
  (select count(*)::int from public.staff_shifts where restaurant_id = :'restaurant_a'::uuid),
  0,
  'owner B cannot read the shifts of restaurant A'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '44444444-7444-4444-8444-444444444444', 'role', 'authenticated')::text,
  true
);

select throws_ok(
  format(
    $$insert into public.staff_shifts (organization_id, restaurant_id, membership_id, starts_at, ends_at)
      values (%L, %L, %L, now() + interval '3 day', now() + interval '3 day 4 hours')$$,
    :'org_a',
    :'restaurant_a',
    :'membership_marketing'
  ),
  '42501',
  null,
  'the warehouse role cannot schedule shifts'
);

reset role;

-- ---------------------------------------------------------------------------
-- Stampanti e coda di stampa
-- ---------------------------------------------------------------------------

select is(
  (select status from public.print_jobs where id = :'job_a'::uuid),
  'queued',
  'a new print job is queued'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '33333333-7333-4333-8333-333333333333', 'role', 'authenticated')::text,
  true
);

select throws_ok(
  format(
    $$insert into public.print_jobs (organization_id, restaurant_id, job_type, payload, idempotency_key)
      values (%L, %L, 'receipt', '{}', 'sprint7-print-0002')$$,
    :'org_a',
    :'restaurant_a'
  ),
  '42501',
  null,
  'the marketing role cannot enqueue print jobs'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '22222222-7222-4222-8222-222222222222', 'role', 'authenticated')::text,
  true
);

select is(
  (select count(*)::int from public.print_jobs where restaurant_id = :'restaurant_a'::uuid),
  0,
  'owner B cannot read the print jobs of restaurant A'
);

reset role;

select is(
  jsonb_array_length(
    public.claim_print_jobs('sprint7-local-secret-0123456789abcdef', 10)
  ),
  1,
  'the local service claims the queued print jobs'
);

select throws_ok(
  $$select public.claim_print_jobs('sprint7-wrong-secret-00000000', 10)$$,
  '42501',
  null,
  'claim_print_jobs rejects a wrong server secret'
);

select is(
  (select status from public.print_jobs where id = :'job_a'::uuid),
  'printing',
  'the claimed print job moves to printing'
);

select public.complete_print_job(
  'sprint7-local-secret-0123456789abcdef', :'job_a'::uuid, 'printed', null
);

select is(
  (select status from public.print_jobs where id = :'job_a'::uuid),
  'printed',
  'the local service can mark the print job as printed'
);

select throws_ok(
  format(
    $$select public.complete_print_job('sprint7-wrong-secret-00000000', %L::uuid, 'printed', null)$$,
    :'job_a'
  ),
  '42501',
  null,
  'complete_print_job rejects a wrong server secret'
);

-- ---------------------------------------------------------------------------
-- Abbonamenti Stripe
-- ---------------------------------------------------------------------------

select is(
  public.process_stripe_subscription_event(
    'sprint7-stripe-secret-0123456789abcdef',
    'evt_sprint7_1',
    'customer.subscription.created',
    :'org_a'::uuid,
    'cus_sprint7',
    'sub_sprint7',
    'active',
    'pro',
    'year'
  ),
  true,
  'a signed Stripe subscription event is processed'
);

select is(
  (select plan_status from public.organizations where id = :'org_a'::uuid),
  'active',
  'the organization plan status is activated'
);

select is(
  (select requested_plan from public.organizations where id = :'org_a'::uuid),
  'pro',
  'the requested plan is stored from the event'
);

select is(
  (select billing_interval from public.organizations where id = :'org_a'::uuid),
  'year',
  'the billing interval is stored from the event'
);

select throws_ok(
  $$select public.process_stripe_subscription_event('sprint7-wrong-secret-00000000', 'evt_sprint7_2', 'customer.subscription.created', '11111111-1111-1111-1111-111111111111', 'cus_x', 'sub_x', 'active', 'pro', 'year')$$,
  '42501',
  null,
  'Stripe events with a wrong server secret are rejected'
);

select throws_ok(
  format(
    $$select public.process_stripe_subscription_event(%L, 'evt_sprint7_3', 'customer.subscription.created', %L, 'cus_x', 'sub_x', 'active', 'platinum', 'year')$$,
    'sprint7-stripe-secret-0123456789abcdef',
    :'org_a'
  ),
  '22023',
  null,
  'an invalid plan id is rejected'
);

select is(
  public.process_stripe_subscription_event(
    'sprint7-stripe-secret-0123456789abcdef',
    'evt_sprint7_1',
    'customer.subscription.created',
    :'org_a'::uuid,
    'cus_sprint7',
    'sub_sprint7',
    'active',
    'pro',
    'year'
  ),
  true,
  'a duplicate Stripe event id is idempotent'
);

select is(
  public.process_stripe_subscription_event(
    'sprint7-stripe-secret-0123456789abcdef',
    'evt_sprint7_4',
    'customer.subscription.deleted',
    :'org_a'::uuid,
    'cus_sprint7',
    'sub_sprint7',
    'canceled',
    null,
    null
  ),
  true,
  'a cancellation event is processed'
);

select is(
  (select plan_status from public.organizations where id = :'org_a'::uuid),
  'canceled',
  'the organization plan status follows the cancellation'
);

-- ---------------------------------------------------------------------------
-- Isolamento anonimo
-- ---------------------------------------------------------------------------

set local role anon;
select set_config('request.jwt.claims', '{}', true);

select is(
  (select count(*)::int from public.customers),
  0,
  'anon cannot read any customer'
);

select is(
  (select count(*)::int from public.online_orders),
  0,
  'anon cannot read any online order'
);

select is(
  (select count(*)::int from public.print_jobs),
  0,
  'anon cannot read any print job'
);

reset role;

select * from finish();
rollback;
