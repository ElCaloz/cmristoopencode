create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  restaurant_id uuid not null,
  menu_item_id uuid not null,
  yield_portions integer not null default 1 check (yield_portions between 1 and 1000),
  notes text not null default '' check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipes_restaurant_organization_fkey
    foreign key (restaurant_id, organization_id)
    references public.restaurants (id, organization_id)
    on delete cascade,
  constraint recipes_menu_item_restaurant_fkey
    foreign key (menu_item_id, restaurant_id)
    references public.menu_items (id, restaurant_id)
    on delete cascade,
  constraint recipes_id_restaurant_key unique (id, restaurant_id),
  constraint recipes_restaurant_menu_item_key unique (restaurant_id, menu_item_id)
);

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  restaurant_id uuid not null,
  recipe_id uuid not null,
  inventory_item_id uuid not null,
  quantity_milli bigint not null check (quantity_milli between 1 and 1000000000000),
  waste_bp integer not null default 0 check (waste_bp between 0 and 10000),
  created_at timestamptz not null default now(),
  constraint recipe_ingredients_recipe_restaurant_fkey
    foreign key (recipe_id, restaurant_id)
    references public.recipes (id, restaurant_id)
    on delete cascade,
  constraint recipe_ingredients_inventory_item_restaurant_fkey
    foreign key (inventory_item_id, restaurant_id)
    references public.inventory_items (id, restaurant_id)
    on delete cascade,
  constraint recipe_ingredients_recipe_item_key unique (recipe_id, inventory_item_id)
);

create index recipes_restaurant_menu_idx
  on public.recipes (restaurant_id, menu_item_id);
create index recipe_ingredients_recipe_idx
  on public.recipe_ingredients (recipe_id, inventory_item_id);
create index recipe_ingredients_inventory_item_idx
  on public.recipe_ingredients (inventory_item_id, restaurant_id);

create trigger recipes_set_updated_at before update on public.recipes
  for each row execute function public.set_updated_at();

alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;

create policy recipes_select on public.recipes
  for select to authenticated
  using (
    public.auth_has_permission_for_restaurant(restaurant_id, 'menu.manage')
    or public.auth_is_platform_admin()
  );

create policy recipe_ingredients_select on public.recipe_ingredients
  for select to authenticated
  using (
    public.auth_has_permission_for_restaurant(restaurant_id, 'menu.manage')
    or public.auth_is_platform_admin()
  );

