begin;

create extension if not exists pgtap with schema extensions;
grant usage on schema extensions to authenticated, anon;
grant execute on all functions in schema extensions to authenticated, anon;
set local search_path = public, extensions, pg_temp;

select plan(59);

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
    'dev-owner-a@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Dev Owner A"}'
  ),
  (
    '77777777-eeee-4eee-8eee-777777777777',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'dev-waiter-a@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Dev Waiter A"}'
  ),
  (
    '88888888-eeee-4eee-8eee-888888888888',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'dev-owner-b@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Dev Owner B"}'
  ),
  (
    '99999999-eeee-4eee-8eee-999999999999',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'dev-platform@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Dev Platform"}'
  );

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '66666666-eeee-4eee-8eee-666666666666', 'role', 'authenticated')::text,
  true
);
select public.create_organization('Dev Org A', 'dev-org-a', 'Ristorante Dev A');

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '88888888-eeee-4eee-8eee-888888888888', 'role', 'authenticated')::text,
  true
);
select public.create_organization('Dev Org B', 'dev-org-b', 'Ristorante Dev B');

reset role;
select set_config('request.jwt.claims', '{}', true);

select id as org_a from public.organizations where slug = 'dev-org-a' \gset
select id as org_b from public.organizations where slug = 'dev-org-b' \gset
select id as restaurant_a from public.restaurants where organization_id = :'org_a' and slug = 'main' \gset
select id as restaurant_b from public.restaurants where organization_id = :'org_b' and slug = 'main' \gset

insert into public.memberships (user_id, organization_id, restaurant_id, role_id)
select '77777777-eeee-4eee-8eee-777777777777', :'org_a', :'restaurant_a', r.id
from public.roles r
where r.key = 'waiter';

insert into public.platform_admins (user_id)
values ('99999999-eeee-4eee-8eee-999999999999');

select is(
  public.device_limit(),
  4,
  'the palmare limit is 4 in the database'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '66666666-eeee-4eee-8eee-666666666666', 'role', 'authenticated')::text,
  true
);

select public.create_device(:'restaurant_a', 'Palmare 1') as p1 \gset
select is((:'p1')::jsonb ->> 'status', 'pending', 'a new palmare starts as pending');
select matches(
  (:'p1')::jsonb ->> 'pairing_code',
  '^[0-9A-HJKMNP-TV-Z]{8}$',
  'the pairing code uses the unambiguous 8 character alphabet'
);
select ok(
  ((:'p1')::jsonb ->> 'pairing_expires_at')::timestamptz > now(),
  'the pairing code expires in the future'
);
select is((:'p1')::jsonb ->> 'palmari_in_use', '1', 'the first palmare occupies one slot');

select public.create_device(:'restaurant_a', 'Palmare 2') as p2 \gset
select is((:'p2')::jsonb ->> 'status', 'pending', 'the second palmare is created as pending');

select public.create_device(:'restaurant_a', 'Palmare 3') as p3 \gset
select is((:'p3')::jsonb ->> 'status', 'pending', 'the third palmare is created as pending');

select public.create_device(:'restaurant_a', 'Palmare 4') as p4 \gset
select is((:'p4')::jsonb ->> 'status', 'pending', 'the fourth palmare is created as pending');
select is((:'p4')::jsonb ->> 'palmari_in_use', '4', 'the fourth palmare saturates the limit');

reset role;
select set_config('request.jwt.claims', '{}', true);
update public.devices set status = 'offline' where id = ((:'p1')::jsonb ->> 'device_id')::uuid;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '66666666-eeee-4eee-8eee-666666666666', 'role', 'authenticated')::text,
  true
);

