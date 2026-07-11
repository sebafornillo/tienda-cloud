# Tienda Multitenant — SaaS de tiendas online

Una sola app React/Vite que sirve infinitas tiendas. Cada tienda vive en su subdominio y toda la data se aísla por `tenant_id` con Row Level Security de Supabase.



## Paso 2 — El proyecto

```bash
npm install
cp .env.example .env   # completá con tus datos de Supabase
npm run dev
```

En desarrollo, elegí qué tienda ver con un query param:

- `http://localhost:5173/?tienda=burger`
- `http://localhost:5173/?tienda=mates`

## Paso 3 — Crear el usuario admin de cada tienda

1. En Supabase: **Authentication → Users → Add user** (email + contraseña del dueño de la tienda).
2. Copiá el `UUID` del usuario creado.
3. En el SQL Editor, vinculalo a su tienda:

```sql
insert into tenant_users (tenant_id, user_id, role)
values (
  (select id from tenants where subdomain = 'burger'),
  'UUID-DEL-USUARIO',
  'owner'
);
```

4. Entrá a `/admin/login` (con `?tienda=burger` en dev) y logueate.

## Paso 4 — GitHub + Vercel

1. Subí el proyecto a un repo de GitHub.
2. En Vercel: **Add New Project → importá el repo**. Framework: Vite. Agregá las variables de entorno `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
3. **Importante (SPA):** el archivo `vercel.json` ya incluido redirige todas las rutas a `index.html`.

## Paso 5 — Dominio wildcard (Namecheap)

1. En Vercel: **Project → Settings → Domains → agregá `*.tudominio.com`** (y también `tudominio.com`).
2. En Namecheap: **Domain → Advanced DNS**, creá:
   - `CNAME` | Host: `*` | Value: `cname.vercel-dns.com`
   - `CNAME` | Host: `www` | Value: `cname.vercel-dns.com`
   - Registro `A` para el root según lo que indique Vercel (76.76.21.21).
3. Listo: `burger.tudominio.com` y `mates.tudominio.com` cargan cada tienda automáticamente. Para sumar una tienda nueva solo insertás una fila en `tenants` — sin tocar código ni DNS.

## Estructura

```
src/
  lib/          Supabase, resolución de tenant, carrito
  pages/        Tienda pública: catálogo, checkout, confirmación
  components/   Modal de producto con modificadores
  admin/        Login, pedidos en vivo (Realtime), gestión de productos
```

## Próximos pasos sugeridos

- **Mercado Pago:** Edge Function en Supabase que crea la preferencia de pago y otra que recibe el webhook y marca `payment_status = 'paid'`.
- **Subida de imágenes:** Supabase Storage (bucket `products`) en lugar de URL manual.
- **Editor de modificadores** en el panel admin (hoy se cargan por SQL).
- **Zonas de delivery** con costo de envío desde `tenant.settings.delivery_zones`.
- **PWA:** manifest + service worker para que la tienda sea instalable.
