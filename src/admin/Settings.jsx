import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useTenant } from '../lib/TenantContext'

// Configuración de la tienda: logo, color de marca y WhatsApp.
// Guarda en tenants.settings (jsonb). El permiso ya existe por RLS
// (solo miembros del tenant pueden actualizar su tienda).
export default function Settings() {
  const { tenant } = useTenant()
  const [form, setForm] = useState({
    logo_url: tenant.settings?.logo_url || '',
    banner_url: tenant.settings?.banner_url || '',
    primary_color: tenant.settings?.primary_color || '#111111',
    whatsapp: tenant.settings?.whatsapp || '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(null) // 'logo' | 'banner' | null
  const [error, setError] = useState(null)

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    setSaved(false)
  }

  async function uploadImage(field, file) {
    if (!file) return
    setUploading(field)
    setError(null)
    const ext = file.name.split('.').pop().toLowerCase()
    const path = `${tenant.id}/branding/${field}-${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('products').upload(path, file, {
      cacheControl: '31536000',
    })
    if (upErr) {
      setError('No se pudo subir la imagen. Probá de nuevo.')
    } else {
      const { data } = supabase.storage.from('products').getPublicUrl(path)
      set(field === 'logo' ? 'logo_url' : 'banner_url', data.publicUrl)
    }
    setUploading(null)
  }

  async function save() {
    setSaving(true)
    setError(null)
    const newSettings = {
      ...tenant.settings,
      logo_url: form.logo_url || null,
      banner_url: form.banner_url || null,
      primary_color: form.primary_color,
      whatsapp: form.whatsapp.trim() || null,
    }
    const { error: dbErr } = await supabase
      .from('tenants')
      .update({ settings: newSettings })
      .eq('id', tenant.id)
    if (dbErr) {
      setError('No se pudo guardar. Probá de nuevo.')
    } else {
      tenant.settings = newSettings // refleja el cambio en la sesión actual
      document.documentElement.style.setProperty('--brand', form.primary_color)
      setSaved(true)
    }
    setSaving(false)
  }

  return (
    <div className="admin-page settings-page">
      <h1>Mi tienda</h1>
      <p className="desc">
        Personalizá cómo se ve tu tienda. Los cambios impactan al guardar.
      </p>

      <div className="settings-block">
        <span className="field-label">Logo</span>
        <div className="photo-row">
          {form.logo_url ? (
            <img className="photo-preview" src={form.logo_url} alt="" />
          ) : (
            <div className="photo-preview placeholder" />
          )}
          <div className="photo-actions">
            <label className="btn-upload">
              {uploading === 'logo' ? 'Subiendo…' : form.logo_url ? 'Cambiar logo' : 'Subir logo'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                disabled={uploading !== null}
                onChange={(e) => uploadImage('logo', e.target.files?.[0])}
              />
            </label>
            {form.logo_url && (
              <button className="link danger" onClick={() => set('logo_url', '')}>
                Quitar
              </button>
            )}
          </div>
        </div>
        <small className="hint">Ideal: imagen cuadrada, mínimo 200×200px.</small>
      </div>

      <div className="settings-block">
        <span className="field-label">Banner (portada)</span>
        <div className="photo-row">
          {form.banner_url ? (
            <img className="banner-preview" src={form.banner_url} alt="" />
          ) : (
            <div className="banner-preview placeholder" />
          )}
        </div>
        <div className="photo-actions">
          <label className="btn-upload">
            {uploading === 'banner' ? 'Subiendo…' : form.banner_url ? 'Cambiar banner' : 'Subir banner'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              disabled={uploading !== null}
              onChange={(e) => uploadImage('banner', e.target.files?.[0])}
            />
          </label>
          {form.banner_url && (
            <button className="link danger" onClick={() => set('banner_url', '')}>
              Quitar
            </button>
          )}
        </div>
        <small className="hint">Ideal: imagen apaisada, 1200×400px aprox.</small>
      </div>

      <div className="settings-block">
        <span className="field-label">Color de marca</span>
        <div className="color-row">
          <input
            type="color"
            value={form.primary_color}
            onChange={(e) => set('primary_color', e.target.value)}
          />
          <input
            className="color-hex"
            value={form.primary_color}
            onChange={(e) => set('primary_color', e.target.value)}
          />
          <span className="color-sample" style={{ background: form.primary_color }}>
            Botones y detalles
          </span>
        </div>
      </div>

      <div className="settings-block">
        <span className="field-label">WhatsApp del negocio</span>
        <input
          className="settings-input"
          value={form.whatsapp}
          onChange={(e) => set('whatsapp', e.target.value)}
          placeholder="Ej: 5493425551234 (código de país, sin + ni espacios)"
          inputMode="tel"
        />
        <small className="hint">
          Se usa en el botón "Avisar por WhatsApp" que ve el cliente al confirmar su pedido.
        </small>
      </div>

      {error && <p className="error">{error}</p>}
      {saved && <p className="success">✓ Guardado. Refrescá la tienda para verlo.</p>}

      <button className="btn-primary full" disabled={saving || uploading !== null} onClick={save}>
        {saving ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </div>
  )
}
