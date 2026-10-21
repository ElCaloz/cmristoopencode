begin;

create extension if not exists pgtap with schema extensions;
grant usage on schema extensions to authenticated, anon;
grant execute on all functions in schema extensions to authenticated, anon;
set local search_path = public, extensions, pg_temp;

select plan(28);

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
    'onboarding-u1@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Onboarding U1"}'
  ),
  (
    '22222222-bbbb-4bbb-8bbb-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'onboarding-u2@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Onboarding U2"}'
  );

set local role anon;
select set_config('request.jwt.claims', '{}', true);

select throws_ok(
  $$select public.complete_onboarding('Org Anon', 'Ristorante Anon', 'org-anon-test', 'Firenze', 'restaurant', 'starter')$$,
  '42501',
  null,
  'anonymous users cannot execute complete_onboarding'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

set local role authenticated;
select set_config('request.jwt.claims', '{}', true);

select throws_ok(
  $$select public.complete_onboarding('Org Noauth', 'Ristorante Noauth', 'org-noauth-test', 'Firenze', 'restaurant', 'starter')$$,
  '28000',
  null,
  'authenticated role without a session cannot onboard'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-aaaa-4aaa-8aaa-111111111111', 'role', 'authenticated')::text,
  true
);

select lives_ok(
  $$select public.complete_onboarding('Trattoria Test', 'Trattoria Test', 'trattoria-test-u1', 'Firenze', 'trattoria', 'pro')$$,
  'the first user completes onboarding'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

select is(
  (select count(*) from public.organizations where slug = 'trattoria-test-u1'),
  1::bigint,
  'onboarding creates exactly one organization'
);

select is(
  (select requested_plan from public.organizations where slug = 'trattoria-test-u1'),
  'pro',
  'the requested plan is persisted'
);

select is(
  (select plan_status from public.organizations where slug = 'trattoria-test-u1'),
  'requested',
  'the plan is recorded as requested, not commercially active'
);

select is(
  (
    select r.key
    from public.memberships m
    join public.roles r on r.id = m.role_id
    join public.organizations o on o.id = m.organization_id
    where m.user_id = '11111111-aaaa-4aaa-8aaa-111111111111'
      and o.slug = 'trattoria-test-u1'
  ),
  'owner',
  'onboarding assigns the owner role from the database'
);

select is(
  (select count(*) from public.memberships where user_id = '11111111-aaaa-4aaa-8aaa-111111111111'),
  1::bigint,
  'onboarding creates exactly one membership'
);

select is(
  (
    select r.venue_type
    from public.restaurants r
    join public.organizations o on o.id = r.organization_id
    where o.slug = 'trattoria-test-u1'
  ),
  'trattoria',
  'the venue type is persisted on the restaurant'
);

select is(
  (
    select l.city
    from public.restaurant_locations l
    join public.restaurants r on r.id = l.restaurant_id
    join public.organizations o on o.id = r.organization_id
    where o.slug = 'trattoria-test-u1'
  ),
  'Firenze',
  'the primary location stores the city'
);

select is(
  (
    select count(*)
    from public.restaurant_locations l
    join public.restaurants r on r.id = l.restaurant_id
    join public.organizations o on o.id = r.organization_id
    where o.slug = 'trattoria-test-u1'
      and l.is_primary
  ),
  1::bigint,
  'exactly one primary location is created'
);

select is(
  (
    select count(*)
    from public.audit_logs
    where action = 'onboarding.completed'
      and actor_user_id = '11111111-aaaa-4aaa-8aaa-111111111111'
  ),
  1::bigint,
  'onboarding writes an audit log entry'
);

select is(
  (select count(*) from public.platform_admins where user_id = '11111111-aaaa-4aaa-8aaa-111111111111'),
  0::bigint,
  'onboarding never grants platform admin'
);

select is(
  (
    select count(*)
    from public.memberships
    where user_id = '11111111-aaaa-4aaa-8aaa-111111111111'
      and restaurant_id is null
  ),
  1::bigint,
  'the onboarding membership is organization-wide'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-aaaa-4aaa-8aaa-111111111111', 'role', 'authenticated')::text,
  true
);

select is(
  (
    select created
    from public.complete_onboarding('Trattoria Duplicata', 'Trattoria Duplicata', 'trattoria-test-dup', 'Roma', 'pizzeria', 'business')
  ),
  false,
  'a repeated onboarding call is idempotent and reports created = false'
);

select is(
  (
    select new_organization_id
    from public.complete_onboarding('Trattoria Duplicata', 'Trattoria Duplicata', 'trattoria-test-dup', 'Roma', 'pizzeria', 'business')
  ),
  (select id from public.organizations where slug = 'trattoria-test-u1'),
  'a repeated onboarding call returns the existing organization'
);

select is(
  (
    select count(*)
    from public.organizations o
    join public.memberships m on m.organization_id = o.id
    where m.user_id = '11111111-aaaa-4aaa-8aaa-111111111111'
      and m.restaurant_id is null
  ),
  1::bigint,
  'a repeated onboarding call does not create a second organization'
);

select throws_ok(
  $$select public.complete_onboarding('Org X', 'Ristorante X', 'org-x-invalid', 'Firenze', 'restaurant', 'platinum')$$,
  '22023',
  null,
  'an invalid requested plan is rejected'
);

select throws_ok(
  $$select public.complete_onboarding('Org X', 'Ristorante X', 'org-x-invalid', 'Firenze', 'hangar', 'starter')$$,
  '22023',
  null,
  'an invalid venue type is rejected'
);

select throws_ok(
  $$select public.complete_onboarding('Org X', 'Ristorante X', 'org-x-invalid', 'A', 'restaurant', 'starter')$$,
  '22023',
  null,
  'an invalid city is rejected'
);

select throws_ok(
  $$select public.complete_onboarding('Org X', 'Ristorante X', 'Org X!', 'Firenze', 'restaurant', 'starter')$$,
  '22023',
  null,
  'an invalid slug is rejected'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '22222222-bbbb-4bbb-8bbb-222222222222', 'role', 'authenticated')::text,
  true
);

select lives_ok(
  $$select public.complete_onboarding('Pizzeria Test', 'Pizzeria Test', 'pizzeria-test-u2', 'Roma', 'pizzeria', 'starter')$$,
  'the second user completes onboarding in a separate organization'
);

select is(
  (
    select count(*)
    from public.organizations
    where slug in ('trattoria-test-u1', 'pizzeria-test-u2')
  ),
  1::bigint,
  'the second user sees only its own organization'
);

select is(
  (select count(*) from public.organizations where slug = 'trattoria-test-u1'),
  0::bigint,
  'the second user cannot read the first organization'
);

select is(
  (
    select count(*)
    from public.restaurants r
    join public.organizations o on o.id = r.organization_id
    where o.slug = 'pizzeria-test-u2'
  ),
  1::bigint,
  'the second user sees only its own restaurant'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

select id as org_u1 from public.organizations where slug = 'trattoria-test-u1' \gset

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '22222222-bbbb-4bbb-8bbb-222222222222', 'role', 'authenticated')::text,
  true
);

select throws_ok(
  format(
    'insert into public.memberships (user_id, organization_id, role_id) values (%L, %L, (select id from public.roles where key = ''owner''))',
    '22222222-bbbb-4bbb-8bbb-222222222222',
    :'org_u1'
  ),
  '42501',
  null,
  'a user cannot self-assign the owner role in another organization'
);

select throws_ok(
  format(
    'insert into public.platform_admins (user_id) values (%L)',
    '22222222-bbbb-4bbb-8bbb-222222222222'
  ),
  '42501',
  null,
  'a user cannot self-assign platform admin'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-aaaa-4aaa-8aaa-111111111111', 'role', 'authenticated')::text,
  true
);

select throws_ok(
  $$update public.organizations set requested_plan = 'platinum' where slug = 'trattoria-test-u1'$$,
  '23514',
  null,
  'the database rejects invalid requested plans written directly'
);

reset role;
select * from finish();
rollback;
