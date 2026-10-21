begin;

create extension if not exists pgtap with schema extensions;
grant usage on schema extensions to authenticated, anon;
grant execute on all functions in schema extensions to authenticated, anon;
set local search_path = public, extensions, pg_temp;

select plan(34);

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
    '11111111-dddd-4ddd-8ddd-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'sala-owner-a@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Sala Owner A"}'
  ),
  (
    '22222222-dddd-4ddd-8ddd-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'sala-owner-b@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Sala Owner B"}'
  ),
  (
    '33333333-dddd-4ddd-8ddd-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'sala-cashier-a@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Sala Cashier A"}'
  ),
  (
    '44444444-dddd-4ddd-8ddd-444444444444',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'sala-platform@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Sala Platform"}'
  );

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-dddd-4ddd-8ddd-111111111111', 'role', 'authenticated')::text,
  true
);
select lives_ok(
  $$select public.create_organization('Sala Org A', 'sala-org-a', 'Ristorante Sala A')$$,
  'owner A can create an organization'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '22222222-dddd-4ddd-8ddd-222222222222', 'role', 'authenticated')::text,
  true
);
select lives_ok(
  $$select public.create_organization('Sala Org B', 'sala-org-b', 'Ristorante Sala B')$$,
  'owner B can create an organization'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

select id as org_a from public.organizations where slug = 'sala-org-a' \gset
select id as org_b from public.organizations where slug = 'sala-org-b' \gset
select id as restaurant_a from public.restaurants where organization_id = :'org_a' and slug = 'main' \gset
select id as restaurant_b from public.restaurants where organization_id = :'org_b' and slug = 'main' \gset

insert into public.memberships (user_id, organization_id, restaurant_id, role_id)
select '33333333-dddd-4ddd-8ddd-333333333333', :'org_a', :'restaurant_a', r.id
from public.roles r
where r.key = 'cashier';

insert into public.platform_admins (user_id)
values ('44444444-dddd-4ddd-8ddd-444444444444');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-dddd-4ddd-8ddd-111111111111', 'role', 'authenticated')::text,
  true
);

select lives_ok(
  format(
    $$insert into public.floor_areas (organization_id, restaurant_id, name) values (%L, %L, 'Sala principale')$$,
    :'org_a',
    :'restaurant_a'
  ),
  'owner A can create a floor area'
);

select lives_ok(
  format(
    $$insert into public.restaurant_tables (organization_id, restaurant_id, area_id, name, seats)
      select %L, %L, a.id, 'T1', 4
      from public.floor_areas a
      where a.restaurant_id = %L and a.name = 'Sala principale'$$,
    :'org_a',
    :'restaurant_a',
    :'restaurant_a'
  ),
  'owner A can create a table linked to the area'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '22222222-dddd-4ddd-8ddd-222222222222', 'role', 'authenticated')::text,
  true
);

select lives_ok(
  format(
    $$insert into public.floor_areas (organization_id, restaurant_id, name) values (%L, %L, 'Sala principale')$$,
    :'org_b',
    :'restaurant_b'
  ),
  'a same-named area is allowed in another restaurant'
);

select lives_ok(
  format(
    $$insert into public.restaurant_tables (organization_id, restaurant_id, name, seats)
      values (%L, %L, 'T1', 2)$$,
    :'org_b',
    :'restaurant_b'
  ),
  'a same-named table is allowed in another restaurant'
);

select throws_ok(
  format(
    $$insert into public.floor_areas (organization_id, restaurant_id, name) values (%L, %L, 'Veranda')$$,
    :'org_b',
    :'restaurant_a'
  ),
  '42501',
  null,
  'owner B cannot insert an area for restaurant A'
);

select throws_ok(
  format(
    $$insert into public.restaurant_tables (organization_id, restaurant_id, name, seats) values (%L, %L, 'Intruso', 2)$$,
    :'org_b',
    :'restaurant_a'
  ),
  '42501',
  null,
  'owner B cannot insert a table for restaurant A'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-dddd-4ddd-8ddd-111111111111', 'role', 'authenticated')::text,
  true
);

select throws_ok(
  format(
    $$insert into public.floor_areas (organization_id, restaurant_id, name) values (%L, %L, 'Sala principale')$$,
    :'org_a',
    :'restaurant_a'
  ),
  '23505',
  null,
  'duplicate area names are rejected inside the same restaurant'
);

select throws_ok(
  format(
    $$insert into public.restaurant_tables (organization_id, restaurant_id, name, seats) values (%L, %L, 'T1', 2)$$,
    :'org_a',
    :'restaurant_a'
  ),
  '23505',
  null,
  'duplicate table names are rejected inside the same restaurant'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

select id as area_a from public.floor_areas where restaurant_id = :'restaurant_a' \gset
select id as area_b from public.floor_areas where restaurant_id = :'restaurant_b' \gset
select id as table_a from public.restaurant_tables where restaurant_id = :'restaurant_a' \gset
select id as table_b from public.restaurant_tables where restaurant_id = :'restaurant_b' \gset

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-dddd-4ddd-8ddd-111111111111', 'role', 'authenticated')::text,
  true
);

