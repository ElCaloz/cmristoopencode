-- Sprint 7 — CRM, fidelizzazione, marketing, ordini online, personale, sedi,
-- stampa scontrini e integrazioni esterne.
--
-- Principi:
--  * ogni record operativo resta legato a organizzazione e ristorante (sede);
--  * i token pubblici sono casuali, revocabili e non enumerabili;
--  * i prezzi degli ordini online vengono ricalcolati dal database;
--  * le funzioni pubbliche sono security definer e ricevono un segreto server-only
--    per webhook e servizio locale di stampa;
--  * nessun segreto viene salvato in chiaro: solo hash SHA-256.

-- ---------------------------------------------------------------------------
-- Estensioni e colonne esistenti
-- ---------------------------------------------------------------------------

alter table public.organizations
  add column stripe_customer_id text,
  add column stripe_subscription_id text,
  add column billing_interval text check (billing_interval in ('month', 'year')),
  add column plan_activated_at timestamptz;

alter table public.restaurants
  add column description text not null default '',
  add column cuisine text not null default '',
  add column phone text,
  add column address text,
  add column public_menu_note text not null default '';

alter table public.restaurant_settings
  add column receipt_header text,
  add column public_menu_enabled boolean not null default false,
  add column inbound_phone text,
  add column inbound_email text;

alter table public.memberships
  add column phone text,
  add column hired_at date,
  add column hourly_rate_cents bigint
    check (hourly_rate_cents is null or hourly_rate_cents between 0 and 100000000),
  add column notes text not null default '';

-- Ordini online confermati diventano comande reali per cucina e POS.
alter table public.orders
  alter column opened_by drop not null,
  add column source text not null default 'pos'
    check (source in ('pos', 'online', 'palmare')),
  add column customer_id uuid,
  add column online_order_id uuid;

-- ---------------------------------------------------------------------------
-- CRM clienti
-- ---------------------------------------------------------------------------

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  restaurant_id uuid not null,
  first_name text not null default '' check (char_length(first_name) <= 80),
  last_name text not null default '' check (char_length(last_name) <= 80),
  email text not null default '' check (char_length(email) <= 254),
  phone text not null default '' check (char_length(phone) <= 40),
  tags text[] not null default '{}',
  allergies text not null default '' check (char_length(allergies) <= 500),
  notes text not null default '' check (char_length(notes) <= 1000),
  marketing_email boolean not null default false,
  marketing_sms boolean not null default false,
  consent_at timestamptz,
  visits integer not null default 0 check (visits >= 0),
  total_spent_cents bigint not null default 0 check (total_spent_cents >= 0),
  last_visit_at timestamptz,
  loyalty_points integer not null default 0 check (loyalty_points >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_restaurant_organization_fkey
    foreign key (restaurant_id, organization_id)
    references public.restaurants (id, organization_id)
    on delete cascade,
  constraint customers_id_restaurant_key unique (id, restaurant_id),
  constraint customers_contact_check check (email <> '' or phone <> '')
);

create unique index customers_restaurant_email_idx
  on public.customers (restaurant_id, lower(email))
  where email <> '';
create unique index customers_restaurant_phone_idx
  on public.customers (restaurant_id, phone)
  where phone <> '';
create index customers_restaurant_created_idx
  on public.customers (restaurant_id, created_at desc);
create index customers_restaurant_loyalty_idx
  on public.customers (restaurant_id, loyalty_points desc);

create table public.loyalty_settings (
  restaurant_id uuid primary key references public.restaurants (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  points_per_euro integer not null default 10
    check (points_per_euro between 1 and 1000),
  point_value_cents integer not null default 1
    check (point_value_cents between 1 and 10000),
  min_redeem_points integer not null default 100
    check (min_redeem_points between 1 and 1000000),
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint loyalty_settings_restaurant_organization_fkey
    foreign key (restaurant_id, organization_id)
    references public.restaurants (id, organization_id)
    on delete cascade
);

create table public.loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  restaurant_id uuid not null,
  customer_id uuid not null,
  order_id uuid,
  points integer not null check (points between -1000000 and 1000000 and points <> 0),
  reason text not null default '' check (char_length(reason) <= 200),
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 120),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint loyalty_transactions_customer_restaurant_fkey
    foreign key (customer_id, restaurant_id)
    references public.customers (id, restaurant_id)
    on delete cascade,
  constraint loyalty_transactions_order_restaurant_fkey
    foreign key (order_id, restaurant_id)
    references public.orders (id, restaurant_id)
    on delete set null (order_id),
  constraint loyalty_transactions_restaurant_idempotency_key
    unique (restaurant_id, idempotency_key)
);

create index loyalty_transactions_customer_idx
  on public.loyalty_transactions (customer_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Marketing e inbox clienti
-- ---------------------------------------------------------------------------

create table public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  restaurant_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  channel text not null check (channel in ('email', 'sms')),
  subject text not null default '' check (char_length(subject) <= 200),
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  segment text not null default 'all'
    check (segment in ('all', 'loyal', 'new', 'inactive', 'vip')),
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  scheduled_at timestamptz,
  sent_count integer not null default 0 check (sent_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketing_campaigns_restaurant_organization_fkey
    foreign key (restaurant_id, organization_id)
    references public.restaurants (id, organization_id)
    on delete cascade
);

create index marketing_campaigns_restaurant_idx
  on public.marketing_campaigns (restaurant_id, created_at desc);

create table public.marketing_campaign_recipients (
  campaign_id uuid not null references public.marketing_campaigns (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'failed', 'skipped')),
  provider_id text,
  error text,
  sent_at timestamptz,
  primary key (campaign_id, customer_id)
);

create index marketing_recipients_campaign_idx
  on public.marketing_campaign_recipients (campaign_id, status);

create table public.customer_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  restaurant_id uuid not null,
  customer_id uuid,
  campaign_id uuid references public.marketing_campaigns (id) on delete set null,
  channel text not null check (channel in ('email', 'sms', 'whatsapp', 'internal')),
  direction text not null check (direction in ('inbound', 'outbound')),
  recipient text not null default '',
  subject text not null default '' check (char_length(subject) <= 200),
  body text not null default '' check (char_length(body) <= 10000),
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'delivered', 'failed', 'received')),
  provider text,
  provider_id text,
  attempts integer not null default 0 check (attempts >= 0),
  error text,
  read_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint customer_messages_customer_restaurant_fkey
    foreign key (customer_id, restaurant_id)
    references public.customers (id, restaurant_id)
    on delete set null (customer_id)
);

