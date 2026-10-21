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
    '11111111-aaaa-4aaa-8aaa-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'recipe-owner-a@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Recipe Owner A"}'
  ),
  (
    '22222222-bbbb-4bbb-8bbb-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'recipe-owner-b@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Recipe Owner B"}'
  ),
  (
    '33333333-cccc-4ccc-8ccc-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'recipe-cashier-a@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Recipe Cashier A"}'
  ),
  (
    '44444444-dddd-4ddd-8ddd-444444444444',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'recipe-warehouse-a@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Recipe Warehouse A"}'
  ),
  (
    '55555555-eeee-4eee-8eee-555555555555',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'recipe-platform@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Recipe Platform"}'
  );

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-aaaa-4aaa-8aaa-111111111111', 'role', 'authenticated')::text,
  true
);
select lives_ok(
  $$select public.create_organization('Recipe Org A', 'recipe-org-a', 'Ristorante Recipe A')$$,
  'owner A can create an organization'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '22222222-bbbb-4bbb-8bbb-222222222222', 'role', 'authenticated')::text,
  true
);
select lives_ok(
  $$select public.create_organization('Recipe Org B', 'recipe-org-b', 'Ristorante Recipe B')$$,
  'owner B can create an organization'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

select id as org_a from public.organizations where slug = 'recipe-org-a' \gset
select id as org_b from public.organizations where slug = 'recipe-org-b' \gset
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

insert into public.platform_admins (user_id)
values ('55555555-eeee-4eee-8eee-555555555555');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-aaaa-4aaa-8aaa-111111111111', 'role', 'authenticated')::text,
  true
);

select public.create_inventory_item(
  :'restaurant_a',
  'Pomodoro Recipe',
  'POM-REC-1',
  'Verdura',
  'kg',
  10000,
  2000,
  250,
  null,
  '',
  null::date,
  'Frigo 1',
  'recipe-item-a-001'
) as item_a \gset
select ok(char_length(:'item_a') > 0, 'owner A can create the first inventory item');

select public.create_inventory_item(
  :'restaurant_a',
  'Basilico Recipe',
  'BAS-REC-1',
  'Verdura',
  'kg',
  2000,
  500,
  100,
  null,
  '',
  null::date,
  'Frigo 1',
  'recipe-item-a-002'
) as item_a2 \gset
select ok(char_length(:'item_a2') > 0, 'owner A can create a second inventory item');

insert into public.menu_items (
  organization_id,
  restaurant_id,
  name,
  description,
  price_cents
)
values (
  :'org_a',
  :'restaurant_a',
  'Piatto Recipe A',
  '',
  1200
)
returning id as menu_a \gset

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '22222222-bbbb-4bbb-8bbb-222222222222', 'role', 'authenticated')::text,
  true
);
select public.create_inventory_item(
  :'restaurant_b',
  'Pomodoro Recipe B',
  'POM-REC-B',
  'Verdura',
  'kg',
  5000,
  1000,
  200,
  null,
  '',
  null::date,
  'Frigo B',
  'recipe-item-b-001'
) as item_b \gset
select ok(char_length(:'item_b') > 0, 'owner B can create an inventory item in the other tenant');

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-aaaa-4aaa-8aaa-111111111111', 'role', 'authenticated')::text,
  true
);

select public.save_recipe(
  :'restaurant_a',
  :'menu_a',
  2,
  'Ricetta test',
  jsonb_build_array(
    jsonb_build_object('inventory_item_id', :'item_a', 'quantity_milli', 500, 'waste_bp', 1000),
    jsonb_build_object('inventory_item_id', :'item_a2', 'quantity_milli', 100, 'waste_bp', 0)
  )
) as recipe_a \gset

select ok(char_length(:'recipe_a') > 0, 'owner A can save a recipe for a menu item');

select is(
  (select count(*) from public.recipe_ingredients where recipe_id = :'recipe_a'),
  2::bigint,
  'the recipe stores all ingredients'
);

