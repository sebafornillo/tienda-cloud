import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTenant } from '../lib/TenantContext'
import { useCart, money } from '../lib/CartContext'
import ProductModal from '../components/ProductModal'
import { isStoreOpen, nextOpening } from '../lib/schedule'

// Normaliza texto para buscar sin acentos ni mayúsculas
const norm = (t) =>
  (t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

// Resalta la parte del texto que coincide con lo buscado
function highlight(text, q) {
  if (!q) return text
  const i = norm(text).indexOf(norm(q))
  if (i === -1) return text
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  )
}

export default function Store() {
  const { tenant } = useTenant()
  const { count, subtotal } = useCart()
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [selected, setSelected] = useState(null)
  const [activeCat, setActiveCat] = useState(null)
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showTop, setShowTop] = useState(false)
  const [slide, setSlide] = useState(0)
  const [autoSlide, setAutoSlide] = useState(true)
  const slideTouchX = useRef(null)

  // Botón "volver arriba": aparece pasados los 400px de scroll
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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

  // Bloquea el scroll del fondo cuando el menú está abierto
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const grouped = useMemo(() => {
    const withCat = categories
      .map((c) => ({ ...c, items: products.filter((p) => p.category_id === c.id) }))
      .filter((c) => c.items.length > 0)
    const orphans = products.filter((p) => !p.category_id)
    if (orphans.length) withCat.push({ id: 'otros', name: 'Otros', items: orphans })
    return withCat
  }, [categories, products])

  const searching = query.trim().length > 0
  const results = useMemo(() => {
    if (!searching) return []
    const q = norm(query)
    return products.filter(
      (p) => norm(p.name).includes(q) || norm(p.description).includes(q)
    )
  }, [products, query, searching])

  const visible = activeCat ? grouped.filter((g) => g.id === activeCat) : grouped

  const open = isStoreOpen(tenant.settings?.schedule)
  const opensAt = open ? null : nextOpening(tenant.settings?.schedule)

  const announcement = tenant.settings?.announcement?.trim()
  const whatsapp = tenant.settings?.whatsapp

  // Portada: si hay imágenes extra, la portada es un carrusel
  const slides = useMemo(() => {
    const extra = Array.isArray(tenant.settings?.banners) ? tenant.settings.banners : []
    return [tenant.settings?.banner_url, ...extra].filter(Boolean)
  }, [tenant.settings])

  useEffect(() => {
    if (!autoSlide || slides.length < 2) return
    const iv = setInterval(() => setSlide((i) => (i + 1) % slides.length), 5000)
    return () => clearInterval(iv)
  }, [autoSlide, slides.length])

  function slideTouchStart(e) {
    slideTouchX.current = e.touches[0].clientX
  }
  function slideTouchEnd(e) {
    if (slideTouchX.current === null) return
    const dx = e.changedTouches[0].clientX - slideTouchX.current
    slideTouchX.current = null
    if (Math.abs(dx) < 40) return
    setAutoSlide(false)
    setSlide((i) => (dx < 0 ? (i + 1) % slides.length : (i - 1 + slides.length) % slides.length))
  }

  function goCategory(id) {
    setActiveCat(id)
    setQuery('')
    setMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function renderCard(p, q) {
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
          <h3>{highlight(p.name, q)}</h3>
          {p.description && <p>{highlight(p.description, q)}</p>}
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
  }

  return (
    <div className="store">
      {announcement && <div className="announce-bar">{announcement}</div>}
      {!open && (
        <div className="closed-banner">
          🌙 Cerrado ahora{opensAt ? ` — abrimos ${opensAt}` : ''}. Podés mirar el menú
          igual.
        </div>
      )}

      {/* ---------- Barra superior: menú + búsqueda ---------- */}
      <div className="store-topbar">
        <button
          className="topbar-btn"
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menú"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
          </svg>
        </button>
        <div className={searchOpen || searching ? 'topbar-search open' : 'topbar-search'}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <line x1="16.5" y1="16.5" x2="21" y2="21" />
          </svg>
          <input
            placeholder="Buscar productos…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setSearchOpen(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setQuery('')
                e.currentTarget.blur()
              }
            }}
          />
          {query && (
            <button className="search-clear" onClick={() => setQuery('')} aria-label="Limpiar búsqueda">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ---------- Drawer lateral ---------- */}
      {menuOpen && (
        <div className="drawer-backdrop" onClick={() => setMenuOpen(false)}>
          <nav className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              {tenant.settings?.logo_url && (
                <img src={tenant.settings.logo_url} alt="" />
              )}
              <strong>{tenant.name}</strong>
              <button
                className="drawer-close"
                onClick={() => setMenuOpen(false)}
                aria-label="Cerrar menú"
              >
                ✕
              </button>
            </div>
            <ul className="drawer-list">
              <li>
                <button
                  className={!activeCat ? 'on' : ''}
                  onClick={() => goCategory(null)}
                >
                  Inicio
                </button>
              </li>
              {grouped.length > 0 && <li className="drawer-label">Categorías</li>}
              {grouped.map((g) => (
                <li key={g.id}>
                  <button
                    className={activeCat === g.id ? 'on' : ''}
                    onClick={() => goCategory(g.id)}
                  >
                    {g.name}
                    <span className="drawer-count">{g.items.length}</span>
                  </button>
                </li>
              ))}
              {whatsapp && (
                <li className="drawer-contact">
                  <a
                    href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hola ${tenant.name}! Tengo una consulta 🙂`)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    💬 Consultanos por WhatsApp
                  </a>
                </li>
              )}
            </ul>
            <p className="drawer-foot">
              Tienda creada con{' '}
              <a href="https://www.fornistore.com" target="_blank" rel="noreferrer">
                Fornistore
              </a>
            </p>
          </nav>
        </div>
      )}

      <header className="store-header">
        {slides.length === 1 && (
          <img className="store-banner" src={slides[0]} alt="" />
        )}
        {slides.length > 1 && (
          <div
            className="banner-carousel"
            onTouchStart={slideTouchStart}
            onTouchEnd={slideTouchEnd}
          >
            <div className="banner-track" style={{ transform: `translateX(-${slide * 100}%)` }}>
              {slides.map((url, i) => (
                <img key={url} src={url} alt="" loading={i === 0 ? 'eager' : 'lazy'} />
              ))}
            </div>
            <div className="banner-dots">
              {slides.map((_, i) => (
                <button
                  key={i}
                  className={i === slide ? 'on' : ''}
                  onClick={() => {
                    setAutoSlide(false)
                    setSlide(i)
                  }}
                  aria-label={`Imagen ${i + 1}`}
                />
              ))}
            </div>
          </div>
        )}
        <div className="store-identity">
          {tenant.settings?.logo_url && (
            <img className="store-logo" src={tenant.settings.logo_url} alt="" />
          )}
          <h1>{tenant.name}</h1>
        </div>
      </header>

      {!searching && grouped.length > 1 && (
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
        {searching ? (
          <section>
            <h2>
              {results.length > 0
                ? `${results.length} ${results.length === 1 ? 'resultado' : 'resultados'} para "${query.trim()}"`
                : `Nada para "${query.trim()}"`}
            </h2>
            {results.length === 0 && (
              <p className="empty">
                Probá con otra palabra, o consultanos por WhatsApp 👉
              </p>
            )}
            <div className="product-list">{results.map((p) => renderCard(p, query.trim()))}</div>
          </section>
        ) : (
          <>
            {visible.length === 0 && (
              <p className="empty">Todavía no hay productos cargados.</p>
            )}
            {visible.map((group) => (
              <section key={group.id}>
                <h2>{group.name}</h2>
                <div className="product-list">{group.items.map((p) => renderCard(p))}</div>
              </section>
            ))}
          </>
        )}
      </main>

      {selected && (
        <ProductModal
          key={selected.id}
          product={selected}
          allProducts={products}
          onSelectProduct={setSelected}
          onClose={() => setSelected(null)}
        />
      )}

      {showTop && (
        <button
          className={`scroll-top ${whatsapp ? 'with-wa' : ''} ${count > 0 ? 'with-cart' : ''}`}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Volver arriba"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="6 14 12 8 18 14" />
          </svg>
        </button>
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