create index customer_messages_restaurant_created_idx
  on public.customer_messages (restaurant_id, created_at desc);
create index customer_messages_customer_idx
  on public.customer_messages (customer_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Menu pubblico e ordini online
-- ---------------------------------------------------------------------------

create table public.restaurant_public_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  restaurant_id uuid not null,
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  kind text not null default 'menu' check (kind in ('menu', 'table')),
  label text not null default '' check (char_length(label) <= 120),
  table_id uuid,
  allow_ordering boolean not null default true,
  is_active boolean not null default true,
  expires_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint restaurant_public_links_restaurant_organization_fkey
    foreign key (restaurant_id, organization_id)
    references public.restaurants (id, organization_id)
    on delete cascade,
  constraint restaurant_public_links_table_fkey
    foreign key (table_id, restaurant_id)
    references public.restaurant_tables (id, restaurant_id)
    on delete set null (table_id)
);

create index restaurant_public_links_restaurant_idx
  on public.restaurant_public_links (restaurant_id, created_at desc);

create table public.online_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  restaurant_id uuid not null,
  public_link_id uuid references public.restaurant_public_links (id) on delete set null,
  customer_id uuid,
  customer_name text not null default '' check (char_length(customer_name) <= 160),
  email text not null default '' check (char_length(email) <= 254),
  phone text not null default '' check (char_length(phone) <= 40),
  fulfillment text not null default 'pickup'
    check (fulfillment in ('pickup', 'delivery', 'dine_in')),
  table_id uuid,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid', 'refunded')),
  payment_method text not null default 'on_site'
    check (payment_method in ('on_site', 'online')),
  stripe_session_id text,
  stripe_payment_intent_id text,
  subtotal_cents bigint not null default 0 check (subtotal_cents >= 0),
  total_cents bigint not null default 0 check (total_cents >= 0),
  notes text not null default '' check (char_length(notes) <= 500),
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 120),
  order_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint online_orders_restaurant_organization_fkey
    foreign key (restaurant_id, organization_id)
    references public.restaurants (id, organization_id)
    on delete cascade,
  constraint online_orders_customer_restaurant_fkey
    foreign key (customer_id, restaurant_id)
    references public.customers (id, restaurant_id)
    on delete set null (customer_id),
  constraint online_orders_restaurant_idempotency_key
    unique (restaurant_id, idempotency_key)
);

create index online_orders_restaurant_created_idx
  on public.online_orders (restaurant_id, created_at desc);
create index online_orders_status_idx
  on public.online_orders (restaurant_id, status, created_at);

create table public.online_order_items (
  id uuid primary key default gen_random_uuid(),
  online_order_id uuid not null references public.online_orders (id) on delete cascade,
  menu_item_id uuid,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  unit_price_cents bigint not null check (unit_price_cents between 0 and 100000000),
  quantity integer not null default 1 check (quantity between 1 and 99),
  note text not null default '' check (char_length(note) <= 200),
  created_at timestamptz not null default now()
);

create index online_order_items_order_idx
  on public.online_order_items (online_order_id);

alter table public.orders
  add constraint orders_customer_restaurant_fkey
    foreign key (customer_id, restaurant_id)
    references public.customers (id, restaurant_id)
    on delete set null (customer_id),
  add constraint orders_online_order_fkey
    foreign key (online_order_id)
    references public.online_orders (id)
    on delete set null,
  add constraint orders_unique_online_order_key unique (online_order_id);

alter table public.online_orders
  add constraint online_orders_order_fkey
    foreign key (order_id)
    references public.orders (id)
    on delete set null;

-- ---------------------------------------------------------------------------
-- Turni del personale
-- ---------------------------------------------------------------------------

create table public.staff_shifts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  restaurant_id uuid not null,
  membership_id uuid not null references public.memberships (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  role_note text not null default '' check (char_length(role_note) <= 120),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'confirmed', 'cancelled')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint staff_shifts_restaurant_organization_fkey
    foreign key (restaurant_id, organization_id)
    references public.restaurants (id, organization_id)
    on delete cascade,
  constraint staff_shifts_time_check check (ends_at > starts_at)
);

create index staff_shifts_restaurant_starts_idx
  on public.staff_shifts (restaurant_id, starts_at);

-- ---------------------------------------------------------------------------
-- Stampanti e coda di stampa
-- ---------------------------------------------------------------------------

create table public.printer_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  restaurant_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  station text not null default 'receipt'
    check (station in ('receipt', 'kitchen', 'bar')),
  connection text not null default 'network'
    check (connection in ('network', 'file')),
  host text,
  port integer check (port is null or port between 1 and 65535),
  paper_width integer not null default 80 check (paper_width in (58, 80)),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint printer_profiles_restaurant_organization_fkey
    foreign key (restaurant_id, organization_id)
    references public.restaurants (id, organization_id)
    on delete cascade
);

create index printer_profiles_restaurant_idx
  on public.printer_profiles (restaurant_id, station);

