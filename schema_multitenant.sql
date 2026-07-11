-- ============================================================
-- SaaS Multitenant - Tiendas Online (Supabase / Postgres)
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- ---------- TENANTS (las tiendas) ----------
create table tenants (
  id uuid primary key default gen_random_uuid(),
  subdomain text unique not null,          -- ej: 'mates', 'burgerhouse'
  custom_domain text unique,               -- ej: 'www.mateslupe.com' (opcional)
  name text not null,
  business_type text not null default 'ecommerce', -- 'ecommerce' | 'gastronomy'
  plan text not null default 'basic',      -- 'basic' | 'pro' | 'premium'
  is_active boolean not null default true,
  -- Branding y configuración flexible por tienda:
  settings jsonb not null default '{
    "logo_url": null,
    "primary_color": "#111111",
    "banner_url": null,
    "whatsapp": null,
    "mp_public_key": null,
    "opening_hours": null,
    "delivery_zones": [],
    "currency": "ARS"
  }'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------- USUARIOS DEL TENANT (dueños/staff de cada tienda) ----------
create table tenant_users (
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner',      -- 'owner' | 'staff'
  primary key (tenant_id, user_id)
);

-- Helper: ¿el usuario logueado pertenece al tenant?
create or replace function is_tenant_member(t_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from tenant_users
    where tenant_id = t_id and user_id = auth.uid()
  );
$$;

-- ---------- CATEGORÍAS ----------
create table categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  is_active boolean not null default true
);

-- ---------- PRODUCTOS ----------
create table products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  name text not null,
  description text,
  price numeric(12,2) not null,
  compare_at_price numeric(12,2),          -- precio tachado / oferta
  image_url text,
  stock int,                                -- null = sin control de stock (útil en gastronomía)
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- MODIFICADORES (la clave para gastronomía) ----------
-- Grupo: "Elegí tu punto de cocción", "Adicionales", "Tamaño"
create table modifier_groups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  name text not null,
  min_select int not null default 0,        -- 0 = opcional
  max_select int not null default 1,        -- >1 = múltiple (ej: adicionales)
  sort_order int not null default 0
);

-- Opción: "Cheddar extra +$800", "Sin cebolla", "Bombilla de alpaca +$3000"
create table modifier_options (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  group_id uuid not null references modifier_groups(id) on delete cascade,
  name text not null,
  price_delta numeric(12,2) not null default 0,
  is_active boolean not null default true,
  sort_order int not null default 0
);

-- ---------- PEDIDOS ----------
create table orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  order_number serial,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  delivery_type text not null default 'pickup', -- 'pickup' | 'delivery' | 'shipping'
  address text,
  notes text,
  status text not null default 'pending',
  -- pending -> confirmed -> preparing -> ready/shipped -> delivered | cancelled
  subtotal numeric(12,2) not null,
  delivery_fee numeric(12,2) not null default 0,
  total numeric(12,2) not null,
  payment_status text not null default 'unpaid', -- 'unpaid' | 'paid' | 'refunded'
  payment_method text,                     -- 'mercadopago' | 'cash' | 'transfer'
  mp_payment_id text,                      -- id de pago de Mercado Pago (webhook)
  created_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text not null,              -- snapshot (por si el producto cambia)
  unit_price numeric(12,2) not null,
  quantity int not null default 1,
  modifiers jsonb not null default '[]'::jsonb, -- [{"name":"Cheddar extra","price_delta":800}]
  line_total numeric(12,2) not null
);

-- ---------- ÍNDICES ----------
create index on categories (tenant_id);
create index on products (tenant_id, is_active);
create index on modifier_groups (product_id);
create index on modifier_options (group_id);
create index on orders (tenant_id, status, created_at desc);
create index on order_items (order_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- Regla general:
--   - Catálogo: lectura pública (la tienda es pública), escritura solo miembros
--   - Pedidos: cualquiera puede crear (checkout), solo miembros pueden ver/gestionar
-- ============================================================

alter table tenants enable row level security;
alter table tenant_users enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table modifier_groups enable row level security;
alter table modifier_options enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

-- TENANTS: lectura pública (para resolver el subdominio), edición solo miembros
create policy "tenants_public_read" on tenants
  for select using (is_active = true);
create policy "tenants_member_update" on tenants
  for update using (is_tenant_member(id));

-- TENANT_USERS: cada usuario ve sus propias membresías
create policy "tenant_users_own" on tenant_users
  for select using (user_id = auth.uid());

-- CATÁLOGO: lectura pública, escritura solo miembros del tenant
create policy "categories_public_read" on categories
  for select using (is_active = true or is_tenant_member(tenant_id));
create policy "categories_member_write" on categories
  for all using (is_tenant_member(tenant_id));

create policy "products_public_read" on products
  for select using (is_active = true or is_tenant_member(tenant_id));
create policy "products_member_write" on products
  for all using (is_tenant_member(tenant_id));

create policy "mgroups_public_read" on modifier_groups
  for select using (true);
create policy "mgroups_member_write" on modifier_groups
  for all using (is_tenant_member(tenant_id));

create policy "moptions_public_read" on modifier_options
  for select using (is_active = true or is_tenant_member(tenant_id));
create policy "moptions_member_write" on modifier_options
  for all using (is_tenant_member(tenant_id));

-- PEDIDOS: el público puede CREAR (checkout anónimo),
-- pero solo los miembros del tenant pueden leer y actualizar
create policy "orders_public_insert" on orders
  for insert with check (true);
create policy "orders_member_read" on orders
  for select using (is_tenant_member(tenant_id));
create policy "orders_member_update" on orders
  for update using (is_tenant_member(tenant_id));

create policy "order_items_public_insert" on order_items
  for insert with check (true);
create policy "order_items_member_read" on order_items
  for select using (is_tenant_member(tenant_id));

-- ============================================================
-- REALTIME: activar para que el panel reciba pedidos en vivo
-- ============================================================
alter publication supabase_realtime add table orders;

-- ============================================================
-- DATOS DE PRUEBA: tus dos primeros clientes
-- ============================================================
insert into tenants (subdomain, name, business_type, settings) values
  ('mates', 'Mundo Mate', 'ecommerce',
   '{"primary_color":"#2d5a27","currency":"ARS","whatsapp":null,"logo_url":null,"banner_url":null,"mp_public_key":null,"opening_hours":null,"delivery_zones":[]}'),
  ('burger', 'Burger & Pizza House', 'gastronomy',
   '{"primary_color":"#c62828","currency":"ARS","whatsapp":null,"logo_url":null,"banner_url":null,"mp_public_key":null,"opening_hours":{"lun-dom":"19:00-00:00"},"delivery_zones":[]}');
