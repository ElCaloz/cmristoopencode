begin;

create extension if not exists pgtap with schema extensions;
grant usage on schema extensions to authenticated, anon;
grant execute on all functions in schema extensions to authenticated, anon;
set local search_path = public, extensions, pg_temp;

select plan(72);

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
    'a1a1a1a1-5555-4555-8555-a1a1a1a1a1a1',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'receptionist-owner-a@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Receptionist Owner A"}'
  ),
  (
    'b2b2b2b2-5555-4555-8555-b2b2b2b2b2b2',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'receptionist-owner-b@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Receptionist Owner B"}'
  ),
  (
    'c3c3c3c3-5555-4555-8555-c3c3c3c3c3c3',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'receptionist-host-a@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Receptionist Host A"}'
  ),
  (
    'd4d4d4d4-5555-4555-8555-d4d4d4d4d4d4',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'receptionist-cashier-a@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Receptionist Cashier A"}'
  );

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a1a1a1a1-5555-4555-8555-a1a1a1a1a1a1', 'role', 'authenticated')::text,
  true
);
select lives_ok(
  $$select public.create_organization('Receptionist Org A', 's5-org-a', 'Ristorante Receptionist A')$$,
  'owner A can create an organization'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'b2b2b2b2-5555-4555-8555-b2b2b2b2b2b2', 'role', 'authenticated')::text,
  true
);
select lives_ok(
  $$select public.create_organization('Receptionist Org B', 's5-org-b', 'Ristorante Receptionist B')$$,
  'owner B can create an organization'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

select id as org_a from public.organizations where slug = 's5-org-a' \gset
select id as org_b from public.organizations where slug = 's5-org-b' \gset
select id as restaurant_a from public.restaurants where organization_id = :'org_a' and slug = 'main' \gset
select id as restaurant_b from public.restaurants where organization_id = :'org_b' and slug = 'main' \gset
select (current_date + 7) as reservation_date \gset
select (current_date + 8) as closed_date \gset
select (current_date + 9) as ai_date \gset
select (current_date + 10) as ai_rejected_date \gset

insert into public.memberships (user_id, organization_id, restaurant_id, role_id)
select 'c3c3c3c3-5555-4555-8555-c3c3c3c3c3c3', :'org_a', :'restaurant_a', r.id
from public.roles r
where r.key = 'host';

insert into public.memberships (user_id, organization_id, restaurant_id, role_id)
select 'd4d4d4d4-5555-4555-8555-d4d4d4d4d4d4', :'org_a', :'restaurant_a', r.id
from public.roles r
where r.key = 'cashier';

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a1a1a1a1-5555-4555-8555-a1a1a1a1a1a1', 'role', 'authenticated')::text,
  true
);

select lives_ok(
  format(
    $$insert into public.restaurant_opening_hours (organization_id, restaurant_id, weekday, opens_at, closes_at)
      select %L, %L, day, '12:00', '23:00' from generate_series(1, 7) as day$$,
    :'org_a',
    :'restaurant_a'
  ),
  'owner A can configure opening hours'
);

select lives_ok(
  format(
    $$insert into public.restaurant_tables (organization_id, restaurant_id, name, seats)
      values (%L, %L, 'T1', 4)$$,
    :'org_a',
    :'restaurant_a'
  ),
  'owner A can create capacity for reservations'
);

select lives_ok(
  format(
    $$update public.receptionist_settings
      set is_enabled = true,
          inbound_phone_number = '+390212345678',
          transfer_phone = '+390212345679',
          max_daily_calls = 100,
          reservation_duration_minutes = 90,
          max_party_size = 8,
          min_notice_minutes = 60,
          max_days_ahead = 60
      where restaurant_id = %L$$,
    :'restaurant_a'
  ),
  'owner A can configure the receptionist'
);

select throws_ok(
  format(
    $$update public.receptionist_settings set inbound_phone_number = '123' where restaurant_id = %L$$,
    :'restaurant_a'
  ),
  '23514',
  null,
  'invalid inbound phone numbers are rejected'
);

select lives_ok(
  format(
    $$insert into public.restaurant_closed_dates (organization_id, restaurant_id, closed_on, reason)
      values (%L, %L, %L, 'Chiusura straordinaria')$$,
    :'org_a',
    :'restaurant_a',
    :'closed_date'
  ),
  'owner A can add a closed date'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'b2b2b2b2-5555-4555-8555-b2b2b2b2b2b2', 'role', 'authenticated')::text,
  true
);

