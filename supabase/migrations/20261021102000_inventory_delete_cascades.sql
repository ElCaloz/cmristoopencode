alter table public.inventory_items
  drop constraint inventory_items_supplier_fkey;

alter table public.inventory_items
  add constraint inventory_items_supplier_fkey
  foreign key (supplier_id, restaurant_id)
  references public.suppliers (id, restaurant_id)
  on delete set null (supplier_id);

alter table public.inventory_movements
  drop constraint inventory_movements_item_restaurant_fkey;

alter table public.inventory_movements
  add constraint inventory_movements_item_restaurant_fkey
  foreign key (item_id, restaurant_id)
  references public.inventory_items (id, restaurant_id)
  on delete cascade;
