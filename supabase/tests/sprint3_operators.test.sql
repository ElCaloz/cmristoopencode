begin;

create extension if not exists pgtap with schema extensions;
grant usage on schema extensions to authenticated, anon;
grant execute on all functions in schema extensions to authenticated, anon;
set local search_path = public, extensions, pg_temp;

select plan(81);

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
    '66666666-eeee-4eee-8eee-666666666666',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'ops-owner-a@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Ops Owner A"}'
  ),
  (
    '77777777-eeee-4eee-8eee-777777777777',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'ops-waiter-a@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Ops Waiter A"}'
  ),
  (
    'aaaaaaaa-eeee-4eee-8eee-aaaaaaaaaaaa',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'ops-accountant-a@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Ops Accountant A"}'
  ),
  (
    '88888888-eeee-4eee-8eee-888888888888',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'ops-owner-b@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Ops Owner B"}'
  );

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '66666666-eeee-4eee-8eee-666666666666', 'role', 'authenticated')::text,
  true
);
select public.create_organization('Ops Org A', 'ops-org-a', 'Ristorante Ops A');

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '88888888-eeee-4eee-8eee-888888888888', 'role', 'authenticated')::text,
  true
);
select public.create_organization('Ops Org B', 'ops-org-b', 'Ristorante Ops B');

reset role;
select set_config('request.jwt.claims', '{}', true);

select id as org_a from public.organizations where slug = 'ops-org-a' \gset
select id as org_b from public.organizations where slug = 'ops-org-b' \gset
select id as restaurant_a from public.restaurants
  where organization_id = :'org_a' and slug = 'main' \gset
select id as restaurant_b from public.restaurants
  where organization_id = :'org_b' and slug = 'main' \gset

insert into public.memberships (user_id, organization_id, restaurant_id, role_id)
select '77777777-eeee-4eee-8eee-777777777777', :'org_a', :'restaurant_a', r.id
from public.roles r
where r.key = 'waiter';

insert into public.memberships (user_id, organization_id, restaurant_id, role_id)
select 'aaaaaaaa-eeee-4eee-8eee-aaaaaaaaaaaa', :'org_a', :'restaurant_a', r.id
from public.roles r
where r.key = 'accountant';

insert into public.memberships (user_id, organization_id, restaurant_id, role_id)
select '88888888-eeee-4eee-8eee-888888888888', :'org_b', :'restaurant_b', r.id
from public.roles r
where r.key = 'waiter';

select id as owner_membership from public.memberships
  where user_id = '66666666-eeee-4eee-8eee-666666666666' and organization_id = :'org_a' \gset
select id as waiter_membership from public.memberships
  where user_id = '77777777-eeee-4eee-8eee-777777777777' and organization_id = :'org_a' \gset
select id as accountant_membership from public.memberships
  where user_id = 'aaaaaaaa-eeee-4eee-8eee-aaaaaaaaaaaa' and organization_id = :'org_a' \gset
select m.id as waiter_b_membership from public.memberships m
  join public.roles r on r.id = m.role_id
  where m.user_id = '88888888-eeee-4eee-8eee-888888888888'
    and m.organization_id = :'org_b'
    and r.key = 'waiter' \gset

insert into public.operator_pins (membership_id, pin_hash)
values (
  :'waiter_b_membership',
  extensions.crypt('4321', extensions.gen_salt('bf'))
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '77777777-eeee-4eee-8eee-777777777777', 'role', 'authenticated')::text,
  true
);

select lives_ok(
  format($$select public.set_operator_pin(%L, '1234')$$, :'waiter_membership'),
  'a waiter can set their own PIN'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '66666666-eeee-4eee-8eee-666666666666', 'role', 'authenticated')::text,
  true
);

select lives_ok(
  format($$select public.set_operator_pin(%L, '1234')$$, :'waiter_membership'),
  'an owner with devices.manage can reset the PIN of any member'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'aaaaaaaa-eeee-4eee-8eee-aaaaaaaaaaaa', 'role', 'authenticated')::text,
  true
);

