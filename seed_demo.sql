-- Datos de ejemplo para probar las dos tiendas
-- Ejecutar DESPUÉS del schema_multitenant.sql

-- ===== BURGER & PIZZA HOUSE =====
with t as (select id from tenants where subdomain = 'burger')
insert into categories (tenant_id, name, sort_order)
select t.id, x.name, x.ord from t, (values
  ('Hamburguesas', 1), ('Pizzas', 2), ('Bebidas', 3)
) as x(name, ord);

with t as (select id from tenants where subdomain = 'burger'),
     c as (select id, name from categories where tenant_id = (select id from t))
insert into products (tenant_id, category_id, name, description, price, sort_order)
select (select id from t),
       (select id from c where name = x.cat),
       x.name, x.descr, x.price, x.ord
from (values
  ('Hamburguesas', 'Clásica', 'Medallón de carne, lechuga, tomate y salsa de la casa', 6500, 1),
  ('Hamburguesas', 'Doble Cheddar', 'Doble medallón, doble cheddar, cebolla caramelizada', 8900, 2),
  ('Pizzas', 'Muzzarella', 'Salsa de tomate, muzzarella y aceitunas', 9500, 1),
  ('Pizzas', 'Napolitana', 'Muzzarella, tomate en rodajas y ajo', 10800, 2),
  ('Bebidas', 'Gaseosa 500ml', null, 1800, 1)
) as x(cat, name, descr, price, ord);

-- Modificadores para la Doble Cheddar
with p as (select id, tenant_id from products where name = 'Doble Cheddar')
insert into modifier_groups (tenant_id, product_id, name, min_select, max_select, sort_order)
select tenant_id, id, 'Adicionales', 0, 4, 1 from p;

with g as (
  select mg.id, mg.tenant_id from modifier_groups mg
  join products p on p.id = mg.product_id
  where p.name = 'Doble Cheddar' and mg.name = 'Adicionales'
)
insert into modifier_options (tenant_id, group_id, name, price_delta, sort_order)
select g.tenant_id, g.id, x.name, x.delta, x.ord from g, (values
  ('Cheddar extra', 800, 1),
  ('Bacon', 1200, 2),
  ('Huevo frito', 700, 3),
  ('Sin cebolla', 0, 4)
) as x(name, delta, ord);

-- ===== MUNDO MATE =====
with t as (select id from tenants where subdomain = 'mates')
insert into categories (tenant_id, name, sort_order)
select t.id, x.name, x.ord from t, (values
  ('Mates', 1), ('Bombillas', 2), ('Combos', 3)
) as x(name, ord);

with t as (select id from tenants where subdomain = 'mates'),
     c as (select id, name from categories where tenant_id = (select id from t))
insert into products (tenant_id, category_id, name, description, price, sort_order)
select (select id from t),
       (select id from c where name = x.cat),
       x.name, x.descr, x.price, x.ord
from (values
  ('Mates', 'Mate Imperial', 'Calabaza forrada en cuero, virola de alpaca', 38000, 1),
  ('Mates', 'Mate Camionero', 'Calabaza forrada en cuero crudo, boca ancha', 29000, 2),
  ('Bombillas', 'Bombilla de Alpaca', 'Pico de loro, filtro desmontable', 15000, 1),
  ('Combos', 'Combo Matero', 'Mate camionero + bombilla + funda', 45000, 1)
) as x(cat, name, descr, price, ord);

-- Modificador para el Combo Matero
with p as (select id, tenant_id from products where name = 'Combo Matero')
insert into modifier_groups (tenant_id, product_id, name, min_select, max_select, sort_order)
select tenant_id, id, 'Color del cuero', 1, 1, 1 from p;

with g as (
  select mg.id, mg.tenant_id from modifier_groups mg
  join products p on p.id = mg.product_id
  where p.name = 'Combo Matero'
)
insert into modifier_options (tenant_id, group_id, name, price_delta, sort_order)
select g.tenant_id, g.id, x.name, x.delta, x.ord from g, (values
  ('Suela', 0, 1),
  ('Negro', 0, 2),
  ('Marrón oscuro', 0, 3)
) as x(name, delta, ord);
