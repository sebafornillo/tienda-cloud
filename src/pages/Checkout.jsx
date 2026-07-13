import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTenant } from '../lib/TenantContext'
import { useCart, money } from '../lib/CartContext'

export default function Checkout() {
  const { tenant } = useTenant()
  const { items, updateQty, subtotal, clear } = useCart()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    delivery_type: 'pickup',
    address: '',
    notes: '',
    payment_method: 'cash',
  })
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const mpEnabled = tenant.settings?.mp_enabled === true

  const deliveryFee = 0 // luego: calcular según settings.delivery_zones
  const total = subtotal + deliveryFee

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  const canSubmit =
    items.length > 0 &&
    form.customer_name.trim() &&
    form.customer_phone.trim() &&
    (form.delivery_type !== 'delivery' || form.address.trim())

  async function submit() {
    setSending(true)
    setError(null)

    // Crea pedido + items de forma atómica vía función de base de datos.
    // Funciona para clientes anónimos (no requiere permiso de lectura).
    const { data: result, error: orderError } = await supabase.rpc('place_order', {
      order_data: {
        tenant_id: tenant.id,
        customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone.trim(),
        delivery_type: form.delivery_type,
        address: form.delivery_type === 'delivery' ? form.address.trim() : '',
        notes: form.notes.trim(),
        subtotal,
        delivery_fee: deliveryFee,
        total,
        payment_method: form.payment_method,
      },
      items_data: items.map((i) => ({
        product_id: i.product.id,
        product_name: i.product.name,
        unit_price: i.unitPrice,
        quantity: i.quantity,
        modifiers: i.modifiers.map((m) => ({ name: m.name, price_delta: m.price_delta })),
        line_total: i.unitPrice * i.quantity,
      })),
    })

    if (orderError || !result?.length) {
      setError('No pudimos enviar el pedido. Probá de nuevo.')
      setSending(false)
      return
    }
    const order = { id: result[0].order_id, order_number: result[0].new_order_number }

    if (form.payment_method === 'mercadopago') {
      const backUrl = `${window.location.origin}/pedido/${order.order_number}${window.location.search}`
      const { data, error: fnError } = await supabase.functions.invoke('create-payment', {
        body: { order_id: order.id, back_url: backUrl },
      })
      if (fnError || !data?.init_point) {
        setError('No pudimos iniciar el pago. Probá con otro medio.')
        setSending(false)
        return
      }
      clear()
      window.location.href = data.init_point // redirige a Mercado Pago
      return
    }

    clear()
    navigate(`/pedido/${order.order_number}`, {
      state: { name: form.customer_name, whatsapp: tenant.settings?.whatsapp },
    })
  }

  if (items.length === 0) {
    return (
      <div className="screen-msg">
        <h1>Tu pedido está vacío</h1>
        <Link className="btn-primary" to="/">Volver a la tienda</Link>
      </div>
    )
  }

  return (
    <div className="checkout">
      <header className="page-header">
        <Link to="/" className="back">← {tenant.name}</Link>
        <h1>Tu pedido</h1>
      </header>

      <ul className="cart-items">
        {items.map((i) => (
          <li key={i.key}>
            <div className="cart-item-info">
              <strong>{i.product.name}</strong>
              {i.modifiers.length > 0 && (
                <small>{i.modifiers.map((m) => m.name).join(', ')}</small>
              )}
              <span>{money(i.unitPrice * i.quantity)}</span>
            </div>
            <div className="qty">
              <button onClick={() => updateQty(i.key, i.quantity - 1)} aria-label="Restar">−</button>
              <span>{i.quantity}</span>
              <button onClick={() => updateQty(i.key, i.quantity + 1)} aria-label="Sumar">+</button>
            </div>
          </li>
        ))}
      </ul>

      <div className="form">
        <label>
          Nombre
          <input
            value={form.customer_name}
            onChange={(e) => set('customer_name', e.target.value)}
            placeholder="Tu nombre"
          />
        </label>
        <label>
          Teléfono / WhatsApp
          <input
            value={form.customer_phone}
            onChange={(e) => set('customer_phone', e.target.value)}
            placeholder="Ej: 3874..."
            inputMode="tel"
          />
        </label>

        <div className="segmented">
          <button
            className={form.delivery_type === 'pickup' ? 'active' : ''}
            onClick={() => set('delivery_type', 'pickup')}
          >
            Retiro
          </button>
          <button
            className={form.delivery_type === 'delivery' ? 'active' : ''}
            onClick={() => set('delivery_type', 'delivery')}
          >
            Delivery
          </button>
        </div>

        {form.delivery_type === 'delivery' && (
          <label>
            Dirección
            <input
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder="Calle, número, referencia"
            />
          </label>
        )}

        <label>
          Notas (opcional)
          <input
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Ej: sin cebolla, timbre roto…"
          />
        </label>

        <div className="segmented">
          <button
            className={form.payment_method === 'cash' ? 'active' : ''}
            onClick={() => set('payment_method', 'cash')}
          >
            Efectivo
          </button>
          <button
            className={form.payment_method === 'transfer' ? 'active' : ''}
            onClick={() => set('payment_method', 'transfer')}
          >
            Transferencia
          </button>
          {mpEnabled && (
            <button
              className={form.payment_method === 'mercadopago' ? 'active' : ''}
              onClick={() => set('payment_method', 'mercadopago')}
            >
              Mercado Pago
            </button>
          )}
        </div>
      </div>

      <div className="totals">
        <div><span>Subtotal</span><span>{money(subtotal)}</span></div>
        {deliveryFee > 0 && <div><span>Envío</span><span>{money(deliveryFee)}</span></div>}
        <div className="grand"><span>Total</span><span>{money(total)}</span></div>
      </div>

      {error && <p className="error">{error}</p>}

      <button className="btn-primary full" disabled={!canSubmit || sending} onClick={submit}>
        {sending
          ? 'Enviando…'
          : form.payment_method === 'mercadopago'
          ? `Pagar con Mercado Pago · ${money(total)}`
          : `Confirmar pedido · ${money(total)}`}
      </button>
    </div>
  )
}
