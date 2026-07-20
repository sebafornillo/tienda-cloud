import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

// ⚠️ COMPLETAR: tu número de WhatsApp con código de país, sin + ni espacios
// Ejemplo Argentina: 5493425551234
const WHATSAPP = '549XXXXXXXXXX'

const TYPE_LABEL = {
  gastronomy: 'Gastronomía',
  ecommerce: 'E-commerce',
}

const DEMO_NAMES = ['sofi', 'marcos', 'caro', 'leo', 'vale', 'nico']
const DEMO_STAGES = ['Nuevo', 'Confirmado', 'En preparación', 'Listo', 'Entregado']

function PanelDemo() {
  const [orders, setOrders] = useState([])
  const [stock, setStock] = useState(4)
  const [count, setCount] = useState(7)
  const timers = useRef([])

  useEffect(() => {
    return () => timers.current.forEach(clearTimeout)
  }, [])

  function now() {
    return new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  }

  function simulate() {
    if (stock <= 0) return
    const id = Date.now()
    setOrders((o) =>
      [{ id, name: DEMO_NAMES[count % DEMO_NAMES.length], num: 47 + count, time: now(), stage: 0 }, ...o].slice(0, 4)
    )
    setStock((s) => s - 1)
    setCount((c) => c + 1)
  }

  function confirmOrder(id) {
    setOrders((o) => o.map((x) => (x.id === id ? { ...x, stage: 1 } : x)))
    for (let s = 2; s < DEMO_STAGES.length; s++) {
      timers.current.push(
        setTimeout(() => {
          setOrders((o) => o.map((x) => (x.id === id ? { ...x, stage: s } : x)))
        }, (s - 1) * 1600)
      )
    }
  }

  const pillClass = (stage) =>
    stage === 0 ? 'pill new' : stage === DEMO_STAGES.length - 1 ? 'pill done' : 'pill'

  return (
    <div className="fs-panel">
      <div className="fs-panel-top">
        <span className="fs-panel-badge">F</span>
        <strong>Pizzería Don Beto</strong>
        <span className="fs-panel-nav">Pedidos · Productos · Stock · Cupones</span>
        <span className="fs-panel-live">● en vivo</span>
      </div>
      <div className="fs-panel-kpis">
        <div>
          <small>Pedidos hoy</small>
          <strong>{count}</strong>
        </div>
        <div>
          <small>Stock muzzarella</small>
          <strong className={stock <= 0 ? 'kpi-out' : stock <= 3 ? 'kpi-low' : ''}>
            {stock} u.
          </strong>
        </div>
        <div>
          <small>Cupón activo</small>
          <strong className="kpi-coupon">HOLA10 · 10%</strong>
        </div>
      </div>
      <div className="fs-panel-orders">
        {orders.map((o) =>
          o.stage === 0 ? (
            <div key={o.id} className="fs-order-card">
              <div className="fs-order-head">
                <span className="fs-order-num">#{o.num}</span>
                <div className="fs-order-who">
                  <strong>{o.name}</strong>
                  <small>Retiro · {o.time}</small>
                </div>
                <span className="pill new">Nuevo</span>
                <span className="fs-order-total">$ 8.500</span>
              </div>
              <div className="fs-order-detail">
                <span>1× Pizza muzzarella</span>
                <span>$ 8.500</span>
              </div>
              <small className="fs-order-meta">Pago: Mercado Pago ✓ acreditado</small>
              <div className="fs-order-actions">
                <button className="fs-demo-confirm" onClick={() => confirmOrder(o.id)}>
                  Confirmar
                </button>
                <span className="fs-demo-wa">WhatsApp</span>
              </div>
            </div>
          ) : (
            <div key={o.id} className="fs-order-row">
              <span className="fs-order-num">#{o.num}</span>
              <div className="fs-order-who">
                <strong>{o.name}</strong>
                <small>Retiro · {o.time}</small>
              </div>
              <span className={pillClass(o.stage)}>{DEMO_STAGES[o.stage]}</span>
              <span className="fs-order-total">$ 8.500</span>
            </div>
          )
        )}
      </div>
      <button className="fs-panel-btn" onClick={simulate} disabled={stock <= 0}>
        {stock <= 0 ? 'Muzzarella agotada — así te avisa' : '▶ Simular un pedido entrante'}
      </button>
    </div>
  )
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

        /* ---- Panel en vivo ---- */
        .fs-admin-demo {
          background: #f7f3e8;
          padding: 0 24px 88px;
        }
        .fs-admin-demo-inner {
          max-width: 640px;
          margin: 0 auto;
          text-align: center;
        }
        .fs-admin-demo h2 {
          font-size: clamp(1.6rem, 3.5vw, 2.2rem);
          letter-spacing: -0.01em;
          margin: 0 0 8px;
          color: #23211b;
        }
        .fs-admin-sub {
          color: #8f8a7c;
          margin: 0 0 28px;
          line-height: 1.55;
        }
        .fs-panel {
          background: #fff;
          border: 1px solid #e8e2d2;
          border-radius: 18px;
          overflow: hidden;
          text-align: left;
          box-shadow: 0 12px 40px rgba(0,0,0,0.08);
        }
        .fs-panel-top {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-bottom: 1px solid #efe9da;
          font-size: 0.95rem;
          color: #23211b;
        }
        .fs-panel-badge {
          width: 22px;
          height: 22px;
          border-radius: 6px;
          background: #1f1d18;
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 800;
        }
        .fs-panel-live {
          margin-left: auto;
          font-size: 0.8rem;
          color: #1d9e75;
          font-weight: 700;
        }
        .fs-panel-kpis {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          padding: 14px 16px;
        }
        .fs-panel-kpis > div {
          background: #f7f3e8;
          border-radius: 10px;
          padding: 10px 12px;
        }
        .fs-panel-kpis small {
          display: block;
          color: #8f8a7c;
          font-size: 0.75rem;
          margin-bottom: 2px;
        }
        .fs-panel-kpis strong {
          font-size: 1.15rem;
          color: #23211b;
        }
        .fs-panel-kpis .kpi-low { color: #b8860b; }
        .fs-panel-kpis .kpi-out { color: #c0392b; }
        .fs-panel-kpis .kpi-coupon {
          font-size: 0.8rem;
          background: #e1f5ee;
          color: #0f6e56;
          padding: 3px 8px;
          border-radius: 99px;
          display: inline-block;
        }
        .fs-panel-nav {
          font-size: 0.75rem;
          color: #b5b0a4;
          display: none;
        }
        @media (min-width: 560px) {
          .fs-panel-nav { display: inline; }
        }
        .fs-panel-orders {
          padding: 0 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-height: 8px;
        }
        .fs-order-row, .fs-order-card {
          border: 1px solid #efe9da;
          border-radius: 12px;
          animation: fs-order-in 0.5s ease;
          background: #fff;
        }
        .fs-order-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          font-size: 0.9rem;
        }
        .fs-order-card {
          padding: 12px 14px;
          border-left: 4px solid #5a6b3a;
        }
        .fs-order-head {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }
        .fs-order-num {
          font-weight: 800;
          color: #23211b;
          font-size: 0.95rem;
        }
        .fs-order-who {
          display: flex;
          flex-direction: column;
          line-height: 1.2;
        }
        .fs-order-who strong { color: #23211b; font-size: 0.92rem; }
        .fs-order-who small { color: #b5b0a4; font-size: 0.75rem; }
        .fs-order-total {
          margin-left: auto;
          font-weight: 800;
          color: #23211b;
          font-size: 0.95rem;
        }
        .fs-order-row .pill { margin-left: auto; }
        .fs-order-row .fs-order-total { margin-left: 10px; }
        .pill {
          font-size: 0.75rem;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 99px;
          background: #f1ede0;
          color: #6b6555;
          white-space: nowrap;
        }
        .pill.new { background: #4a5232; color: #f5efdf; }
        .pill.done { background: #e1f5ee; color: #0f6e56; }
        .fs-order-detail {
          display: flex;
          justify-content: space-between;
          font-size: 0.9rem;
          color: #555043;
          padding: 6px 0;
          border-top: 1px dashed #efe9da;
        }
        .fs-order-meta {
          display: block;
          color: #8f8a7c;
          font-size: 0.78rem;
          margin-bottom: 10px;
        }
        .fs-order-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .fs-demo-confirm {
          border: none;
          border-radius: 99px;
          background: #4a5232;
          color: #f5efdf;
          font-weight: 700;
          font-size: 0.9rem;
          padding: 9px 22px;
          cursor: pointer;
          transition: transform 0.12s;
        }
        .fs-demo-confirm:hover { transform: translateY(-1px); }
        .fs-demo-wa {
          border-radius: 99px;
          background: #25d366;
          color: #0b2b16;
          font-weight: 700;
          font-size: 0.9rem;
          padding: 9px 18px;
        }
        @keyframes fs-order-in {
          from { background: #e7f6e2; transform: translateY(-6px); opacity: 0; }
          to { background: #fff; transform: none; opacity: 1; }
        }
        .fs-panel-btn {
          display: block;
          width: calc(100% - 32px);
          margin: 14px 16px 16px;
          padding: 13px;
          border: none;
          border-radius: 12px;
          background: #1f1d18;
          color: #f5efdf;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.12s;
        }
        .fs-panel-btn:hover:not(:disabled) { transform: translateY(-1px); }
        .fs-panel-btn:disabled {
          background: #f3d9d3;
          color: #a32d2d;
          cursor: default;
        }
        @media (max-width: 520px) {
          .fs-panel-kpis { grid-template-columns: 1fr 1fr; }
        }

        /* ---- Precios ---- */
        .fs-pricing {
          background: #f7f3e8;
          padding: 0 24px 88px;
        }
        .fs-pricing-inner {
          max-width: 880px;
          margin: 0 auto;
          text-align: center;
        }
        .fs-pricing h2 {
          font-size: clamp(1.6rem, 3.5vw, 2.2rem);
          letter-spacing: -0.01em;
          margin: 0 0 32px;
          color: #23211b;
        }
        .fs-plans {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 22px;
          text-align: left;
        }
        .fs-plan {
          background: #fff;
          border: 1px solid #e8e2d2;
          border-radius: 18px;
          padding: 28px 26px;
          display: flex;
          flex-direction: column;
        }
        .fs-plan.featured {
          border: 2px solid #1f1d18;
          box-shadow: 0 16px 44px rgba(0,0,0,0.10);
          position: relative;
        }
        .fs-plan-tag {
          position: absolute;
          top: -12px;
          left: 24px;
          background: #1f1d18;
          color: #f5efdf;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          padding: 4px 12px;
          border-radius: 99px;
        }
        .fs-plan h3 {
          margin: 0 0 10px;
          font-size: 1.15rem;
          color: #23211b;
        }
        .fs-plan-price strong {
          font-size: 2.1rem;
          color: #23211b;
          letter-spacing: -0.02em;
        }
        .fs-plan-price span { color: #8f8a7c; }
        .fs-plan-setup {
          margin: 4px 0 0;
          font-size: 0.88rem;
          font-weight: 700;
          color: #8f8a7c;
        }
        .fs-plan ul {
          list-style: none;
          padding: 0;
          margin: 18px 0 22px;
          display: flex;
          flex-direction: column;
          gap: 9px;
          flex: 1;
        }
        .fs-plan li {
          font-size: 0.93rem;
          color: #555043;
          padding-left: 22px;
          position: relative;
        }
        .fs-plan li::before {
          content: '✓';
          position: absolute;
          left: 0;
          color: #1d9e75;
          font-weight: 800;
        }
        .fs-plan-cta {
          display: block;
          text-align: center;
          padding: 13px;
          border-radius: 99px;
          background: #1f1d18;
          color: #f5efdf;
          font-weight: 700;
          text-decoration: none;
          transition: transform 0.12s;
        }
        .fs-plan-cta:hover { transform: translateY(-1px); }
        .fs-plan-cta.outline {
          background: transparent;
          border: 2px solid #1f1d18;
          color: #1f1d18;
        }
        .fs-pricing-fine {
          margin-top: 22px;
          font-size: 0.8rem;
          color: #b5b0a4;
        }
        @media (max-width: 700px) {
          .fs-plans { grid-template-columns: 1fr; }
        }

        /* ---- CTA final ---- */
        .fs-final {
          background: #14120e;
          color: #f5efdf;
          text-align: center;
          padding: 88px 24px 48px;
        }
        .fs-badge.big {
          width: 52px;
          height: 52px;
          border-radius: 13px;
          font-size: 28px;
          margin-bottom: 20px;
        }
        .fs-final h2 {
          font-size: clamp(1.7rem, 4vw, 2.5rem);
          letter-spacing: -0.02em;
          margin: 0 0 10px;
        }
        .fs-final > p {
          color: #b8b2a2;
          margin: 0 0 30px;
        }
        .fs-final-foot {
          margin-top: 52px !important;
          font-size: 0.8rem;
          color: #6b665a !important;
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

      {/* ---------- TU PANEL EN VIVO ---------- */}
      <section className="fs-admin-demo">
        <div className="fs-admin-demo-inner">
          <span className="fs-kicker">Del otro lado del mostrador</span>
          <h2>Vos manejás todo desde acá</h2>
          <p className="fs-admin-sub">
            Pedidos que entran solos, stock que se descuenta con cada venta y estados en
            un click. Simulá un pedido y confirmalo vos, como si fueras el dueño:
          </p>
          <PanelDemo />
        </div>
      </section>

      {/* ---------- PRECIOS ---------- */}
      <section className="fs-pricing">
        <div className="fs-pricing-inner">
          <span className="fs-kicker">Simple y sin sorpresas</span>
          <h2>Un precio que se paga solo</h2>
          <div className="fs-plans">
            <div className="fs-plan">
              <h3>Tienda Online</h3>
              <div className="fs-plan-price">
                <strong>$35.000</strong>
                <span>/mes</span>
              </div>
              <ul>
                <li>Catálogo con fotos y categorías</li>
                <li>Pedidos en tiempo real + WhatsApp</li>
                <li>Cobros con Mercado Pago</li>
                <li>Control de stock automático</li>
                <li>Cupones de descuento</li>
                <li>Panel de gestión completo</li>
                <li>Tu subdominio: tunegocio.fornistore.com</li>
              </ul>
              <a
                className="fs-plan-cta outline"
                href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Hola! Quiero mi Tienda Online de Fornistore 🚀')}`}
                target="_blank"
                rel="noreferrer"
              >
                Quiero mi tienda
              </a>
            </div>
            <div className="fs-plan featured">
              <span className="fs-plan-tag">Para marcas que quieren impactar</span>
              <h3>Tienda + Landing Premium</h3>
              <div className="fs-plan-price">
                <strong>$35.000</strong>
                <span>/mes</span>
              </div>
              <p className="fs-plan-setup">+ $90.000 por única vez</p>
              <ul>
                <li>Todo lo del plan Tienda Online</li>
                <li>Landing de marca diseñada a medida</li>
                <li>Animaciones y fotografía optimizada</li>
                <li>Tu historia, tu colección, tus sets</li>
                <li>Ideal para regalos empresariales</li>
              </ul>
              <a
                className="fs-plan-cta"
                href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Hola! Me interesa la Tienda + Landing Premium de Fornistore ✨')}`}
                target="_blank"
                rel="noreferrer"
              >
                Quiero el combo
              </a>
            </div>
          </div>
          <p className="fs-pricing-fine">
            Precios en pesos argentinos, con actualización trimestral. Sin permanencia:
            te vas cuando quieras.
          </p>
        </div>
      </section>

      {/* ---------- CTA FINAL ---------- */}
      <section className="fs-final">
        <span className="fs-badge big">F</span>
        <h2>Tu tienda puede estar vendiendo esta semana.</h2>
        <p>Escribinos y en 48 horas está en línea, con tu marca y tus productos.</p>
        <a
          className="fs-cta"
          href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Hola! Quiero arrancar con Fornistore 🚀')}`}
          target="_blank"
          rel="noreferrer"
        >
          Hablemos por WhatsApp →
        </a>
        <p className="fs-final-foot">
          Fornistore · Tiendas online para emprendedores · Santa Fe, Argentina
        </p>
      </section>
    </div>
  )
}