select lives_ok(
  format($$select public.set_operator_pin(%L, '9999')$$, :'accountant_membership'),
  'a member without devices.manage can still set their own PIN'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '66666666-eeee-4eee-8eee-666666666666', 'role', 'authenticated')::text,
  true
);

select throws_ok(
  format($$select public.set_operator_pin(%L, '123')$$, :'waiter_membership'),
  '23514',
  null,
  'a PIN shorter than 4 digits is rejected'
);
select throws_ok(
  format($$select public.set_operator_pin(%L, '1234567')$$, :'waiter_membership'),
  '23514',
  null,
  'a PIN longer than 6 digits is rejected'
);
select throws_ok(
  format($$select public.set_operator_pin(%L, 'abcd')$$, :'waiter_membership'),
  '23514',
  null,
  'a PIN with letters is rejected'
);
select throws_ok(
  format($$select public.set_operator_pin(%L, '1234')$$, '11111111-1111-4111-8111-111111111111'),
  'P0002',
  null,
  'setting a PIN for an unknown membership fails'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '77777777-eeee-4eee-8eee-777777777777', 'role', 'authenticated')::text,
  true
);

select throws_ok(
  format($$select public.set_operator_pin(%L, '5555')$$, :'accountant_membership'),
  '42501',
  null,
  'a waiter cannot set the PIN of another member'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

select ok(
  (select pin_hash ~ '^\$2' from public.operator_pins where membership_id = :'waiter_membership'),
  'the PIN is stored as a bcrypt hash'
);
select ok(
  (select position('1234' in pin_hash) = 0 from public.operator_pins where membership_id = :'waiter_membership'),
  'the plaintext PIN never appears in the stored hash'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '66666666-eeee-4eee-8eee-666666666666', 'role', 'authenticated')::text,
  true
);

select is(
  (select count(*) from public.operator_pins_overview(:'restaurant_a')),
  3::bigint,
  'the overview lists every non suspended member of the restaurant'
);
select is(
  (
    select has_pin
    from public.operator_pins_overview(:'restaurant_a')
    where membership_id = :'waiter_membership'
  ),
  true,
  'the overview reports the waiter as having a PIN'
);
select is(
  (
    select locked_until
    from public.operator_pins_overview(:'restaurant_a')
    where membership_id = :'waiter_membership'
  ),
  null::timestamptz,
  'a fresh PIN is not locked'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '77777777-eeee-4eee-8eee-777777777777', 'role', 'authenticated')::text,
  true
);

select throws_ok(
  format($$select * from public.operator_pins_overview(%L)$$, :'restaurant_a'),
  '42501',
  null,
  'the operator PIN overview requires devices.manage'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

set local role anon;
select set_config('request.jwt.claims', '{}', true);

select is(
  (select count(*) from public.operator_pins),
  0::bigint,
  'anonymous callers cannot read the PIN table'
);
select is(
  (select count(*) from public.operator_sessions),
  0::bigint,
  'anonymous callers cannot read the session table'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '66666666-eeee-4eee-8eee-666666666666', 'role', 'authenticated')::text,
  true
);

select is(
  (select count(*) from public.operator_pins),
  0::bigint,
  'even an owner cannot read the PIN table directly'
);
select is(
  (select count(*) from public.operator_sessions),
  0::bigint,
  'even an owner cannot read the session table directly'
);

select public.create_device(:'restaurant_a', 'Palmare Ops 1') ->> 'pairing_code' as code1 \gset
select public.create_device(:'restaurant_a', 'Palmare Ops 2') ->> 'pairing_code' as code2 \gset

reset role;
select set_config('request.jwt.claims', '{}', true);

set local role anon;
select set_config('request.jwt.claims', '{}', true);

select public.claim_device_pairing(:'code1', 'palmare-test') ->> 'token' as token1 \gset
select public.claim_device_pairing(:'code2', 'palmare-test') ->> 'token' as token2 \gset

