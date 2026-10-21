create or replace function public.role_rank(p_role_id uuid)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case r.key
    when 'owner' then 100
    when 'admin' then 90
    when 'manager' then 80
    when 'cashier' then 50
    when 'waiter' then 40
    when 'kitchen' then 40
    when 'warehouse' then 40
    when 'host' then 40
    when 'accountant' then 30
    when 'marketing' then 30
    else 10
  end
  from public.roles r
  where r.id = p_role_id;
$$;

revoke execute on function public.role_rank(uuid) from public, anon, authenticated;

create or replace function public.enforce_membership_role_hierarchy()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_rank integer;
  v_old_rank integer;
  v_new_rank integer;
  v_owner_role uuid;
  v_has_members boolean;
begin
  if v_actor is null then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    select public.role_rank(m.role_id) into v_actor_rank
    from public.memberships m
    where m.user_id = v_actor
      and m.organization_id = old.organization_id
      and m.restaurant_id is null
      and m.status = 'active';

    if v_actor_rank is null then
      raise exception 'not allowed to manage memberships' using errcode = '42501';
    end if;
    if old.user_id = v_actor then
      raise exception 'cannot remove own membership' using errcode = '42501';
    end if;

    select public.role_rank(old.role_id) into v_old_rank;
    if v_old_rank >= v_actor_rank and v_actor_rank < 100 then
      raise exception 'cannot remove equal or higher role' using errcode = '42501';
    end if;

    return old;
  end if;

  if tg_op = 'UPDATE' then
    if new.organization_id is distinct from old.organization_id
       or new.user_id is distinct from old.user_id then
      raise exception 'membership identity cannot change' using errcode = '42501';
    end if;
    if new.user_id = v_actor and new.role_id is distinct from old.role_id then
      raise exception 'cannot change own role' using errcode = '42501';
    end if;

    select public.role_rank(m.role_id) into v_actor_rank
    from public.memberships m
    where m.user_id = v_actor
      and m.organization_id = new.organization_id
      and m.restaurant_id is null
      and m.status = 'active';

    if v_actor_rank is null then
      raise exception 'not allowed to manage memberships' using errcode = '42501';
    end if;

    select public.role_rank(old.role_id) into v_old_rank;
    select public.role_rank(new.role_id) into v_new_rank;

    if v_old_rank >= v_actor_rank and v_actor_rank < 100 then
      raise exception 'cannot modify equal or higher role' using errcode = '42501';
    end if;
    if v_new_rank > v_actor_rank then
      raise exception 'cannot assign higher role' using errcode = '42501';
    end if;
    if v_new_rank = v_actor_rank and v_actor_rank < 100 then
      raise exception 'cannot assign equal role' using errcode = '42501';
    end if;

    return new;
  end if;

  select id into v_owner_role from public.roles where key = 'owner';
  select exists (
    select 1
    from public.memberships m
    where m.organization_id = new.organization_id
  ) into v_has_members;

  if not v_has_members then
    if new.role_id is distinct from v_owner_role then
      raise exception 'first membership must be owner' using errcode = '42501';
    end if;
    return new;
  end if;

  select public.role_rank(m.role_id) into v_actor_rank
  from public.memberships m
  where m.user_id = v_actor
    and m.organization_id = new.organization_id
    and m.restaurant_id is null
    and m.status = 'active';

  if v_actor_rank is null then
    raise exception 'not allowed to manage memberships' using errcode = '42501';
  end if;

  select public.role_rank(new.role_id) into v_new_rank;
  if v_new_rank > v_actor_rank then
    raise exception 'cannot assign higher role' using errcode = '42501';
  end if;
  if v_new_rank = v_actor_rank and v_actor_rank < 100 then
    raise exception 'cannot assign equal role' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_membership_role_hierarchy() from public, anon, authenticated;

drop trigger if exists memberships_enforce_role_hierarchy on public.memberships;
create trigger memberships_enforce_role_hierarchy
  before insert or update or delete on public.memberships
  for each row execute function public.enforce_membership_role_hierarchy();
