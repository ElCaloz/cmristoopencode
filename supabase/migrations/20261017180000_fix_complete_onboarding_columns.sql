create or replace function public.complete_onboarding(
  p_organization_name text,
  p_restaurant_name text,
  p_slug text,
  p_city text,
  p_restaurant_kind text,
  p_requested_plan text
)
returns table (
  new_organization_id uuid,
  new_restaurant_id uuid,
  created boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_slug text := lower(btrim(coalesce(p_slug, '')));
  v_existing_organization_id uuid;
  v_existing_restaurant_id uuid;
  v_organization_id uuid;
  v_restaurant_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if p_organization_name is null
    or char_length(btrim(p_organization_name)) not between 2 and 120 then
    raise exception 'invalid organization name' using errcode = '22023';
  end if;

  if p_restaurant_name is null
    or char_length(btrim(p_restaurant_name)) not between 2 and 120 then
    raise exception 'invalid restaurant name' using errcode = '22023';
  end if;

  if p_city is null
    or char_length(btrim(p_city)) not between 2 and 100 then
    raise exception 'invalid city' using errcode = '22023';
  end if;

  if p_restaurant_kind is null
    or p_restaurant_kind not in ('restaurant', 'trattoria', 'pizzeria', 'bar', 'bistro', 'other') then
    raise exception 'invalid restaurant kind' using errcode = '22023';
  end if;

  if p_requested_plan is null
    or p_requested_plan not in ('starter', 'pro', 'business', 'enterprise') then
    raise exception 'invalid requested plan' using errcode = '22023';
  end if;

  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'invalid slug' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select m.organization_id
  into v_existing_organization_id
  from public.memberships m
  where m.user_id = v_user_id
    and m.status = 'active'
    and m.restaurant_id is null
  order by m.created_at
  limit 1;

  if v_existing_organization_id is not null then
    select r.id
    into v_existing_restaurant_id
    from public.restaurants r
    where r.organization_id = v_existing_organization_id
    order by r.created_at
    limit 1;

    return query
      select v_existing_organization_id, v_existing_restaurant_id, false;
    return;
  end if;

  select created_organization.new_organization_id, created_organization.new_restaurant_id
  into v_organization_id, v_restaurant_id
  from public.create_organization(
    btrim(p_organization_name),
    v_slug,
    btrim(p_restaurant_name)
  ) as created_organization;

  update public.organizations
  set requested_plan = p_requested_plan,
      plan_status = 'requested'
  where id = v_organization_id;

  update public.restaurants
  set venue_type = p_restaurant_kind
  where id = v_restaurant_id;

  insert into public.restaurant_locations (restaurant_id, name, city, is_primary)
  values (v_restaurant_id, 'Sede principale', btrim(p_city), true);

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
    v_organization_id,
    v_restaurant_id,
    v_user_id,
    'onboarding.completed',
    'organization',
    v_organization_id::text,
    jsonb_build_object(
      'requested_plan', p_requested_plan,
      'restaurant_kind', p_restaurant_kind,
      'city', btrim(p_city)
    )
  );

  return query select v_organization_id, v_restaurant_id, true;
end;
$$;

revoke all on function public.complete_onboarding(text, text, text, text, text, text)
  from public, anon;
grant execute on function public.complete_onboarding(text, text, text, text, text, text)
  to authenticated, service_role;
