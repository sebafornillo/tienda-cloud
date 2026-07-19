import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

// ⚠️ COMPLETAR: tu número de WhatsApp con código de país, sin + ni espacios
// Ejemplo Argentina: 5493425551234
const WHATSAPP = '5493425255392'

const TYPE_LABEL = {
  gastronomy: 'Gastronomía',
  ecommerce: 'E-commerce',
}

const COLORS = [
  { hex: '#e05a33', name: 'naranja' },
  { hex: '#1d9e75', name: 'verde' },
  { hex: '#3787dd', name: 'azul' },
  { hex: '#e6a817', name: 'amarillo' },
  { hex: '#7c4dbe', name: 'violeta' },
  { hex: '#d4537e', name: 'rosa' },
]

function initials(text) {
  const parts = text.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'TU'
  return parts
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')
}

export default function FornistoreLanding() {
  const [bizName, setBizName] = useState('')
  const [color, setColor] = useState(COLORS[1])
  const [stores, setStores] = useState([])

  useEffect(() => {
    supabase
      .from('tenants')
      .select('subdomain, name, business_type, settings')
      .eq('settings->>featured_on_fornistore', 'true')
      .then(({ data }) => setStores(data || []))
  }, [])

  const displayName = bizName.trim() || 'Tu Negocio'

  const waLink = useMemo(() => {
    const msg = `Hola! Quiero mi tienda "${displayName}" en ${color.name} 🚀`
    return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`
  }, [displayName, color])

  return (
    <div className="fs-landing">
      <style>{`
        .fs-landing {
          min-height: 100vh;
          background: #14120e;
          color: #f5efdf;
          font-family: inherit;
        }
        .fs-hero {
          max-width: 1080px;
          margin: 0 auto;
          padding: 32px 24px 80px;
        }
        .fs-nav {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 64px;
        }
        .fs-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 9px;
          background: #f5efdf;
          color: #14120e;
          font-size: 19px;
          font-weight: 800;
        }
        .fs-nav strong {
          font-size: 20px;
          letter-spacing: -0.01em;
        }
        .fs-hero-grid {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 48px;
          align-items: center;
        }
        .fs-hero h1 {
          font-size: clamp(2.2rem, 5vw, 3.4rem);
          line-height: 1.08;
          letter-spacing: -0.02em;
          margin: 0 0 16px;
        }
        .fs-hero .fs-sub {
          font-size: 1.1rem;
          line-height: 1.6;
          color: #b8b2a2;
          margin: 0 0 32px;
          max-width: 44ch;
        }
        .fs-field label {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          color: #8f8a7c;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .fs-field input {
          width: 100%;
          max-width: 380px;
          padding: 14px 16px;
          border-radius: 12px;
          border: 1.5px solid #3a362c;
          background: #1e1b15;
          color: #f5efdf;
          font-size: 1.05rem;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .fs-field input:focus {
          border-color: var(--fs-accent);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--fs-accent) 25%, transparent);
        }
        .fs-field input::placeholder { color: #6b665a; }
        .fs-field { margin-bottom: 22px; }
        .fs-swatches {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .fs-swatch {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 3px solid transparent;
          cursor: pointer;
          padding: 0;
          transition: transform 0.12s, border-color 0.12s;
        }
        .fs-swatch:hover { transform: scale(1.1); }
        .fs-swatch.on {
          border-color: #f5efdf;
          transform: scale(1.12);
        }
        .fs-cta {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin-top: 32px;
          padding: 16px 28px;
          border-radius: 99px;
          background: #25d366;
          color: #0b2b16;
          font-size: 1.05rem;
          font-weight: 700;
          text-decoration: none;
          transition: transform 0.12s, box-shadow 0.12s;
        }
        .fs-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(37, 211, 102, 0.35);
        }
        .fs-cta-hint {
          margin-top: 12px;
          font-size: 0.85rem;
          color: #8f8a7c;
        }

        /* ---- Celular de muestra ---- */
        .fs-phone-wrap {
          display: flex;
          justify-content: center;
          perspective: 1000px;
        }
        .fs-phone {
          width: 270px;
          background: #fdfaf2;
          border-radius: 32px;
          overflow: hidden;
          box-shadow:
            0 24px 64px rgba(0, 0, 0, 0.5),
            0 0 0 8px #26221a,
            0 0 60px color-mix(in srgb, var(--fs-accent) 30%, transparent);
          transform: rotateY(-6deg) rotateX(2deg);
          transition: box-shadow 0.3s;
          color: #23211b;
        }
        .fs-phone-topbar {
          height: 7px;
          background: var(--fs-accent);
          transition: background 0.25s;
        }
        .fs-phone-body {
          padding: 20px 18px 24px;
          text-align: center;
        }
        .fs-phone-logo {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: var(--fs-accent);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.3rem;
          font-weight: 800;
          margin: 0 auto 10px;
          transition: background 0.25s;
        }
        .fs-phone-name {
          font-size: 1.15rem;
          font-weight: 800;
          margin: 0 0 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .fs-phone-tag {
          font-size: 0.75rem;
          color: #9a9484;
          margin: 0 0 16px;
        }
        .fs-phone-products {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 16px;
        }
        .fs-phone-card {
          background: #fff;
          border: 1px solid #ece7d9;
          border-radius: 12px;
          padding: 8px;
          text-align: left;
        }
        .fs-phone-card .ph-img {
          height: 52px;
          border-radius: 8px;
          background: linear-gradient(135deg, #ece7d9, #f7f3e8);
          margin-bottom: 6px;
        }
        .fs-phone-card small { color: #9a9484; font-size: 0.65rem; }
        .fs-phone-card p { margin: 2px 0 0; font-size: 0.8rem; font-weight: 700; }
        .fs-phone-btn {
          background: var(--fs-accent);
          color: #fff;
          border-radius: 99px;
          padding: 11px;
          font-size: 0.85rem;
          font-weight: 700;
          transition: background 0.25s;
        }

        @media (max-width: 800px) {
          .fs-hero-grid { grid-template-columns: 1fr; gap: 40px; }
          .fs-phone { transform: none; }
          .fs-nav { margin-bottom: 40px; }
          .fs-hero { padding-bottom: 56px; }
        }

        /* ---- Transición oscuro → claro ---- */
        .fs-fade {
          height: 120px;
          background: linear-gradient(180deg, #14120e, #f7f3e8);
        }

        /* ---- Sección dolor ---- */
        .fs-pain {
          background: #f7f3e8;
          color: #23211b;
          padding: 40px 24px 72px;
        }
        .fs-pain-inner {
          max-width: 720px;
          margin: 0 auto;
          text-align: center;
        }
        .fs-kicker {
          display: inline-block;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #8f8a7c;
          margin-bottom: 14px;
        }
        .fs-pain h2 {
          font-size: clamp(1.6rem, 3.5vw, 2.2rem);
          letter-spacing: -0.01em;
          margin: 0 0 32px;
        }
        .fs-pain-chats {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-width: 420px;
          margin: 0 auto 28px;
          text-align: left;
        }
        .fs-chat {
          background: #fff;
          border: 1px solid #e8e2d2;
          border-radius: 14px 14px 14px 4px;
          padding: 10px 14px;
          font-size: 0.95rem;
          color: #555043;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          max-width: 85%;
        }
        .fs-chat.right {
          align-self: flex-end;
          border-radius: 14px 14px 4px 14px;
          background: #e7f6e2;
          border-color: #cfe8c6;
        }
        .fs-pain-punch {
          font-size: 1.1rem;
          line-height: 1.6;
          color: #555043;
          max-width: 46ch;
          margin: 0 auto;
        }
        .fs-pain-punch strong { color: #23211b; }

        /* ---- Tiendas reales ---- */
        .fs-stores {
          background: #f7f3e8;
          padding: 0 24px 80px;
        }
        .fs-stores-inner {
          max-width: 1080px;
          margin: 0 auto;
          text-align: center;
        }
        .fs-stores h2 {
          font-size: clamp(1.6rem, 3.5vw, 2.2rem);
          letter-spacing: -0.01em;
          margin: 0 0 8px;
          color: #23211b;
        }
        .fs-stores > .fs-stores-inner > p {
          color: #8f8a7c;
          margin: 0 0 36px;
        }
        .fs-stores-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        .fs-store-card {
          display: block;
          background: #fff;
          border: 1px solid #e8e2d2;
          border-radius: 18px;
          padding: 28px 24px;
          text-decoration: none;
          color: #23211b;
          text-align: left;
          transition: transform 0.15s, box-shadow 0.15s;
          position: relative;
          overflow: hidden;
        }
        .fs-store-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 5px;
          background: var(--card-accent);
        }
        .fs-store-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 14px 36px rgba(0,0,0,0.10);
        }
        .fs-store-card .tag {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--card-accent);
          margin-bottom: 8px;
        }
        .fs-store-card h3 {
          font-size: 1.35rem;
          margin: 0 0 6px;
        }
        .fs-store-card p {
          color: #8f8a7c;
          font-size: 0.95rem;
          line-height: 1.55;
          margin: 0 0 16px;
        }
        .fs-store-card .visit {
          font-weight: 700;
          color: var(--card-accent);
        }
        @media (max-width: 700px) {
          .fs-stores-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="fs-hero" style={{ '--fs-accent': color.hex }}>
        <nav className="fs-nav">
          <span className="fs-badge">F</span>
          <strong>Fornistore</strong>
        </nav>

        <div className="fs-hero-grid">
          <div>
            <h1>
              Tu tienda online,
              <br />
              con tu marca,
              <br />
              vendiendo en 48 horas.
            </h1>
            <p className="fs-sub">
              Catálogo, pedidos en tiempo real y cobros con Mercado Pago. Escribí el
              nombre de tu negocio y mirala nacer. →
            </p>

            <div className="fs-field">
              <label htmlFor="fs-bizname">Nombre de tu negocio</label>
              <input
                id="fs-bizname"
                type="text"
                maxLength={26}
                placeholder="Pizzería Don Beto"
                value={bizName}
                onChange={(e) => setBizName(e.target.value)}
              />
            </div>

            <div className="fs-field">
              <label>Tu color</label>
              <div className="fs-swatches">
                {COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    aria-label={c.name}
                    className={`fs-swatch ${c.hex === color.hex ? 'on' : ''}`}
                    style={{ background: c.hex }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>

            <a className="fs-cta" href={waLink} target="_blank" rel="noreferrer">
              Quiero mi tienda así →
            </a>
            <p className="fs-cta-hint">
              Te abre WhatsApp con tu pedido armado. Sin compromiso.
            </p>
          </div>

          <div className="fs-phone-wrap">
            <div className="fs-phone">
              <div className="fs-phone-topbar" />
              <div className="fs-phone-body">
                <div className="fs-phone-logo">{initials(displayName)}</div>
                <p className="fs-phone-name">{displayName}</p>
                <p className="fs-phone-tag">tienda online · {displayName
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, '')
                  .slice(0, 14) || 'tunegocio'}.fornistore.com</p>
                <div className="fs-phone-products">
                  <div className="fs-phone-card">
                    <div className="ph-img" />
                    <small>Más vendido</small>
                    <p>$ 8.500</p>
                  </div>
                  <div className="fs-phone-card">
                    <div className="ph-img" />
                    <small>Nuevo</small>
                    <p>$ 5.000</p>
                  </div>
                </div>
                <div className="fs-phone-btn">Hacer mi pedido</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- TRANSICIÓN ---------- */}
      <div className="fs-fade" aria-hidden="true" />

      {/* ---------- DOLOR ---------- */}
      <section className="fs-pain">
        <div className="fs-pain-inner">
          <span className="fs-kicker">¿Te suena?</span>
          <h2>Vender por WhatsApp era gratis.<br />Hasta que empezaste a vender.</h2>
          <div className="fs-pain-chats" aria-hidden="true">
            <div className="fs-chat">Hola! ¿Tenés stock del grande?</div>
            <div className="fs-chat">¿Me pasás el CBU de nuevo?</div>
            <div className="fs-chat">¿Viste mi pedido de ayer? Nadie me contestó 😕</div>
            <div className="fs-chat right">Perdón!! Se me traspapeló 🙏</div>
          </div>
          <p className="fs-pain-punch">
            Pedidos perdidos entre 40 chats, transferencias que hay que verificar a mano,
            el "¿tenés stock?" repetido veinte veces por día. <strong>Tu negocio creció;
            tu herramienta no.</strong> Fornistore ordena todo eso: catálogo, pago y
            pedidos en un solo lugar, con tu marca.
          </p>
        </div>
      </section>

      {/* ---------- TIENDAS REALES ---------- */}
      {stores.length > 0 && (
      <section className="fs-stores">
        <div className="fs-stores-inner">
          <span className="fs-kicker">Sin humo</span>
          <h2>Tiendas reales, vendiendo ahora</h2>
          <p>No te mostramos plantillas: tocá y recorré tiendas de clientes reales.</p>
          <div className="fs-stores-grid">
            {stores.map((t) => (
              <a
                key={t.subdomain}
                className="fs-store-card"
                style={{ '--card-accent': t.settings?.primary_color || '#5a6b3a' }}
                href={`https://${t.subdomain}.fornistore.com`}
                target="_blank"
                rel="noreferrer"
              >
                <span className="tag">{TYPE_LABEL[t.business_type] || 'Tienda'}</span>
                <h3>{t.name}</h3>
                {t.settings?.fornistore_blurb && <p>{t.settings.fornistore_blurb}</p>}
                <span className="visit">Recorrer la tienda →</span>
              </a>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* Parte 3 en adelante: panel en vivo → precios → CTA final */}
    </div>
  )
}