create table public.print_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  restaurant_id uuid not null,
  printer_id uuid references public.printer_profiles (id) on delete set null,
  order_id uuid,
  online_order_id uuid,
  job_type text not null default 'receipt' check (job_type in ('receipt', 'kitchen')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued'
    check (status in ('queued', 'printing', 'printed', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  error text,
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 120),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint print_jobs_restaurant_organization_fkey
    foreign key (restaurant_id, organization_id)
    references public.restaurants (id, organization_id)
    on delete cascade,
  constraint print_jobs_restaurant_idempotency_key
    unique (restaurant_id, idempotency_key)
);

create index print_jobs_queue_idx
  on public.print_jobs (status, created_at);
create index print_jobs_restaurant_idx
  on public.print_jobs (restaurant_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Integrazioni e segreti server-only
-- ---------------------------------------------------------------------------

create table public.integration_events (
  id bigint generated always as identity primary key,
  provider text not null check (provider in ('stripe', 'resend', 'twilio', 'local_service')),
  event_id text not null,
  event_type text not null default '',
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'received'
    check (status in ('received', 'processed', 'failed')),
  error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint integration_events_provider_event_key unique (provider, event_id)
);

create index integration_events_provider_created_idx
  on public.integration_events (provider, created_at desc);

create table public.integration_secrets (
  provider text primary key check (provider in ('stripe', 'resend', 'twilio', 'local_service')),
  secret_hash text not null check (char_length(secret_hash) = 64),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Trigger updated_at
-- ---------------------------------------------------------------------------

create trigger customers_set_updated_at before update on public.customers
  for each row execute function public.set_updated_at();
create trigger loyalty_settings_set_updated_at before update on public.loyalty_settings
  for each row execute function public.set_updated_at();
create trigger marketing_campaigns_set_updated_at before update on public.marketing_campaigns
  for each row execute function public.set_updated_at();
create trigger online_orders_set_updated_at before update on public.online_orders
  for each row execute function public.set_updated_at();
create trigger printer_profiles_set_updated_at before update on public.printer_profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.customers enable row level security;
alter table public.loyalty_settings enable row level security;
alter table public.loyalty_transactions enable row level security;
alter table public.marketing_campaigns enable row level security;
alter table public.marketing_campaign_recipients enable row level security;
alter table public.customer_messages enable row level security;
alter table public.restaurant_public_links enable row level security;
alter table public.online_orders enable row level security;
alter table public.online_order_items enable row level security;
alter table public.staff_shifts enable row level security;
alter table public.printer_profiles enable row level security;
alter table public.print_jobs enable row level security;
alter table public.integration_events enable row level security;
alter table public.integration_secrets enable row level security;

create policy customers_select on public.customers
  for select to authenticated
  using (
    public.auth_has_permission_for_restaurant(restaurant_id, 'customers.manage')
    or public.auth_is_platform_admin()
  );
create policy customers_insert on public.customers
  for insert to authenticated
  with check (public.auth_has_permission_for_restaurant(restaurant_id, 'customers.manage'));
create policy customers_update on public.customers
  for update to authenticated
  using (public.auth_has_permission_for_restaurant(restaurant_id, 'customers.manage'))
  with check (public.auth_has_permission_for_restaurant(restaurant_id, 'customers.manage'));
create policy customers_delete on public.customers
  for delete to authenticated
  using (public.auth_has_permission_for_restaurant(restaurant_id, 'customers.manage'));

create policy loyalty_settings_select on public.loyalty_settings
  for select to authenticated
  using (restaurant_id in (select public.auth_restaurant_ids()) or public.auth_is_platform_admin());
create policy loyalty_settings_write on public.loyalty_settings
  for all to authenticated
  using (public.auth_has_permission_for_restaurant(restaurant_id, 'settings.manage'))
  with check (public.auth_has_permission_for_restaurant(restaurant_id, 'settings.manage'));

create policy loyalty_transactions_select on public.loyalty_transactions
  for select to authenticated
  using (public.auth_has_permission_for_restaurant(restaurant_id, 'customers.manage'));

create policy marketing_campaigns_all on public.marketing_campaigns
  for all to authenticated
  using (public.auth_has_permission_for_restaurant(restaurant_id, 'customers.manage'))
  with check (public.auth_has_permission_for_restaurant(restaurant_id, 'customers.manage'));

create policy marketing_recipients_select on public.marketing_campaign_recipients
  for select to authenticated
  using (
    exists (
      select 1 from public.marketing_campaigns c
      where c.id = campaign_id
        and public.auth_has_permission_for_restaurant(c.restaurant_id, 'customers.manage')
    )
  );

create policy customer_messages_all on public.customer_messages
  for all to authenticated
  using (public.auth_has_permission_for_restaurant(restaurant_id, 'customers.manage'))
  with check (public.auth_has_permission_for_restaurant(restaurant_id, 'customers.manage'));

create policy restaurant_public_links_all on public.restaurant_public_links
  for all to authenticated
  using (public.auth_has_permission_for_restaurant(restaurant_id, 'menu.manage'))
  with check (public.auth_has_permission_for_restaurant(restaurant_id, 'menu.manage'));

create policy online_orders_all on public.online_orders
  for all to authenticated
  using (public.auth_has_permission_for_restaurant(restaurant_id, 'orders.manage'))
  with check (public.auth_has_permission_for_restaurant(restaurant_id, 'orders.manage'));

create policy online_order_items_select on public.online_order_items
  for select to authenticated
  using (
    exists (
      select 1 from public.online_orders o
      where o.id = online_order_id
        and public.auth_has_permission_for_restaurant(o.restaurant_id, 'orders.manage')
    )
  );

create policy staff_shifts_all on public.staff_shifts
  for all to authenticated
  using (public.auth_has_permission_for_restaurant(restaurant_id, 'staff.manage'))
  with check (public.auth_has_permission_for_restaurant(restaurant_id, 'staff.manage'));

create policy printer_profiles_all on public.printer_profiles
  for all to authenticated
  using (public.auth_has_permission_for_restaurant(restaurant_id, 'settings.manage'))
  with check (public.auth_has_permission_for_restaurant(restaurant_id, 'settings.manage'));

create policy print_jobs_all on public.print_jobs
  for all to authenticated
  using (
    public.auth_has_permission_for_restaurant(restaurant_id, 'orders.manage')
    or public.auth_has_permission_for_restaurant(restaurant_id, 'settings.manage')
  )
  with check (
    public.auth_has_permission_for_restaurant(restaurant_id, 'orders.manage')
    or public.auth_has_permission_for_restaurant(restaurant_id, 'settings.manage')
  );

-- integration_events e integration_secrets: nessuna policy, accesso solo
-- tramite funzioni security definer o service role.

-- ---------------------------------------------------------------------------
-- Helper segreti server-only
-- ---------------------------------------------------------------------------

create or replace function public.check_integration_secret(
  p_provider text,
  p_secret text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.integration_secrets s
    where s.provider = p_provider
      and p_secret is not null
      and s.secret_hash = encode(extensions.digest(p_secret, 'sha256'), 'hex')
  );
$$;

revoke execute on function public.check_integration_secret(text, text)
  from public, anon, authenticated;
grant execute on function public.check_integration_secret(text, text) to service_role;

create or replace function public.set_integration_secret(
  p_provider text,
  p_secret text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_provider not in ('stripe', 'resend', 'twilio', 'local_service') then
    raise exception 'Provider non valido.' using errcode = '22023';
  end if;
  if p_secret is null or char_length(p_secret) < 16 then
    raise exception 'Segreto troppo corto.' using errcode = '22023';
  end if;

  insert into public.integration_secrets (provider, secret_hash, updated_at)
  values (
    p_provider,
    encode(extensions.digest(p_secret, 'sha256'), 'hex'),
    now()
  )
  on conflict (provider) do update
    set secret_hash = excluded.secret_hash,
        updated_at = now();
end;
$$;

revoke execute on function public.set_integration_secret(text, text)
  from public, anon, authenticated;
grant execute on function public.set_integration_secret(text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Menu pubblico (token-only)
-- ---------------------------------------------------------------------------

create or replace function public.get_public_menu(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_link public.restaurant_public_links;
  v_restaurant public.restaurants;
  v_settings public.restaurant_settings;
begin
  if p_token is null or char_length(p_token) < 16 then
    raise exception 'Link non valido.' using errcode = '22023';
  end if;

  select * into v_link
  from public.restaurant_public_links l
  where l.token = p_token
    and l.is_active
    and (l.expires_at is null or l.expires_at > now());

  if not found then
    raise exception 'Link non trovato o scaduto.' using errcode = 'P0002';
  end if;

  select * into v_restaurant
  from public.restaurants r
  where r.id = v_link.restaurant_id
    and r.status = 'active';

  if not found then
    raise exception 'Ristorante non disponibile.' using errcode = 'P0002';
  end if;

  select * into v_settings
  from public.restaurant_settings s
  where s.restaurant_id = v_restaurant.id;

  return jsonb_build_object(
    'restaurant', jsonb_build_object(
      'id', v_restaurant.id,
      'name', v_restaurant.name,
      'description', v_restaurant.description,
      'cuisine', v_restaurant.cuisine,
      'phone', v_restaurant.phone,
      'address', v_restaurant.address,
      'currency', v_restaurant.currency,
      'timezone', v_restaurant.timezone,
      'public_note', v_restaurant.public_menu_note
    ),
    'link', jsonb_build_object(
      'kind', v_link.kind,
      'label', v_link.label,
      'table_id', v_link.table_id,
      'allow_ordering', v_link.allow_ordering
    ),
    'settings', jsonb_build_object(
      'prices_include_tax', coalesce(v_settings.prices_include_tax, true),
      'tax_rate_bps', coalesce(v_settings.tax_rate_bps, 1000),
      'service_charge_bps', coalesce(v_settings.service_charge_bps, 0)
    ),
    'categories', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'items', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', i.id,
                'name', i.name,
                'description', i.description,
                'price_cents', i.price_cents,
                'is_available', i.is_available
              )
              order by i.sort_order, i.name
            )
            from public.menu_items i
            where i.category_id = c.id
              and i.restaurant_id = v_restaurant.id
          ), '[]'::jsonb)
        )
        order by c.sort_order, c.name
      )
      from public.menu_categories c
      where c.restaurant_id = v_restaurant.id
        and c.is_active
    ), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.get_public_menu(text) from public;
