drop policy if exists suppliers_select on public.suppliers;
create policy suppliers_select on public.suppliers
  for select to authenticated
  using (
    public.auth_has_permission_for_restaurant(restaurant_id, 'inventory.manage')
    or public.auth_is_platform_admin()
  );

drop policy if exists inventory_items_select on public.inventory_items;
create policy inventory_items_select on public.inventory_items
  for select to authenticated
  using (
    public.auth_has_permission_for_restaurant(restaurant_id, 'inventory.manage')
    or public.auth_is_platform_admin()
  );

drop policy if exists inventory_movements_select on public.inventory_movements;
create policy inventory_movements_select on public.inventory_movements
  for select to authenticated
  using (
    public.auth_has_permission_for_restaurant(restaurant_id, 'inventory.manage')
    or public.auth_is_platform_admin()
  );