select is(
  (select count(*) from public.palmare_operators(:'token1')),
  1::bigint,
  'the palmare operator list shows only members with a PIN and orders.manage'
);
select is(
  (select full_name from public.palmare_operators(:'token1')),
  'Ops Waiter A',
  'the palmare operator list reports the operator name'
);
select throws_ok(
  $$select * from public.palmare_operators(repeat('a', 63))$$,
  '28000',
  null,
  'a malformed device token is rejected'
);

select public.verify_operator_pin(:'token1', :'waiter_membership', '0000') as wrong1 \gset
select is((:'wrong1')::jsonb ->> 'status', 'invalid_pin', 'a wrong PIN is rejected');
select is((:'wrong1')::jsonb ->> 'locked', 'false', 'a single wrong attempt does not lock the operator');

reset role;
select set_config('request.jwt.claims', '{}', true);

select is(
  (
    select failed_attempts
    from public.operator_pins
    where membership_id = :'waiter_membership'
  ),
  1,
  'a wrong PIN increments the failed attempt counter'
);

set local role anon;
select set_config('request.jwt.claims', '{}', true);

select public.verify_operator_pin(:'token1', :'waiter_membership', '0000') as wrong2 \gset
select is((:'wrong2')::jsonb ->> 'status', 'invalid_pin', 'the second wrong PIN is rejected');
select public.verify_operator_pin(:'token1', :'waiter_membership', '0000') as wrong3 \gset
select is((:'wrong3')::jsonb ->> 'status', 'invalid_pin', 'the third wrong PIN is rejected');
select public.verify_operator_pin(:'token1', :'waiter_membership', '0000') as wrong4 \gset
select is((:'wrong4')::jsonb ->> 'status', 'invalid_pin', 'the fourth wrong PIN is rejected');
select public.verify_operator_pin(:'token1', :'waiter_membership', '0000') as wrong5 \gset
select is((:'wrong5')::jsonb ->> 'status', 'invalid_pin', 'the fifth wrong PIN is rejected');
select is((:'wrong5')::jsonb ->> 'locked', 'true', 'the fifth wrong attempt locks the operator');

reset role;
select set_config('request.jwt.claims', '{}', true);

select ok(
  (
    select locked_until is not null
    from public.operator_pins
    where membership_id = :'waiter_membership'
  ),
  'five wrong attempts set the temporary lock'
);
select is(
  (
    select failed_attempts
    from public.operator_pins
    where membership_id = :'waiter_membership'
  ),
  0,
  'the attempt counter is reset when the lock is applied'
);

set local role anon;
select set_config('request.jwt.claims', '{}', true);