select lives_ok(
  format(
    $$update public.receptionist_settings
      set inbound_phone_number = '+390298765432',
          is_enabled = false
      where restaurant_id = %L$$,
    :'restaurant_b'
  ),
  'owner B can configure its own receptionist'
);

select throws_ok(
  format(
    $$insert into public.restaurant_opening_hours (organization_id, restaurant_id, weekday, opens_at, closes_at)
      values (%L, %L, 1, '12:00', '15:00')$$,
    :'org_b',
    :'restaurant_a'
  ),
  '42501',
  null,
  'owner B cannot configure opening hours for restaurant A'
);

select is(
  (select count(*) from public.receptionist_settings where restaurant_id = :'restaurant_a'),
  0::bigint,
  'owner B cannot read receptionist settings of restaurant A'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'd4d4d4d4-5555-4555-8555-d4d4d4d4d4d4', 'role', 'authenticated')::text,
  true
);

select throws_ok(
  format(
    $$insert into public.restaurant_opening_hours (organization_id, restaurant_id, weekday, opens_at, closes_at)
      values (%L, %L, 2, '12:00', '15:00')$$,
    :'org_a',
    :'restaurant_a'
  ),
  '42501',
  null,
  'cashier cannot configure opening hours'
);

select throws_ok(
  format(
    $$select public.check_reservation_availability(%L, %L, '19:00', 2)$$,
    :'restaurant_a',
    :'reservation_date'
  ),
  '42501',
  null,
  'cashier cannot check availability'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'c3c3c3c3-5555-4555-8555-c3c3c3c3c3c3', 'role', 'authenticated')::text,
  true
);

select is(
  (public.check_reservation_availability(:'restaurant_a', :'reservation_date', '19:00', 2) ->> 'available')::boolean,
  true,
  'host A can check availability'
);

select is(
  (public.check_reservation_availability(:'restaurant_a', :'reservation_date', '10:00', 2) ->> 'reason'),
  'outside_opening_hours',
  'availability rejects times outside opening hours'
);

select is(
  (public.check_reservation_availability(:'restaurant_a', :'reservation_date', '19:00', 9) ->> 'reason'),
  'party_too_large',
  'availability rejects parties above the configured limit'
);

select is(
  (public.check_reservation_availability(:'restaurant_a', (current_date - 1), '19:00', 2) ->> 'reason'),
  'date_in_past',
  'availability rejects past dates'
);

select is(
  (public.check_reservation_availability(:'restaurant_a', (current_date + 61), '19:00', 2) ->> 'reason'),
  'date_too_far',
  'availability rejects dates beyond the configured horizon'
);

select is(
  (public.check_reservation_availability(:'restaurant_a', :'closed_date', '19:00', 2) ->> 'reason'),
  'closed_date',
  'availability rejects closed dates'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'b2b2b2b2-5555-4555-8555-b2b2b2b2b2b2', 'role', 'authenticated')::text,
  true
);

select is(
  (public.check_reservation_availability(:'restaurant_b', :'reservation_date', '19:00', 2) ->> 'reason'),
  'no_capacity',
  'availability rejects restaurants without active tables'
);

select throws_ok(
  format(
    $$select public.set_reservation_status('00000000-0000-0000-0000-000000000001', 'confirmed')$$
  ),
  'P0002',
  null,
  'missing reservations are rejected'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a1a1a1a1-5555-4555-8555-a1a1a1a1a1a1', 'role', 'authenticated')::text,
  true
);

select (public.create_reservation(
  :'restaurant_a',
  'Mario Rossi',
  '+393331112222',
  3,
  :'reservation_date',
  '19:00',
  null,
  null,
  'dashboard',
  'Tavolo finestra',
  's5-idempotency-1',
  null,
  false
) ->> 'reservation_id') as pending_reservation \gset

select ok(
  :'pending_reservation' is not null,
  'owner A can create a reservation'
);

select is(
  (select status from public.reservations where id = :'pending_reservation'),
  'pending',
  'manual reservations start pending unless confirmed'
);

