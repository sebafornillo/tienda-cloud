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
  { key: 'today', label: 'Hoy' },
  { key: '7d', label: '7 días' },
  { key: '30d', label: '30 días' },
]

function rangeStart(key) {
  const d = new Date()
  if (key === 'today') d.setHours(0, 0, 0, 0)
  if (key === '7d') d.setDate(d.getDate() - 7)
  if (key === '30d') d.setDate(d.getDate() - 30)
  return d.toISOString()
}

export default function History() {
  const { tenant } = useTenant()
  const [range, setRange] = useState('today')
  const [orders, setOrders] = useState([])
  const [items, setItems] = useState({})
  const [open, setOpen] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('tenant_id', tenant.id)
        .gte('created_at', rangeStart(range))
        .order('created_at', { ascending: false })
        .limit(200)
      setOrders(data || [])
      setLoading(false)
    }
    load()
  }, [tenant.id, range])

  const kpis = useMemo(() => {
    const delivered = orders.filter((o) => o.status === 'delivered')
    const cancelled = orders.filter((o) => o.status === 'cancelled')
    const revenue = delivered.reduce((s, o) => s + Number(o.total), 0)
    const avg = delivered.length ? revenue / delivered.length : 0
    return {
      total: orders.length,
      delivered: delivered.length,
      cancelled: cancelled.length,
      revenue,
      avg,
    }
  }, [orders])

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
        </div>
        <div className="kpi-card">
          <span className="kpi-value">{kpis.delivered}</span>
          <span className="kpi-label">Pedidos entregados</span>
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

      {loading && <p className="empty">Cargando…</p>}
      {!loading && orders.length === 0 && (
        <p className="empty">No hay pedidos en este período.</p>
      )}

      <ul className="order-list">
        {orders.map((o) => (
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
                </p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