select throws_ok(
  format($$select public.verify_operator_pin(%L, %L, '1234')$$, :'token1', :'waiter_membership'),
  '28000',
  null,
  'the correct PIN is refused while the operator is locked'
);
select throws_ok(
  format($$select public.verify_operator_pin(%L, %L, 'ab12')$$, :'token1', :'waiter_membership'),
  '28000',
  null,
  'a PIN with non numeric characters is rejected before verification'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

update public.operator_pins
set locked_until = null
where membership_id = :'waiter_membership';

set local role anon;
select set_config('request.jwt.claims', '{}', true);

select public.verify_operator_pin(:'token1', :'waiter_membership', '1234') as login1 \gset

select matches(
  (:'login1')::jsonb ->> 'session_token',
  '^[0-9a-f]{64}$',
  'a successful PIN login returns a 256 bit hex session token'
);
select is(
  (:'login1')::jsonb ->> 'operator_full_name',
  'Ops Waiter A',
  'the login response identifies the operator'
);
select is(
  (:'login1')::jsonb ->> 'role_key',
  'waiter',
  'the login response reports the operator role'
);
select is(
  (:'login1')::jsonb ->> 'device_name',
  'Palmare Ops 1',
  'the login response reports the device'
);

select (:'login1')::jsonb ->> 'session_token' as session1 \gset

select throws_ok(
  format($$select public.verify_operator_pin(%L, %L, '9999')$$, :'token1', :'accountant_membership'),
  '28000',
  null,
  'a role without orders.manage cannot log in on a palmare'
);

select throws_ok(
  format($$select public.verify_operator_pin(%L, %L, '4321')$$, :'token1', :'waiter_b_membership'),
  '28000',
  null,
  'a membership from another tenant cannot log in on this device'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

select ok(
  (
    select token_hash ~ '^[0-9a-f]{64}$' and token_hash <> :'session1'
    from public.operator_sessions
    where membership_id = :'waiter_membership' and revoked_at is null
  ),
  'the session token is stored only as a hash'
);

set local role anon;
select set_config('request.jwt.claims', '{}', true);

select public.operator_session_context(:'session1') as ctx1 \gset

select is(
  (:'ctx1')::jsonb ->> 'operator_full_name',
  'Ops Waiter A',
  'the session context resolves the operator'
);
select is(
  (:'ctx1')::jsonb ->> 'restaurant_id',
  :'restaurant_a',
  'the session context resolves the restaurant'
);
select throws_ok(
  $$select public.operator_session_context(repeat('b', 64))$$,
  '28000',
  null,
  'an unknown session token is rejected'
);
select throws_ok(
  $$select public.operator_session_context('not-a-token')$$,
  '28000',
  null,
  'a malformed session token is rejected'
);

select public.verify_operator_pin(:'token1', :'waiter_membership', '1234') as login2 \gset
select (:'login2')::jsonb ->> 'session_token' as session2 \gset

select throws_ok(
  format($$select public.operator_session_context(%L)$$, :'session1'),
  '28000',
  null,
  'a new login on the same device revokes the previous session'
);
select public.operator_session_context(:'session2') as ctx2 \gset
select is(
  (:'ctx2')::jsonb ->> 'device_name',
  'Palmare Ops 1',
  'the new session is valid on the same device'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

update public.operator_sessions
set issued_at = now() - interval '2 hours',
    expires_at = now() - interval '1 minute'
where token_hash = public._operator_token_hash(:'session2');

set local role anon;
select set_config('request.jwt.claims', '{}', true);

select throws_ok(
  format($$select public.operator_session_context(%L)$$, :'session2'),
  '28000',
  null,
  'an expired session is rejected'
);

set local role anon;
select set_config('request.jwt.claims', '{}', true);

select public.verify_operator_pin(:'token1', :'waiter_membership', '1234') as login3 \gset
select (:'login3')::jsonb ->> 'session_token' as session3 \gset

reset role;
select set_config('request.jwt.claims', '{}', true);

update public.operator_sessions
set last_seen_at = now() - interval '16 minutes'
where token_hash = public._operator_token_hash(:'session3');

set local role anon;
select set_config('request.jwt.claims', '{}', true);

select throws_ok(
  format($$select public.operator_session_context(%L)$$, :'session3'),
  '28000',
  null,
  'a session idle for more than 15 minutes is rejected'
);

set local role anon;
select set_config('request.jwt.claims', '{}', true);

select public.verify_operator_pin(:'token1', :'waiter_membership', '1234') as login4 \gset
select (:'login4')::jsonb ->> 'session_token' as session4 \gset

select is(public.operator_logout(:'session4'), true, 'logout revokes the session');
select throws_ok(
  format($$select public.operator_session_context(%L)$$, :'session4'),
  '28000',
  null,
  'a session revoked by logout is rejected'
);
select is(public.operator_logout(:'session4'), false, 'logging out twice is an idempotent no-op');

select public.verify_operator_pin(:'token2', :'waiter_membership', '1234') as login5 \gset
select (:'login5')::jsonb ->> 'session_token' as session5 \gset
select public.operator_session_context(:'session5') as ctx5 \gset
select is((:'ctx5')::jsonb ->> 'device_name', 'Palmare Ops 2', 'the second palmare starts its own session');

reset role;
select set_config('request.jwt.claims', '{}', true);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '66666666-eeee-4eee-8eee-666666666666', 'role', 'authenticated')::text,
  true
);

select public.set_device_status(
  (select id from public.devices where name = 'Palmare Ops 2'),
  'block'
) ->> 'status' as blocked_status \gset
select is(:'blocked_status'::text, 'blocked', 'an owner can block a palmare');

reset role;
select set_config('request.jwt.claims', '{}', true);

set local role anon;
select set_config('request.jwt.claims', '{}', true);

select throws_ok(
  format($$select public.operator_session_context(%L)$$, :'session5'),
  '28000',
  null,
  'blocking the device closes its open operator session'
);
select throws_ok(
  format($$select public.verify_operator_pin(%L, %L, '1234')$$, :'token2', :'waiter_membership'),
  '28000',
  null,
  'a blocked device rejects the stored device token'
);

select public.device_heartbeat(:'token1') as hb1 \gset

select is((:'hb1')::jsonb ->> 'device_name', 'Palmare Ops 1', 'the heartbeat identifies the device');
select is((:'hb1')::jsonb ->> 'restaurant_id', :'restaurant_a', 'the heartbeat identifies the restaurant');
select throws_ok(
  $$select public.device_heartbeat(repeat('c', 64))$$,
  '28000',
  null,
  'the heartbeat rejects unknown device tokens'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

select ok(
  (
    select last_seen_at > now() - interval '1 minute'
    from public.devices
    where name = 'Palmare Ops 1'
  ),
  'the heartbeat updates the last seen timestamp'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '66666666-eeee-4eee-8eee-666666666666', 'role', 'authenticated')::text,
  true
);

select public.set_operator_pin(:'waiter_membership', '1234');
select is(public.clear_operator_pin(:'waiter_membership'), true, 'clearing an existing PIN returns true');

reset role;
select set_config('request.jwt.claims', '{}', true);

select is(
  (select count(*) from public.operator_pins where membership_id = :'waiter_membership'),
  0::bigint,
  'clearing the PIN removes the stored hash'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '66666666-eeee-4eee-8eee-666666666666', 'role', 'authenticated')::text,
  true
);

