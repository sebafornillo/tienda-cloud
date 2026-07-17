import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTenant } from '../lib/TenantContext'
import { useCart, money } from '../lib/CartContext'
import ProductModal from '../components/ProductModal'

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

  return (
    <div className="store">
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
