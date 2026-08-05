import { useEffect, useRef, useState } from 'react'
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

function useTilt() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const zone = el.closest('.l-hero')
    if (!zone) return
    const move = (e) => {
      const r = zone.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width - 0.5
      const y = (e.clientY - r.top) / r.height - 0.5
      el.style.transform = `rotateY(${(x * 16).toFixed(2)}deg) rotateX(${(-y * 11).toFixed(2)}deg)`
    }
    const reset = () => {
      el.style.transform = 'rotateY(0deg) rotateX(0deg)'
    }
    zone.addEventListener('mousemove', move)
    zone.addEventListener('mouseleave', reset)
    return () => {
      zone.removeEventListener('mousemove', move)
      zone.removeEventListener('mouseleave', reset)
    }
  }, [])
  return ref
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-2.8.7.7-2.7-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1-1.4-.6-2.3-1.4-2.9-2.5-.1-.2-.1-.4.1-.5.2-.2.4-.5.6-.7.1-.2.1-.4 0-.6-.1-.2-.5-1.3-.7-1.7-.2-.4-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.2-.9.9-.9 2.1 0 1.2 1 2.5 1.1 2.6.1.2 1.9 3 4.7 4.1 2.3.9 2.3.6 2.7.6.4 0 1.3-.5 1.5-1.1.2-.5.2-1 .1-1.1-.1-.1-.2-.2-.4-.3Z" />
    </svg>
  )
}

function ProductImage({ image, images, name, intervalMs = 1800 }) {
  const list = Array.isArray(images) && images.length > 0 ? images : image ? [image] : []
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (list.length < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setIdx((i) => (i + 1) % list.length), intervalMs)
    return () => clearInterval(t)
  }, [list.length, intervalMs])

  if (list.length === 0) return null

  return list.map((src, i) => (
    <img
      key={src + i}
      src={src}
      alt={name}
      loading="lazy"
      className={`l-product-carousel-img${i === idx ? ' is-active' : ''}`}
    />
  ))
}

function AnimatedTitle({ text, startDelayMs = 0, stepMs = 35 }) {
  const words = text.split(' ')
  let letterIndex = 0
  return words.flatMap((word, wi) => {
    const wordSpan = (
      <span className="l-title-word" key={`w${wi}`}>
        {Array.from(word).map((ch) => {
          const delay = startDelayMs + letterIndex * stepMs
          letterIndex++
          return (
            <span key={letterIndex} className="letter" style={{ animationDelay: `${delay}ms` }}>
              {ch}
            </span>
          )
        })}
      </span>
    )
    return wi < words.length - 1 ? [wordSpan, ' '] : [wordSpan]
  })
}

export default function Landing() {
  const { tenant } = useTenant()
  const s = tenant.settings || {}
  const L = s.landing || {}
  const rootRef = useReveal()
  const tiltRef = useTilt()
  const isDark = L.theme === 'dark'

  // Temas disponibles: 'dark' (food-truck / 3D), 'craft' (papelería / hecho a mano),
  // 'epic' (streetwear cristiano / cinematográfico) o default (claro genérico).
  const themeClass =
    L.theme === 'dark' ? 'theme-dark' : L.theme === 'craft' ? 'theme-craft' : L.theme === 'epic' ? 'theme-epic' : ''

  // Colores extra opcionales para el tema craft. Si el tenant no los define,
  // el CSS cae de nuevo en var(--brand) — no rompe nada para tenants existentes.
  const accentVars = {}
  if (L.accent2) accentVars['--accent2'] = L.accent2
  if (L.accent3) accentVars['--accent3'] = L.accent3
  if (L.accent4) accentVars['--accent4'] = L.accent4

  // Entrada animada del logo del hero: opt-in por tenant.
  // logo_entrance acepta 'bounce' (caida con rebote, HITA) o 'reveal' (aparicion
  // pesada tipo cine, sin rebote). logo_bounce=true se mantiene por compatibilidad.
  const logoEntrance = L.logo_entrance || (L.logo_bounce ? 'bounce' : null)
  const logoClass = [
    'l-hero-logo',
    logoEntrance === 'bounce' ? 'bounce-in' : '',
    logoEntrance === 'reveal' ? 'reveal-in' : '',
  ].filter(Boolean).join(' ')

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
  const verseRef = L.verse_ref || ''
  const verseText = L.verse_text || ''
  const verseLines = verseText ? verseText.split('\n').filter(Boolean) : []
  const animateTitle = L.heading_effect === 'letters'
  const titleStartDelay = logoEntrance === 'reveal' ? 2500 : logoEntrance === 'bounce' ? 700 : 0

  return (
    <div
      className={['landing', themeClass].filter(Boolean).join(' ')}
      style={accentVars}
      ref={rootRef}
    >
      {/* ---------- HERO ---------- */}
      {isDark ? (
        <section className="l-hero l-hero-dark">
          <div className="l-hero-dark-grid">
            <div className="l-hero-content">
              {logo && <img className={logoClass} src={logo} alt={tenant.name} />}
              <h1>{animateTitle ? <AnimatedTitle text={tagline} startDelayMs={titleStartDelay} /> : tagline}</h1>
              {sub && <p>{sub}</p>}
              <Link to="/tienda" className="l-cta">
                Pedir ahora
              </Link>
            </div>
            {hero && (
              <div className="l-tilt-stage" aria-hidden="true">
                <div className="l-tilt-float">
                  <img ref={tiltRef} className="l-tilt" src={hero} alt="" />
                </div>
              </div>
            )}
          </div>
          <div className="checker-strip" aria-hidden="true" />
        </section>
      ) : (
        <section className="l-hero">
          {hero && <div className="l-hero-bg" style={{ backgroundImage: `url(${hero})` }} />}
          <div className="l-hero-overlay" />
          <div className="l-hero-content">
            {logo && <img className={logoClass} src={logo} alt={tenant.name} />}
            <h1>{animateTitle ? <AnimatedTitle text={tagline} startDelayMs={titleStartDelay} /> : tagline}</h1>
            {sub && <p>{sub}</p>}
            <Link to="/tienda" className="l-cta">
              Ver la tienda
            </Link>
          </div>
          <div className="l-scroll-hint" aria-hidden="true">
            <span />
          </div>
        </section>
      )}

      {/* ---------- HISTORIA ---------- */}
      {story && (
        <section className="l-story">
          <div className="reveal">
            <span className="l-kicker">{storyTitle}</span>
            <p className="l-story-text">{story}</p>
          </div>
        </section>
      )}

      {/* ---------- MOMENTO DE VERSICULO (opt-in: verse_ref + verse_text) ---------- */}
      {verseRef && verseLines.length > 0 && (
        <section className="l-verse">
          <div className="l-verse-inner">
            <span className="l-verse-ref">{verseRef}</span>
            {verseLines.map((line, i) => (
              <p
                key={i}
                className="reveal l-verse-line"
                style={{ transitionDelay: `${i * 250}ms` }}
              >
                {line}
              </p>
            ))}
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
                      <ProductImage image={p.image} images={p.images} name={p.name} />
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
            {L.feature_show_logo && logo && (
              <img className="l-feature-logo" src={logo} alt={tenant.name} />
            )}
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
      {isDark && <div className="checker-strip" aria-hidden="true" />}
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
                <InstagramIcon /> @{instagram}
              </a>
            )}
            {whatsapp && (
              <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">
                <WhatsAppIcon /> WhatsApp
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