select is(public.clear_operator_pin(:'waiter_membership'), false, 'clearing a missing PIN is an idempotent no-op');

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '77777777-eeee-4eee-8eee-777777777777', 'role', 'authenticated')::text,
  true
);

select throws_ok(
  format($$select public.clear_operator_pin(%L)$$, :'accountant_membership'),
  '42501',
  null,
  'a waiter cannot clear the PIN of another member'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '66666666-eeee-4eee-8eee-666666666666', 'role', 'authenticated')::text,
  true
);

select public.set_operator_pin(:'waiter_membership', '1234');

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'aaaaaaaa-eeee-4eee-8eee-aaaaaaaaaaaa', 'role', 'authenticated')::text,
  true
);
select is(public.clear_operator_pin(:'accountant_membership'), true, 'a member can clear their own PIN');

reset role;
select set_config('request.jwt.claims', '{}', true);

insert into public.floor_areas (organization_id, restaurant_id, name)
values (:'org_a', :'restaurant_a', 'Sala Ops');

select id as area_ops from public.floor_areas
  where restaurant_id = :'restaurant_a' and name = 'Sala Ops' \gset

insert into public.restaurant_tables (organization_id, restaurant_id, area_id, name, seats)
values (:'org_a', :'restaurant_a', :'area_ops', 'T1 Ops', 4);

insert into public.restaurant_tables (organization_id, restaurant_id, area_id, name, seats)
values (:'org_a', :'restaurant_a', null, 'L1 Ops', 2);

select id as table_t1 from public.restaurant_tables
  where restaurant_id = :'restaurant_a' and name = 'T1 Ops' \gset

insert into public.orders (organization_id, restaurant_id, table_id, guests, opened_by)
values (:'org_a', :'restaurant_a', :'table_t1', 2, '77777777-eeee-4eee-8eee-777777777777')
returning id as order_ops \gset

insert into public.order_items (
  organization_id,
  restaurant_id,
  order_id,
  name,
  unit_price_cents,
  quantity,
  status,
  created_at
)
values
  (:'org_a', :'restaurant_a', :'order_ops', 'Pizza Ops', 800, 2, 'pending', now() - interval '3 minutes'),
  (:'org_a', :'restaurant_a', :'order_ops', 'Acqua Ops', 200, 1, 'ready', now() - interval '2 minutes'),
  (:'org_a', :'restaurant_a', :'order_ops', 'Insalata Ops', 500, 1, 'cancelled', now() - interval '1 minute');