select is(
  (public.create_reservation(
    :'restaurant_a',
    'Mario Rossi',
    '+393331112222',
    3,
    :'reservation_date',
    '19:00',
    null,
    null,
    'dashboard',
    'Tavolo finestra',
    's5-idempotency-1',
    null,
    false
  ) ->> 'reservation_id'),
  :'pending_reservation',
  'idempotency returns the original reservation'
);

select is(
  (public.create_reservation(
    :'restaurant_a',
    'Mario Rossi',
    '+393331112222',
    3,
    :'reservation_date',
    '19:00',
    null,
    null,
    'dashboard',
    'Tavolo finestra',
    's5-idempotency-1',
    null,
    false
  ) ->> 'created')::boolean,
  false,
  'idempotency reports that no new reservation was created'
);

select is(
  (public.check_reservation_availability(:'restaurant_a', :'reservation_date', '19:00', 2) ->> 'reason'),
  'insufficient_capacity',
  'overlapping reservations cannot exceed active seats'
);

select throws_ok(
  format(
    $$select public.create_reservation(
      %L,
      'Giulia Bianchi',
      '+393334445555',
      2,
      %L,
      '19:00',
      null,
      null,
      'dashboard',
      null,
      's5-idempotency-2',
      null,
      false
    )$$,
    :'restaurant_a',
    :'reservation_date'
  ),
  'P0001',
  null,
  'duplicate overlapping reservations are rejected by the database'
);

select throws_ok(
  format(
    $$select public.create_reservation(
      %L,
      'Giulia Bianchi',
      '+393334445555',
      1,
      %L,
      '21:00',
      null,
      null,
      'phone_ai',
      null,
      's5-ai-without-call',
      null,
      false
    )$$,
    :'restaurant_a',
    :'ai_rejected_date'
  ),
  '22023',
  null,
  'AI reservations require a call identifier'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'c3c3c3c3-5555-4555-8555-c3c3c3c3c3c3', 'role', 'authenticated')::text,
  true
);

select lives_ok(
  format(
    $$select public.set_reservation_status(%L, 'confirmed')$$,
    :'pending_reservation'
  ),
  'host A can confirm a pending reservation'
);

select throws_ok(
  format(
    $$select public.set_reservation_status(%L, 'pending')$$,
    :'pending_reservation'
  ),
  '22023',
  null,
  'confirmed reservations cannot return to pending'
);

select lives_ok(
  format(
    $$select public.set_reservation_status(%L, 'seated')$$,
    :'pending_reservation'
  ),
  'host A can seat a confirmed reservation'
);

select lives_ok(
  format(
    $$select public.set_reservation_status(%L, 'completed')$$,
    :'pending_reservation'
  ),
  'host A can complete a seated reservation'
);

select throws_ok(
  format(
    $$select public.set_reservation_status(%L, 'cancelled')$$,
    :'pending_reservation'
  ),
  '22023',
  null,
  'completed reservations cannot be cancelled'
);

select lives_ok(
  format(
    $$select public.update_reservation_notes(%L, 'Cliente abituale, preferisce tavolo tranquillo')$$,
    :'pending_reservation'
  ),
  'host A can update reservation notes'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'd4d4d4d4-5555-4555-8555-d4d4d4d4d4d4', 'role', 'authenticated')::text,
  true
);

select throws_ok(
  format(
    $$select public.update_reservation_notes(%L, 'Nota non autorizzata')$$,
    :'pending_reservation'
  ),
  '42501',
  null,
  'cashier cannot update reservation notes'
);

select throws_ok(
  format(
    $$select public.set_reservation_status(%L, 'cancelled')$$,
    :'pending_reservation'
  ),
  '42501',
  null,
  'cashier cannot change reservation status'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'b2b2b2b2-5555-4555-8555-b2b2b2b2b2b2', 'role', 'authenticated')::text,
  true
);

select throws_ok(
  format(
    $$select public.set_reservation_status(%L, 'cancelled')$$,
    :'pending_reservation'
  ),
  '42501',
  null,
  'owner B cannot change reservations of restaurant A'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a1a1a1a1-5555-4555-8555-a1a1a1a1a1a1', 'role', 'authenticated')::text,
  true
);

