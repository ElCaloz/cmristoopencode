-- Sprint 2 — KDS: transizioni di stato delle righe d'ordine validate nel database.
-- Come per il POS (D-025), le mutazioni passano solo da RPC security definer;
-- la state machine è server-side: pending → preparing → ready → served.

create or replace function public.set_order_item_status(
  p_item_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_item public.order_items;
  v_order public.orders;
  v_rank_current integer;
  v_rank_next integer;
begin
  if v_user is null then
    raise exception 'Autenticazione richiesta.' using errcode = '42501';
  end if;

  if p_status not in ('pending', 'preparing', 'ready', 'served') then
    raise exception 'Stato riga non valido.' using errcode = '22023';
  end if;

  select * into v_item
  from public.order_items
  where id = p_item_id
  for update;

  if not found then
    raise exception 'Riga non trovata.' using errcode = 'P0002';
  end if;

  if not (
    public.auth_has_permission_for_restaurant(v_item.restaurant_id, 'kitchen.operate')
    or public.auth_has_permission_for_restaurant(v_item.restaurant_id, 'pos.operate')
  ) then
    raise exception 'Servono i permessi di cucina o cassa per aggiornare una riga.'
      using errcode = '42501';
  end if;

  select * into v_order
  from public.orders
  where id = v_item.order_id;

  if not found then
    raise exception 'Conto non trovato.' using errcode = 'P0002';
  end if;

  if v_order.status <> 'open' then
    raise exception 'Il conto non è più aperto.' using errcode = '23514';
  end if;

  if v_item.status = p_status then
    return jsonb_build_object(
      'item_id', v_item.id,
      'order_id', v_item.order_id,
      'previous_status', v_item.status,
      'status', v_item.status,
      'changed', false
    );
  end if;

  if v_item.status = 'cancelled' or v_item.status = 'served' then
    raise exception 'La riga è già chiusa.' using errcode = '23514';
  end if;

  v_rank_current := case v_item.status
    when 'pending' then 1
    when 'preparing' then 2
    when 'ready' then 3
  end;

  v_rank_next := case p_status
    when 'pending' then 1
    when 'preparing' then 2
    when 'ready' then 3
    when 'served' then 4
  end;

  if v_rank_next <> v_rank_current + 1 then
    raise exception 'Transizione non consentita: da % a %.',
      v_item.status, p_status using errcode = '23514';
  end if;

  update public.order_items
  set status = p_status
  where id = v_item.id;

  return jsonb_build_object(
    'item_id', v_item.id,
    'order_id', v_item.order_id,
    'previous_status', v_item.status,
    'status', p_status,
    'changed', true
  );
end;
$$;

revoke execute on function public.set_order_item_status(uuid, text) from public, anon;
grant execute on function public.set_order_item_status(uuid, text) to authenticated, service_role;