select is(
  public.save_recipe(
    :'restaurant_a',
    :'menu_a',
    2,
    'Ricetta test',
    jsonb_build_array(
      jsonb_build_object('inventory_item_id', :'item_a', 'quantity_milli', 500, 'waste_bp', 1000),
      jsonb_build_object('inventory_item_id', :'item_a2', 'quantity_milli', 100, 'waste_bp', 0)
    )
  ),
  :'recipe_a'::uuid,
  'saving the same recipe again returns the existing recipe'
);

select is(
  (select count(*) from public.recipe_ingredients where recipe_id = :'recipe_a'),
  2::bigint,
  'saving the same recipe again does not duplicate ingredients'
);

select is(
  public.save_recipe(
    :'restaurant_a',
    :'menu_a',
    4,
    'Ricetta aggiornata',
    jsonb_build_array(
      jsonb_build_object('inventory_item_id', :'item_a', 'quantity_milli', 2000, 'waste_bp', 0)
    )
  ),
  :'recipe_a'::uuid,
  'updating a recipe keeps the same recipe id'
);

select is(
  (select yield_portions from public.recipes where id = :'recipe_a'),
  4,
  'updating a recipe changes its yield'
);

select is(
  (select count(*) from public.recipe_ingredients where recipe_id = :'recipe_a'),
  1::bigint,
  'updating a recipe replaces the ingredient list'
);

select throws_ok(
  format(
    $$select public.save_recipe(%L, %L, 0, '', %L::jsonb)$$,
    :'restaurant_a',
    :'menu_a',
    jsonb_build_array(
      jsonb_build_object('inventory_item_id', :'item_a', 'quantity_milli', 1000, 'waste_bp', 0)
    )::text
  ),
  '23514',
  null,
  'zero portions are rejected'
);

select throws_ok(
  format(
    $$select public.save_recipe(%L, %L, 1, '', '[]'::jsonb)$$,
    :'restaurant_a',
    :'menu_a'
  ),
  '23514',
  null,
  'a recipe without ingredients is rejected'
);

select throws_ok(
  format(
    $$select public.save_recipe(%L, %L, 1, '', %L::jsonb)$$,
    :'restaurant_a',
    :'menu_a',
    jsonb_build_array(
      jsonb_build_object('inventory_item_id', :'item_a', 'quantity_milli', 1000, 'waste_bp', 0),
      jsonb_build_object('inventory_item_id', :'item_a', 'quantity_milli', 500, 'waste_bp', 0)
    )::text
  ),
  '23505',
  null,
  'duplicate ingredients are rejected'
);

select throws_ok(
  format(
    $$select public.save_recipe(%L, %L, 1, '', %L::jsonb)$$,
    :'restaurant_a',
    :'menu_a',
    jsonb_build_array(
      jsonb_build_object('inventory_item_id', :'item_a', 'quantity_milli', 0, 'waste_bp', 0)
    )::text
  ),
  '23514',
  null,
  'zero ingredient quantities are rejected'
);

select throws_ok(
  format(
    $$select public.save_recipe(%L, %L, 1, '', %L::jsonb)$$,
    :'restaurant_a',
    :'menu_a',
    jsonb_build_array(
      jsonb_build_object('inventory_item_id', :'item_a', 'quantity_milli', 1000, 'waste_bp', 10001)
    )::text
  ),
  '23514',
  null,
  'waste above one hundred percent is rejected'
);

