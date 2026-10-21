begin;

create extension if not exists pgtap with schema extensions;
grant usage on schema extensions to authenticated, anon;
grant execute on all functions in schema extensions to authenticated, anon;
set local search_path = public, extensions, pg_temp;

select plan(33);

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
    'e1111111-dddd-4ddd-8ddd-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'layout-owner-a@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Layout Owner A"}'
  ),
  (
    'e2222222-dddd-4ddd-8ddd-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'layout-owner-b@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Layout Owner B"}'
  ),
  (
    'e3333333-dddd-4ddd-8ddd-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'layout-cashier-a@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Layout Cashier A"}'
  ),
  (
    'e4444444-dddd-4ddd-8ddd-444444444444',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'layout-platform@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Layout Platform"}'
  );

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'e1111111-dddd-4ddd-8ddd-111111111111', 'role', 'authenticated')::text,
  true
);
select lives_ok(
  $$select public.create_organization('Layout Org A', 'layout-org-a', 'Ristorante Layout A')$$,
  'owner A can create an organization'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'e2222222-dddd-4ddd-8ddd-222222222222', 'role', 'authenticated')::text,
  true
);
select lives_ok(
  $$select public.create_organization('Layout Org B', 'layout-org-b', 'Ristorante Layout B')$$,
  'owner B can create an organization'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

select id as org_a from public.organizations where slug = 'layout-org-a' \gset
select id as org_b from public.organizations where slug = 'layout-org-b' \gset
select id as restaurant_a from public.restaurants where organization_id = :'org_a' and slug = 'main' \gset
select id as restaurant_b from public.restaurants where organization_id = :'org_b' and slug = 'main' \gset

insert into public.memberships (user_id, organization_id, restaurant_id, role_id)
select 'e3333333-dddd-4ddd-8ddd-333333333333', :'org_a', :'restaurant_a', r.id
from public.roles r
where r.key = 'cashier';

insert into public.platform_admins (user_id)
values ('e4444444-dddd-4ddd-8ddd-444444444444');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'e1111111-dddd-4ddd-8ddd-111111111111', 'role', 'authenticated')::text,
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
    $$insert into public.restaurant_tables (organization_id, restaurant_id, area_id, name, seats, shape, pos_x, pos_y, width, height)
      select %L, %L, a.id, 'T1', 4, 'rect', 4, 4, 4, 4
      from public.floor_areas a
      where a.restaurant_id = %L and a.name = 'Sala principale'$$,
    :'org_a',
    :'restaurant_a',
    :'restaurant_a'
  ),
  'owner A can create a table with explicit geometry'
);

select throws_ok(
  format(
    $$insert into public.restaurant_tables (organization_id, restaurant_id, name, seats, pos_x, width)
      values (%L, %L, 'Fuori', 2, 46, 4)$$,
    :'org_a',
    :'restaurant_a'
  ),
  '23514',
  null,
  'a table outside the grid is rejected'
);

select throws_ok(
  format(
    $$insert into public.restaurant_tables (organization_id, restaurant_id, name, seats, shape)
      values (%L, %L, 'Forma', 2, 'triangle')$$,
    :'org_a',
    :'restaurant_a'
  ),
  '23514',
  null,
  'an invalid table shape is rejected'
);

select throws_ok(
  format(
    $$insert into public.restaurant_tables (organization_id, restaurant_id, name, seats, width)
      values (%L, %L, 'Piccolo', 2, 1)$$,
    :'org_a',
    :'restaurant_a'
  ),
  '23514',
  null,
  'a table smaller than one cell is rejected'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

select id as area_a from public.floor_areas where restaurant_id = :'restaurant_a' and name = 'Sala principale' \gset
select id as table_a from public.restaurant_tables where restaurant_id = :'restaurant_a' and name = 'T1' \gset

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'e3333333-dddd-4ddd-8ddd-333333333333', 'role', 'authenticated')::text,
  true
);

select throws_ok(
  format(
    $$insert into public.restaurant_tables (organization_id, restaurant_id, name, seats)
      values (%L, %L, 'Intruso', 2)$$,
    :'org_a',
    :'restaurant_a'
  ),
  '42501',
  null,
  'cashier cannot create a table'
);