select throws_ok(
  format(
    $$select public.create_device(%L, 'Palmare 5')$$,
    :'restaurant_a'
  ),
  '23514',
  null,
  'the fifth palmare is rejected even when one of the four is offline'
);
select throws_ok(
  format($$select public.create_device(%L, '')$$, :'restaurant_a'),
  '23514',
  null,
  'an empty device name is rejected'
);
select throws_ok(
  format($$select public.create_device(%L, repeat('x', 81))$$, :'restaurant_a'),
  '23514',
  null,
  'an overlong device name is rejected'
);
select throws_ok(
  format($$select public.create_device(%L, 'Stampante', 'scanner')$$, :'restaurant_a'),
  '23514',
  null,
  'an unknown device type is rejected'
);
select throws_ok(
  format(
    $$select public.create_device(%L, 'Palmare extra', 'palmare', repeat('x', 41))$$,
    :'restaurant_a'
  ),
  '23514',
  null,
  'an overlong platform string is rejected'
);

select public.create_device(:'restaurant_a', 'Cassa POS', 'pos') as ppos \gset
select is(
  (:'ppos')::jsonb ->> 'status',
  'pending',
  'non palmare devices are not subject to the palmare limit'
);

select public.reissue_device_pairing(((:'p1')::jsonb ->> 'device_id')::uuid) ->> 'pairing_code' as r1 \gset
select public.reissue_device_pairing(((:'p1')::jsonb ->> 'device_id')::uuid) ->> 'pairing_code' as r2 \gset
select isnt(:'r1'::text, :'r2'::text, 'reissuing generates a different pairing code');

reset role;
select set_config('request.jwt.claims', '{}', true);

set local role anon;
select set_config('request.jwt.claims', '{}', true);

select throws_ok(
  format($$select public.claim_device_pairing(%L)$$, :'r1'),
  '28000',
  null,
  'a pairing code replaced by a reissue can no longer be claimed'
);

select public.claim_device_pairing(:'r2', 'browser-test') as claim1 \gset
select is((:'claim1')::jsonb ->> 'status', 'active', 'claiming a valid code activates the device');
select matches(
  (:'claim1')::jsonb ->> 'token',
  '^[0-9a-f]{64}$',
  'claiming returns a 256 bit hex device token'
);
select is((:'claim1')::jsonb ->> 'name', 'Palmare 1', 'the claim response identifies the device');

reset role;
select set_config('request.jwt.claims', '{}', true);

select is(
  (select status from public.devices where id = ((:'p1')::jsonb ->> 'device_id')::uuid),
  'active',
  'the device row is active after the claim'
);
select ok(
  (select token_hash is not null from public.devices where id = ((:'p1')::jsonb ->> 'device_id')::uuid),
  'the device token is stored only as a hash'
);
select ok(
  (select pairing_expires_at is null from public.devices where id = ((:'p1')::jsonb ->> 'device_id')::uuid),
  'the pending pairing marker is cleared after the claim'
);
select is(
  (select platform from public.devices where id = ((:'p1')::jsonb ->> 'device_id')::uuid),
  'browser-test',
  'the platform reported during the claim is recorded'
);
select ok(
  (select last_seen_at is not null from public.devices where id = ((:'p1')::jsonb ->> 'device_id')::uuid),
  'the claim records the last seen timestamp'
);

set local role anon;
select set_config('request.jwt.claims', '{}', true);

select throws_ok(
  format($$select public.claim_device_pairing(%L)$$, :'r2'),
  '28000',
  null,
  'a consumed pairing code cannot be replayed'
);
select throws_ok(
  $$select public.claim_device_pairing('ABC')$$,
  '28000',
  null,
  'a code with the wrong length is rejected'
);
select throws_ok(
  $$select public.claim_device_pairing('IIIIIIII')$$,
  '28000',
  null,
  'a code with characters outside the alphabet is rejected'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '66666666-eeee-4eee-8eee-666666666666', 'role', 'authenticated')::text,
  true
);

select public.reissue_device_pairing(((:'p1')::jsonb ->> 'device_id')::uuid) ->> 'pairing_code' as r3 \gset

reset role;
select set_config('request.jwt.claims', '{}', true);

