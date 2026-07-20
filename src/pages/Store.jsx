import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTenant } from '../lib/TenantContext'
import { useCart, money } from '../lib/CartContext'
import ProductModal from '../components/ProductModal'
import { isStoreOpen, nextOpening } from '../lib/schedule'

export default function Store() {
  const { tenant } = useTenant()
  const { count, subtotal } = useCart()
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [selected, setSelected] = useState(null)
  const [activeCat, setActiveCat] = useState(null)

  useEffect(() => {
    async function load() {
      const [cats, prods] = await Promise.all([
        supabase
          .from('categories')
          .select('*')
          .eq('tenant_id', tenant.id)
          .eq('is_active', true)
          .order('sort_order'),
        supabase
          .from('products')
          .select('*')
          .eq('tenant_id', tenant.id)
          .eq('is_active', true)
          .order('sort_order'),
      ])
      setCategories(cats.data || [])
      setProducts(prods.data || [])
    }
    load()
  }, [tenant.id])

  const grouped = useMemo(() => {
    const withCat = categories
      .map((c) => ({ ...c, items: products.filter((p) => p.category_id === c.id) }))
      .filter((c) => c.items.length > 0)
    const orphans = products.filter((p) => !p.category_id)
    if (orphans.length) withCat.push({ id: 'otros', name: 'Otros', items: orphans })
    return withCat
  }, [categories, products])

  const visible = activeCat ? grouped.filter((g) => g.id === activeCat) : grouped

  const open = isStoreOpen(tenant.settings?.schedule)
  const opensAt = open ? null : nextOpening(tenant.settings?.schedule)

  const announcement = tenant.settings?.announcement?.trim()
  const whatsapp = tenant.settings?.whatsapp

  return (
    <div className="store">
      {announcement && <div className="announce-bar">{announcement}</div>}
      {!open && (
        <div className="closed-banner">
          🌙 Cerrado ahora{opensAt ? ` — abrimos ${opensAt}` : ''}. Podés mirar el menú
          igual.
        </div>
      )}
      <header className="store-header">
        {tenant.settings?.banner_url && (
          <img className="store-banner" src={tenant.settings.banner_url} alt="" />
        )}
        <div className="store-identity">
          {tenant.settings?.logo_url && (
            <img className="store-logo" src={tenant.settings.logo_url} alt="" />
          )}
          <h1>{tenant.name}</h1>
        </div>
      </header>

      {grouped.length > 1 && (
        <nav className="cat-nav">
          <button
            className={!activeCat ? 'active' : ''}
            onClick={() => setActiveCat(null)}
          >
            Todo
          </button>
          {grouped.map((g) => (
            <button
              key={g.id}
              className={activeCat === g.id ? 'active' : ''}
              onClick={() => setActiveCat(g.id)}
            >
              {g.name}
            </button>
          ))}
        </nav>
      )}

      <main className="catalog">
        {visible.length === 0 && (
          <p className="empty">Todavía no hay productos cargados.</p>
        )}
        {visible.map((group) => (
          <section key={group.id}>
            <h2>{group.name}</h2>
            <div className="product-list">
              {group.items.map((p) => {
                const out = p.stock !== null && p.stock <= 0
                const low = !out && p.stock !== null && p.stock <= 3
                return (
                  <button
                    key={p.id}
                    className={out ? 'product-card out-of-stock' : 'product-card'}
                    disabled={out}
                    onClick={() => setSelected(p)}
                  >
                    <div className="product-info">
                      <h3>{p.name}</h3>
                      {p.description && <p>{p.description}</p>}
                      <div className="price-row">
                        <span className="price">{money(p.price)}</span>
                        {p.compare_at_price && (
                          <span className="compare">{money(p.compare_at_price)}</span>
                        )}
                        {out && <span className="stock-chip out">Sin stock</span>}
                        {low && (
                          <span className="stock-chip low">
                            ¡{p.stock === 1 ? 'Última unidad' : `Últimas ${p.stock}`}!
                          </span>
                        )}
                      </div>
                    </div>
                    {p.image_url && <img src={p.image_url} alt={p.name} />}
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </main>

      {selected && (
        <ProductModal product={selected} onClose={() => setSelected(null)} />
      )}

      {whatsapp && (
        <a
          className={count > 0 ? 'wa-float up' : 'wa-float'}
          href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hola ${tenant.name}! Tengo una consulta 🙂`)}`}
          target="_blank"
          rel="noreferrer"
          aria-label="Consultanos por WhatsApp"
        >
          <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
            <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.39a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.65-1.03-5.14-2.9-7.01A9.83 9.83 0 0 0 12.04 2Zm0 18.15c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.05-.2-.31a8.26 8.26 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.23 8.24Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.17.25-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29Z" />
          </svg>
        </a>
      )}

      {count > 0 && (
        <Link to="/checkout" className="cart-bar">
          <span className="cart-count">{count}</span>
          <span>Ver pedido</span>
          <span>{money(subtotal)}</span>
        </Link>
      )}
    </div>
  )
}