select throws_ok(
  format(
    $$select public.save_recipe(%L, %L, 1, '', %L::jsonb)$$,
    :'restaurant_a',
    :'menu_a',
    jsonb_build_array(
      jsonb_build_object('inventory_item_id', :'item_b', 'quantity_milli', 1000, 'waste_bp', 0)
    )::text
  ),
  '23503',
  null,
  'an inventory item from another tenant cannot be used'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '22222222-bbbb-4bbb-8bbb-222222222222', 'role', 'authenticated')::text,
  true
);
select throws_ok(
  format(
    $$select public.save_recipe(%L, %L, 1, '', %L::jsonb)$$,
    :'restaurant_a',
    :'menu_a',
    jsonb_build_array(
      jsonb_build_object('inventory_item_id', :'item_b', 'quantity_milli', 1000, 'waste_bp', 0)
    )::text
  ),
  '42501',
  null,
  'owner B cannot save a recipe for restaurant A'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '33333333-cccc-4ccc-8ccc-333333333333', 'role', 'authenticated')::text,
  true
);
select throws_ok(
  format(
    $$select public.save_recipe(%L, %L, 1, '', %L::jsonb)$$,
    :'restaurant_a',
    :'menu_a',
    jsonb_build_array(
      jsonb_build_object('inventory_item_id', :'item_a', 'quantity_milli', 1000, 'waste_bp', 0)
    )::text
  ),
  '42501',
  null,
  'a cashier cannot save a recipe'
);
select is(
  (select count(*) from public.recipes),
  0::bigint,
  'a cashier cannot read recipes'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '44444444-dddd-4ddd-8ddd-444444444444', 'role', 'authenticated')::text,
  true
);
select throws_ok(
  format(
    $$select public.save_recipe(%L, %L, 1, '', %L::jsonb)$$,
    :'restaurant_a',
    :'menu_a',
    jsonb_build_array(
      jsonb_build_object('inventory_item_id', :'item_a', 'quantity_milli', 1000, 'waste_bp', 0)
    )::text
  ),
  '42501',
  null,
  'the warehouse role cannot manage recipes without menu.manage'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '22222222-bbbb-4bbb-8bbb-222222222222', 'role', 'authenticated')::text,
  true
);
select is(
  (select count(*) from public.recipes),
  0::bigint,
  'owner B cannot read recipes from restaurant A'
);
select is(
  (select count(*) from public.recipe_ingredients),
  0::bigint,
  'owner B cannot read recipe ingredients from restaurant A'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-aaaa-4aaa-8aaa-111111111111', 'role', 'authenticated')::text,
  true
);
select throws_ok(
  format(
    $$insert into public.recipes (organization_id, restaurant_id, menu_item_id)
      values (%L, %L, %L)$$,
    :'org_a',
    :'restaurant_a',
    :'menu_a'
  ),
  '42501',
  null,
  'recipes cannot be inserted directly'
);
select throws_ok(
  format(
    $$insert into public.recipe_ingredients (
      organization_id, restaurant_id, recipe_id, inventory_item_id, quantity_milli
    ) values (%L, %L, %L, %L, 1000)$$,
    :'org_a',
    :'restaurant_a',
    :'recipe_a',
    :'item_a'
  ),
  '42501',
  null,
  'recipe ingredients cannot be inserted directly'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '33333333-cccc-4ccc-8ccc-333333333333', 'role', 'authenticated')::text,
  true
);
select throws_ok(
  format($$select public.delete_recipe(%L)$$, :'recipe_a'),
  '42501',
  null,
  'a cashier cannot delete a recipe'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '55555555-eeee-4eee-8eee-555555555555', 'role', 'authenticated')::text,
  true
);
select is(
  (select count(*) from public.recipes where id = :'recipe_a'),
  1::bigint,
  'the platform admin can read a recipe'
);
select is(
  (select count(*) from public.recipe_ingredients where recipe_id = :'recipe_a'),
  1::bigint,
  'the platform admin can read recipe ingredients'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-aaaa-4aaa-8aaa-111111111111', 'role', 'authenticated')::text,
  true
);
select lives_ok(
  format($$select public.delete_recipe(%L)$$, :'recipe_a'),
  'owner A can delete a recipe'
);
select is(
  (select count(*) from public.recipes where id = :'recipe_a'),
  0::bigint,
  'deleting a recipe removes it'
);
select is(
  (select count(*) from public.recipe_ingredients where recipe_id = :'recipe_a'),
  0::bigint,
  'deleting a recipe cascades to its ingredients'
);

select ok(
  (select count(*) from public.audit_logs where action = 'recipe.saved') >= 2,
  'saving recipes writes an audit entry'
);
select ok(
  (select count(*) from public.audit_logs where action = 'recipe.deleted') >= 1,
  'deleting a recipe writes an audit entry'
);

select * from finish();
rollback;