select throws_ok(
  format(
    $$insert into public.reservations (
      organization_id, restaurant_id, customer_name, customer_phone, party_size,
      reservation_date, reservation_time, source
    ) values (%L, %L, 'Intruso', '+393330000000', 1, %L, '19:00', 'dashboard')$$,
    :'org_a',
    :'restaurant_a',
    :'reservation_date'
  ),
  '42501',
  null,
  'authenticated users cannot bypass reservation creation RPCs'
);

select throws_ok(
  format(
    $$update public.reservations set notes = 'aggiornata' where id = %L$$,
    :'pending_reservation'
  ),
  '42501',
  null,
  'authenticated users cannot update reservations directly'
);

select throws_ok(
  format(
    $$delete from public.reservations where id = %L$$,
    :'pending_reservation'
  ),
  '42501',
  null,
  'authenticated users cannot delete reservations directly'
);

select throws_ok(
  format(
    $$insert into public.receptionist_calls (
      organization_id, restaurant_id, provider, provider_call_id, from_phone, to_phone
    ) values (%L, %L, 'livekit', 'manual-bypass', '+391111111111', '+390212345678')$$,
    :'org_a',
    :'restaurant_a'
  ),
  '42501',
  null,
  'authenticated users cannot write call records directly'
);

select throws_ok(
  format(
    $$insert into public.receptionist_messages (
      organization_id, restaurant_id, call_id, role, content
    ) values (%L, %L, '00000000-0000-0000-0000-000000000001', 'system', 'test')$$,
    :'org_a',
    :'restaurant_a'
  ),
  '42501',
  null,
  'authenticated users cannot write messages directly'
);

select is(
  (select count(*) from public.reservations where restaurant_id = :'restaurant_a'),
  1::bigint,
  'owner A can read reservations of its restaurant'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'b2b2b2b2-5555-4555-8555-b2b2b2b2b2b2', 'role', 'authenticated')::text,
  true
);

select is(
  (select count(*) from public.reservations where restaurant_id = :'restaurant_a'),
  0::bigint,
  'owner B cannot read reservations of restaurant A'
);

reset role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

select is(
  (public.resolve_receptionist_tenant('+39 02 1234 5678') ->> 'found')::boolean,
  true,
  'service role can resolve a tenant by called number'
);

select is(
  (public.resolve_receptionist_tenant('+39 02 1234 5678') ->> 'restaurantId')::uuid,
  :'restaurant_a'::uuid,
  'tenant resolution returns the correct restaurant'
);

select is(
  (public.resolve_receptionist_tenant('123') ->> 'reason'),
  'invalid_phone',
  'tenant resolution rejects invalid phone numbers'
);

select (public.begin_receptionist_call(
  's5-call-1',
  '+390212345678',
  '+393331112222',
  'room-s5-1'
) ->> 'callId') as call_id \gset

select ok(
  :'call_id' is not null,
  'service role can start a call for an enabled tenant'
);

select is(
  (public.begin_receptionist_call(
    's5-call-1',
    '+390212345678',
    '+393331112222',
    'room-s5-1'
  ) ->> 'created')::boolean,
  false,
  'starting the same provider call twice is idempotent'
);

select lives_ok(
  format(
    $$select public.add_receptionist_message('s5-call-1', 'caller', 'Vorrei prenotare per due persone')$$
  ),
  'service role can store call messages'
);

select is(
  (public.end_receptionist_call('s5-call-1', 'completed', 'Richiesta gestita', 95) ->> 'changed')::boolean,
  true,
  'service role can end a call'
);

select is(
  (public.end_receptionist_call('s5-call-1', 'completed', 'Richiesta gestita', 95) ->> 'changed')::boolean,
  false,
  'ending the same call twice is idempotent'
);

select throws_ok(
  format(
    $$select public.begin_receptionist_call('s5-call-unknown', '+390200000000', '+393331112222')$$
  ),
  'P0002',
  null,
  'calls from unknown numbers are rejected'
);

select throws_ok(
  format(
    $$select public.begin_receptionist_call('s5-call-disabled', '+390298765432', '+393331112222')$$
  ),
  'P0001',
  null,
  'calls for disabled receptionists are rejected'
);

update public.receptionist_settings
set max_daily_calls = 1
where restaurant_id = :'restaurant_a';

select throws_ok(
  format(
    $$select public.begin_receptionist_call('s5-call-limit', '+390212345678', '+393331112222')$$
  ),
  'P0001',
  null,
  'daily call limits are enforced'
);