update public.restaurant_tables set pos_x = 30, width = 8 where id = :'table_a';

reset role;
select set_config('request.jwt.claims', '{}', true);

select is(
  (select pos_x from public.restaurant_tables where id = :'table_a'),
  4,
  'cashier update on table geometry has no effect'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'e2222222-dddd-4ddd-8ddd-222222222222', 'role', 'authenticated')::text,
  true
);

select lives_ok(
  format(
    $$insert into public.floor_areas (organization_id, restaurant_id, name) values (%L, %L, 'Sala B')$$,
    :'org_b',
    :'restaurant_b'
  ),
  'owner B can create its own floor area'
);

select lives_ok(
  format(
    $$insert into public.restaurant_tables (organization_id, restaurant_id, area_id, name, seats, pos_x, pos_y, width, height)
      select %L, %L, a.id, 'B1', 2, 2, 2, 4, 4
      from public.floor_areas a
      where a.restaurant_id = %L and a.name = 'Sala B'$$,
    :'org_b',
    :'restaurant_b',
    :'restaurant_b'
  ),
  'owner B can create its own table with geometry'
);

select throws_ok(
  format(
    $$insert into public.floor_objects (organization_id, restaurant_id, area_id, kind, label)
      values (%L, %L, %L, 'wall', '')$$,
    :'org_b',
    :'restaurant_a',
    :'area_a'
  ),
  '42501',
  null,
  'owner B cannot insert an object for restaurant A'
);

select is(
  (select count(*) from public.floor_objects where restaurant_id = :'restaurant_a'),
  0::bigint,
  'owner B cannot read objects of restaurant A'
);

select throws_ok(
  format(
    $$select public.save_floor_layout(%L, '[]'::jsonb, '[]'::jsonb, '{}'::uuid[], '{}'::uuid[])$$,
    :'area_a'
  ),
  '42501',
  null,
  'owner B cannot save the layout of restaurant A'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

select id as area_b from public.floor_areas where restaurant_id = :'restaurant_b' and name = 'Sala B' \gset
select id as table_b from public.restaurant_tables where restaurant_id = :'restaurant_b' and name = 'B1' \gset

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'e3333333-dddd-4ddd-8ddd-333333333333', 'role', 'authenticated')::text,
  true
);

select throws_ok(
  format(
    $$select public.save_floor_layout(%L, '[]'::jsonb, '[]'::jsonb, '{}'::uuid[], '{}'::uuid[])$$,
    :'area_a'
  ),
  '42501',
  null,
  'cashier cannot save the floor layout'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'e1111111-dddd-4ddd-8ddd-111111111111', 'role', 'authenticated')::text,
  true
);

select lives_ok(
  format(
    $$select public.save_floor_layout(%L,
      $json$[{"id":null,"name":"T2","seats":4,"shape":"round","posX":10,"posY":10,"width":6,"height":6}]$json$::jsonb,
      $json$[{"id":null,"kind":"counter","label":"Banco","posX":2,"posY":0,"width":20,"height":3}]$json$::jsonb,
      '{}'::uuid[], '{}'::uuid[])$$,
    :'area_a'
  ),
  'owner A can save a floor layout with a new table and object'
);

select is(
  (select shape from public.restaurant_tables where restaurant_id = :'restaurant_a' and name = 'T2'),
  'round',
  'saved table keeps its shape'
);

select is(
  (select pos_x from public.restaurant_tables where restaurant_id = :'restaurant_a' and name = 'T2'),
  10,
  'saved table keeps its position'
);

select is(
  (select kind from public.floor_objects where restaurant_id = :'restaurant_a' and area_id = :'area_a'),
  'counter',
  'saved object keeps its kind'
);

select is(
  (select label from public.floor_objects where restaurant_id = :'restaurant_a' and area_id = :'area_a'),
  'Banco',
  'saved object keeps its label'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

select id as table_t2 from public.restaurant_tables where restaurant_id = :'restaurant_a' and name = 'T2' \gset
select id as object_a1 from public.floor_objects where restaurant_id = :'restaurant_a' and area_id = :'area_a' \gset

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'e1111111-dddd-4ddd-8ddd-111111111111', 'role', 'authenticated')::text,
  true
);

