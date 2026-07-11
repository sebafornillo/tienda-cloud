import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useCart, money } from '../lib/CartContext'

export default function ProductModal({ product, onClose }) {
  const { addItem } = useCart()
  const [groups, setGroups] = useState([])
  const [selected, setSelected] = useState({}) // groupId -> [optionIds]
  const [qty, setQty] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: gs } = await supabase
        .from('modifier_groups')
        .select('*, modifier_options(*)')
        .eq('product_id', product.id)
        .order('sort_order')
      setGroups(gs || [])
      setLoading(false)
    }
    load()
  }, [product.id])

  function toggle(group, option) {
    setSelected((prev) => {
      const current = prev[group.id] || []
      const has = current.includes(option.id)
      let next
      if (group.max_select === 1) {
        next = has ? [] : [option.id]
      } else if (has) {
        next = current.filter((id) => id !== option.id)
      } else if (current.length < group.max_select) {
        next = [...current, option.id]
      } else {
        next = current
      }
      return { ...prev, [group.id]: next }
    })
  }

  const chosenOptions = useMemo(() => {
    const all = []
    for (const g of groups) {
      const ids = selected[g.id] || []
      for (const o of g.modifier_options || []) {
        if (ids.includes(o.id)) all.push(o)
      }
    }
    return all
  }, [groups, selected])

  const missingRequired = groups.some(
    (g) => (selected[g.id] || []).length < g.min_select
  )

  const total =
    (Number(product.price) +
      chosenOptions.reduce((s, o) => s + Number(o.price_delta), 0)) *
    qty

  function confirm() {
    addItem(product, chosenOptions, qty)
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {product.image_url && (
          <img className="modal-img" src={product.image_url} alt={product.name} />
        )}
        <div className="modal-body">
          <h2>{product.name}</h2>
          {product.description && <p className="desc">{product.description}</p>}

          {loading && <p className="desc">Cargando opciones…</p>}

          {groups.map((g) => (
            <fieldset key={g.id} className="mod-group">
              <legend>
                {g.name}
                <span className="mod-hint">
                  {g.min_select > 0
                    ? ` · obligatorio${g.max_select > 1 ? ` (hasta ${g.max_select})` : ''}`
                    : g.max_select > 1
                    ? ` · elegí hasta ${g.max_select}`
                    : ' · opcional'}
                </span>
              </legend>
              {(g.modifier_options || [])
                .filter((o) => o.is_active)
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((o) => {
                  const checked = (selected[g.id] || []).includes(o.id)
                  return (
                    <label key={o.id} className={checked ? 'mod-option checked' : 'mod-option'}>
                      <input
                        type={g.max_select === 1 ? 'radio' : 'checkbox'}
                        name={g.id}
                        checked={checked}
                        onChange={() => toggle(g, o)}
                      />
                      <span>{o.name}</span>
                      {Number(o.price_delta) !== 0 && (
                        <span className="delta">+{money(o.price_delta)}</span>
                      )}
                    </label>
                  )
                })}
            </fieldset>
          ))}

          <div className="modal-actions">
            <div className="qty">
              <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Restar">−</button>
              <span>{qty}</span>
              <button onClick={() => setQty(qty + 1)} aria-label="Sumar">+</button>
            </div>
            <button
              className="btn-primary"
              disabled={missingRequired}
              onClick={confirm}
            >
              Agregar {money(total)}
            </button>
          </div>
        </div>
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">✕</button>
      </div>
    </div>
  )
}