update public.receptionist_settings
set max_daily_calls = 100
where restaurant_id = :'restaurant_a';

select (public.create_reservation(
  :'restaurant_a',
  'Anna Verdi',
  '+393337778888',
  2,
  :'ai_date',
  '21:00',
  null,
  null,
  'phone_ai',
  'Prenotazione telefonica',
  's5-ai-1',
  :'call_id'::uuid,
  false
) ->> 'reservation_id') as ai_reservation \gset

select ok(
  :'ai_reservation' is not null,
  'AI can create a pending reservation linked to a call'
);

select is(
  (select status from public.reservations where id = :'ai_reservation'),
  'pending',
  'AI reservations remain pending'
);

select throws_ok(
  format(
    $$select public.create_reservation(
      %L,
      'Anna Verdi',
      '+393337778888',
      1,
      %L,
      '21:00',
      null,
      null,
      'phone_ai',
      null,
      's5-ai-confirm',
      %L,
      true
    )$$,
    :'restaurant_a',
    :'ai_rejected_date',
    :'call_id'
  ),
  '22023',
  null,
  'AI cannot confirm a reservation without human approval'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a1a1a1a1-5555-4555-8555-a1a1a1a1a1a1', 'role', 'authenticated')::text,
  true
);

select throws_ok(
  $$select public.resolve_receptionist_tenant('+390212345678')$$,
  '42501',
  null,
  'authenticated users cannot resolve tenants'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'c3c3c3c3-5555-4555-8555-c3c3c3c3c3c3', 'role', 'authenticated')::text,
  true
);

select is(
  (select count(*) from public.receptionist_calls where restaurant_id = :'restaurant_a'),
  1::bigint,
  'host A can read calls of its restaurant'
);

select is(
  (select count(*) from public.receptionist_messages where restaurant_id = :'restaurant_a'),
  1::bigint,
  'host A can read call messages of its restaurant'
);

select is(
  (select count(*) from public.receptionist_settings where restaurant_id = :'restaurant_a'),
  1::bigint,
  'host A can read receptionist settings'
);

update public.receptionist_settings
set greeting = 'Non autorizzato'
where restaurant_id = :'restaurant_a';

select is(
  (select greeting from public.receptionist_settings where restaurant_id = :'restaurant_a'),
  null::text,
  'host cannot change receptionist settings'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'd4d4d4d4-5555-4555-8555-d4d4d4d4d4d4', 'role', 'authenticated')::text,
  true
);

select is(
  (select count(*) from public.receptionist_calls where restaurant_id = :'restaurant_a'),
  0::bigint,
  'cashier cannot read calls'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'b2b2b2b2-5555-4555-8555-b2b2b2b2b2b2', 'role', 'authenticated')::text,
  true
);

select is(
  (select count(*) from public.receptionist_calls where restaurant_id = :'restaurant_a'),
  0::bigint,
  'owner B cannot read calls of restaurant A'
);

select is(
  (select count(*) from public.receptionist_messages where restaurant_id = :'restaurant_a'),
  0::bigint,
  'owner B cannot read messages of restaurant A'
);

set local role anon;
select set_config('request.jwt.claims', '{}', true);

select is(
  (select count(*) from public.reservations),
  0::bigint,
  'anonymous users cannot read reservations'
);

select is(
  (select count(*) from public.receptionist_settings),
  0::bigint,
  'anonymous users cannot read receptionist settings'
);

select is(
  (select count(*) from public.restaurant_opening_hours),
  0::bigint,
  'anonymous users cannot read opening hours'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

select is(
  (select count(*) from public.role_permissions rp
    join public.roles r on r.id = rp.role_id
    join public.permissions p on p.id = rp.permission_id
    where p.key = 'receptionist.manage'
      and r.key in ('owner', 'admin', 'manager')),
  3::bigint,
  'receptionist management is assigned to owner, admin and manager'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.check_reservation_availability(uuid,date,time without time zone,integer,integer)',
    'execute'
  ),
  'authenticated users can execute the availability RPC'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.resolve_receptionist_tenant(text)',
    'execute'
  ),
  'tenant resolution is restricted to service role'
);

select ok(
  not has_table_privilege('authenticated', 'public.reservations', 'insert'),
  'reservation inserts are restricted to RPCs'
);

select * from finish();
rollback;
