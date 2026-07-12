import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useTenant } from '../lib/TenantContext'
import { money } from '../lib/CartContext'

// Editor de grupos de opciones/adicionales de un producto.
// Se abre como modal desde la lista de productos del admin.
export default function ModifierEditor({ product, onClose }) {
  const { tenant } = useTenant()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [newGroup, setNewGroup] = useState({ name: '', required: false, max_select: 1 })
  const [newOption, setNewOption] = useState({}) // groupId -> {name, price_delta}

  async function load() {
    const { data } = await supabase
      .from('modifier_groups')
      .select('*, modifier_options(*)')
      .eq('product_id', product.id)
      .order('sort_order')
    setGroups(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [product.id])

  async function addGroup() {
    if (!newGroup.name.trim()) return
    await supabase.from('modifier_groups').insert({
      tenant_id: tenant.id,
      product_id: product.id,
      name: newGroup.name.trim(),
      min_select: newGroup.required ? 1 : 0,
      max_select: Math.max(1, Number(newGroup.max_select) || 1),
      sort_order: groups.length,
    })
    setNewGroup({ name: '', required: false, max_select: 1 })
    load()
  }

  async function removeGroup(g) {
    if (!window.confirm(`¿Eliminar el grupo "${g.name}" y todas sus opciones?`)) return
    await supabase.from('modifier_groups').delete().eq('id', g.id)
    load()
  }

  async function addOption(g) {
    const draft = newOption[g.id]
    if (!draft?.name?.trim()) return
    await supabase.from('modifier_options').insert({
      tenant_id: tenant.id,
      group_id: g.id,
      name: draft.name.trim(),
      price_delta: Number(draft.price_delta) || 0,
      sort_order: (g.modifier_options || []).length,
    })
    setNewOption((prev) => ({ ...prev, [g.id]: { name: '', price_delta: '' } }))
    load()
  }

  async function removeOption(o) {
    await supabase.from('modifier_options').delete().eq('id', o.id)
    load()
  }

  function setDraft(groupId, field, value) {
    setNewOption((prev) => ({
      ...prev,
      [groupId]: { name: '', price_delta: '', ...prev[groupId], [field]: value },
    }))
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-body">
          <h2>Opciones de {product.name}</h2>
          <p className="desc">
            Grupos de opciones que el cliente elige al pedir: adicionales, tamaños, punto
            de cocción, sabores…
          </p>

          {loading && <p className="desc">Cargando…</p>}

          {groups.map((g) => (
            <div key={g.id} className="editor-group">
              <div className="editor-group-head">
                <strong>{g.name}</strong>
                <small>
                  {g.min_select > 0 ? 'Obligatorio' : 'Opcional'}
                  {g.max_select > 1 ? ` · hasta ${g.max_select}` : ''}
                </small>
                <button className="link danger" onClick={() => removeGroup(g)}>
                  Eliminar grupo
                </button>
              </div>

              <ul className="editor-options">
                {(g.modifier_options || [])
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((o) => (
                    <li key={o.id}>
                      <span>{o.name}</span>
                      <span className="delta">
                        {Number(o.price_delta) > 0 ? `+${money(o.price_delta)}` : 'Sin costo'}
                      </span>
                      <button className="link danger" onClick={() => removeOption(o)}>
                        ✕
                      </button>
                    </li>
                  ))}
              </ul>

              <div className="editor-add-option">
                <input
                  placeholder="Nueva opción (ej: Bacon)"
                  value={newOption[g.id]?.name || ''}
                  onChange={(e) => setDraft(g.id, 'name', e.target.value)}
                />
                <input
                  placeholder="$ extra"
                  type="number"
                  inputMode="decimal"
                  value={newOption[g.id]?.price_delta || ''}
                  onChange={(e) => setDraft(g.id, 'price_delta', e.target.value)}
                />
                <button className="btn-small" onClick={() => addOption(g)}>
                  Agregar
                </button>
              </div>
            </div>
          ))}

          <div className="editor-new-group">
            <h3>Nuevo grupo</h3>
            <input
              placeholder="Nombre del grupo (ej: Adicionales, Tamaño)"
              value={newGroup.name}
              onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
            />
            <div className="editor-new-group-row">
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={newGroup.required}
                  onChange={(e) => setNewGroup({ ...newGroup, required: e.target.checked })}
                />
                Obligatorio (el cliente debe elegir)
              </label>
              <label className="max-label">
                Máx. a elegir
                <input
                  type="number"
                  min="1"
                  value={newGroup.max_select}
                  onChange={(e) => setNewGroup({ ...newGroup, max_select: e.target.value })}
                />
              </label>
            </div>
            <button
              className="btn-primary full"
              disabled={!newGroup.name.trim()}
              onClick={addGroup}
            >
              Crear grupo
            </button>
          </div>
        </div>
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">✕</button>
      </div>
    </div>
  )
}
