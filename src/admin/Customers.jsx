import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useTenant } from '../lib/TenantContext'
import { money } from '../lib/CartContext'

// Normaliza teléfonos argentinos para el botón de WhatsApp
function waNumber(phone) {
  let d = (phone || '').replace(/\D/g, '')
  if (d.startsWith('549')) return d
  if (d.startsWith('54')) return '549' + d.slice(2)
  if (d.startsWith('0')) d = d.slice(1)
  return '549' + d
}

function sinceLabel(dateStr) {
  const days = Math.floor((Date.now() - new Date(dateStr)) / 86400000)
  if (days <= 0) return 'hoy'
  if (days === 1) return 'ayer'
  if (days < 30) return `hace ${days} días`
  if (days < 60) return 'hace 1 mes'
  return `hace ${Math.floor(days / 30)} meses`
}

export default function Customers() {
  const { tenant } = useTenant()
  const [rows, setRows] = useState(null)

  useEffect(() => {
    async function load() {
      // Solo pedidos entregados: miden compra real, no intención
      const { data } = await supabase
        .from('orders')
        .select('customer_name, customer_phone, total, created_at')
        .eq('tenant_id', tenant.id)
        .eq('status', 'delivered')
      const byPhone = {}
      for (const o of data || []) {
        const key = (o.customer_phone || '').replace(/\D/g, '') || 'sin-tel'
        if (!byPhone[key]) {
          byPhone[key] = {
            phone: o.customer_phone,
            name: o.customer_name,
            orders: 0,
            spent: 0,
            last: o.created_at,
          }
        }
        const c = byPhone[key]
        c.orders += 1
        c.spent += Number(o.total)
        if (new Date(o.created_at) > new Date(c.last)) {
          c.last = o.created_at
          c.name = o.customer_name // el nombre más reciente
        }
      }
      const list = Object.values(byPhone).sort(
        (a, b) => b.orders - a.orders || b.spent - a.spent
      )
      setRows(list)
    }
    load()
  }, [tenant.id])

  if (!rows) return <div className="admin-page"><p>Cargando…</p></div>

  const totalCustomers = rows.length
  const repeat = rows.filter((r) => r.orders > 1).length
  const totalRevenue = rows.reduce((s, r) => s + r.spent, 0)

  return (
    <div className="admin-page">
      <div className="page-title-row">
        <h1>Clientes</h1>
      </div>

      {rows.length === 0 ? (
        <p className="empty">
          Todavía no hay clientes con compras entregadas. Aparecen acá cuando marcás un
          pedido como "Entregado".
        </p>
      ) : (
        <>
          <div className="stock-kpis">
            <div className="stock-kpi">
              <strong>{totalCustomers}</strong>
              <span>Clientes</span>
            </div>
            <div className="stock-kpi">
              <strong>{repeat}</strong>
              <span>Compraron más de una vez</span>
            </div>
            <div className="stock-kpi">
              <strong>{money(totalRevenue)}</strong>
              <span>Facturado (entregado)</span>
            </div>
          </div>

          <div className="customer-list">
            {rows.map((c, i) => (
              <div key={c.phone + i} className="customer-row">
                <div className="customer-rank">{i + 1}</div>
                <div className="customer-info">
                  <strong>
                    {c.name}
                    {c.orders >= 3 && <span className="vip-chip">★ Frecuente</span>}
                  </strong>
                  <small>
                    {c.orders} {c.orders === 1 ? 'compra' : 'compras'} · {money(c.spent)}{' '}
                    · última {sinceLabel(c.last)}
                  </small>
                </div>
                {c.phone && (
                  <a
                    className="btn-wa small"
                    href={`https://wa.me/${waNumber(c.phone)}?text=${encodeURIComponent(
                      `Hola ${c.name.split(' ')[0]}! Te escribimos de ${tenant.name} 🧉`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp
                  </a>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
