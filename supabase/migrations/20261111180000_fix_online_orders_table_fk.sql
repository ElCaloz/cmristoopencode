-- Fix Sprint 7: mancava la foreign key da online_orders a restaurant_tables.
-- Senza relazione, l'embed PostgREST `restaurant_tables(name)` usato dalla
-- query della dashboard falliva e la lista degli ordini online restava vuota
-- anche con ordini presenti (l'errore veniva assorbito dal fallback a []).

alter table public.online_orders
  add constraint online_orders_table_fkey
  foreign key (table_id, restaurant_id)
  references public.restaurant_tables (id, restaurant_id)
  on delete set null (table_id);
