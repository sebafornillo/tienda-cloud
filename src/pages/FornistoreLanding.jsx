import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

// ⚠️ COMPLETAR: tu número de WhatsApp con código de país, sin + ni espacios
// Ejemplo Argentina: 5493425551234
const WHATSAPP = '5493425255392'

const TYPE_LABEL = {
  gastronomy: 'Gastronomía',
  ecommerce: 'E-commerce',
}

const DEMO_NAMES = ['sofi', 'marcos', 'caro', 'leo', 'vale', 'nico']
const DEMO_STAGES = ['Nuevo', 'Confirmado', 'En preparación', 'Listo', 'Entregado']

// ---------- Scroll reveal: los elementos aparecen al entrar en pantalla ----------
function useReveal(deps = []) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.querySelectorAll('.fs-reveal').forEach((n) => n.classList.add('visible'))
      return
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('visible')
            obs.unobserve(e.target)
          }
        }
      },
      { threshold: 0.18 }
    )
    el.querySelectorAll('.fs-reveal:not(.visible)').forEach((n) => obs.observe(n))
    return () => obs.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return ref
}

// ---------- Intro: editor que "programa" tu tienda ----------
// ---------- Logo F3: los módulos caen y arman la F, el cursor rebota último ----------
function LogoF({ size = 34 }) {
  // misma grilla que el SVG del monograma (celda 74, gap 14)
  const c = 74
  const g = 14
  const o = { x: 138, y: 108 }
  const B = (cx, cy, green, i) => (
    <rect
      key={`${cx}-${cy}`}
      className={green ? 'lb lb-cursor' : 'lb'}
      style={{ animationDelay: `${0.08 * i}s` }}
      x={o.x + cx * (c + g)}
      y={o.y + cy * (c + g)}
      width={c}
      height={c}
      rx="16"
      fill={green ? '#1d9e75' : '#f5efdf'}
    />
  )
  return (
    <svg
      className="fs-logo"
      width={size}
      height={size}
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Fornistore"
    >
      <rect width="512" height="512" rx="112" fill="#1f1d18" />
      {B(0, 0, false, 0)}
      {B(1, 0, false, 1)}
      {B(2, 0, false, 2)}
      {B(0, 1, false, 3)}
      {B(0, 2, false, 4)}
      {B(1, 2, false, 5)}
      {B(0, 3, false, 6)}
      {B(2, 3, true, 8)}
    </svg>
  )
}

const BOOT_LINES = [
  'crear_tienda({',
  '  negocio: "el tuyo",',
  '  color: "tu marca",',
  '  pagos: "Mercado Pago",',
  '  online_en: "48 horas"',
  '})',
]

function IntroBoot({ onDone }) {
  const [text, setText] = useState('')
  const [stage, setStage] = useState('typing') // typing | deploy | ready | out

  useEffect(() => {
    const full = BOOT_LINES.join('\n')
    let i = 0
    const iv = setInterval(() => {
      i += 2
      setText(full.slice(0, i))
      if (i >= full.length) {
        clearInterval(iv)
        setStage('deploy')
      }
    }, 16)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    if (stage === 'deploy') {
      const t = setTimeout(() => setStage('ready'), 850)
      return () => clearTimeout(t)
    }
    if (stage === 'ready') {
      const t = setTimeout(() => setStage('out'), 650)
      return () => clearTimeout(t)
    }
    if (stage === 'out') {
      const t = setTimeout(onDone, 600)
      return () => clearTimeout(t)
    }
  }, [stage, onDone])

  return (
    <div className={stage === 'out' ? 'fs-boot fs-boot-out' : 'fs-boot'}>
      <div className="fs-boot-editor">
        <div className="fs-boot-bar">
          <span /><span /><span />
          <em>fornistore.dev</em>
        </div>
        <pre>
          {text}
          <span className="fs-caret" />
        </pre>
        <p className="fs-boot-status">
          {stage === 'deploy' && '▶ Deployando tu tienda…'}
          {(stage === 'ready' || stage === 'out') && '✓ Tienda lista'}
        </p>
      </div>
      <button className="fs-boot-skip" onClick={onDone}>
        Saltar →
      </button>
    </div>
  )
}

