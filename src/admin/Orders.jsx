import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useTenant } from '../lib/TenantContext'
import { money } from '../lib/CartContext'

const FLOW = ['pending', 'confirmed', 'preparing', 'ready', 'delivered']
const LABELS = {
  pending: 'Nuevo',
  confirmed: 'Confirmado',
  preparing: 'En preparación',
  ready: 'Listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}
const NEXT_LABEL = {
  pending: 'Confirmar',
  confirmed: 'A preparación',
  preparing: 'Marcar listo',
  ready: 'Entregado',
}

export default function Orders() {
  const { tenant } = useTenant()
  const [orders, setOrders] = useState([])
  const [items, setItems] = useState({}) // orderId -> items
  const [open, setOpen] = useState(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('tenant_id', tenant.id)
        .neq('status', 'delivered')
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false })
      setOrders(data || [])
    }
    load()

    const channel = supabase
      .channel('orders-live')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `tenant_id=eq.${tenant.id}`,
        },
        (payload) => {
          setOrders((prev) => [payload.new, ...prev])
          try {
            new Audio(
              'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU'
            ).play()
          } catch {}
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [tenant.id])

  async function toggleDetail(order) {
    if (open === order.id) {
      setOpen(null)
      return
    }
    setOpen(order.id)
    if (!items[order.id]) {
      const { data } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id)
      setItems((prev) => ({ ...prev, [order.id]: data || [] }))
    }
  }

  async function setStatus(order, status) {
    await supabase.from('orders').update({ status }).eq('id', order.id)
    setOrders((prev) =>
      status === 'delivered' || status === 'cancelled'
        ? prev.filter((o) => o.id !== order.id)
        : prev.map((o) => (o.id === order.id ? { ...o, status } : o))
    )
  }

  return (
    <div className="admin-page">
      <h1>Pedidos activos</h1>
      {orders.length === 0 && <p className="empty">Sin pedidos activos por ahora.</p>}
      <ul className="order-list">
        {orders.map((o) => {
          const nextStatus = FLOW[FLOW.indexOf(o.status) + 1]
          return (
            <li key={o.id} className={`order status-${o.status}`}>
              <button className="order-summary" onClick={() => toggleDetail(o)}>
                <span className="order-number">#{o.order_number}</span>
                <span className="order-customer">
                  {o.customer_name}
                  <small>
                    {o.delivery_type === 'delivery' ? `Delivery · ${o.address || ''}` : 'Retiro'}
                    {' · '}
                    {new Date(o.created_at).toLocaleTimeString('es-AR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
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
                  <div className="order-actions">
                    {nextStatus && (
                      <button
                        className="btn-primary"
                        onClick={() => setStatus(o, nextStatus)}
                      >
                        {NEXT_LABEL[o.status]}
                      </button>
                    )}
                    <button className="link danger" onClick={() => setStatus(o, 'cancelled')}>
                      Cancelar pedido
                    </button>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
