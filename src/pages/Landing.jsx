import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTenant } from '../lib/TenantContext'

// ============================================================
// Landing configurable por tienda (settings.landing_enabled)
// El contenido sale de tenant.settings.landing con defaults
// razonables si algún campo falta.
// ============================================================

function useReveal() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('visible')
            obs.unobserve(e.target)
          }
        }
      },
      { threshold: 0.15 }
    )
    el.querySelectorAll('.reveal').forEach((n) => obs.observe(n))
    return () => obs.disconnect()
  }, [])
  return ref
}

export default function Landing() {
  const { tenant } = useTenant()
  const s = tenant.settings || {}
  const L = s.landing || {}
  const rootRef = useReveal()

  const hero = L.hero_image || s.banner_url
  const logo = s.logo_url
  const tagline = L.tagline || `Bienvenido a ${tenant.name}`
  const sub = L.subtitle || ''
  const story = L.story || ''
  const storyTitle = L.story_title || 'Nuestra historia'
  const collectionImg = L.collection_image
  const collectionTitle = L.collection_title || 'La colección'
  const collectionText = L.collection_text || ''
  const products = Array.isArray(L.products) ? L.products : []
  const featureImg = L.feature_image
  const featureTitle = L.feature_title || ''
  const featureText = L.feature_text || ''
  const badges = Array.isArray(L.badges) ? L.badges : []
  const instagram = L.instagram
  const whatsapp = s.whatsapp

  return (
    <div className="landing" ref={rootRef}>
      {/* ---------- HERO ---------- */}
      <section className="l-hero">
        {hero && <div className="l-hero-bg" style={{ backgroundImage: `url(${hero})` }} />}
        <div className="l-hero-overlay" />
        <div className="l-hero-content">
          {logo && <img className="l-hero-logo" src={logo} alt={tenant.name} />}
          <h1>{tagline}</h1>
          {sub && <p>{sub}</p>}
          <Link to="/tienda" className="l-cta">
            Ver la tienda
          </Link>
        </div>
        <div className="l-scroll-hint" aria-hidden="true">
          <span />
        </div>
      </section>

      {/* ---------- HISTORIA ---------- */}
      {story && (
        <section className="l-story">
          <div className="reveal">
            <span className="l-kicker">{storyTitle}</span>
            <p className="l-story-text">{story}</p>
          </div>
        </section>
      )}

      {/* ---------- COLECCIÓN ---------- */}
      {(collectionImg || products.length > 0) && (
        <section className="l-collection">
          <div className="l-collection-head reveal">
            <span className="l-kicker">{collectionTitle}</span>
            {collectionText && <p>{collectionText}</p>}
          </div>
          <div className="l-collection-body">
            {collectionImg && (
              <div className="l-collection-img reveal">
                <img src={collectionImg} alt="" loading="lazy" />
              </div>
            )}
            {products.length > 0 && (
              <div className="l-products">
                {products.map((p, i) => (
                  <Link
                    to="/tienda"
                    key={i}
                    className="l-product reveal"
                    style={{ transitionDelay: `${i * 90}ms` }}
                  >
                    <div className="l-product-img">
                      <img src={p.image} alt={p.name} loading="lazy" />
                    </div>
                    <strong>{p.name}</strong>
                    {p.note && <small>{p.note}</small>}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="l-center reveal">
            <Link to="/tienda" className="l-cta l-cta-outline">
              Ver todos los productos
            </Link>
          </div>
        </section>
      )}

      {/* ---------- DIFERENCIAL / PERSONALIZADOS ---------- */}
      {featureTitle && (
        <section className="l-feature">
          {featureImg && (
            <div
              className="l-feature-bg"
              style={{ backgroundImage: `url(${featureImg})` }}
            />
          )}
          <div className="l-feature-overlay" />
          <div className="l-feature-content reveal">
            <span className="l-kicker light">{featureTitle}</span>
            <p>{featureText}</p>
            <Link to="/tienda" className="l-cta">
              Encargá el tuyo
            </Link>
          </div>
        </section>
      )}

      {/* ---------- BADGES (envíos, etc.) ---------- */}
      {badges.length > 0 && (
        <section className="l-badges">
          {badges.map((b, i) => (
            <div className="l-badge reveal" key={i} style={{ transitionDelay: `${i * 90}ms` }}>
              <span className="l-badge-icon">{b.icon}</span>
              <strong>{b.title}</strong>
              <small>{b.text}</small>
            </div>
          ))}
        </section>
      )}

      {/* ---------- CIERRE ---------- */}
      <section className="l-footer">
        <div className="reveal">
          {logo && <img className="l-footer-logo" src={logo} alt="" />}
          <h2>{L.closing || `Sumate a ${tenant.name}`}</h2>
          <Link to="/tienda" className="l-cta">
            Comprar ahora
          </Link>
          <div className="l-social">
            {instagram && (
              <a href={`https://instagram.com/${instagram}`} target="_blank" rel="noreferrer">
                Instagram @{instagram}
              </a>
            )}
            {whatsapp && (
              <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">
                WhatsApp
              </a>
            )}
          </div>
          <p className="l-credit">
            Tienda creada con <a href="https://www.fornistore.com" target="_blank" rel="noreferrer">Fornistore</a>
          </p>
        </div>
      </section>
    </div>
  )
}
