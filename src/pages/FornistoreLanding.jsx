import { useMemo, useState } from 'react'

// ⚠️ COMPLETAR: tu número de WhatsApp con código de país, sin + ni espacios
// Ejemplo Argentina: 5493425551234
const WHATSAPP = '549XXXXXXXXXX'

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

      {/* Parte 2 en adelante: dolor → tiendas reales → panel en vivo → precios → CTA */}
    </div>
  )
}
