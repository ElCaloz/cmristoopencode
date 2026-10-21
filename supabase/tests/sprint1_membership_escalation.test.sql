begin;

create extension if not exists pgtap with schema extensions;
grant usage on schema extensions to authenticated, anon;
grant execute on all functions in schema extensions to authenticated, anon;
set local search_path = public, extensions, pg_temp;

select plan(14);

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
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'owner-m@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Owner M"}'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'manager-m@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Manager M"}'
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'cashier-m@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Cashier M"}'
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin-m@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Admin M"}'
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'newbie-m@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Newbie M"}'
  );

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'role', 'authenticated')::text,
  true
);
select lives_ok(
  $$select public.create_organization('Org M', 'org-m', 'Ristorante M')$$,
  'owner can bootstrap an organization and its first owner membership'
);
reset role;
select set_config('request.jwt.claims', '{}', true);

insert into public.memberships (user_id, organization_id, role_id)
select 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', o.id, r.id
from public.organizations o, public.roles r
where o.slug = 'org-m' and r.key = 'manager';

insert into public.memberships (user_id, organization_id, role_id)
select 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', o.id, r.id
from public.organizations o, public.roles r
where o.slug = 'org-m' and r.key = 'cashier';

insert into public.memberships (user_id, organization_id, role_id)
select 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', o.id, r.id
from public.organizations o, public.roles r
where o.slug = 'org-m' and r.key = 'admin';

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'role', 'authenticated')::text,
  true
);

select throws_ok(
  $$update public.memberships
    set role_id = (select id from public.roles where key = 'owner')
    where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'$$,
  '42501',
  null,
  'manager cannot promote itself to owner'
);

select throws_ok(
  $$update public.memberships
    set role_id = (select id from public.roles where key = 'owner')
    where user_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'$$,
  '42501',
  null,
  'manager cannot promote another member to owner'
);

select throws_ok(
  $$update public.memberships
    set role_id = (select id from public.roles where key = 'admin')
    where user_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'$$,
  '42501',
  null,
  'manager cannot promote another member to admin'
);

select throws_ok(
  $$update public.memberships
    set status = 'suspended'
    where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '42501',
  null,
  'manager cannot modify the owner membership'
);

select throws_ok(
  $$delete from public.memberships
    where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '42501',
  null,
  'manager cannot delete the owner membership'
);

select throws_ok(
  $$delete from public.memberships
    where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'$$,
  '42501',
  null,
  'manager cannot delete its own membership'
);

select throws_ok(
  $$insert into public.memberships (user_id, organization_id, role_id)
    select 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', o.id, r.id
    from public.organizations o, public.roles r
    where o.slug = 'org-m' and r.key = 'owner'$$,
  '42501',
  null,
  'manager cannot invite a new owner'
);

select lives_ok(
  $$update public.memberships
    set role_id = (select id from public.roles where key = 'waiter')
    where user_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'$$,
  'manager can assign a lower role'
);

select is(
  (
    select r.key
    from public.memberships m
    join public.roles r on r.id = m.role_id
    where m.user_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
  ),
  'waiter',
  'the lower role assignment is persisted'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'role', 'authenticated')::text,
  true
);

select lives_ok(
  $$update public.memberships
    set role_id = (select id from public.roles where key = 'admin')
    where user_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'$$,
  'owner can assign the admin role'
);

select is(
  (
    select r.key
    from public.memberships m
    join public.roles r on r.id = m.role_id
    where m.user_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
  ),
  'admin',
  'the admin role assignment is persisted'
);

select throws_ok(
  $$update public.memberships
    set role_id = (select id from public.roles where key = 'admin')
    where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '42501',
  null,
  'owner cannot change its own role'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'role', 'authenticated')::text,
  true
);

select throws_ok(
  $$update public.memberships
    set role_id = (select id from public.roles where key = 'owner')
    where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'$$,
  '42501',
  null,
  'admin cannot promote a manager to owner'
);

reset role;
select * from finish();
rollback;