set local role anon;
select set_config('request.jwt.claims', '{}', true);

select public.verify_operator_pin(:'token1', :'waiter_membership', '1234') as login6 \gset
select (:'login6')::jsonb ->> 'session_token' as session6 \gset
select public.palmare_board(:'session6') as board1 \gset

select is(jsonb_array_length((:'board1')::jsonb -> 'areas'), 1, 'the board lists the dining areas');
select is((:'board1')::jsonb #>> '{areas,0,name}', 'Sala Ops', 'the board reports the area name');
select is(jsonb_array_length((:'board1')::jsonb #> '{areas,0,tables}'), 1, 'the board lists the area tables');
select is((:'board1')::jsonb #>> '{areas,0,tables,0,name}', 'T1 Ops', 'the board reports the table name');
select is((:'board1')::jsonb #>> '{areas,0,tables,0,order,guests}', '2', 'the board reports the open order guests');
select is((:'board1')::jsonb #>> '{areas,0,tables,0,order,total_cents}', '1800', 'the board totals the open order excluding cancelled items');
select is((:'board1')::jsonb #>> '{areas,0,tables,0,order,active_count}', '1', 'the board counts pending and preparing items');
select is((:'board1')::jsonb #>> '{areas,0,tables,0,order,ready_count}', '1', 'the board counts ready to serve items');
select is(
  jsonb_array_length((:'board1')::jsonb #> '{areas,0,tables,0,order,items}'),
  2,
  'the board excludes cancelled items from the order detail'
);
select is(jsonb_array_length((:'board1')::jsonb -> 'loose_tables'), 1, 'the board lists tables without an area');
select is(
  (:'board1')::jsonb #> '{loose_tables,0,order}',
  'null'::jsonb,
  'a free table has no open order on the board'
);
select is((:'board1')::jsonb ->> 'operator_full_name', 'Ops Waiter A', 'the board reports the logged in operator');
select is((:'board1')::jsonb ->> 'device_name', 'Palmare Ops 1', 'the board reports the device');

select throws_ok(
  format($$select public.palmare_board(%L)$$, repeat('d', 64)),
  '28000',
  null,
  'the board rejects unknown session tokens'
);

select public.operator_logout(:'session6');

reset role;
select set_config('request.jwt.claims', '{}', true);

select throws_ok(
  format(
    $$insert into public.operator_sessions (device_id, membership_id, restaurant_id, token_hash, expires_at)
      select d.id, %L, %L, 'not-a-hash', now() + interval '1 hour'
      from public.devices d where d.name = 'Palmare Ops 1'$$,
    :'waiter_membership',
    :'restaurant_a'
  ),
  '23514',
  null,
  'a session token hash with the wrong format is rejected'
);

select throws_ok(
  format(
    $$insert into public.operator_sessions (device_id, membership_id, restaurant_id, token_hash, expires_at)
      select d.id, %L, %L, repeat('e', 64), now() - interval '1 hour'
      from public.devices d where d.name = 'Palmare Ops 1'$$,
    :'waiter_membership',
    :'restaurant_a'
  ),
  '23514',
  null,
  'a session that expires before it is issued is rejected'
);

insert into public.operator_sessions (device_id, membership_id, restaurant_id, token_hash, expires_at)
select d.id, :'waiter_membership', :'restaurant_a', repeat('f', 64), now() + interval '1 hour'
from public.devices d where d.name = 'Palmare Ops 1';

select throws_ok(
  format(
    $$insert into public.operator_sessions (device_id, membership_id, restaurant_id, token_hash, expires_at)
      select d.id, %L, %L, repeat('9', 64), now() + interval '1 hour'
      from public.devices d where d.name = 'Palmare Ops 1'$$,
    :'waiter_membership',
    :'restaurant_a'
  ),
  '23505',
  null,
  'a device can have at most one open operator session'
);

select * from finish();
rollback;
