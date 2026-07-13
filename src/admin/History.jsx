import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useTenant } from '../lib/TenantContext'
import { money } from '../lib/CartContext'

const LABELS = {
  pending: 'Nuevo',
  confirmed: 'Confirmado',
  preparing: 'En preparación',
  ready: 'Listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

const RANGES = [
  { key: 'today', label: 'Hoy', days: 1 },
  { key: '7d', label: '7 días', days: 7 },
  { key: '30d', label: '30 días', days: 30 },
]

function startOf(key) {
  const d = new Date()
  if (key === 'today') d.setHours(0, 0, 0, 0)
  if (key === '7d') d.setDate(d.getDate() - 7)
  if (key === '30d') d.setDate(d.getDate() - 30)
  return d
}

export default function History() {
  const { tenant } = useTenant()
  const [range, setRange] = useState('today')
  const [orders, setOrders] = useState([]) // período actual + anterior
  const [items, setItems] = useState({})
  const [open, setOpen] = useState(null)
  const [loading, setLoading] = useState(true)

  const rangeStart = useMemo(() => startOf(range), [range])
  const prevStart = useMemo(() => {
    const days = RANGES.find((r) => r.key === range).days
    const d = new Date(rangeStart)
    d.setDate(d.getDate() - days)
    return d
  }, [range, rangeStart])

  useEffect(() => {
    async function load() {
      setLoading(true)
      // Trae período actual + período anterior en una sola consulta
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('tenant_id', tenant.id)
        .gte('created_at', prevStart.toISOString())
        .order('created_at', { ascending: false })
        .limit(1000)
      setOrders(data || [])
      setLoading(false)
    }
    load()
  }, [tenant.id, prevStart])

  const current = useMemo(
    () => orders.filter((o) => new Date(o.created_at) >= rangeStart),
    [orders, rangeStart]
  )
  const previous = useMemo(
    () => orders.filter((o) => new Date(o.created_at) < rangeStart),
    [orders, rangeStart]
  )

  const kpis = useMemo(() => {
    const calc = (list) => {
      const delivered = list.filter((o) => o.status === 'delivered')
      const revenue = delivered.reduce((s, o) => s + Number(o.total), 0)
      return {
        delivered: delivered.length,
        cancelled: list.filter((o) => o.status === 'cancelled').length,
        revenue,
        avg: delivered.length ? revenue / delivered.length : 0,
      }
    }
    const now = calc(current)
    const prev = calc(previous)
    const delta = (a, b) => (b > 0 ? Math.round(((a - b) / b) * 100) : null)
    return {
      ...now,
      revenueDelta: delta(now.revenue, prev.revenue),
      deliveredDelta: delta(now.delivered, prev.delivered),
    }
  }, [current, previous])

  // ---------- Gráfico de ventas: por hora (Hoy) o por día (7/30 días) ----------
  const chart = useMemo(() => {
    const delivered = current.filter((o) => o.status === 'delivered')
    const buckets = new Map()
    if (range === 'today') {
      for (const o of delivered) {
        const h = new Date(o.created_at).getHours()
        const key = `${h}h`
        buckets.set(key, (buckets.get(key) || 0) + Number(o.total))
      }
      const hours = [...buckets.keys()].map((k) => parseInt(k))
      if (hours.length === 0) return []
      const min = Math.min(...hours)
      const max = Math.max(...hours)
      const out = []
      for (let h = min; h <= max; h++) out.push({ label: `${h}h`, value: buckets.get(`${h}h`) || 0 })
      return out
    }
    const days = RANGES.find((r) => r.key === range).days
    const out = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - i)
      const key = d.toDateString()
      out.push({
        label: d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }),
        key,
        value: 0,
      })
    }
    for (const o of delivered) {
      const key = new Date(o.created_at).toDateString()
      const bucket = out.find((b) => b.key === key)
      if (bucket) bucket.value += Number(o.total)
    }
    return out
  }, [current, range])

  const chartMax = Math.max(1, ...chart.map((b) => b.value))

  // ---------- Top productos (por items de pedidos entregados) ----------
  const [topProducts, setTopProducts] = useState([])
  useEffect(() => {
    async function loadTop() {
      const { data } = await supabase
        .from('order_items')
        .select('product_name, quantity, line_total, orders!inner(status, created_at)')
        .eq('tenant_id', tenant.id)
        .eq('orders.status', 'delivered')
        .gte('orders.created_at', rangeStart.toISOString())
        .limit(1000)
      const totals = new Map()
      for (const it of data || []) {
        const t = totals.get(it.product_name) || { qty: 0, revenue: 0 }
        t.qty += it.quantity
        t.revenue += Number(it.line_total)
        totals.set(it.product_name, t)
      }
      setTopProducts(
        [...totals.entries()]
          .map(([name, t]) => ({ name, ...t }))
          .sort((a, b) => b.qty - a.qty)
          .slice(0, 5)
      )
    }
    loadTop()
  }, [tenant.id, rangeStart])

  async function toggleDetail(order) {
    if (open === order.id) return setOpen(null)
    setOpen(order.id)
    if (!items[order.id]) {
      const { data } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id)
      setItems((prev) => ({ ...prev, [order.id]: data || [] }))
    }
  }

  const deltaBadge = (delta) =>
    delta === null ? null : (
      <span className={delta >= 0 ? 'delta-up' : 'delta-down'}>
        {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}% vs período anterior
      </span>
    )

  return (
    <div className="admin-page">
      <div className="page-title-row">
        <h1>Historial</h1>
        <div className="segmented range-picker">
          {RANGES.map((r) => (
            <button
              key={r.key}
              className={range === r.key ? 'active' : ''}
              onClick={() => setRange(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-value">{money(kpis.revenue)}</span>
          <span className="kpi-label">Facturado (entregados)</span>
          {deltaBadge(kpis.revenueDelta)}
        </div>
        <div className="kpi-card">
          <span className="kpi-value">{kpis.delivered}</span>
          <span className="kpi-label">Pedidos entregados</span>
          {deltaBadge(kpis.deliveredDelta)}
        </div>
        <div className="kpi-card">
          <span className="kpi-value">{money(kpis.avg)}</span>
          <span className="kpi-label">Ticket promedio</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">{kpis.cancelled}</span>
          <span className="kpi-label">Cancelados</span>
        </div>
      </div>

      {chart.length > 0 && (
        <div className="stats-block">
          <h2>Ventas {range === 'today' ? 'por hora' : 'por día'}</h2>
          <div className="bar-chart">
            {chart.map((b, i) => (
              <div key={i} className="bar-col" title={`${b.label}: ${money(b.value)}`}>
                <div
                  className="bar"
                  style={{ height: `${Math.max(3, (b.value / chartMax) * 100)}%` }}
                />
                <span className="bar-label">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {topProducts.length > 0 && (
        <div className="stats-block">
          <h2>Más vendidos</h2>
          <ol className="top-products">
            {topProducts.map((p, i) => (
              <li key={p.name}>
                <span className="top-rank">{i + 1}</span>
                <span className="top-name">{p.name}</span>
                <span className="top-qty">{p.qty} u.</span>
                <span className="top-revenue">{money(p.revenue)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <h2 className="section-title">Pedidos del período</h2>
      {loading && <p className="empty">Cargando…</p>}
      {!loading && current.length === 0 && (
        <p className="empty">No hay pedidos en este período.</p>
      )}

      <ul className="order-list">
        {current.map((o) => (
          <li key={o.id} className="order">
            <button className="order-summary" onClick={() => toggleDetail(o)}>
              <span className="order-number">#{o.order_number}</span>
              <span className="order-customer">
                {o.customer_name}
                <small>
                  {new Date(o.created_at).toLocaleDateString('es-AR', {
                    day: '2-digit',
                    month: '2-digit',
                  })}{' '}
                  {new Date(o.created_at).toLocaleTimeString('es-AR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {' · '}
                  {o.delivery_type === 'delivery' ? 'Delivery' : 'Retiro'}
                </small>
              </span>
              <span className={`badge b-${o.status}`}>{LABELS[o.status]}</span>
              <span className="order-total">{money(o.total)}</span>
            </button>

            {open === o.id && (
              <div className="order-detail">
                <ul>
                  {(items[o.id] || []).map((it) => (
                    <li key={it.id}>
                      {it.quantity}× {it.product_name}
                      {Array.isArray(it.modifiers) && it.modifiers.length > 0 && (
                        <small> ({it.modifiers.map((m) => m.name).join(', ')})</small>
                      )}
                      <span>{money(it.line_total)}</span>
                    </li>
                  ))}
                </ul>
                {o.notes && <p className="order-notes">Nota: {o.notes}</p>}
                <p className="order-notes">
                  Tel: {o.customer_phone} · Pago: {o.payment_method}
                  {o.payment_status === 'paid' ? ' ✓ PAGADO' : ''}
                </p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