select lives_ok(
  format(
    $$select public.save_floor_layout(%L,
      $json$[{"id":"%s","name":"T1","seats":4,"shape":"rect","posX":12,"posY":4,"width":6,"height":4}]$json$::jsonb,
      '[]'::jsonb, '{}'::uuid[], '{}'::uuid[])$$,
    :'area_a',
    :'table_a'
  ),
  'owner A can update an existing table geometry'
);

select is(
  (select pos_x from public.restaurant_tables where id = :'table_a'),
  12,
  'existing table position is updated'
);

select throws_ok(
  format(
    $$select public.save_floor_layout(%L,
      $json$[{"id":null,"name":"T2","seats":2,"shape":"rect","posX":2,"posY":2,"width":4,"height":4}]$json$::jsonb,
      '[]'::jsonb, '{}'::uuid[], '{}'::uuid[])$$,
    :'area_a'
  ),
  '23505',
  null,
  'duplicate table names are rejected by the layout save'
);

select throws_ok(
  format(
    $$select public.save_floor_layout(%L,
      $json$[{"id":null,"name":"Fuori","seats":2,"shape":"rect","posX":50,"posY":2,"width":4,"height":4}]$json$::jsonb,
      '[]'::jsonb, '{}'::uuid[], '{}'::uuid[])$$,
    :'area_a'
  ),
  '23514',
  null,
  'out of bounds tables are rejected by the layout save'
);

select throws_ok(
  format(
    $$select public.save_floor_layout(%L,
      $json$[{"id":"%s","name":"B1","seats":2,"shape":"rect","posX":2,"posY":2,"width":4,"height":4}]$json$::jsonb,
      '[]'::jsonb, '{}'::uuid[], '{}'::uuid[])$$,
    :'area_a',
    :'table_b'
  ),
  'P0002',
  null,
  'a table id from another restaurant is rejected'
);

select lives_ok(
  format(
    $$select public.save_floor_layout(%L,
      $json$[{"id":"%s","name":"T1","seats":4,"shape":"rect","posX":12,"posY":4,"width":6,"height":4}]$json$::jsonb,
      '[]'::jsonb, array[%L]::uuid[], array[%L]::uuid[])$$,
    :'area_a',
    :'table_a',
    :'table_t2',
    :'object_a1'
  ),
  'owner A can remove layout elements explicitly'
);

select is(
  (select count(*) from public.restaurant_tables where restaurant_id = :'restaurant_a' and name = 'T2'),
  0::bigint,
  'removed table is deleted'
);

select is(
  (select count(*) from public.floor_objects where area_id = :'area_a'),
  0::bigint,
  'removed object is deleted'
);

select lives_ok(
  format(
    $$insert into public.floor_objects (organization_id, restaurant_id, area_id, kind, label)
      values (%L, %L, %L, 'plant', 'Ficus')$$,
    :'org_a',
    :'restaurant_a',
    :'area_a'
  ),
  'owner A can insert a floor object directly'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'e2222222-dddd-4ddd-8ddd-222222222222', 'role', 'authenticated')::text,
  true
);

select is(
  (select count(*) from public.floor_objects where restaurant_id = :'restaurant_a'),
  0::bigint,
  'cross-tenant object isolation holds for owner B'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'e4444444-dddd-4ddd-8ddd-444444444444', 'role', 'authenticated')::text,
  true
);

select is(
  (select count(*) from public.floor_objects where restaurant_id = :'restaurant_a'),
  1::bigint,
  'platform admin can read floor objects'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

select is(
  (select count(*) from public.audit_logs where restaurant_id = :'restaurant_a' and action = 'floor.layout_saved'),
  3::bigint,
  'layout saves are written to the audit log'
);

set local role anon;
select set_config('request.jwt.claims', '{}', true);

select throws_ok(
  format(
    $$select public.save_floor_layout(%L, '[]'::jsonb, '[]'::jsonb, '{}'::uuid[], '{}'::uuid[])$$,
    :'area_a'
  ),
  '42501',
  null,
  'anon cannot execute the layout save'
);

select * from finish();
rollback;
