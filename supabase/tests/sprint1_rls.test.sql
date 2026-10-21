begin;

create extension if not exists pgtap with schema extensions;
grant usage on schema extensions to authenticated, anon;
grant execute on all functions in schema extensions to authenticated, anon;
set local search_path = public, extensions, pg_temp;

select plan(30);

select count(*) as base_organizations from public.organizations \gset
select count(*) as base_restaurants from public.restaurants \gset

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
    '11111111-1111-4111-8111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'owner-a@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Owner A"}'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'owner-b@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Owner B"}'
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'cashier@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Cashier C"}'
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'platform@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Platform D"}'
  );

select is(
  (
    select count(*)
    from public.profiles
    where id in (
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
      '33333333-3333-4333-8333-333333333333',
      '44444444-4444-4444-8444-444444444444'
    )
  ),
  4::bigint,
  'the auth trigger creates one profile per user'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-1111-4111-8111-111111111111', 'role', 'authenticated')::text,
  true
);
select lives_ok(
  $$select public.create_organization('Org A', 'org-a', 'Ristorante A')$$,
  'owner A can create an organization atomically'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '22222222-2222-4222-8222-222222222222', 'role', 'authenticated')::text,
  true
);
select lives_ok(
  $$select public.create_organization('Org B', 'org-b', 'Ristorante B')$$,
  'owner B can create an organization atomically'
);
reset role;
select set_config('request.jwt.claims', '{}', true);

select id as org_a from public.organizations where slug = 'org-a' \gset
select id as org_b from public.organizations where slug = 'org-b' \gset
select id as restaurant_a from public.restaurants where organization_id = :'org_a' and slug = 'main' \gset
select id as restaurant_b from public.restaurants where organization_id = :'org_b' and slug = 'main' \gset

insert into public.restaurants (organization_id, name, slug)
values (:'org_a', 'Ristorante A2', 'a2');

select id as restaurant_a2 from public.restaurants where organization_id = :'org_a' and slug = 'a2' \gset

insert into public.memberships (user_id, organization_id, restaurant_id, role_id)
select '33333333-3333-4333-8333-333333333333', :'org_a', :'restaurant_a', r.id
from public.roles r
where r.key = 'cashier';

insert into public.platform_admins (user_id)
values ('44444444-4444-4444-8444-444444444444');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-1111-4111-8111-111111111111', 'role', 'authenticated')::text,
  true
);

select is((select count(*) from public.organizations), 1::bigint, 'A sees only its own organization');
select is((select name from public.organizations where id = :'org_a'), 'Org A', 'A reads its own organization row');
select is((select count(*) from public.organizations where id = :'org_b'), 0::bigint, 'A cannot read organization B');
select is((select count(*) from public.restaurants), 2::bigint, 'A sees both restaurants of its organization');
select is((select count(*) from public.restaurants where organization_id = :'org_b'), 0::bigint, 'A cannot read restaurants of B');
select is(public.auth_has_permission(:'org_a', 'organization.manage'), true, 'owner has organization.manage');
select is((select count(*) from public.memberships), 2::bigint, 'owner sees memberships of its organization');
select is((select count(*) from public.memberships where organization_id = :'org_b'), 0::bigint, 'owner cannot read memberships of B');
select isnt_empty(
  format('update public.organizations set name = %L where id = %L returning id', 'Org A updated', :'org_a'),
  'owner can update its own organization'
);
select is_empty(
  format('update public.organizations set name = %L where id = %L returning id', 'Hacked', :'org_b'),
  'owner cannot update organization B'
);
select lives_ok(
  format(
    'insert into public.audit_logs (organization_id, actor_user_id, action, entity_type) values (%L, %L, %L, %L)',
    :'org_a',
    '11111111-1111-4111-8111-111111111111',
    'test.action',
    'test'
  ),
  'owner can append an audit entry for itself'
);
select throws_ok(
  format(
    'insert into public.audit_logs (organization_id, actor_user_id, action, entity_type) values (%L, %L, %L, %L)',
    :'org_b',
    '22222222-2222-4222-8222-222222222222',
    'test.action',
    'test'
  ),
  '42501',
  null,
  'owner cannot forge an audit entry for another tenant'
);
select is((select count(*) from public.platform_admins), 0::bigint, 'owner cannot read platform admins');

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '22222222-2222-4222-8222-222222222222', 'role', 'authenticated')::text,
  true
);

select is((select count(*) from public.restaurants), 1::bigint, 'B sees only its own restaurant');
select is((select count(*) from public.organizations where id = :'org_a'), 0::bigint, 'B cannot read organization A');
select is((select count(*) from public.organizations where id = :'org_b'), 1::bigint, 'B reads its own organization');

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '33333333-3333-4333-8333-333333333333', 'role', 'authenticated')::text,
  true
);

select is((select count(*) from public.restaurants), 1::bigint, 'restaurant-scoped cashier sees only the assigned restaurant');
select is((select id from public.restaurants), :'restaurant_a'::uuid, 'scoped cashier sees the assigned restaurant id');
select is((select count(*) from public.restaurant_settings), 1::bigint, 'scoped cashier reads settings of the assigned restaurant');
select is(
  (select count(*) from public.restaurant_settings where restaurant_id = :'restaurant_a2'),
  0::bigint,
  'scoped cashier cannot read settings of another restaurant'
);
select is(
  public.auth_has_permission_for_restaurant(:'restaurant_a', 'pos.operate'),
  true,
  'cashier has pos.operate on the assigned restaurant'
);
select is(
  public.auth_has_permission_for_restaurant(:'restaurant_a2', 'pos.operate'),
  false,
  'cashier lacks pos.operate on another restaurant'
);
select is(
  public.auth_has_permission(:'org_a', 'pos.operate'),
  false,
  'restaurant-scoped membership grants no organization-wide permission'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '44444444-4444-4444-8444-444444444444', 'role', 'authenticated')::text,
  true
);

select is(
  (select count(*) from public.organizations),
  (:'base_organizations'::bigint + 2),
  'platform admin sees all organizations'
);
select is(
  (select count(*) from public.restaurants),
  (:'base_restaurants'::bigint + 3),
  'platform admin sees all restaurants'
);
select is((select count(*) from public.platform_admins), 1::bigint, 'platform admin reads its own platform row');

reset role;
set local role anon;
select set_config('request.jwt.claims', '{}', true);

select is((select count(*) from public.organizations), 0::bigint, 'anonymous sees no organizations');

reset role;
select * from finish();
rollback;