update public.device_pairings
set expires_at = now() - interval '1 minute'
where device_id = ((:'p1')::jsonb ->> 'device_id')::uuid
  and consumed_at is null
  and revoked_at is null;

set local role anon;
select set_config('request.jwt.claims', '{}', true);

select throws_ok(
  format($$select public.claim_device_pairing(%L)$$, :'r3'),
  '28000',
  null,
  'an expired pairing code cannot be claimed'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '66666666-eeee-4eee-8eee-666666666666', 'role', 'authenticated')::text,
  true
);

select public.reissue_device_pairing(((:'p1')::jsonb ->> 'device_id')::uuid) ->> 'pairing_code' as r4 \gset

reset role;
select set_config('request.jwt.claims', '{}', true);

set local role anon;
select set_config('request.jwt.claims', '{}', true);

select is(
  (
    select public.claim_device_pairing(lower(' ' || :'r4' || ' ')) ->> 'status'
  ),
  'active',
  'codes are accepted ignoring case, spaces and dashes'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '66666666-eeee-4eee-8eee-666666666666', 'role', 'authenticated')::text,
  true
);

select public.set_device_status(((:'p4')::jsonb ->> 'device_id')::uuid, 'block') as block4 \gset
select is((:'block4')::jsonb ->> 'status', 'blocked', 'a device can be blocked');
select is((:'block4')::jsonb ->> 'changed', 'true', 'blocking reports the change');

select throws_ok(
  format(
    $$select public.reissue_device_pairing(%L)$$,
    ((:'p4')::jsonb ->> 'device_id')::uuid
  ),
  '23514',
  null,
  'a blocked device cannot receive a new pairing code'
);

select public.set_device_status(((:'p4')::jsonb ->> 'device_id')::uuid, 'unblock') as unblock4 \gset
select is((:'unblock4')::jsonb ->> 'status', 'authorized', 'unblocking moves the device to authorized');

select public.reissue_device_pairing(((:'p4')::jsonb ->> 'device_id')::uuid) ->> 'pairing_code' as r5 \gset

reset role;
select set_config('request.jwt.claims', '{}', true);

set local role anon;
select set_config('request.jwt.claims', '{}', true);

select is(
  (select public.claim_device_pairing(:'r5') ->> 'status'),
  'active',
  'an unblocked device can be claimed again'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '66666666-eeee-4eee-8eee-666666666666', 'role', 'authenticated')::text,
  true
);

select public.set_device_status(((:'p4')::jsonb ->> 'device_id')::uuid, 'block') as block4b \gset
select is((:'block4b')::jsonb ->> 'changed', 'true', 'blocking an active device clears its session');

select public.set_device_status(((:'p2')::jsonb ->> 'device_id')::uuid, 'revoke') as revoke2 \gset
select is((:'revoke2')::jsonb ->> 'status', 'revoked', 'a device can be revoked');
select is((:'revoke2')::jsonb ->> 'changed', 'true', 'revoking reports the change');

select public.set_device_status(((:'p2')::jsonb ->> 'device_id')::uuid, 'revoke') as revoke2b \gset
select is((:'revoke2b')::jsonb ->> 'changed', 'false', 'revoking an already revoked device is a no-op');

select throws_ok(
  format(
    $$select public.reissue_device_pairing(%L)$$,
    ((:'p2')::jsonb ->> 'device_id')::uuid
  ),
  '23514',
  null,
  'a revoked device cannot receive a new pairing code'
);
select throws_ok(
  format(
    $$select public.set_device_status(%L, 'jump')$$,
    ((:'p3')::jsonb ->> 'device_id')::uuid
  ),
  '22023',
  null,
  'an unknown device action is rejected'
);

select public.create_device(:'restaurant_a', 'Palmare 5') as p5 \gset
select is((:'p5')::jsonb ->> 'status', 'pending', 'revoking a device frees a slot for its replacement');
select is((:'p5')::jsonb ->> 'palmari_in_use', '4', 'the replacement brings the count back to four');

