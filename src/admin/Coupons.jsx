import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useTenant } from '../lib/TenantContext'
import { money } from '../lib/CartContext'

const EMPTY = {
  code: '',
  discount_type: 'percent',
  value: '',
  min_subtotal: '',
  max_uses: '',
  expires_at: '',
}

function couponStatus(c) {
  if (!c.is_active) return { key: 'paused', label: 'Pausado' }
  if (c.expires_at && new Date(c.expires_at) < new Date())
    return { key: 'expired', label: 'Vencido' }
  if (c.max_uses && c.used_count >= c.max_uses)
    return { key: 'expired', label: 'Agotado' }
  return { key: 'active', label: 'Activo' }
}

export default function Coupons() {
  const { tenant } = useTenant()
  const [coupons, setCoupons] = useState([])
  const [creating, setCreating] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function load() {
    const { data } = await supabase
      .from('coupons')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
    setCoupons(data || [])
  }

  useEffect(() => {
    load()
  }, [tenant.id])

  async function create() {
    setBusy(true)
    setError(null)
    const { error: err } = await supabase.from('coupons').insert({
      tenant_id: tenant.id,
      code: creating.code.trim().toUpperCase(),
      discount_type: creating.discount_type,
      value: Number(creating.value),
      min_subtotal: Number(creating.min_subtotal) || 0,
      max_uses: creating.max_uses === '' ? null : Number(creating.max_uses),
      expires_at: creating.expires_at
        ? new Date(creating.expires_at + 'T23:59:59').toISOString()
        : null,
    })
    setBusy(false)
    if (err) {
      setError(
        err.code === '23505' ? 'Ya existe un cupón con ese código.' : 'No se pudo crear el cupón.'
      )
      return
    }
    setCreating(null)
    load()
  }

  async function toggleActive(c) {
    await supabase.from('coupons').update({ is_active: !c.is_active }).eq('id', c.id)
    load()
  }

  async function remove(c) {
    if (!window.confirm(`¿Eliminar el cupón ${c.code}?`)) return
    await supabase.from('coupons').delete().eq('id', c.id)
    load()
  }

  const valuePreview =
    creating &&
    (creating.discount_type === 'percent'
      ? `${creating.value || 0}% de descuento`
      : `${money(Number(creating.value) || 0)} de descuento`)

  return (
    <div className="admin-page">
      <div className="page-title-row">
        <h1>Cupones</h1>
        <button className="btn-primary" onClick={() => setCreating({ ...EMPTY })}>
          Crear cupón
        </button>
      </div>

      {coupons.length === 0 && (
        <p className="empty">
          Todavía no creaste cupones. Un código de bienvenida (ej: HOLA10) es una gran
          forma de estrenar la tienda.
        </p>
      )}

      <ul className="coupon-list">
        {coupons.map((c) => {
          const st = couponStatus(c)
          return (
            <li key={c.id} className={`coupon ${st.key}`}>
              <div className="coupon-code">
                <span>{c.code}</span>
              </div>
              <div className="coupon-info">
                <strong>
                  {c.discount_type === 'percent' ? `${Number(c.value)}% OFF` : `${money(c.value)} OFF`}
                </strong>
                <small>
                  {c.min_subtotal > 0 && <>mínimo {money(c.min_subtotal)} · </>}
                  {c.max_uses
                    ? `${c.used_count}/${c.max_uses} usados`
                    : `${c.used_count} usados`}
                  {c.expires_at &&
                    ` · vence ${new Date(c.expires_at).toLocaleDateString('es-AR', {
                      day: '2-digit',
                      month: '2-digit',
                    })}`}
                </small>
              </div>
              <span className={`badge b-coupon-${st.key}`}>{st.label}</span>
              <div className="row-actions">
                <button className="link" onClick={() => toggleActive(c)}>
                  {c.is_active ? 'Pausar' : 'Activar'}
                </button>
                <button className="link danger" onClick={() => remove(c)}>
                  Eliminar
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {creating && (
        <div className="modal-backdrop" onClick={() => setCreating(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-body form">
              <h2>Nuevo cupón</h2>
              <label>
                Código
                <input
                  value={creating.code}
                  onChange={(e) =>
                    setCreating({
                      ...creating,
                      code: e.target.value.toUpperCase().replace(/\s+/g, ''),
                    })
                  }
                  placeholder="Ej: HOLA10"
                />
              </label>
              <div className="field-row">
                <label>
                  Tipo
                  <select
                    value={creating.discount_type}
                    onChange={(e) => setCreating({ ...creating, discount_type: e.target.value })}
                  >
                    <option value="percent">Porcentaje %</option>
                    <option value="fixed">Monto fijo $</option>
                  </select>
                </label>
                <label>
                  {creating.discount_type === 'percent' ? 'Porcentaje' : 'Monto'}
                  <input
                    type="number"
                    inputMode="decimal"
                    value={creating.value}
                    onChange={(e) => setCreating({ ...creating, value: e.target.value })}
                    placeholder={creating.discount_type === 'percent' ? '10' : '2000'}
                  />
                </label>
              </div>
              {creating.value && <small className="hint">→ {valuePreview}</small>}
              <label>
                Compra mínima (opcional)
                <input
                  type="number"
                  inputMode="decimal"
                  value={creating.min_subtotal}
                  onChange={(e) => setCreating({ ...creating, min_subtotal: e.target.value })}
                  placeholder="0"
                />
              </label>
              <div className="field-row">
                <label>
                  Límite de usos
                  <input
                    type="number"
                    value={creating.max_uses}
                    onChange={(e) => setCreating({ ...creating, max_uses: e.target.value })}
                    placeholder="Sin límite"
                  />
                </label>
                <label>
                  Vence el
                  <input
                    type="date"
                    value={creating.expires_at}
                    onChange={(e) => setCreating({ ...creating, expires_at: e.target.value })}
                  />
                </label>
              </div>
              {error && <p className="error">{error}</p>}
              <button
                className="btn-primary full"
                disabled={!creating.code.trim() || !Number(creating.value) || busy}
                onClick={create}
              >
                {busy ? 'Creando…' : 'Crear cupón'}
              </button>
            </div>
            <button className="modal-close" onClick={() => setCreating(null)} aria-label="Cerrar">✕</button>
          </div>
        </div>
      )}
    </div>
  )
}