create or replace function public.save_recipe(
  p_restaurant_id uuid,
  p_menu_item_id uuid,
  p_yield_portions integer,
  p_notes text,
  p_ingredients jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_org uuid;
  v_menu_item_name text;
  v_recipe_id uuid;
  v_ingredient jsonb;
  v_item_id uuid;
  v_quantity_milli bigint;
  v_waste_bp integer;
  v_ingredient_count integer;
begin
  if v_user is null then
    raise exception 'Autenticazione richiesta.' using errcode = '42501';
  end if;

  if not public.auth_has_permission_for_restaurant(p_restaurant_id, 'menu.manage')
    or not public.auth_has_permission_for_restaurant(p_restaurant_id, 'inventory.manage') then
    raise exception 'Permessi menu.manage e inventory.manage richiesti.' using errcode = '42501';
  end if;

  select r.organization_id into v_org
  from public.restaurants r
  where r.id = p_restaurant_id;

  if v_org is null then
    raise exception 'Ristorante non trovato.' using errcode = 'P0002';
  end if;

  select mi.name into v_menu_item_name
  from public.menu_items mi
  where mi.id = p_menu_item_id
    and mi.restaurant_id = p_restaurant_id;

  if v_menu_item_name is null then
    raise exception 'Prodotto del menu non trovato.' using errcode = 'P0002';
  end if;

  if p_yield_portions is null or p_yield_portions < 1 or p_yield_portions > 1000 then
    raise exception 'Le porzioni prodotte devono essere tra 1 e 1000.' using errcode = '23514';
  end if;

  if char_length(coalesce(p_notes, '')) > 500 then
    raise exception 'Le note sono troppo lunghe.' using errcode = '23514';
  end if;

  if p_ingredients is null or jsonb_typeof(p_ingredients) <> 'array' then
    raise exception 'Gli ingredienti devono essere una lista.' using errcode = '23514';
  end if;

  v_ingredient_count := jsonb_array_length(p_ingredients);

  if v_ingredient_count < 1 or v_ingredient_count > 50 then
    raise exception 'La ricetta deve avere tra 1 e 50 ingredienti.' using errcode = '23514';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_ingredients) entry
    group by entry->>'inventory_item_id'
    having count(*) > 1
  ) then
    raise exception 'Ogni articolo puo comparire una sola volta nella ricetta.' using errcode = '23505';
  end if;

  for v_ingredient in select value from jsonb_array_elements(p_ingredients)
  loop
    if jsonb_typeof(v_ingredient) <> 'object' then
      raise exception 'Ingrediente non valido.' using errcode = '23514';
    end if;

    begin
      v_item_id := (v_ingredient->>'inventory_item_id')::uuid;
    exception when others then
      raise exception 'Articolo di magazzino non valido.' using errcode = '23514';
    end;

    begin
      v_quantity_milli := (v_ingredient->>'quantity_milli')::bigint;
    exception when others then
      raise exception 'Quantita ingrediente non valida.' using errcode = '23514';
    end;

    if v_quantity_milli is null or v_quantity_milli < 1 or v_quantity_milli > 1000000000000 then
      raise exception 'Quantita ingrediente non valida.' using errcode = '23514';
    end if;

    begin
      v_waste_bp := coalesce((v_ingredient->>'waste_bp')::integer, 0);
    exception when others then
      raise exception 'Sfrido non valido.' using errcode = '23514';
    end;

    if v_waste_bp < 0 or v_waste_bp > 10000 then
      raise exception 'Lo sfrido deve essere tra 0 e 100 percento.' using errcode = '23514';
    end if;

    perform 1
    from public.inventory_items ii
    where ii.id = v_item_id
      and ii.restaurant_id = p_restaurant_id
      and ii.is_active;

    if not found then
      raise exception 'Articolo di magazzino non disponibile per questo ristorante.' using errcode = '23503';
    end if;
  end loop;

  select rec.id into v_recipe_id
  from public.recipes rec
  where rec.restaurant_id = p_restaurant_id
    and rec.menu_item_id = p_menu_item_id;

  if v_recipe_id is null then
    insert into public.recipes (
      organization_id,
      restaurant_id,
      menu_item_id,
      yield_portions,
      notes
    )
    values (
      v_org,
      p_restaurant_id,
      p_menu_item_id,
      p_yield_portions,
      coalesce(p_notes, '')
    )
    returning id into v_recipe_id;
  else
    update public.recipes
    set yield_portions = p_yield_portions,
        notes = coalesce(p_notes, '')
    where id = v_recipe_id;

    delete from public.recipe_ingredients
    where recipe_id = v_recipe_id;
  end if;

  insert into public.recipe_ingredients (
    organization_id,
    restaurant_id,
    recipe_id,
    inventory_item_id,
    quantity_milli,
    waste_bp
  )
  select
    v_org,
    p_restaurant_id,
    v_recipe_id,
    (entry->>'inventory_item_id')::uuid,
    (entry->>'quantity_milli')::bigint,
    coalesce((entry->>'waste_bp')::integer, 0)
  from jsonb_array_elements(p_ingredients) entry;

  insert into public.audit_logs (
    organization_id,
    restaurant_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    v_org,
    p_restaurant_id,
    v_user,
    'recipe.saved',
    'recipe',
    v_recipe_id::text,
    jsonb_build_object(
      'menu_item_id', p_menu_item_id,
      'menu_item_name', v_menu_item_name,
      'yield_portions', p_yield_portions,
      'ingredient_count', v_ingredient_count
    )
  );

  return v_recipe_id;
end;
$$;

create or replace function public.delete_recipe(p_recipe_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_recipe public.recipes;
  v_menu_item_name text;
begin
  if v_user is null then
    raise exception 'Autenticazione richiesta.' using errcode = '42501';
  end if;

  select * into v_recipe
  from public.recipes
  where id = p_recipe_id;

  if not found then
    raise exception 'Ricetta non trovata.' using errcode = 'P0002';
  end if;

  if not public.auth_has_permission_for_restaurant(v_recipe.restaurant_id, 'menu.manage')
    or not public.auth_has_permission_for_restaurant(v_recipe.restaurant_id, 'inventory.manage') then
    raise exception 'Permessi menu.manage e inventory.manage richiesti.' using errcode = '42501';
  end if;

  select mi.name into v_menu_item_name
  from public.menu_items mi
  where mi.id = v_recipe.menu_item_id;

  delete from public.recipes
  where id = p_recipe_id;

  insert into public.audit_logs (
    organization_id,
    restaurant_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    v_recipe.organization_id,
    v_recipe.restaurant_id,
    v_user,
    'recipe.deleted',
    'recipe',
    p_recipe_id::text,
    jsonb_build_object(
      'menu_item_id', v_recipe.menu_item_id,
      'menu_item_name', coalesce(v_menu_item_name, '')
    )
  );
end;
$$;

revoke execute on function public.save_recipe(
  uuid, uuid, integer, text, jsonb
) from public, anon;
revoke execute on function public.delete_recipe(uuid) from public, anon;

grant execute on function public.save_recipe(
  uuid, uuid, integer, text, jsonb
) to authenticated, service_role;
grant execute on function public.delete_recipe(uuid) to authenticated, service_role;
