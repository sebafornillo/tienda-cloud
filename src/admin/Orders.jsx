import { useEffect, useRef, useState } from 'react'
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

// ---------- Sonido de pedido nuevo (sin archivos: sintetizado) ----------
let audioCtx = null
function ensureAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    if (audioCtx.state === 'suspended') audioCtx.resume()
  } catch {}
}
function playDing() {
  try {
    ensureAudio()
    if (!audioCtx) return
    const note = (freq, t0, dur) => {
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = audioCtx.currentTime + t0
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      osc.start(t)
      osc.stop(t + dur + 0.05)
    }
    note(880, 0, 0.4) // La5
    note(1174.66, 0.18, 0.55) // Re6 — "ding-dong" ascendente
  } catch {}
}

// ---------- WhatsApp al cliente ----------
// Normaliza teléfonos argentinos al formato de wa.me (549 + número)
function waNumber(phone) {
  let d = (phone || '').replace(/\D/g, '')
  if (d.startsWith('549')) return d
  if (d.startsWith('54')) return '549' + d.slice(2)
  if (d.startsWith('0')) d = d.slice(1)
  return '549' + d
}
function waMessage(order, tenantName) {
  const n = order.order_number
  const name = order.customer_name.split(' ')[0]
  const byStatus = {
    pending: `recibimos tu pedido #${n} y lo estamos revisando.`,
    confirmed: `tu pedido #${n} está confirmado y entra a cocina. 🙌`,
    preparing: `tu pedido #${n} se está preparando. 👨‍🍳`,
    ready:
      order.delivery_type === 'delivery'
        ? `tu pedido #${n} está listo y sale en camino. 🛵`
        : `tu pedido #${n} está listo para retirar. ✅`,
    delivered: `¡gracias por tu compra! Esperamos que disfrutes tu pedido #${n}. 😊`,
    cancelled: `lamentablemente tuvimos que cancelar tu pedido #${n}. Escribinos y lo resolvemos.`,
  }
  return encodeURIComponent(
    `Hola ${name}! Te escribimos de ${tenantName}: ${byStatus[order.status] || `novedades de tu pedido #${n}.`}`
  )
}

export default function Orders() {
  const { tenant } = useTenant()
  const [orders, setOrders] = useState([])
  const [items, setItems] = useState({})
  const [open, setOpen] = useState(null)
  const pendingAlerts = useRef(0)

  // El navegador bloquea el audio hasta la primera interacción:
  // con el primer click/tecla en el panel dejamos el audio listo.
  useEffect(() => {
    const unlock = () => ensureAudio()
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  // Al volver a la pestaña, se limpia el aviso del título
  useEffect(() => {
    const clearTitle = () => {
      pendingAlerts.current = 0
      document.title = tenant.name
    }
    const onVisible = () => {
      if (!document.hidden) clearTitle()
    }
    window.addEventListener('focus', clearTitle)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', clearTitle)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [tenant.name])

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
          playDing()
          pendingAlerts.current += 1
          document.title = `(🔔 ${pendingAlerts.current}) Pedido nuevo — ${tenant.name}`
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `tenant_id=eq.${tenant.id}`,
        },
        (payload) => {
          // Refleja pagos confirmados por webhook (✓ PAGADO) sin refrescar
          setOrders((prev) =>
            prev.map((o) => (o.id === payload.new.id ? { ...o, ...payload.new } : o))
          )
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [tenant.id, tenant.name])

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
                    {o.payment_status === 'paid' ? ' ✓ PAGADO' : ''}
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
                    <a
                      className="btn-wa"
                      href={`https://wa.me/${waNumber(o.customer_phone)}?text=${waMessage(o, tenant.name)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      WhatsApp
                    </a>
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
