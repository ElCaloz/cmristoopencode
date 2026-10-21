-- Sprint 3 (parte 2a) — il riepilogo PIN non segnala più come "bloccato" un
-- lockout già scaduto: locked_until viene restituito solo se ancora attivo,
-- così l'interfaccia può renderizzare senza confronti con l'orologio locale.
create or replace function public.operator_pins_overview(
  p_restaurant_id uuid
)
returns table (
  membership_id uuid,
  user_id uuid,
  full_name text,
  email text,
  role_key text,
  role_name text,
  status text,
  has_pin boolean,
  locked_until timestamptz,
  pin_updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_organization_id uuid;
begin
  if v_user is null then
    raise exception 'Autenticazione richiesta.' using errcode = '42501';
  end if;

  if not public.auth_has_permission_for_restaurant(p_restaurant_id, 'devices.manage') then
    raise exception 'Permesso devices.manage richiesto.' using errcode = '42501';
  end if;

  select r.organization_id into v_organization_id
  from public.restaurants r
  where r.id = p_restaurant_id;

  if v_organization_id is null then
    raise exception 'Ristorante non trovato.' using errcode = 'P0002';
  end if;

  return query
  select
    m.id,
    m.user_id,
    pr.full_name,
    pr.email,
    ro.key,
    ro.name,
    m.status,
    op.membership_id is not null,
    case
      when op.locked_until is not null and op.locked_until > now()
        then op.locked_until
      else null
    end,
    op.updated_at
  from public.memberships m
  join public.profiles pr on pr.id = m.user_id
  join public.roles ro on ro.id = m.role_id
  left join public.operator_pins op on op.membership_id = m.id
  where m.organization_id = v_organization_id
    and (m.restaurant_id is null or m.restaurant_id = p_restaurant_id)
    and m.status <> 'suspended'
  order by pr.full_name, ro.name;
end;
$$;