grant execute on function public.get_public_menu(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Invio ordine online (token-only, prezzi ricalcolati dal database)
-- ---------------------------------------------------------------------------

create or replace function public.submit_online_order(
  p_token text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_link public.restaurant_public_links;
  v_restaurant public.restaurants;
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_items jsonb := coalesce(v_payload -> 'items', '[]'::jsonb);
  v_item jsonb;
  v_menu public.menu_items;
  v_quantity integer;
  v_note text;
  v_subtotal bigint := 0;
  v_customer_id uuid;
  v_order_id uuid;
  v_existing_id uuid;
  v_existing_total bigint;
  v_idempotency text;
  v_email text;
  v_phone text;
  v_name text;
  v_first_name text;
  v_last_name text;
  v_fulfillment text;
  v_notes text;
  v_table_id uuid;
  v_marketing_email boolean;
  v_marketing_sms boolean;
begin
  if p_token is null or char_length(p_token) < 16 then
    raise exception 'Link non valido.' using errcode = '22023';
  end if;

  select * into v_link
  from public.restaurant_public_links l
  where l.token = p_token
    and l.is_active
    and (l.expires_at is null or l.expires_at > now());

  if not found then
    raise exception 'Link non trovato o scaduto.' using errcode = 'P0002';
  end if;

  if not v_link.allow_ordering then
    raise exception 'Questo link consente solo la consultazione del menu.'
      using errcode = '42501';
  end if;

  select * into v_restaurant
  from public.restaurants r
  where r.id = v_link.restaurant_id
    and r.status = 'active';

  if not found then
    raise exception 'Ristorante non disponibile.' using errcode = 'P0002';
  end if;

  if jsonb_typeof(v_items) <> 'array'
    or jsonb_array_length(v_items) = 0
    or jsonb_array_length(v_items) > 50 then
    raise exception 'Elenco prodotti non valido.' using errcode = '23514';
  end if;

  v_name := btrim(coalesce(v_payload ->> 'customer_name', ''));
  if char_length(v_name) < 2 or char_length(v_name) > 160 then
    raise exception 'Inserisci il nome del cliente.' using errcode = '23514';
  end if;

  v_email := lower(btrim(coalesce(v_payload ->> 'email', '')));
  v_phone := btrim(coalesce(v_payload ->> 'phone', ''));

  if v_email = '' and v_phone = '' then
    raise exception 'Inserisci email o telefono.' using errcode = '23514';
  end if;

  if v_email <> '' and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Email non valida.' using errcode = '23514';
  end if;

  if char_length(v_phone) > 40 then
    raise exception 'Telefono non valido.' using errcode = '23514';
  end if;

  -- Protezione anti-abuso: massimo 10 ordini ogni 10 minuti per contatto.
  if (
    select count(*)
    from public.online_orders o
    where o.restaurant_id = v_restaurant.id
      and o.created_at > now() - interval '10 minutes'
      and (
        (v_email <> '' and lower(o.email) = v_email)
        or (v_phone <> '' and o.phone = v_phone)
      )
  ) >= 10 then
    raise exception 'Troppi ordini ravvicinati. Attendi qualche minuto o chiama il ristorante.'
      using errcode = '23514';
  end if;

  v_fulfillment := coalesce(v_payload ->> 'fulfillment', 'pickup');
  if v_fulfillment not in ('pickup', 'delivery', 'dine_in') then
    raise exception 'Modalità di consegna non valida.' using errcode = '22023';
  end if;

  v_notes := btrim(coalesce(v_payload ->> 'notes', ''));
  if char_length(v_notes) > 500 then
    raise exception 'Note troppo lunghe.' using errcode = '23514';
  end if;

  v_table_id := null;
  if v_fulfillment = 'dine_in' then
    v_table_id := v_link.table_id;
    if v_table_id is null and (v_payload ->> 'table_id') is not null then
      begin
        v_table_id := (v_payload ->> 'table_id')::uuid;
      exception when others then
        raise exception 'Tavolo non valido.' using errcode = '22023';
      end;
    end if;
    if v_table_id is not null and not exists (
      select 1 from public.restaurant_tables t
      where t.id = v_table_id
        and t.restaurant_id = v_restaurant.id
        and t.is_active
    ) then
      raise exception 'Tavolo non valido o non attivo.' using errcode = '23503';
    end if;
    if v_table_id is null then
      raise exception 'Per mangiare in sede serve un tavolo.' using errcode = '23514';
    end if;
  end if;

  v_marketing_email := coalesce((v_payload ->> 'marketing_email')::boolean, false);
  v_marketing_sms := coalesce((v_payload ->> 'marketing_sms')::boolean, false);

  v_idempotency := left(
    coalesce(nullif(btrim(v_payload ->> 'idempotency_key'), ''), encode(extensions.gen_random_bytes(16), 'hex')),
    120
  );

  select o.id, o.total_cents into v_existing_id, v_existing_total
  from public.online_orders o
  where o.restaurant_id = v_restaurant.id
    and o.idempotency_key = v_idempotency;

  if v_existing_id is not null then
    return jsonb_build_object(
      'order_id', v_existing_id,
      'order_number', upper(left(v_existing_id::text, 8)),
      'total_cents', v_existing_total,
      'currency', v_restaurant.currency,
      'duplicate', true
    );
  end if;

  if v_email <> '' then
    select c.id into v_customer_id
    from public.customers c
    where c.restaurant_id = v_restaurant.id
      and lower(c.email) = v_email
    limit 1;
  elsif v_phone <> '' then
    select c.id into v_customer_id
    from public.customers c
    where c.restaurant_id = v_restaurant.id
      and c.phone = v_phone
    limit 1;
  end if;

  v_first_name := split_part(v_name, ' ', 1);
  v_last_name := btrim(substr(v_name, char_length(v_first_name) + 1));

  if v_customer_id is null then
    insert into public.customers (
      organization_id, restaurant_id, first_name, last_name, email, phone,
      marketing_email, marketing_sms, consent_at
    )
    values (
      v_restaurant.organization_id, v_restaurant.id, v_first_name, v_last_name,
      v_email, v_phone, v_marketing_email, v_marketing_sms,
      case when v_marketing_email or v_marketing_sms then now() else null end
    )
    returning id into v_customer_id;
  else
    update public.customers
    set first_name = coalesce(nullif(v_first_name, ''), first_name),
        last_name = coalesce(nullif(v_last_name, ''), last_name),
        email = coalesce(nullif(v_email, ''), email),
        phone = coalesce(nullif(v_phone, ''), phone),
        marketing_email = marketing_email or v_marketing_email,
        marketing_sms = marketing_sms or v_marketing_sms,
        consent_at = case
          when (v_marketing_email or v_marketing_sms) then coalesce(consent_at, now())
          else consent_at
        end
    where id = v_customer_id;
  end if;

  insert into public.online_orders (
    organization_id, restaurant_id, public_link_id, customer_id,
    customer_name, email, phone, fulfillment, table_id, notes,
    payment_method, idempotency_key
  )
  values (
    v_restaurant.organization_id, v_restaurant.id, v_link.id, v_customer_id,
    v_name, v_email, v_phone, v_fulfillment, v_table_id, v_notes,
    'on_site', v_idempotency
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(v_items)
  loop
    if (v_item ? 'menu_item_id') is not true then
      raise exception 'Prodotto non valido.' using errcode = '23514';
    end if;

    begin
      select * into v_menu
      from public.menu_items m
      where m.id = (v_item ->> 'menu_item_id')::uuid
        and m.restaurant_id = v_restaurant.id;
    exception when others then
      raise exception 'Prodotto non valido.' using errcode = '23514';
    end;

    if not found then
      raise exception 'Prodotto non trovato nel menu.' using errcode = '23503';
    end if;
    if not v_menu.is_available then
      raise exception 'Il prodotto % è esaurito.', v_menu.name using errcode = '23514';
    end if;

    v_quantity := coalesce((v_item ->> 'quantity')::integer, 1);
    if v_quantity < 1 or v_quantity > 99 then
      raise exception 'Quantità non valida.' using errcode = '23514';
    end if;

    v_note := btrim(coalesce(v_item ->> 'note', ''));
    if char_length(v_note) > 200 then
      raise exception 'Nota riga troppo lunga.' using errcode = '23514';
    end if;

    insert into public.online_order_items (
      online_order_id, menu_item_id, name, unit_price_cents, quantity, note
    )
    values (
      v_order_id, v_menu.id, v_menu.name, v_menu.price_cents, v_quantity, v_note
    );

    v_subtotal := v_subtotal + (v_menu.price_cents * v_quantity);
  end loop;

  update public.online_orders
  set subtotal_cents = v_subtotal,
      total_cents = v_subtotal
  where id = v_order_id;

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', upper(left(v_order_id::text, 8)),
    'total_cents', v_subtotal,
    'currency', v_restaurant.currency,
    'duplicate', false
  );
end;
$$;

revoke execute on function public.submit_online_order(text, jsonb) from public;
grant execute on function public.submit_online_order(text, jsonb) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Conferma ordine online → comanda POS/KDS
-- ---------------------------------------------------------------------------

create or replace function public.confirm_online_order(p_online_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_online public.online_orders;
  v_order_id uuid;
  v_note text;
begin
  if v_user is null then
    raise exception 'Autenticazione richiesta.' using errcode = '42501';
  end if;

  select * into v_online
  from public.online_orders o
  where o.id = p_online_order_id
  for update;

  if not found then
    raise exception 'Ordine online non trovato.' using errcode = 'P0002';
  end if;

  if not public.auth_has_permission_for_restaurant(v_online.restaurant_id, 'orders.manage') then
    raise exception 'Permesso orders.manage richiesto.' using errcode = '42501';
  end if;

  if v_online.order_id is not null then
    return v_online.order_id;
  end if;

  if v_online.status not in ('pending', 'confirmed') then
    raise exception 'L''ordine non può essere confermato nello stato attuale.'
      using errcode = '23514';
  end if;

  v_note := left(
    'Ordine online ' || upper(left(v_online.id::text, 8)) || ' · ' || v_online.customer_name ||
    case when v_online.notes <> '' then ' · ' || v_online.notes else '' end,
    300
  );

  insert into public.orders (
    organization_id, restaurant_id, table_id, guests, note,
    opened_by, source, customer_id, online_order_id
  )
  values (
    v_online.organization_id, v_online.restaurant_id, v_online.table_id, null,
    v_note, null, 'online', v_online.customer_id, v_online.id
  )
  returning id into v_order_id;

  insert into public.order_items (
    organization_id, restaurant_id, order_id, menu_item_id, name,
    unit_price_cents, quantity, note, status
  )
  select
    v_online.organization_id, v_online.restaurant_id, v_order_id,
    i.menu_item_id, i.name, i.unit_price_cents, i.quantity, i.note, 'pending'
  from public.online_order_items i
  where i.online_order_id = v_online.id;

  update public.online_orders
  set status = 'confirmed',
      order_id = v_order_id
  where id = v_online.id;

  if v_online.customer_id is not null then
    update public.customers
    set visits = visits + 1,
        total_spent_cents = total_spent_cents + v_online.total_cents,
        last_visit_at = now()
    where id = v_online.customer_id;
  end if;

  insert into public.audit_logs (
    organization_id, restaurant_id, actor_user_id, action,
    entity_type, entity_id, metadata
  )
  values (
    v_online.organization_id, v_online.restaurant_id, v_user,
    'online_order.confirmed', 'online_order', v_online.id::text,
    jsonb_build_object('order_id', v_order_id)
  );

  return v_order_id;
end;
$$;

revoke execute on function public.confirm_online_order(uuid) from public, anon;
grant execute on function public.confirm_online_order(uuid) to authenticated, service_role;

create or replace function public.update_online_order_status(
  p_online_order_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_online public.online_orders;
begin
  if v_user is null then
    raise exception 'Autenticazione richiesta.' using errcode = '42501';
  end if;

  if p_status not in ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled') then
    raise exception 'Stato non valido.' using errcode = '22023';
  end if;

  select * into v_online
  from public.online_orders o
  where o.id = p_online_order_id
  for update;

  if not found then
    raise exception 'Ordine online non trovato.' using errcode = 'P0002';
  end if;

  if not public.auth_has_permission_for_restaurant(v_online.restaurant_id, 'orders.manage') then
    raise exception 'Permesso orders.manage richiesto.' using errcode = '42501';
  end if;

  update public.online_orders
  set status = p_status
  where id = v_online.id;

  if v_online.order_id is not null then
    if p_status = 'cancelled' then
      update public.orders
      set status = 'cancelled',
          closed_at = now()
      where id = v_online.order_id
        and status = 'open';
      update public.order_items
      set status = 'cancelled'
      where order_id = v_online.order_id
        and status in ('pending', 'preparing', 'ready');
    elsif p_status = 'completed' and v_online.payment_status = 'paid' then
      update public.orders
      set status = 'paid',
          closed_at = now()
      where id = v_online.order_id
        and status = 'open';
    end if;
  end if;

  insert into public.audit_logs (
    organization_id, restaurant_id, actor_user_id, action,
    entity_type, entity_id, metadata
  )
  values (
    v_online.organization_id, v_online.restaurant_id, v_user,
    'online_order.status_changed', 'online_order', v_online.id::text,
    jsonb_build_object('status', p_status)
  );
end;
$$;

revoke execute on function public.update_online_order_status(uuid, text) from public, anon;
grant execute on function public.update_online_order_status(uuid, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Fidelizzazione
-- ---------------------------------------------------------------------------

create or replace function public.record_loyalty_transaction(
  p_customer_id uuid,
  p_points integer,
  p_reason text,
  p_idempotency_key text
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_customer public.customers;
  v_existing integer;
  v_balance integer;
begin
  if v_user is null then
    raise exception 'Autenticazione richiesta.' using errcode = '42501';
  end if;

  if p_points = 0 or abs(p_points) > 1000000 then
    raise exception 'Punti non validi.' using errcode = '23514';
  end if;

  if p_idempotency_key is null or char_length(p_idempotency_key) < 8 then
    raise exception 'Chiave idempotenza non valida.' using errcode = '23514';
  end if;

  select * into v_customer
  from public.customers c
  where c.id = p_customer_id
  for update;

  if not found then
    raise exception 'Cliente non trovato.' using errcode = 'P0002';
  end if;

  if not public.auth_has_permission_for_restaurant(v_customer.restaurant_id, 'customers.manage') then
    raise exception 'Permesso customers.manage richiesto.' using errcode = '42501';
  end if;

  select points into v_existing
  from public.loyalty_transactions t
  where t.restaurant_id = v_customer.restaurant_id
    and t.idempotency_key = p_idempotency_key;

  if v_existing is not null then
    return v_customer.loyalty_points;
  end if;

  if p_points < 0 and v_customer.loyalty_points + p_points < 0 then
    raise exception 'Punti insufficienti.' using errcode = '23514';
  end if;

  insert into public.loyalty_transactions (
    organization_id, restaurant_id, customer_id, points, reason,
    idempotency_key, created_by
  )
  values (
    v_customer.organization_id, v_customer.restaurant_id, v_customer.id,
    p_points, left(coalesce(p_reason, ''), 200), p_idempotency_key, v_user
  );

  update public.customers
  set loyalty_points = loyalty_points + p_points
  where id = v_customer.id
  returning loyalty_points into v_balance;

  return v_balance;
end;
$$;

revoke execute on function public.record_loyalty_transaction(uuid, integer, text, text)
  from public, anon;
grant execute on function public.record_loyalty_transaction(uuid, integer, text, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Webhook: pagamento ordine online e eventi integrazione
-- ---------------------------------------------------------------------------

create or replace function public.record_integration_event(
  p_provider text,
  p_secret text,
  p_event_id text,
  p_event_type text,
  p_payload jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.check_integration_secret(p_provider, p_secret) then
    raise exception 'Firma server non valida.' using errcode = '42501';
  end if;

  if p_event_id is null or char_length(p_event_id) < 4 then
    raise exception 'Evento non valido.' using errcode = '23514';
  end if;

  insert into public.integration_events (
    provider, event_id, event_type, payload, status, processed_at
  )
  values (
    p_provider, left(p_event_id, 200), left(coalesce(p_event_type, ''), 120),
    coalesce(p_payload, '{}'::jsonb), 'processed', now()
  )
  on conflict (provider, event_id) do nothing;

  return true;
end;
$$;

revoke execute on function public.record_integration_event(text, text, text, text, jsonb)
  from public;
grant execute on function public.record_integration_event(text, text, text, text, jsonb)
  to anon, authenticated, service_role;

create or replace function public.mark_online_order_paid(
  p_secret text,
  p_order_id uuid,
  p_session_id text,
  p_payment_intent_id text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.online_orders;
  v_settings public.loyalty_settings;
  v_points integer := 0;
begin
  if not public.check_integration_secret('stripe', p_secret) then
    raise exception 'Firma server non valida.' using errcode = '42501';
  end if;

  select * into v_order
  from public.online_orders o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception 'Ordine online non trovato.' using errcode = 'P0002';
  end if;

  update public.online_orders
  set payment_status = 'paid',
      payment_method = 'online',
      stripe_session_id = coalesce(p_session_id, stripe_session_id),
      stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id)
  where id = v_order.id;

  select * into v_settings
  from public.loyalty_settings s
  where s.restaurant_id = v_order.restaurant_id
    and s.is_active;

  if found and v_order.customer_id is not null and v_order.total_cents > 0 then
    v_points := floor(v_order.total_cents / 100.0)::integer * v_settings.points_per_euro;

    if v_points > 0 then
      insert into public.loyalty_transactions (
        organization_id, restaurant_id, customer_id, points, reason,
        idempotency_key, created_by
      )
      values (
        v_order.organization_id, v_order.restaurant_id, v_order.customer_id,
        v_points, 'Punti ordine online', 'online:' || v_order.id::text, null
      )
      on conflict (restaurant_id, idempotency_key) do nothing;

      if found then
        update public.customers
        set loyalty_points = loyalty_points + v_points
        where id = v_order.customer_id;
      end if;
    end if;
  end if;

  insert into public.integration_events (
    provider, event_id, event_type, payload, status, processed_at
  )
  values (
    'stripe', 'checkout:' || v_order.id::text, 'checkout.session.completed',
    jsonb_build_object('order_id', v_order.id, 'session_id', p_session_id),
    'processed', now()
  )
  on conflict (provider, event_id) do nothing;

  return true;
end;
$$;

revoke execute on function public.mark_online_order_paid(text, uuid, text, text)
  from public;
grant execute on function public.mark_online_order_paid(text, uuid, text, text)
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Webhook inbound (Twilio/Resend) → inbox clienti
-- ---------------------------------------------------------------------------

create or replace function public.record_inbound_message(
  p_provider text,
  p_secret text,
  p_channel text,
  p_from text,
  p_to text,
  p_body text,
  p_provider_id text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_settings public.restaurant_settings;
  v_restaurant public.restaurants;
  v_customer public.customers;
  v_message_id uuid;
begin
  if not public.check_integration_secret(p_provider, p_secret) then
    raise exception 'Firma server non valida.' using errcode = '42501';
  end if;

  if p_channel not in ('email', 'sms', 'whatsapp') then
    raise exception 'Canale non valido.' using errcode = '22023';
  end if;

  select s.* into v_settings
  from public.restaurant_settings s
  where (p_channel = 'email' and lower(coalesce(s.inbound_email, '')) = lower(coalesce(p_to, '')))
     or (p_channel <> 'email' and coalesce(s.inbound_phone, '') = coalesce(p_to, ''))
  limit 1;

  if not found then
    insert into public.integration_events (
      provider, event_id, event_type, payload, status, error, processed_at
    )
    values (
      p_provider,
      left(coalesce(nullif(p_provider_id, ''), encode(extensions.gen_random_bytes(12), 'hex')), 200),
      'inbound.unmatched',
      jsonb_build_object('from', p_from, 'to', p_to, 'channel', p_channel),
      'failed', 'Nessuna sede associata al destinatario', now()
    )
    on conflict (provider, event_id) do nothing;
    return null;
  end if;

  select r.* into v_restaurant
  from public.restaurants r
  where r.id = v_settings.restaurant_id;

  if p_channel = 'email' then
    select * into v_customer
    from public.customers c
    where c.restaurant_id = v_restaurant.id
      and lower(c.email) = lower(coalesce(p_from, ''))
    limit 1;
  else
    select * into v_customer
    from public.customers c
    where c.restaurant_id = v_restaurant.id
      and c.phone = coalesce(p_from, '')
    limit 1;
  end if;

  insert into public.customer_messages (
    organization_id, restaurant_id, customer_id, channel, direction,
    recipient, subject, body, status, provider, provider_id
  )
  values (
    v_restaurant.organization_id, v_restaurant.id,
    case when v_customer.id is not null then v_customer.id else null end,
    p_channel, 'inbound', left(coalesce(p_from, ''), 254), '', left(coalesce(p_body, ''), 10000),
    'received', p_provider, left(coalesce(p_provider_id, ''), 200)
  )
  returning id into v_message_id;

  insert into public.integration_events (
    provider, event_id, event_type, payload, status, processed_at
  )
  values (
    p_provider,
    left(coalesce(nullif(p_provider_id, ''), encode(extensions.gen_random_bytes(12), 'hex')), 200),
    'inbound.received',
    jsonb_build_object('message_id', v_message_id, 'restaurant_id', v_restaurant.id),
    'processed', now()
  )
  on conflict (provider, event_id) do nothing;

  return v_message_id;
end;
$$;

revoke execute on function public.record_inbound_message(text, text, text, text, text, text, text)
  from public;
grant execute on function public.record_inbound_message(text, text, text, text, text, text, text)
  to anon, authenticated, service_role;

create or replace function public.update_message_status_by_provider(
  p_provider text,
  p_secret text,
  p_provider_id text,
  p_status text,
  p_error text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.check_integration_secret(p_provider, p_secret) then
    raise exception 'Firma server non valida.' using errcode = '42501';
  end if;

  if p_status not in ('sent', 'delivered', 'failed') then
    raise exception 'Stato messaggio non valido.' using errcode = '22023';
  end if;

  update public.customer_messages
  set status = p_status,
      error = case when p_status = 'failed' then left(coalesce(p_error, 'Invio fallito'), 500) else null end
  where provider = p_provider
    and provider_id = p_provider_id;

  return found;
end;
$$;

revoke execute on function public.update_message_status_by_provider(text, text, text, text, text)
  from public;
grant execute on function public.update_message_status_by_provider(text, text, text, text, text)
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Coda di stampa per il servizio locale
-- ---------------------------------------------------------------------------

create or replace function public.claim_print_jobs(
  p_secret text,
  p_limit integer default 10
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 10), 1), 50);
  v_rows jsonb;
begin
  if not public.check_integration_secret('local_service', p_secret) then
    raise exception 'Firma server non valida.' using errcode = '42501';
  end if;

  with claimed as (
    select j.id
    from public.print_jobs j
    where j.status = 'queued'
    order by j.created_at asc
    limit v_limit
    for update skip locked
  ),
  updated as (
    update public.print_jobs j
    set status = 'printing',
        attempts = j.attempts + 1
    from claimed c
    where j.id = c.id
    returning j.*
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', j.id,
      'job_type', j.job_type,
      'payload', j.payload,
      'attempts', j.attempts,
      'printer', case when p.id is null then null else jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'station', p.station,
        'connection', p.connection,
        'host', p.host,
        'port', p.port,
        'paper_width', p.paper_width
      ) end
    )
  ), '[]'::jsonb)
  into v_rows
  from updated j
  left join public.printer_profiles p on p.id = j.printer_id;

  return v_rows;
end;
$$;

revoke execute on function public.claim_print_jobs(text, integer) from public;
grant execute on function public.claim_print_jobs(text, integer) to anon, authenticated, service_role;

create or replace function public.complete_print_job(
  p_secret text,
  p_job_id uuid,
  p_status text,
  p_error text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.check_integration_secret('local_service', p_secret) then
    raise exception 'Firma server non valida.' using errcode = '42501';
  end if;

  if p_status not in ('printed', 'failed', 'queued') then
    raise exception 'Stato stampa non valido.' using errcode = '22023';
  end if;

  update public.print_jobs
  set status = p_status,
      error = left(coalesce(p_error, ''), 500),
      processed_at = case when p_status in ('printed', 'failed') then now() else null end
  where id = p_job_id;

  return found;
end;
$$;

revoke execute on function public.complete_print_job(text, uuid, text, text) from public;
grant execute on function public.complete_print_job(text, uuid, text, text)
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Stato pagamento ordine online (staff, senza webhook)
-- ---------------------------------------------------------------------------

create or replace function public.set_online_order_payment_status(
  p_online_order_id uuid,
  p_payment_status text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_order public.online_orders;
begin
  if v_user is null then
    raise exception 'Autenticazione richiesta.' using errcode = '42501';
  end if;

  if p_payment_status not in ('unpaid', 'paid', 'refunded') then
    raise exception 'Stato pagamento non valido.' using errcode = '22023';
  end if;

  select * into v_order
  from public.online_orders o
  where o.id = p_online_order_id
  for update;

  if not found then
    raise exception 'Ordine online non trovato.' using errcode = 'P0002';
  end if;

  if not public.auth_has_permission_for_restaurant(v_order.restaurant_id, 'orders.manage') then
    raise exception 'Permesso orders.manage richiesto.' using errcode = '42501';
  end if;

  update public.online_orders
  set payment_status = p_payment_status,
      payment_method = case when p_payment_status = 'paid' then 'on_site' else payment_method end
  where id = v_order.id;

  insert into public.audit_logs (
    organization_id, restaurant_id, actor_user_id, action,
    entity_type, entity_id, metadata
  )
  values (
    v_order.organization_id, v_order.restaurant_id, v_user,
    'online_order.payment_status_changed', 'online_order', v_order.id::text,
    jsonb_build_object('payment_status', p_payment_status)
  );
end;
$$;

revoke execute on function public.set_online_order_payment_status(uuid, text)
  from public, anon;
grant execute on function public.set_online_order_payment_status(uuid, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Webhook abbonamenti Stripe → organizzazione
-- ---------------------------------------------------------------------------

create or replace function public.process_stripe_subscription_event(
  p_secret text,
  p_event_id text,
  p_event_type text,
  p_organization_id uuid,
  p_customer_id text,
  p_subscription_id text,
  p_status text,
  p_plan text,
  p_interval text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
begin
  if not public.check_integration_secret('stripe', p_secret) then
    raise exception 'Firma server non valida.' using errcode = '42501';
  end if;

  if p_event_id is null or char_length(p_event_id) < 4 then
    raise exception 'Evento non valido.' using errcode = '23514';
  end if;

  if p_plan is not null
    and p_plan not in ('starter', 'pro', 'business', 'enterprise') then
    raise exception 'Piano non valido.' using errcode = '22023';
  end if;

  if p_interval is not null and p_interval not in ('month', 'year') then
    raise exception 'Intervallo non valido.' using errcode = '22023';
  end if;

  if not exists (select 1 from public.organizations o where o.id = p_organization_id) then
    raise exception 'Organizzazione non trovata.' using errcode = 'P0002';
  end if;

  v_status := case
    when p_status in ('active', 'trialing') then 'active'
    when p_status in ('canceled', 'unpaid', 'incomplete_expired') then 'canceled'
    else null
  end;

  update public.organizations
  set stripe_customer_id = coalesce(nullif(p_customer_id, ''), stripe_customer_id),
      stripe_subscription_id = coalesce(nullif(p_subscription_id, ''), stripe_subscription_id),
      requested_plan = coalesce(p_plan, requested_plan),
      billing_interval = coalesce(p_interval, billing_interval),
      plan_status = coalesce(v_status, plan_status),
      plan_activated_at = case
        when v_status = 'active' then coalesce(plan_activated_at, now())
        else plan_activated_at
      end
  where id = p_organization_id;

  insert into public.integration_events (
    provider, event_id, event_type, payload, status, processed_at
  )
  values (
    'stripe', left(p_event_id, 200), left(coalesce(p_event_type, ''), 120),
    jsonb_build_object(
      'organization_id', p_organization_id,
      'customer_id', p_customer_id,
      'subscription_id', p_subscription_id,
      'status', p_status,
      'plan', p_plan,
      'interval', p_interval
    ),
    'processed', now()
  )
  on conflict (provider, event_id) do nothing;

  return true;
end;
$$;

revoke execute on function public.process_stripe_subscription_event(
  text, text, text, uuid, text, text, text, text, text
) from public;
grant execute on function public.process_stripe_subscription_event(
  text, text, text, uuid, text, text, text, text, text
) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Statistiche CRM/report (security invoker, RLS applicata)
-- ---------------------------------------------------------------------------

create or replace view public.restaurant_daily_sales
with (security_invoker = true)
as
select
  p.organization_id,
  p.restaurant_id,
  date_trunc('day', p.created_at)::date as day,
  count(distinct p.order_id)::integer as orders,
  sum(p.amount_cents)::bigint as revenue_cents,
  sum(p.tip_cents)::bigint as tips_cents,
  sum(case when p.method = 'cash' then p.amount_cents else 0 end)::bigint as cash_cents,
  sum(case when p.method = 'card' then p.amount_cents else 0 end)::bigint as card_cents
from public.payments p
group by p.organization_id, p.restaurant_id, date_trunc('day', p.created_at)::date;

grant select on public.restaurant_daily_sales to authenticated, service_role;
