import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useTenant } from '../lib/TenantContext'
import { money } from '../lib/CartContext'

const EMPTY = {
  name: '',
  description: '',
  price: '',
  category_id: '',
  image_url: '',
  is_active: true,
}

export default function Products() {
  const { tenant } = useTenant()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [editing, setEditing] = useState(null) // null | {id?, ...EMPTY}
  const [newCat, setNewCat] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  async function uploadImage(file) {
    if (!file) return
    setUploading(true)
    setUploadError(null)
    const ext = file.name.split('.').pop().toLowerCase()
    const path = `${tenant.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('products').upload(path, file, {
      cacheControl: '31536000',
      upsert: false,
    })
    if (error) {
      setUploadError('No se pudo subir la imagen. Probá de nuevo.')
    } else {
      const { data } = supabase.storage.from('products').getPublicUrl(path)
      setEditing((e) => ({ ...e, image_url: data.publicUrl }))
    }
    setUploading(false)
  }

  async function load() {
    const [prods, cats] = await Promise.all([
      supabase.from('products').select('*').eq('tenant_id', tenant.id).order('sort_order'),
      supabase.from('categories').select('*').eq('tenant_id', tenant.id).order('sort_order'),
    ])
    setProducts(prods.data || [])
    setCategories(cats.data || [])
  }

  useEffect(() => {
    load()
  }, [tenant.id])

  async function saveProduct() {
    setSaving(true)
    const row = {
      tenant_id: tenant.id,
      name: editing.name.trim(),
      description: editing.description.trim() || null,
      price: Number(editing.price),
      category_id: editing.category_id || null,
      image_url: editing.image_url.trim() || null,
      is_active: editing.is_active,
    }
    if (editing.id) {
      await supabase.from('products').update(row).eq('id', editing.id)
    } else {
      await supabase.from('products').insert(row)
    }
    setEditing(null)
    setSaving(false)
    load()
  }

  async function toggleActive(p) {
    await supabase.from('products').update({ is_active: !p.is_active }).eq('id', p.id)
    load()
  }

  async function removeProduct(p) {
    if (!window.confirm(`¿Eliminar "${p.name}"?`)) return
    await supabase.from('products').delete().eq('id', p.id)
    load()
  }

  async function addCategory() {
    if (!newCat.trim()) return
    await supabase.from('categories').insert({ tenant_id: tenant.id, name: newCat.trim() })
    setNewCat('')
    load()
  }

  return (
    <div className="admin-page">
      <div className="page-title-row">
        <h1>Productos</h1>
        <button className="btn-primary" onClick={() => setEditing({ ...EMPTY })}>
          Agregar producto
        </button>
      </div>

      <div className="cat-manager">
        <input
          placeholder="Nueva categoría (ej: Hamburguesas)"
          value={newCat}
          onChange={(e) => setNewCat(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCategory()}
        />
        <button onClick={addCategory}>Crear categoría</button>
      </div>

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-body form">
              <h2>{editing.id ? 'Editar producto' : 'Nuevo producto'}</h2>
              <label>
                Nombre
                <input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </label>
              <label>
                Descripción
                <input
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </label>
              <label>
                Precio
                <input
                  type="number"
                  inputMode="decimal"
                  value={editing.price}
                  onChange={(e) => setEditing({ ...editing, price: e.target.value })}
                />
              </label>
              <label>
                Categoría
                <select
                  value={editing.category_id || ''}
                  onChange={(e) => setEditing({ ...editing, category_id: e.target.value })}
                >
                  <option value="">Sin categoría</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
              <div className="photo-field">
                <span className="field-label">Foto</span>
                <div className="photo-row">
                  {editing.image_url ? (
                    <img className="photo-preview" src={editing.image_url} alt="" />
                  ) : (
                    <div className="photo-preview placeholder" />
                  )}
                  <div className="photo-actions">
                    <label className="btn-upload">
                      {uploading ? 'Subiendo…' : editing.image_url ? 'Cambiar foto' : 'Subir foto'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        hidden
                        disabled={uploading}
                        onChange={(e) => uploadImage(e.target.files?.[0])}
                      />
                    </label>
                    {editing.image_url && (
                      <button
                        className="link danger"
                        onClick={() => setEditing({ ...editing, image_url: '' })}
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                </div>
                {uploadError && <p className="error">{uploadError}</p>}
              </div>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={editing.is_active}
                  onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                />
                Visible en la tienda
              </label>
              <button
                className="btn-primary full"
                disabled={!editing.name.trim() || !editing.price || saving}
                onClick={saveProduct}
              >
                {saving ? 'Guardando…' : 'Guardar producto'}
              </button>
            </div>
            <button className="modal-close" onClick={() => setEditing(null)} aria-label="Cerrar">✕</button>
          </div>
        </div>
      )}

      <ul className="admin-product-list">
        {products.map((p) => (
          <li key={p.id} className={p.is_active ? '' : 'inactive'}>
            {p.image_url ? <img src={p.image_url} alt="" /> : <div className="img-placeholder" />}
            <div className="info">
              <strong>{p.name}</strong>
              <small>
                {categories.find((c) => c.id === p.category_id)?.name || 'Sin categoría'}
                {' · '}{money(p.price)}
              </small>
            </div>
            <div className="row-actions">
              <button className="link" onClick={() => setEditing({ ...EMPTY, ...p, price: String(p.price), description: p.description || '', image_url: p.image_url || '', category_id: p.category_id || '' })}>
                Editar
              </button>
              <button className="link" onClick={() => toggleActive(p)}>
                {p.is_active ? 'Ocultar' : 'Mostrar'}
              </button>
              <button className="link danger" onClick={() => removeProduct(p)}>
                Eliminar
              </button>
            </div>
          </li>
        ))}
      </ul>
      {products.length === 0 && <p className="empty">Todavía no cargaste productos.</p>}
    </div>
  )
}
