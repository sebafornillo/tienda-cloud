import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTenant } from '../lib/TenantContext'
import { money } from '../lib/CartContext'

// ============================================================
// Seguimiento de pedido en vivo (sin login, sin datos sensibles)
// Se actualiza solo cada 12 segundos.
// ============================================================
export default function OrderConfirmed() {
  const { orderNumber } = useParams()
  const { state } = useLocation()
  const { tenant } = useTenant()
  const [order, setOrder] = useState(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let alive = true
    async function fetchStatus() {
      const { data } = await supabase.rpc('get_order_status', {
        t_id: tenant.id,
        o_number: Number(orderNumber),
      })
      if (!alive) return
      if (data && data.length > 0) setOrder(data[0])
      else setNotFound(true)
    }
    fetchStatus()
    const interval = setInterval(fetchStatus, 12000)
    return () => {
      alive = false
      clearInterval(interval)
    }
  }, [tenant.id, orderNumber])

  const storeHome = tenant.settings?.landing_enabled ? '/tienda' : '/'
  const whatsapp = tenant.settings?.whatsapp

  const steps = useMemo(() => {
    if (!order) return []
    const isDelivery = order.delivery_type === 'delivery'
    return [
      { key: 'pending', label: 'Pedido recibido', icon: '📝' },
      { key: 'confirmed', label: 'Confirmado', icon: '👍' },
      { key: 'preparing', label: 'En preparación', icon: '👨‍🍳' },
      {
        key: 'ready',
        label: isDelivery ? 'En camino' : 'Listo para retirar',
        icon: isDelivery ? '🛵' : '🛍️',
      },
      { key: 'delivered', label: 'Entregado', icon: '✅' },
    ]
  }, [order])

  const currentIndex = order ? steps.findIndex((s) => s.key === order.status) : -1

  if (notFound)
    return (
      <div className="screen-msg">
        <h1>Pedido no encontrado</h1>
        <p>Revisá el link o consultá con la tienda.</p>
        <Link className="btn-primary" to={storeHome}>Ir a la tienda</Link>
      </div>
    )

  if (!order) return <div className="screen-msg">Buscando tu pedido…</div>

  if (order.status === 'cancelled')
    return (
      <div className="screen-msg">
        <h1>Pedido #{order.order_number} cancelado</h1>
        <p>Si tenés dudas, escribile a la tienda y lo resuelven.</p>
        {whatsapp && (
          <a className="btn-primary" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">
            Contactar a {tenant.name}
          </a>
        )}
        <Link to={storeHome} className="back">Volver a la tienda</Link>
      </div>
    )

  return (
    <div className="tracking">
      <header className="page-header">
        <Link to={storeHome} className="back">← {tenant.name}</Link>
        <h1>
          {state?.name ? `¡Gracias, ${state.name.split(' ')[0]}!` : 'Tu pedido'}
        </h1>
        <p className="desc">
          Pedido <strong>#{order.order_number}</strong> · {money(order.total)}
          {order.delivery_zone ? ` · ${order.delivery_zone}` : ''}
        </p>
        {order.payment_status === 'paid' ? (
          <span className="pay-chip paid">✓ Pago acreditado</span>
        ) : order.payment_method === 'mercadopago' ? (
          <span className="pay-chip">Esperando confirmación del pago…</span>
        ) : null}
      </header>

      <ol className="timeline">
        {steps.map((s, i) => {
          const done = i < currentIndex
          const current = i === currentIndex
          return (
            <li
              key={s.key}
              className={done ? 'done' : current ? 'current' : ''}
            >
              <span className="t-dot">{done ? '✓' : s.icon}</span>
              <span className="t-label">{s.label}</span>
              {current && <span className="t-now">ahora</span>}
            </li>
          )
        })}
      </ol>

      <p className="tracking-hint">
        Esta página se actualiza sola — dejala abierta y mirá tu pedido avanzar.
      </p>

      <div className="tracking-actions">
        {whatsapp && (
          <a
            className="btn-wa"
            href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(
              `Hola! Consulta por mi pedido #${order.order_number}`
            )}`}
            target="_blank"
            rel="noreferrer"
          >
            Consultar por WhatsApp
          </a>
        )}
        <Link to={storeHome} className="link">Volver a la tienda</Link>
      </div>
    </div>
  )
}
