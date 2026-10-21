-- Sprint 6: planimetria della sala (posizioni, forme e oggetti di arredo).
-- Griglia logica: 48 x 32 mezze-celle (24 x 16 celle), quindi 1 unita = mezza cella.
-- I vincoli geometrici sono verificati lato database: nessuna coordinata fuori pianta.

alter table public.restaurant_tables
  add column shape text not null default 'rect',
  add column pos_x integer not null default 2,
  add column pos_y integer not null default 2,
  add column width integer not null default 4,
  add column height integer not null default 4;

alter table public.restaurant_tables
  add constraint restaurant_tables_shape_check
    check (shape in ('rect', 'round')),
  add constraint restaurant_tables_pos_x_check
    check (pos_x between 0 and 47),
  add constraint restaurant_tables_pos_y_check
    check (pos_y between 0 and 31),
  add constraint restaurant_tables_width_check
    check (width between 2 and 24),
  add constraint restaurant_tables_height_check
    check (height between 2 and 16),
  add constraint restaurant_tables_bounds_check
    check (pos_x + width <= 48 and pos_y + height <= 32);

create table public.floor_objects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  restaurant_id uuid not null,
  area_id uuid not null,
  kind text not null default 'wall',
  label text not null default '',
  pos_x integer not null default 2,
  pos_y integer not null default 2,
  width integer not null default 8,
  height integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint floor_objects_kind_check
    check (kind in ('wall', 'counter', 'door', 'plant', 'label')),
  constraint floor_objects_label_check
    check (char_length(label) between 0 and 40),
  constraint floor_objects_pos_x_check
    check (pos_x between 0 and 47),
  constraint floor_objects_pos_y_check
    check (pos_y between 0 and 31),
  constraint floor_objects_width_check
    check (width between 1 and 48),
  constraint floor_objects_height_check
    check (height between 1 and 32),
  constraint floor_objects_bounds_check
    check (pos_x + width <= 48 and pos_y + height <= 32),
  constraint floor_objects_restaurant_organization_fkey
    foreign key (restaurant_id, organization_id)
    references public.restaurants (id, organization_id)
    on delete cascade,
  constraint floor_objects_area_restaurant_fkey
    foreign key (area_id, restaurant_id)
    references public.floor_areas (id, restaurant_id)
    on delete cascade,
  constraint floor_objects_id_restaurant_key unique (id, restaurant_id)
);

create index floor_objects_area_idx
  on public.floor_objects (area_id, restaurant_id);

create trigger floor_objects_set_updated_at before update on public.floor_objects
  for each row execute function public.set_updated_at();

alter table public.floor_objects enable row level security;

create policy floor_objects_select on public.floor_objects
  for select to authenticated
  using (
    restaurant_id in (select public.auth_restaurant_ids())
    or public.auth_is_platform_admin()
  );

create policy floor_objects_insert on public.floor_objects
  for insert to authenticated
  with check (public.auth_has_permission_for_restaurant(restaurant_id, 'reservations.manage'));

create policy floor_objects_update on public.floor_objects
  for update to authenticated
  using (public.auth_has_permission_for_restaurant(restaurant_id, 'reservations.manage'))
  with check (public.auth_has_permission_for_restaurant(restaurant_id, 'reservations.manage'));

create policy floor_objects_delete on public.floor_objects
  for delete to authenticated
  using (public.auth_has_permission_for_restaurant(restaurant_id, 'reservations.manage'));