select throws_ok(
  format($$select public.create_device(%L, 'Palmare 6')$$, :'restaurant_a'),
  '23514',
  null,
  'the limit applies again once the replacement is in place'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '77777777-eeee-4eee-8eee-777777777777', 'role', 'authenticated')::text,
  true
);

select throws_ok(
  format($$select public.create_device(%L, 'Palmare waiter')$$, :'restaurant_a'),
  '42501',
  null,
  'a waiter cannot register devices'
);
select throws_ok(
  format(
    $$select public.set_device_status(%L, 'revoke')$$,
    ((:'p3')::jsonb ->> 'device_id')::uuid
  ),
  '42501',
  null,
  'a waiter cannot revoke devices'
);
select throws_ok(
  format(
    $$select public.reissue_device_pairing(%L)$$,
    ((:'p3')::jsonb ->> 'device_id')::uuid
  ),
  '42501',
  null,
  'a waiter cannot reissue pairing codes'
);
select ok(
  (select count(*) from public.devices where restaurant_id = :'restaurant_a') >= 5,
  'restaurant members can list the devices of their restaurant'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '88888888-eeee-4eee-8eee-888888888888', 'role', 'authenticated')::text,
  true
);

select is(
  (select count(*) from public.devices),
  0::bigint,
  'tenant B sees no devices of tenant A'
);
select throws_ok(
  format(
    $$select public.reissue_device_pairing(%L)$$,
    ((:'p3')::jsonb ->> 'device_id')::uuid
  ),
  '42501',
  null,
  'tenant B cannot reissue pairing codes of tenant A'
);
select throws_ok(
  format(
    $$select public.set_device_status(%L, 'revoke')$$,
    ((:'p3')::jsonb ->> 'device_id')::uuid
  ),
  '42501',
  null,
  'tenant B cannot revoke devices of tenant A'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '99999999-eeee-4eee-8eee-999999999999', 'role', 'authenticated')::text,
  true
);

select ok(
  (select count(*) from public.devices) >= 5,
  'the platform admin sees the devices of every tenant'
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
  (select count(*) from public.device_pairings),
  0::bigint,
  'pairing codes and their hashes are not readable through the API'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

set local role anon;
select set_config('request.jwt.claims', '{}', true);

select is(
  (select count(*) from public.devices),
  0::bigint,
  'anonymous users cannot read devices'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

select throws_ok(
  format(
    $$update public.devices set token_hash = null where id = %L$$,
    ((:'p1')::jsonb ->> 'device_id')::uuid
  ),
  '23514',
  null,
  'token hash and issue timestamp must be set together'
);
select throws_ok(
  format(
    $$update public.devices set token_hash = 'zz' where id = %L$$,
    ((:'p1')::jsonb ->> 'device_id')::uuid
  ),
  '23514',
  null,
  'the token hash must be a sha256 hex digest'
);
select throws_ok(
  format(
    $$update public.devices set status = 'revoked' where id = %L$$,
    ((:'p3')::jsonb ->> 'device_id')::uuid
  ),
  '23514',
  null,
  'revoking outside the function requires the revoked timestamp'
);
select throws_ok(
  format(
    $$update public.device_pairings set consumed_at = now(), revoked_at = now() where device_id = %L$$,
    ((:'p3')::jsonb ->> 'device_id')::uuid
  ),
  '23514',
  null,
  'a pairing cannot be consumed and revoked at the same time'
);
select throws_ok(
  format(
    $$insert into public.device_pairings (organization_id, restaurant_id, device_id, code_hash, expires_at, created_by) values (%L, %L, %L, %L, now() + interval '15 minutes', %L)$$,
    :'org_a',
    :'restaurant_a',
    ((:'p3')::jsonb ->> 'device_id')::uuid,
    encode(digest('ZZZZZZZZ', 'sha256'), 'hex'),
    '66666666-eeee-4eee-8eee-666666666666'
  ),
  '23505',
  null,
  'a device can have at most one open pairing code'
);

select * from finish();
rollback;
