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

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        tenant_id: tenant.id,
        customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone.trim(),
        delivery_type: form.delivery_type,
        address: form.delivery_type === 'delivery' ? form.address.trim() : null,
        notes: form.notes.trim() || null,
        subtotal,
        delivery_fee: deliveryFee,
        total,
        payment_method: form.payment_method,
      })
      .select('id, order_number')
      .single()

    if (orderError) {
      setError('No pudimos enviar el pedido. Probá de nuevo.')
      setSending(false)
      return
    }

    const rows = items.map((i) => ({
      tenant_id: tenant.id,
      order_id: order.id,
      product_id: i.product.id,
      product_name: i.product.name,
      unit_price: i.unitPrice,
      quantity: i.quantity,
      modifiers: i.modifiers.map((m) => ({ name: m.name, price_delta: m.price_delta })),
      line_total: i.unitPrice * i.quantity,
    }))
    const { error: itemsError } = await supabase.from('order_items').insert(rows)

    if (itemsError) {
      setError('No pudimos enviar el pedido. Probá de nuevo.')
      setSending(false)
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
        </div>
      </div>

      <div className="totals">
        <div><span>Subtotal</span><span>{money(subtotal)}</span></div>
        {deliveryFee > 0 && <div><span>Envío</span><span>{money(deliveryFee)}</span></div>}
        <div className="grand"><span>Total</span><span>{money(total)}</span></div>
      </div>

      {error && <p className="error">{error}</p>}

      <button className="btn-primary full" disabled={!canSubmit || sending} onClick={submit}>
        {sending ? 'Enviando…' : `Confirmar pedido · ${money(total)}`}
      </button>
    </div>
  )
}
