import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useTenant } from '../lib/TenantContext'

const money = (n) =>
  n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

export default function StockPanel() {
  const { tenant } = useTenant()
  const [products, setProducts] = useState(null)
  useEffect(() => {
    function load() {
      supabase
        .from('products')
        .select('id, name, price, stock, is_active')
        .eq('tenant_id', tenant.id)
        .then(({ data }) => setProducts(data || []))
    }
  
    load()
  
    const channel = supabase
      .channel('stock-panel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: `tenant_id=eq.${tenant.id}`,
        },
        load
      )
      .subscribe()
  
    return () => supabase.removeChannel(channel)
  }, [tenant.id])

  if (!products) return <div className="admin-page"><p>Cargando…</p></div>

  const tracked = products.filter((p) => p.stock !== null && p.is_active)
  const untracked = products.filter((p) => p.stock === null && p.is_active)
  const out = tracked.filter((p) => p.stock <= 0)
  const low = tracked.filter((p) => p.stock > 0 && p.stock <= 3)
  const inventoryValue = tracked.reduce((sum, p) => sum + p.price * Math.max(p.stock, 0), 0)

  const sorted = [...tracked].sort((a, b) => a.stock - b.stock)
  const maxStock = Math.max(...tracked.map((p) => p.stock), 1)

  return (
    <div className="admin-page">
      <div className="page-title-row">
        <h1>Stock</h1>
      </div>

      <div className="stock-kpis">
        <div className="stock-kpi">
          <strong>{tracked.length}</strong>
          <span>Con control de stock</span>
        </div>
        <div className={`stock-kpi ${out.length > 0 ? 'danger' : ''}`}>
          <strong>{out.length}</strong>
          <span>Agotados</span>
        </div>
        <div className={`stock-kpi ${low.length > 0 ? 'warn' : ''}`}>
          <strong>{low.length}</strong>
          <span>Stock bajo (≤3)</span>
        </div>
        <div className="stock-kpi">
          <strong>{money(inventoryValue)}</strong>
          <span>Valor del inventario</span>
        </div>
      </div>

      {tracked.length === 0 ? (
        <p className="hint" style={{ marginTop: '1rem' }}>
          Ningún producto tiene control de stock. Cargalo desde Productos → Editar → campo
          Stock.
        </p>
      ) : (
        <div className="stock-list">
          {sorted.map((p) => (
            <div key={p.id} className="stock-row">
              <div className="stock-row-info">
                <span className="stock-row-name">{p.name}</span>
                <small>
                  {money(p.price)} c/u · valor {money(p.price * Math.max(p.stock, 0))}
                </small>
              </div>
              <div className="stock-row-bar">
                <div
                  className={`stock-row-fill ${
                    p.stock <= 0 ? 'out' : p.stock <= 3 ? 'low' : ''
                  }`}
                  style={{ width: `${Math.max((p.stock / maxStock) * 100, 4)}%` }}
                />
              </div>
              <span
                className={
                  p.stock <= 0 ? 'stock-tag out' : p.stock <= 3 ? 'stock-tag low' : 'stock-tag'
                }
              >
                {p.stock <= 0 ? 'Sin stock' : `${p.stock} u.`}
              </span>
            </div>
          ))}
        </div>
      )}

      {untracked.length > 0 && (
        <p className="hint" style={{ marginTop: '1rem' }}>
          {untracked.length} producto{untracked.length > 1 ? 's' : ''} sin control de stock
          (se venden siempre): {untracked.map((p) => p.name).join(', ')}
        </p>
      )}
    </div>
  )
}