-- Salvataggio atomico del layout di una area: tavoli (aggiornati o inseriti),
-- oggetti di arredo (aggiornati o inseriti) ed elenchi espliciti di rimozioni.
create or replace function public.save_floor_layout(
  p_area_id uuid,
  p_tables jsonb,
  p_objects jsonb,
  p_remove_table_ids uuid[],
  p_remove_object_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_restaurant uuid;
  v_org uuid;
  v_table jsonb;
  v_object jsonb;
  v_id uuid;
  v_tables_count integer := 0;
  v_objects_count integer := 0;
  v_tables_removed integer := 0;
  v_objects_removed integer := 0;
begin
  if v_user is null then
    raise exception 'Autenticazione richiesta.' using errcode = '42501';
  end if;

  select a.restaurant_id, a.organization_id into v_restaurant, v_org
  from public.floor_areas a
  where a.id = p_area_id;

  if v_restaurant is null then
    raise exception 'Area non trovata.' using errcode = 'P0002';
  end if;

  if not public.auth_has_permission_for_restaurant(v_restaurant, 'reservations.manage') then
    raise exception 'Permesso reservations.manage richiesto.' using errcode = '42501';
  end if;

  if p_tables is not null and jsonb_typeof(p_tables) <> 'array' then
    raise exception 'Layout tavoli non valido.' using errcode = '23514';
  end if;

  if p_objects is not null and jsonb_typeof(p_objects) <> 'array' then
    raise exception 'Layout oggetti non valido.' using errcode = '23514';
  end if;

  if jsonb_array_length(coalesce(p_tables, '[]'::jsonb)) > 200
    or jsonb_array_length(coalesce(p_objects, '[]'::jsonb)) > 200 then
    raise exception 'Il layout contiene troppi elementi.' using errcode = '23514';
  end if;

  delete from public.restaurant_tables
  where id = any (coalesce(p_remove_table_ids, '{}'::uuid[]))
    and area_id = p_area_id
    and restaurant_id = v_restaurant;
  get diagnostics v_tables_removed = row_count;

  delete from public.floor_objects
  where id = any (coalesce(p_remove_object_ids, '{}'::uuid[]))
    and area_id = p_area_id
    and restaurant_id = v_restaurant;
  get diagnostics v_objects_removed = row_count;

  for v_table in
    select value from jsonb_array_elements(coalesce(p_tables, '[]'::jsonb)) as t (value)
  loop
    v_id := nullif(v_table ->> 'id', '')::uuid;

    if v_id is null then
      insert into public.restaurant_tables (
        organization_id,
        restaurant_id,
        area_id,
        name,
        seats,
        shape,
        pos_x,
        pos_y,
        width,
        height,
        sort_order
      )
      values (
        v_org,
        v_restaurant,
        p_area_id,
        v_table ->> 'name',
        (v_table ->> 'seats')::integer,
        v_table ->> 'shape',
        (v_table ->> 'posX')::integer,
        (v_table ->> 'posY')::integer,
        (v_table ->> 'width')::integer,
        (v_table ->> 'height')::integer,
        (
          select coalesce(max(t.sort_order), 0) + 1
          from public.restaurant_tables t
          where t.restaurant_id = v_restaurant
        )
      );
    else
      update public.restaurant_tables
      set
        name = v_table ->> 'name',
        seats = (v_table ->> 'seats')::integer,
        shape = v_table ->> 'shape',
        pos_x = (v_table ->> 'posX')::integer,
        pos_y = (v_table ->> 'posY')::integer,
        width = (v_table ->> 'width')::integer,
        height = (v_table ->> 'height')::integer
      where id = v_id
        and area_id = p_area_id
        and restaurant_id = v_restaurant;

      if not found then
        raise exception 'Tavolo non trovato in questa area.' using errcode = 'P0002';
      end if;
    end if;

    v_tables_count := v_tables_count + 1;
  end loop;

  for v_object in
    select value from jsonb_array_elements(coalesce(p_objects, '[]'::jsonb)) as o (value)
  loop
    v_id := nullif(v_object ->> 'id', '')::uuid;

    if v_id is null then
      insert into public.floor_objects (
        organization_id,
        restaurant_id,
        area_id,
        kind,
        label,
        pos_x,
        pos_y,
        width,
        height
      )
      values (
        v_org,
        v_restaurant,
        p_area_id,
        v_object ->> 'kind',
        coalesce(v_object ->> 'label', ''),
        (v_object ->> 'posX')::integer,
        (v_object ->> 'posY')::integer,
        (v_object ->> 'width')::integer,
        (v_object ->> 'height')::integer
      );
    else
      update public.floor_objects
      set
        kind = v_object ->> 'kind',
        label = coalesce(v_object ->> 'label', ''),
        pos_x = (v_object ->> 'posX')::integer,
        pos_y = (v_object ->> 'posY')::integer,
        width = (v_object ->> 'width')::integer,
        height = (v_object ->> 'height')::integer
      where id = v_id
        and area_id = p_area_id
        and restaurant_id = v_restaurant;

      if not found then
        raise exception 'Oggetto non trovato in questa area.' using errcode = 'P0002';
      end if;
    end if;

    v_objects_count := v_objects_count + 1;
  end loop;

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
    v_restaurant,
    v_user,
    'floor.layout_saved',
    'floor_area',
    p_area_id,
    jsonb_build_object(
      'tables', v_tables_count,
      'objects', v_objects_count,
      'tables_removed', v_tables_removed,
      'objects_removed', v_objects_removed
    )
  );
end;
$$;

revoke execute on function public.save_floor_layout(uuid, jsonb, jsonb, uuid[], uuid[]) from public, anon;
grant execute on function public.save_floor_layout(uuid, jsonb, jsonb, uuid[], uuid[]) to authenticated, service_role;
