begin;

create extension if not exists pgtap with schema extensions;
grant usage on schema extensions to authenticated, anon;
grant execute on all functions in schema extensions to authenticated, anon;
set local search_path = public, extensions, pg_temp;

select plan(30);

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
    '11111111-cccc-4ccc-8ccc-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'menu-owner-a@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Menu Owner A"}'
  ),
  (
    '22222222-cccc-4ccc-8ccc-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'menu-owner-b@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Menu Owner B"}'
  ),
  (
    '33333333-cccc-4ccc-8ccc-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'menu-cashier-a@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Menu Cashier A"}'
  ),
  (
    '44444444-cccc-4ccc-8ccc-444444444444',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'menu-platform@example.test',
    'test-only',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Menu Platform"}'
  );

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-cccc-4ccc-8ccc-111111111111', 'role', 'authenticated')::text,
  true
);
select lives_ok(
  $$select public.create_organization('Menu Org A', 'menu-org-a', 'Ristorante Menu A')$$,
  'owner A can create an organization'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '22222222-cccc-4ccc-8ccc-222222222222', 'role', 'authenticated')::text,
  true
);
select lives_ok(
  $$select public.create_organization('Menu Org B', 'menu-org-b', 'Ristorante Menu B')$$,
  'owner B can create an organization'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

select id as org_a from public.organizations where slug = 'menu-org-a' \gset
select id as org_b from public.organizations where slug = 'menu-org-b' \gset
select id as restaurant_a from public.restaurants where organization_id = :'org_a' and slug = 'main' \gset
select id as restaurant_b from public.restaurants where organization_id = :'org_b' and slug = 'main' \gset

insert into public.memberships (user_id, organization_id, restaurant_id, role_id)
select '33333333-cccc-4ccc-8ccc-333333333333', :'org_a', :'restaurant_a', r.id
from public.roles r
where r.key = 'cashier';

insert into public.platform_admins (user_id)
values ('44444444-cccc-4ccc-8ccc-444444444444');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-cccc-4ccc-8ccc-111111111111', 'role', 'authenticated')::text,
  true
);

select lives_ok(
  format(
    $$insert into public.menu_categories (organization_id, restaurant_id, name) values (%L, %L, 'Antipasti')$$,
    :'org_a',
    :'restaurant_a'
  ),
  'owner A can create a menu category'
);

select lives_ok(
  format(
    $$insert into public.menu_items (organization_id, restaurant_id, category_id, name, price_cents)
      select %L, %L, c.id, 'Bruschette al pomodoro', 650
      from public.menu_categories c
      where c.restaurant_id = %L and c.name = 'Antipasti'$$,
    :'org_a',
    :'restaurant_a',
    :'restaurant_a'
  ),
  'owner A can create a menu item with a category'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '22222222-cccc-4ccc-8ccc-222222222222', 'role', 'authenticated')::text,
  true
);

select lives_ok(
  format(
    $$insert into public.menu_categories (organization_id, restaurant_id, name) values (%L, %L, 'Antipasti')$$,
    :'org_b',
    :'restaurant_b'
  ),
  'a same-named category is allowed in another restaurant'
);

select throws_ok(
  format(
    $$insert into public.menu_categories (organization_id, restaurant_id, name) values (%L, %L, 'Secondi')$$,
    :'org_b',
    :'restaurant_a'
  ),
  '42501',
  null,
  'owner B cannot insert a category for restaurant A'
);

select throws_ok(
  format(
    $$insert into public.menu_items (organization_id, restaurant_id, name, price_cents) values (%L, %L, 'Intruso', 100)$$,
    :'org_b',
    :'restaurant_a'
  ),
  '42501',
  null,
  'owner B cannot insert an item for restaurant A'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-cccc-4ccc-8ccc-111111111111', 'role', 'authenticated')::text,
  true
);

select throws_ok(
  format(
    $$insert into public.menu_categories (organization_id, restaurant_id, name) values (%L, %L, 'Antipasti')$$,
    :'org_a',
    :'restaurant_a'
  ),
  '23505',
  null,
  'duplicate category names are rejected inside the same restaurant'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

select id as cat_a from public.menu_categories where restaurant_id = :'restaurant_a' \gset
select id as item_a from public.menu_items where restaurant_id = :'restaurant_a' \gset
select id as cat_b from public.menu_categories where restaurant_id = :'restaurant_b' \gset

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-cccc-4ccc-8ccc-111111111111', 'role', 'authenticated')::text,
  true
);