const DEMO_MODES = {
  food: {
    label: '🍔 Gastronomía',
    store: 'Pizzería Don Beto',
    product: 'Pizza muzzarella',
    price: '$ 8.500',
    stockName: 'muzzarella',
    outMsg: 'Muzzarella agotada — así te avisa',
    stages: ['Nuevo', 'Confirmado', 'En preparación 👨\u200d🍳', 'En camino 🛵', 'Entregado ✅'],
    thanks: '¡Muchas gracias por tu compra, ',
  },
  shop: {
    label: '🧉 E-commerce',
    store: 'Rincón del Mate',
    product: 'Mate imperial + bombilla',
    price: '$ 35.000',
    stockName: 'mate imperial',
    outMsg: 'Mate imperial agotado — así te avisa',
    stages: ['Nuevo', 'Confirmado', 'Armando tu paquete 📦', 'Despachado 🚚', 'Entregado ✅'],
    thanks: '¡Muchas gracias por tu compra, ',
  },
}

function PanelDemo() {
  const [mode, setMode] = useState('food')
  const [orders, setOrders] = useState([])
  const [stock, setStock] = useState(4)
  const [count, setCount] = useState(7)
  const timers = useRef([])
  const M = DEMO_MODES[mode]

  useEffect(() => {
    return () => timers.current.forEach(clearTimeout)
  }, [])

  function switchMode(m) {
    if (m === mode) return
    timers.current.forEach(clearTimeout)
    timers.current = []
    setMode(m)
    setOrders([])
    setStock(4)
    setCount(7)
  }

  function now() {
    return new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  }

  function simulate() {
    if (stock <= 0) return
    const id = Date.now()
    setOrders((o) =>
      [{ id, name: DEMO_NAMES[count % DEMO_NAMES.length], num: 47 + count, time: now(), stage: 0 }, ...o].slice(0, 3)
    )
    setStock((s) => s - 1)
    setCount((c) => c + 1)
  }

  function confirmOrder(id) {
    setOrders((o) => o.map((x) => (x.id === id ? { ...x, stage: 1 } : x)))
    for (let s = 2; s < M.stages.length; s++) {
      timers.current.push(
        setTimeout(() => {
          setOrders((o) => o.map((x) => (x.id === id ? { ...x, stage: s } : x)))
        }, (s - 1) * 1500)
      )
    }
  }

  const pillClass = (stage) =>
    stage === 0 ? 'pill new' : stage === M.stages.length - 1 ? 'pill done' : 'pill'

  return (
    <div className="fs-panel">
      <div className="fs-panel-modes">
        {Object.entries(DEMO_MODES).map(([key, m]) => (
          <button
            key={key}
            className={mode === key ? 'on' : ''}
            onClick={() => switchMode(key)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="fs-panel-top">
        <span className="fs-panel-badge">F</span>
        <strong>{M.store}</strong>
        <span className="fs-panel-nav">Pedidos · Productos · Stock · Cupones</span>
        <span className="fs-panel-live">● en vivo</span>
      </div>
      <div className="fs-panel-kpis">
        <div>
          <small>Pedidos hoy</small>
          <strong>{count}</strong>
        </div>
        <div>
          <small>Stock {M.stockName}</small>
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
                  <small>{mode === 'food' ? 'Delivery' : 'Envío'} · {o.time}</small>
                </div>
                <span className="pill new">Nuevo</span>
                <span className="fs-order-total">{M.price}</span>
              </div>
              <div className="fs-order-detail">
                <span>1× {M.product}</span>
                <span>{M.price}</span>
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
            <div key={o.id} className="fs-order-block">
              <div className="fs-order-row">
                <span className="fs-order-num">#{o.num}</span>
                <div className="fs-order-who">
                  <strong>{o.name}</strong>
                  <small>{mode === 'food' ? 'Delivery' : 'Envío'} · {o.time}</small>
                </div>
                <span className={pillClass(o.stage)}>{M.stages[o.stage]}</span>
                <span className="fs-order-total">{M.price}</span>
              </div>
              {o.stage === M.stages.length - 1 && (
                <div className="fs-thanks-bubble">
                  <span className="fs-thanks-tail" aria-hidden="true" />
                  {M.thanks}
                  {o.name}! 🧡 Cualquier duda escribinos por acá.
                  <em>enviado por WhatsApp ✓✓</em>
                </div>
              )}
            </div>
          )
        )}
      </div>
      <button className="fs-panel-btn" onClick={simulate} disabled={stock <= 0}>
        {stock <= 0 ? M.outMsg : '▶ Simular un pedido entrante'}
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

// ---------- Tilt 3D de tarjetas (herencia del "3d card" 2023 de Sebastián) ----------
// La idea original: remap(posición del mouse → ángulo). Acá el suavizado
// lo hace la transición CSS en vez de un lerp a 60fps: mismo efecto, menos CPU.
const TILT_MAX = 7 // grados
function tiltMove(e) {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  const x = ((e.clientX - r.left) / r.width - 0.5) * 2 // -1 … 1
  const y = ((e.clientY - r.top) / r.height - 0.5) * 2
  el.style.setProperty('--tx', `${(x * TILT_MAX).toFixed(2)}deg`)
  el.style.setProperty('--ty', `${(-y * TILT_MAX).toFixed(2)}deg`)
}
function tiltLeave(e) {
  const el = e.currentTarget
  el.style.setProperty('--tx', '0deg')
  el.style.setProperty('--ty', '0deg')
}

export default function FornistoreLanding() {
  const [bizName, setBizName] = useState('')
  const [color, setColor] = useState(COLORS[1])
  const [autoColor, setAutoColor] = useState(true)
  const [stores, setStores] = useState([])
  const [intro, setIntro] = useState(() => {
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
      return !sessionStorage.getItem('fs_intro_seen')
    } catch {
      return false
    }
  })

  // El celular va rotando colores solo, hasta que el visitante toma el control
  useEffect(() => {
    if (!autoColor || intro) return
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    } catch {}
    const iv = setInterval(() => {
      setColor((c) => {
        const i = COLORS.findIndex((x) => x.hex === c.hex)
        return COLORS[(i + 1) % COLORS.length]
      })
    }, 1600)
    return () => clearInterval(iv)
  }, [autoColor, intro])

  function finishIntro() {
    try {
      sessionStorage.setItem('fs_intro_seen', '1')
    } catch {}
    setIntro(false)
  }

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

  const rootRef = useReveal([stores, intro])

  return (
    <div className={intro ? 'fs-landing' : 'fs-landing fs-ready'} ref={rootRef}>
      {intro && <IntroBoot onDone={finishIntro} />}
      <style>{`
        .fs-landing {
          min-height: 100vh;
          background: #14120e;
          color: #f5efdf;
          font-family: inherit;
          overflow-x: clip;
        }

        /* ---- Intro: editor de código ---- */
        .fs-boot {
          position: fixed;
          inset: 0;
          background: #14120e;
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.55s ease, transform 0.55s ease;
        }
        .fs-boot-out {
          opacity: 0;
          transform: scale(1.04);
          pointer-events: none;
        }
        .fs-boot-editor {
          width: min(440px, 88vw);
          background: #1e1b15;
          border: 1px solid #3a362c;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
        }
        .fs-boot-bar {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 11px 14px;
          border-bottom: 1px solid #3a362c;
        }
        .fs-boot-bar span {
          width: 11px;
          height: 11px;
          border-radius: 50%;
          background: #3a362c;
        }
        .fs-boot-bar span:nth-child(1) { background: #e05a33; }
        .fs-boot-bar span:nth-child(2) { background: #e6a817; }
        .fs-boot-bar span:nth-child(3) { background: #1d9e75; }
        .fs-boot-bar em {
          margin-left: auto;
          font-style: normal;
          font-size: 0.75rem;
          color: #6b665a;
        }
        .fs-boot-editor pre {
          margin: 0;
          padding: 18px 18px 6px;
          font-family: ui-monospace, 'Cascadia Code', Menlo, Consolas, monospace;
          font-size: 0.92rem;
          line-height: 1.65;
          color: #1d9e75;
          min-height: 176px;
          white-space: pre-wrap;
        }
        .fs-caret {
          display: inline-block;
          width: 8px;
          height: 1.05em;
          background: #f5efdf;
          vertical-align: text-bottom;
          margin-left: 2px;
          animation: fs-blink 0.85s steps(1) infinite;
        }
        @keyframes fs-blink { 50% { opacity: 0; } }
        .fs-boot-status {
          margin: 0;
          padding: 0 18px 18px;
          font-family: ui-monospace, 'Cascadia Code', Menlo, Consolas, monospace;
          font-size: 0.88rem;
          color: #e6a817;
          min-height: 1.4em;
        }
        .fs-boot-skip {
          position: absolute;
          bottom: 26px;
          right: 28px;
          border: none;
          background: none;
          color: #6b665a;
          font-size: 0.85rem;
          cursor: pointer;
        }
        .fs-boot-skip:hover { color: #f5efdf; }

        /* ---- Entrada escalonada del hero tras la intro ---- */
        .fs-hero-grid > div {
          opacity: 0;
        }
        .fs-ready .fs-hero-grid > div {
          animation: fs-rise 0.7s cubic-bezier(0.2, 0.7, 0.3, 1) both;
        }
        .fs-ready .fs-hero-grid > div:nth-child(2) {
          animation-delay: 0.25s;
        }
        .fs-ready .fs-nav {
          animation: fs-rise 0.6s ease both;
        }
        @keyframes fs-rise {
          from { opacity: 0; transform: translateY(22px); }
          to { opacity: 1; transform: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .fs-hero-grid > div { opacity: 1; }
          .fs-ready .fs-hero-grid > div,
          .fs-ready .fs-nav { animation: none; }
        }

        /* ---- Scroll reveal: la historia se cuenta al scrollear ---- */
        .fs-reveal {
          opacity: 0;
          transform: translateY(22px);
          transition: opacity 0.6s ease, transform 0.6s cubic-bezier(0.2, 0.7, 0.3, 1);
        }
        .fs-reveal.from-left { transform: translateX(-44px); }
        .fs-reveal.from-right { transform: translateX(44px); }
        .fs-reveal.visible {
          opacity: 1;
          transform: none;
        }
        .fs-chat.fs-reveal { transform: translateY(14px) scale(0.96); }
        .fs-chat.fs-reveal.visible { transform: none; }

        /* ---- El celular cae y se arma por partes ---- */
        .fs-phone-wrap.fs-reveal {
          transform: none;
          transition: opacity 0.3s ease;
        }
        .fs-phone-wrap.fs-reveal .fs-phone {
          opacity: 0;
        }
        .fs-phone-wrap.fs-reveal.visible .fs-phone {
          animation: fs-phone-drop 0.75s cubic-bezier(0.2, 0.85, 0.3, 1.15) both;
        }
        @keyframes fs-phone-drop {
          from { opacity: 0; transform: translateY(-56px) rotateY(-6deg) rotateX(2deg); }
          to { opacity: 1; transform: rotateY(-6deg) rotateX(2deg); }
        }
        .fs-phone-wrap.fs-reveal .fs-phone-topbar,
        .fs-phone-wrap.fs-reveal .fs-phone-logo,
        .fs-phone-wrap.fs-reveal .fs-phone-name,
        .fs-phone-wrap.fs-reveal .fs-phone-tag,
        .fs-phone-wrap.fs-reveal .fs-phone-products,
        .fs-phone-wrap.fs-reveal .fs-phone-btn {
          opacity: 0;
        }
        .fs-phone-wrap.fs-reveal.visible .fs-phone-topbar { animation: fs-build 0.45s 0.35s ease both; }
        .fs-phone-wrap.fs-reveal.visible .fs-phone-logo { animation: fs-build 0.45s 0.5s ease both; }
        .fs-phone-wrap.fs-reveal.visible .fs-phone-name { animation: fs-build 0.45s 0.62s ease both; }
        .fs-phone-wrap.fs-reveal.visible .fs-phone-tag { animation: fs-build 0.45s 0.72s ease both; }
        .fs-phone-wrap.fs-reveal.visible .fs-phone-products { animation: fs-build 0.45s 0.84s ease both; }
        .fs-phone-wrap.fs-reveal.visible .fs-phone-btn { animation: fs-build 0.45s 0.98s ease both; }
        @keyframes fs-build {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: none; }
        }
        @media (max-width: 800px) {
          .fs-phone-wrap.fs-reveal.visible .fs-phone {
            animation-name: fs-phone-drop-flat;
          }
          @keyframes fs-phone-drop-flat {
            from { opacity: 0; transform: translateY(-56px); }
            to { opacity: 1; transform: none; }
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .fs-reveal,
          .fs-phone-wrap.fs-reveal .fs-phone,
          .fs-phone-wrap.fs-reveal .fs-phone-topbar,
          .fs-phone-wrap.fs-reveal .fs-phone-logo,
          .fs-phone-wrap.fs-reveal .fs-phone-name,
          .fs-phone-wrap.fs-reveal .fs-phone-tag,
          .fs-phone-wrap.fs-reveal .fs-phone-products,
          .fs-phone-wrap.fs-reveal .fs-phone-btn {
            opacity: 1;
            transform: none;
            transition: none;
            animation: none;
          }
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
          position: relative;
          display: flex;
          gap: 10px;
          flex-wrap: nowrap;
        }
        .fs-swatch-ring {
          position: absolute;
          top: -3px;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 3px solid #f5efdf;
          pointer-events: none;
          transition: left 0.45s cubic-bezier(0.3, 1.35, 0.4, 1);
        }
        .fs-swatch {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 3px solid transparent;
          cursor: pointer;
          padding: 0;
          transition: transform 0.12s;
        }
        .fs-swatch:hover { transform: scale(1.1); }
        .fs-swatch.on {
          transform: scale(1.08);
        }

        /* ---- Logo F3: caída y rebote de módulos ---- */
        .fs-logo .lb {
          opacity: 0;
          transform: translateY(-140px);
        }
        .fs-ready .fs-logo .lb {
          animation: lb-fall 0.7s cubic-bezier(0.25, 0.9, 0.3, 1.3) both;
        }
        .fs-ready .fs-logo .lb-cursor {
          animation: lb-fall-cursor 0.85s cubic-bezier(0.25, 0.9, 0.25, 1.45) both;
        }
        @keyframes lb-fall {
          from { opacity: 0; transform: translateY(-140px); }
          65% { opacity: 1; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lb-fall-cursor {
          from { opacity: 0; transform: translateY(-180px); }
          55% { opacity: 1; transform: translateY(16px); }
          78% { transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .fs-logo .lb { opacity: 1; transform: none; }
          .fs-ready .fs-logo .lb,
          .fs-ready .fs-logo .lb-cursor { animation: none; }
          .fs-swatch-ring { transition: none; }
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
        /* Tilt 3D: se activa recién cuando la tarjeta ya se reveló */
        .fs-store-card.visible {
          transform: perspective(900px) rotateY(var(--tx, 0deg)) rotateX(var(--ty, 0deg));
          transition: transform 0.18s ease-out, box-shadow 0.25s ease;
          will-change: transform;
        }
        .fs-store-card.visible:hover {
          transform: perspective(900px) rotateY(var(--tx, 0deg)) rotateX(var(--ty, 0deg))
            translateY(-4px);
          box-shadow: 0 18px 44px rgba(0, 0, 0, 0.13);
        }
        @media (prefers-reduced-motion: reduce) {
          .fs-store-card.visible,
          .fs-store-card.visible:hover {
            transform: none;
          }
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
        .fs-panel-modes {
          display: flex;
          justify-content: center;
          gap: 8px;
          padding: 14px 16px 0;
        }
        .fs-panel-modes button {
          border: 1.5px solid #e8e2d2;
          background: #fff;
          border-radius: 99px;
          padding: 8px 18px;
          font-size: 0.9rem;
          font-weight: 700;
          color: #8f8a7c;
          cursor: pointer;
          transition: all 0.15s;
        }
        .fs-panel-modes button.on {
          background: #1f1d18;
          border-color: #1f1d18;
          color: #f5efdf;
        }
        .fs-order-block {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .fs-thanks-bubble {
          position: relative;
          align-self: flex-start;
          margin-left: 26px;
          background: #e7f6e2;
          border: 1px solid #cfe8c6;
          border-radius: 4px 14px 14px 14px;
          padding: 9px 12px;
          font-size: 0.85rem;
          color: #2c4a24;
          max-width: 88%;
          animation: fs-order-in 0.5s ease;
        }
        .fs-thanks-bubble em {
          display: block;
          margin-top: 4px;
          font-style: normal;
          font-size: 0.7rem;
          color: #7ba36f;
        }
        .fs-thanks-tail {
          position: absolute;
          left: -7px;
          top: 0;
          width: 0;
          height: 0;
          border-top: 8px solid #cfe8c6;
          border-left: 8px solid transparent;
        }
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
        .fs-plan-proof {
          color: #23211b;
          font-weight: 700;
          text-decoration: underline;
          text-underline-offset: 3px;
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
          <LogoF size={36} />
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
                onChange={(e) => {
                  setBizName(e.target.value)
                  setAutoColor(false)
                }}
              />
            </div>

            <div className="fs-field">
              <label>Tu color</label>
              <div className="fs-swatches">
                <span
                  className="fs-swatch-ring"
                  style={{ left: `${COLORS.findIndex((x) => x.hex === color.hex) * 48 - 3}px` }}
                  aria-hidden="true"
                />
                {COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    aria-label={c.name}
                    className={`fs-swatch ${c.hex === color.hex ? 'on' : ''}`}
                    style={{ background: c.hex }}
                    onClick={() => {
                      setAutoColor(false)
                      setColor(c)
                    }}
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

          <div className="fs-phone-wrap fs-reveal">
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
          <span className="fs-kicker fs-reveal">¿Te suena?</span>
          <h2 className="fs-reveal">Vender por WhatsApp era gratis.<br />Hasta que empezaste a vender.</h2>
          <div className="fs-pain-chats" aria-hidden="true">
            <div className="fs-chat fs-reveal">Hola! ¿Tenés stock del grande?</div>
            <div className="fs-chat fs-reveal" style={{ transitionDelay: '0.15s' }}>¿Me pasás el CBU de nuevo?</div>
            <div className="fs-chat fs-reveal" style={{ transitionDelay: '0.3s' }}>¿Viste mi pedido de ayer? Nadie me contestó 😕</div>
            <div className="fs-chat right fs-reveal" style={{ transitionDelay: '0.5s' }}>Perdón!! Se me traspapeló 🙏</div>
          </div>
          <p className="fs-pain-punch fs-reveal">
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
          <span className="fs-kicker fs-reveal">Sin humo</span>
          <h2 className="fs-reveal">Tiendas reales, vendiendo ahora</h2>
          <p className="fs-reveal">No te mostramos plantillas: tocá y recorré tiendas de clientes reales.</p>
          <div className="fs-stores-grid">
            {stores.map((t, i) => (
              <a
                key={t.subdomain}
                className={`fs-store-card fs-reveal ${i % 2 === 0 ? 'from-left' : 'from-right'}`}
                onMouseMove={tiltMove}
                onMouseLeave={tiltLeave}
                style={{ '--card-accent': t.settings?.primary_color || '#5a6b3a', transitionDelay: `${i * 0.12}s` }}
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
          <span className="fs-kicker fs-reveal">Del otro lado del mostrador</span>
          <h2 className="fs-reveal">Vos manejás todo desde acá</h2>
          <p className="fs-admin-sub fs-reveal">
            Pedidos que entran solos, stock que se descuenta con cada venta y estados en
            un click. Simulá un pedido y confirmalo vos, como si fueras el dueño:
          </p>
          <div className="fs-reveal from-right" style={{ transitionDelay: '0.15s' }}>
            <PanelDemo />
          </div>
        </div>
      </section>

      {/* ---------- PRECIOS ---------- */}
      <section className="fs-pricing">
        <div className="fs-pricing-inner">
          <span className="fs-kicker fs-reveal">Simple y sin sorpresas</span>
          <h2 className="fs-reveal">Un precio que se paga solo</h2>
          <div className="fs-plans">
            <div className="fs-plan fs-reveal from-left">
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
            <div className="fs-plan featured fs-reveal from-right" style={{ transitionDelay: '0.12s' }}>
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
                <li>Tu historia, tu colección, tus productos</li>
                <li>
                  Mirá{' '}
                  <a
                    href="https://rinconmatero.fornistore.com"
                    target="_blank"
                    rel="noreferrer"
                    className="fs-plan-proof"
                  >
                    la página web y la tienda de Rincón Matero →
                  </a>
                </li>
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
        <span className="fs-reveal" style={{ display: 'inline-block' }}>
          <LogoF size={54} />
        </span>
        <h2 className="fs-reveal">Tu tienda puede estar vendiendo esta semana.</h2>
        <p className="fs-reveal">Escribinos y en 48 horas está en línea, con tu marca y tus productos.</p>
        <a
          className="fs-cta fs-reveal"
          style={{ transitionDelay: '0.15s' }}
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
