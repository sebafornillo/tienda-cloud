import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useTenant } from '../lib/TenantContext'
import { money } from '../lib/CartContext'

const FLOW = ['pending', 'confirmed', 'preparing', 'ready', 'delivered']
const CHANNEL_LABELS = { whatsapp: 'WhatsApp', instagram: 'Instagram', otro: 'Otro canal' }
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

// ---------- Notificación del sistema (aunque el panel esté en otra pestaña) ----------
function askNotifPermission() {
  try {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  } catch {}
}
function notifyNewOrder(order, tenant) {
  try {
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return
    const body = `${order.customer_name} · ${money(order.total)} · ${
      order.delivery_type === 'delivery' ? 'Delivery' : 'Retiro'
    }`
    const n = new Notification(`🔔 Pedido nuevo #${order.order_number}`, {
      body,
      icon: tenant.settings?.logo_url || undefined,
      tag: `order-${order.id}`,
    })
    n.onclick = () => {
      window.focus()
      n.close()
    }
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

function waMessage(order, tenantName, businessType) {
  const n = order.order_number
  const name = order.customer_name.split(' ')[0]
  const food = businessType === 'gastronomy'
  const byStatus = {
    pending: `recibimos tu pedido #${n} y lo estamos revisando.`,
    confirmed: food
      ? `tu pedido #${n} está confirmado y ya entra a cocina. 🙌`
      : `tu pedido #${n} está confirmado y ya lo estamos preparando. 🙌`,
    preparing: food
      ? `tu pedido #${n} se está preparando. 👨‍🍳`
      : `estamos armando tu pedido #${n} con mucho cuidado. 📦`,
    ready:
      order.delivery_type === 'delivery'
        ? food
          ? `tu pedido #${n} está listo y sale en camino. 🛵`
          : `tu pedido #${n} fue despachado y va en camino. 🚚`
        : `tu pedido #${n} está listo para retirar. ✅`,
    delivered: `¡Gracias por tu compra! Esperamos que disfrutes tu pedido #${n}. 😊`,
    cancelled: `lamentablemente tuvimos que cancelar tu pedido #${n}. Escribinos y lo resolvemos.`,
  }
  const place =
    order.delivery_type === 'delivery' && order.address
      ? `📍 Envío a: ${order.address}${order.delivery_zone ? ` (${order.delivery_zone})` : ''}\n`
      : order.delivery_type === 'pickup'
      ? `🏪 Retiro por el local\n`
      : ''
      const greeting =
      order.status === 'cancelled'
        ? `Hola ${name}, te escribimos de ${tenantName}.`
        : `¡Muchas gracias por tu compra, ${name}! 🧡 Te escribimos de ${tenantName}.`
    const tracking = `${window.location.origin}/pedido/${n}`
    return encodeURIComponent(
      `${greeting}\n${byStatus[order.status] || `Novedades de tu pedido #${n}.`}\n\n${place}💰 Total: ${money(order.total)}\n\n👉 Seguí tu pedido en vivo: ${tracking}\n\nCualquier duda escribinos por acá, ¡estamos para ayudarte!`
    )
}

export default function Orders() {
  const { tenant } = useTenant()
  const [orders, setOrders] = useState([])
  const [items, setItems] = useState({})
  const [open, setOpen] = useState(null)
  const pendingAlerts = useRef(0)
  const [products, setProducts] = useState([])
const [showExternal, setShowExternal] = useState(false)
const [extForm, setExtForm] = useState({
  product_id: '',
  quantity: 1,
  unit_price: '',
  channel: 'whatsapp',
  customer_name: '',
  phone: '',
})
const [extSending, setExtSending] = useState(false)
const [extError, setExtError] = useState(null)

  // El navegador bloquea el audio hasta la primera interacción:
  // con el primer click/tecla en el panel dejamos el audio listo
  // y aprovechamos para pedir permiso de notificaciones.
  useEffect(() => {
    const unlock = () => {
      ensureAudio()
      askNotifPermission()
    }
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  useEffect(() => {
    if (!showExternal || products.length > 0) return
    supabase
      .from('products')
      .select('id, name, price, stock')
      .eq('tenant_id', tenant.id)
      .order('name')
      .then(({ data }) => setProducts(data || []))
  }, [showExternal, tenant.id])

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
          notifyNewOrder(payload.new, tenant)
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
  function openExternalSale() {
    setExtForm({ product_id: '', quantity: 1, unit_price: '', channel: 'whatsapp',customer_name: '', phone: '' })
    setExtError(null)
    setShowExternal(true)
  }
  
  function selectExtProduct(productId) {
    const p = products.find((x) => x.id === productId)
    setExtForm((f) => ({
      ...f,
      product_id: productId,
      unit_price: p ? String(p.price) : '',
    }))
  }
  
  async function submitExternalSale() {
    const product = products.find((p) => p.id === extForm.product_id)
    const qty = Number(extForm.quantity)
    const price = Number(extForm.unit_price)
    if (!product || !qty || qty < 1 || !price || price <= 0) {
      setExtError('Elegí un producto y completá cantidad y precio.')
      return
    }
    setExtSending(true)
    setExtError(null)
    const subtotal = price * qty
    const { error } = await supabase.rpc('place_order', {
      order_data: {
        tenant_id: tenant.id,
        customer_name: `Venta por ${CHANNEL_LABELS[extForm.channel]}`,
        customer_phone: extForm.phone.trim(),
        delivery_type: 'pickup',
        subtotal,
        delivery_fee: 0,
        total: subtotal,
        payment_method: 'efectivo',
        sale_channel: extForm.channel,
        status: 'delivered',
        payment_status: 'paid',
      },
      items_data: [
        {
          product_id: product.id,
          product_name: product.name,
          unit_price: price,
          quantity: qty,
          modifiers: [],
          line_total: subtotal,
        },
      ],
    })
    setExtSending(false)
    if (error) {
      setExtError(
        error.message.includes('SIN_STOCK')
          ? `"${product.name}" no tiene stock suficiente.`
          : 'No se pudo registrar la venta. Probá de nuevo.'
      )
      return
    }
    setShowExternal(false)
  }
  async function setStatus(order, status) {
    if (status === 'cancelled') {
      // Cancela y devuelve el stock de los productos, todo junto
      await supabase.rpc('cancel_order_restore', { o_id: order.id })
    } else {
      await supabase.from('orders').update({ status }).eq('id', order.id)
    }
    setOrders((prev) =>
      status === 'delivered' || status === 'cancelled'
        ? prev.filter((o) => o.id !== order.id)
        : prev.map((o) => (o.id === order.id ? { ...o, status } : o))
    )
  }

  return (
    <div className="admin-page">
     <div className="admin-page-header">
  <h1>Pedidos activos</h1>
  <button className="btn-primary" onClick={openExternalSale}>
    + Venta externa
  </button>
</div>
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
                    {o.delivery_type === 'delivery'
                      ? `Delivery${o.delivery_zone ? ` · ${o.delivery_zone}` : ''} · ${o.address || ''}`
                      : 'Retiro'}
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
                    {Number(o.discount) > 0 && ` · Cupón ${o.coupon_code}: −${money(o.discount)}`}
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
                      href={`https://wa.me/${waNumber(o.customer_phone)}?text=${waMessage(o, tenant.name, tenant.business_type)}`}
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
      {showExternal && (
  <div className="modal-backdrop" onClick={() => setShowExternal(false)}>
    <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
      <div className="modal-body">
        <h2>Registrar venta externa</h2>
        <p className="desc">Para ventas cerradas por WhatsApp, Instagram u otro canal fuera de la tienda.</p>

        <div className="form">
          <label>
            Producto
            <select
              value={extForm.product_id}
              onChange={(e) => selectExtProduct(e.target.value)}
            >
              <option value="">Elegí un producto…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.stock != null ? `(stock: ${p.stock})` : ''}
                </option>
              ))}
            </select>
          </label>

          <label>
            Cantidad
            <input
              type="number"
              min="1"
              value={extForm.quantity}
              onChange={(e) => setExtForm((f) => ({ ...f, quantity: e.target.value }))}
            />
          </label>

          <label>
            Precio unitario
            <input
              type="number"
              min="0"
              value={extForm.unit_price}
              onChange={(e) => setExtForm((f) => ({ ...f, unit_price: e.target.value }))}
            />
          </label>

          <div className="segmented">
            {Object.entries(CHANNEL_LABELS).map(([key, label]) => (
              <button
                key={key}
                className={extForm.channel === key ? 'active' : ''}
                onClick={() => setExtForm((f) => ({ ...f, channel: key }))}
              >
                {label}
              </button>
            ))}
          </div>

          <label>
            Teléfono del cliente (opcional)
            <input
              value={extForm.phone}
              onChange={(e) => setExtForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="Ej: 3874..."
              inputMode="tel"
            />
          </label>
        </div>

        {extError && <p className="error">{extError}</p>}

        <div className="confirm-actions">
          <button className="link" onClick={() => setShowExternal(false)}>
            Cancelar
          </button>
          <button className="btn-primary" disabled={extSending} onClick={submitExternalSale}>
            {extSending ? 'Guardando…' : 'Registrar venta'}
          </button>
        </div>
      </div>
    </div>
  </div>
)}
    </div>
  )
}