select is(
  (select count(*) from public.menu_categories),
  1::bigint,
  'owner A sees exactly its own category'
);
select is(
  (select count(*) from public.menu_items),
  1::bigint,
  'owner A sees exactly its own item'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '22222222-cccc-4ccc-8ccc-222222222222', 'role', 'authenticated')::text,
  true
);

select is(
  (select count(*) from public.menu_categories),
  1::bigint,
  'owner B sees only its own category'
);
select is(
  (select count(*) from public.menu_categories where restaurant_id = :'restaurant_a'),
  0::bigint,
  'owner B cannot read categories of restaurant A'
);
select is(
  (select count(*) from public.menu_items),
  0::bigint,
  'owner B cannot read items of restaurant A'
);

update public.menu_items set name = 'Hack' where id = :'item_a';
delete from public.menu_categories where id = :'cat_a';

reset role;
select set_config('request.jwt.claims', '{}', true);

select is(
  (select name from public.menu_items where id = :'item_a'),
  'Bruschette al pomodoro',
  'owner B update on an item of A has no effect'
);
select is(
  (select count(*) from public.menu_categories where id = :'cat_a'),
  1::bigint,
  'owner B delete on a category of A has no effect'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '33333333-cccc-4ccc-8ccc-333333333333', 'role', 'authenticated')::text,
  true
);

select is(
  (select count(*) from public.menu_categories),
  1::bigint,
  'the cashier can read the menu of its restaurant'
);
select is(
  (select count(*) from public.menu_items),
  1::bigint,
  'the cashier can read items of its restaurant'
);
select is(
  (select count(*) from public.menu_categories where restaurant_id = :'restaurant_b'),
  0::bigint,
  'the cashier cannot read the menu of another tenant'
);

select throws_ok(
  format(
    $$insert into public.menu_categories (organization_id, restaurant_id, name) values (%L, %L, 'Senza permesso')$$,
    :'org_a',
    :'restaurant_a'
  ),
  '42501',
  null,
  'a cashier without menu.manage cannot insert categories'
);

update public.menu_items set name = 'Hack' where id = :'item_a';
delete from public.menu_categories where id = :'cat_a';

reset role;
select set_config('request.jwt.claims', '{}', true);

select is(
  (select name from public.menu_items where id = :'item_a'),
  'Bruschette al pomodoro',
  'a cashier update on menu items has no effect'
);
select is(
  (select count(*) from public.menu_categories where id = :'cat_a'),
  1::bigint,
  'a cashier delete on categories has no effect'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-cccc-4ccc-8ccc-111111111111', 'role', 'authenticated')::text,
  true
);

select throws_ok(
  format(
    $$insert into public.menu_items (organization_id, restaurant_id, name, price_cents) values (%L, %L, 'Prezzo negativo', -1)$$,
    :'org_a',
    :'restaurant_a'
  ),
  '23514',
  null,
  'negative prices are rejected by the database'
);

select throws_ok(
  format(
    $$insert into public.menu_items (organization_id, restaurant_id, category_id, name, price_cents) values (%L, %L, %L, 'Categoria altrui', 500)$$,
    :'org_a',
    :'restaurant_a',
    :'cat_b'
  ),
  '23503',
  null,
  'an item cannot reference a category of another restaurant'
);

select throws_ok(
  format(
    $$insert into public.menu_items (organization_id, restaurant_id, name, price_cents) values (%L, %L, 'Org incoerente', 500)$$,
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
  json_build_object('sub', '44444444-cccc-4ccc-8ccc-444444444444', 'role', 'authenticated')::text,
  true
);

select is(
  (select count(*) from public.menu_categories),
  2::bigint,
  'the platform admin sees categories of every tenant'
);
select is(
  (select count(*) from public.menu_items),
  1::bigint,
  'the platform admin sees every menu item'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

set local role anon;
select set_config('request.jwt.claims', '{}', true);
select is(
  (select count(*) from public.menu_categories),
  0::bigint,
  'anonymous users cannot read menu categories'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-cccc-4ccc-8ccc-111111111111', 'role', 'authenticated')::text,
  true
);

select lives_ok(
  format($$delete from public.menu_categories where id = %L$$, :'cat_a'),
  'owner A can delete its own category'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

select is(
  (select count(*) from public.menu_items where id = :'item_a'),
  1::bigint,
  'deleting a category keeps its items'
);
select is(
  (select category_id from public.menu_items where id = :'item_a'),
  null::uuid,
  'deleting a category clears the category reference on items'
);

select * from finish();
rollback;