select is(
  (select count(*) from public.floor_areas),
  1::bigint,
  'owner A sees exactly its own areas'
);
select is(
  (select count(*) from public.restaurant_tables),
  1::bigint,
  'owner A sees exactly its own tables'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '22222222-dddd-4ddd-8ddd-222222222222', 'role', 'authenticated')::text,
  true
);

select is(
  (select count(*) from public.floor_areas),
  1::bigint,
  'owner B sees exactly its own areas'
);
select is(
  (select count(*) from public.floor_areas where restaurant_id = :'restaurant_a'),
  0::bigint,
  'owner B cannot read areas of restaurant A'
);
select is(
  (select count(*) from public.restaurant_tables where restaurant_id = :'restaurant_a'),
  0::bigint,
  'owner B cannot read tables of restaurant A'
);

update public.restaurant_tables set name = 'Hack' where id = :'table_a';
delete from public.floor_areas where id = :'area_a';

reset role;
select set_config('request.jwt.claims', '{}', true);

select is(
  (select name from public.restaurant_tables where id = :'table_a'),
  'T1',
  'owner B update on a table of A has no effect'
);
select is(
  (select count(*) from public.floor_areas where id = :'area_a'),
  1::bigint,
  'owner B delete on an area of A has no effect'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '33333333-dddd-4ddd-8ddd-333333333333', 'role', 'authenticated')::text,
  true
);

select is(
  (select count(*) from public.floor_areas),
  1::bigint,
  'the cashier can read the areas of its restaurant'
);
select is(
  (select count(*) from public.restaurant_tables),
  1::bigint,
  'the cashier can read the tables of its restaurant'
);
select is(
  (select count(*) from public.floor_areas where restaurant_id = :'restaurant_b'),
  0::bigint,
  'the cashier cannot read the areas of another tenant'
);

select throws_ok(
  format(
    $$insert into public.floor_areas (organization_id, restaurant_id, name) values (%L, %L, 'Senza permesso')$$,
    :'org_a',
    :'restaurant_a'
  ),
  '42501',
  null,
  'a cashier without reservations.manage cannot insert areas'
);

update public.restaurant_tables set name = 'Hack' where id = :'table_a';
delete from public.floor_areas where id = :'area_a';

reset role;
select set_config('request.jwt.claims', '{}', true);

select is(
  (select name from public.restaurant_tables where id = :'table_a'),
  'T1',
  'a cashier update on tables has no effect'
);
select is(
  (select count(*) from public.floor_areas where id = :'area_a'),
  1::bigint,
  'a cashier delete on areas has no effect'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-dddd-4ddd-8ddd-111111111111', 'role', 'authenticated')::text,
  true
);

select throws_ok(
  format(
    $$insert into public.restaurant_tables (organization_id, restaurant_id, name, seats) values (%L, %L, 'Posti zero', 0)$$,
    :'org_a',
    :'restaurant_a'
  ),
  '23514',
  null,
  'a table with zero seats is rejected by the database'
);

select throws_ok(
  format(
    $$insert into public.restaurant_tables (organization_id, restaurant_id, name, seats) values (%L, %L, 'Posti troppi', 51)$$,
    :'org_a',
    :'restaurant_a'
  ),
  '23514',
  null,
  'a table with more than fifty seats is rejected by the database'
);

select throws_ok(
  format(
    $$insert into public.restaurant_tables (organization_id, restaurant_id, area_id, name, seats) values (%L, %L, %L, 'Tavolo intruso', 2)$$,
    :'org_a',
    :'restaurant_a',
    :'area_b'
  ),
  '23503',
  null,
  'a table cannot reference an area of another restaurant'
);

select throws_ok(
  format(
    $$insert into public.restaurant_tables (organization_id, restaurant_id, name, seats) values (%L, %L, 'Org incoerente', 2)$$,
    :'org_b',
    :'restaurant_a'
  ),
  '23503',
  null,
  'the composite foreign key rejects mismatched organization rows'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '44444444-dddd-4ddd-8ddd-444444444444', 'role', 'authenticated')::text,
  true
);

select is(
  (select count(*) from public.floor_areas),
  2::bigint,
  'the platform admin sees areas of every tenant'
);
select is(
  (select count(*) from public.restaurant_tables),
  2::bigint,
  'the platform admin sees tables of every tenant'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

set local role anon;
select set_config('request.jwt.claims', '{}', true);
select is(
  (select count(*) from public.floor_areas),
  0::bigint,
  'anonymous users cannot read floor areas'
);
select is(
  (select count(*) from public.restaurant_tables),
  0::bigint,
  'anonymous users cannot read tables'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-dddd-4ddd-8ddd-111111111111', 'role', 'authenticated')::text,
  true
);

select lives_ok(
  format($$delete from public.floor_areas where id = %L$$, :'area_a'),
  'owner A can delete its own area'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

select is(
  (select count(*) from public.restaurant_tables where id = :'table_a'),
  1::bigint,
  'deleting an area keeps its tables'
);
select is(
  (select area_id from public.restaurant_tables where id = :'table_a'),
  null::uuid,
  'deleting an area clears the table area reference'
);

select * from finish();
rollback;
