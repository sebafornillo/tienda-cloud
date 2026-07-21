import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useTenant } from '../lib/TenantContext'
import { DAY_NAMES } from '../lib/schedule'

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
    announcement: tenant.settings?.announcement || '',
    transfer_alias: tenant.settings?.transfer_alias || '',
    transfer_holder: tenant.settings?.transfer_holder || '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(null) // 'logo' | 'banner' | null
  const [error, setError] = useState(null)
  const [mpToken, setMpToken] = useState('')
  const [mpConfigured, setMpConfigured] = useState(false)
  const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] // lunes a domingo
  const [schedule, setSchedule] = useState(() => {
    const base = tenant.settings?.schedule || { enabled: false, days: {} }
    const days = {}
    for (const d of DAY_ORDER) {
      days[d] = base.days?.[d] || { on: false, from: '20:00', to: '00:00' }
    }
    return { enabled: !!base.enabled, days }
  })

  function setDay(d, field, value) {
    setSchedule((sc) => ({
      ...sc,
      days: { ...sc.days, [d]: { ...sc.days[d], [field]: value } },
    }))
    setSaved(false)
  }

  const [zones, setZones] = useState(
    Array.isArray(tenant.settings?.delivery_zones) ? tenant.settings.delivery_zones : []
  )
  const [newZone, setNewZone] = useState({ name: '', fee: '' })

  function addZone() {
    if (!newZone.name.trim()) return
    setZones([...zones, { name: newZone.name.trim(), fee: Number(newZone.fee) || 0 }])
    setNewZone({ name: '', fee: '' })
    setSaved(false)
  }
  function removeZone(i) {
    setZones(zones.filter((_, idx) => idx !== i))
    setSaved(false)
  }

  useEffect(() => {
    async function loadSecret() {
      const { data } = await supabase
        .from('tenant_secrets')
        .select('mp_access_token')
        .eq('tenant_id', tenant.id)
        .maybeSingle()
      if (data?.mp_access_token) setMpConfigured(true)
    }
    loadSecret()
  }, [tenant.id])

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

    // Si cargó un token nuevo de MP, se guarda en la tabla segura
    if (mpToken.trim()) {
      const { error: secErr } = await supabase
        .from('tenant_secrets')
        .upsert({ tenant_id: tenant.id, mp_access_token: mpToken.trim() })
      if (secErr) {
        setError('No se pudo guardar el token de Mercado Pago.')
        setSaving(false)
        return
      }
      setMpConfigured(true)
      setMpToken('')
    }

    const newSettings = {
      ...tenant.settings,
      logo_url: form.logo_url || null,
      banner_url: form.banner_url || null,
      primary_color: form.primary_color,
      whatsapp: form.whatsapp.trim() || null,
      announcement: form.announcement.trim() || null,
      transfer_alias: form.transfer_alias.trim() || null,
      transfer_holder: form.transfer_holder.trim() || null,
      delivery_zones: zones,
      schedule,
      mp_enabled: mpConfigured || !!mpToken.trim(),
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
        <span className="field-label">Anuncio de la tienda</span>
        <input
          className="settings-input"
          value={form.announcement}
          onChange={(e) => set('announcement', e.target.value)}
          maxLength={90}
          placeholder='Ej: 🔥 10% OFF en toda la tienda con el cupón HOLA10'
        />
        <small className="hint">
          Aparece como barra destacada arriba de tu tienda, con tu color de marca. Ideal
          para promos y cupones. Dejalo vacío para ocultarla.
        </small>
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
          Se usa en el botón "Avisar por WhatsApp" del pedido y en el botón flotante de
          consultas que ve el cliente en la tienda.
        </small>
      </div>

      <div className="settings-block">
        <span className="field-label">Transferencia bancaria</span>
        <input
          className="settings-input"
          value={form.transfer_alias}
          onChange={(e) => set('transfer_alias', e.target.value)}
          placeholder="Alias o CBU/CVU (ej: rincon.matero.mp)"
        />
        <input
          className="settings-input"
          style={{ marginTop: 8 }}
          value={form.transfer_holder}
          onChange={(e) => set('transfer_holder', e.target.value)}
          placeholder="Titular de la cuenta (opcional)"
        />
        <small className="hint">
          Si cargás un alias, el cliente puede elegir "Transferencia" al pagar y lo ve
          con un botón para copiarlo. Dejalo vacío para no ofrecer transferencia.
        </small>
      </div>

      <div className="settings-block">
        <span className="field-label">Horarios de atención</span>
        <label className="check-label">
          <input
            type="checkbox"
            checked={schedule.enabled}
            onChange={(e) => { setSchedule({ ...schedule, enabled: e.target.checked }); setSaved(false) }}
          />
          Controlar horarios (fuera de horario la tienda se ve, pero no toma pedidos)
        </label>
        {schedule.enabled && (
          <div className="schedule-grid">
            {DAY_ORDER.map((d) => (
              <div key={d} className={schedule.days[d].on ? 'schedule-row' : 'schedule-row off'}>
                <label className="check-label day-check">
                  <input
                    type="checkbox"
                    checked={schedule.days[d].on}
                    onChange={(e) => setDay(d, 'on', e.target.checked)}
                  />
                  {DAY_NAMES[d].charAt(0).toUpperCase() + DAY_NAMES[d].slice(1)}
                </label>
                {schedule.days[d].on && (
                  <div className="schedule-times">
                    <input
                      type="time"
                      value={schedule.days[d].from}
                      onChange={(e) => setDay(d, 'from', e.target.value)}
                    />
                    <span>a</span>
                    <input
                      type="time"
                      value={schedule.days[d].to}
                      onChange={(e) => setDay(d, 'to', e.target.value)}
                    />
                  </div>
                )}
              </div>
            ))}
            <small className="hint">
              Cierre "00:00" = hasta la medianoche. Un cierre menor que la apertura (ej:
              20:00 a 02:00) cruza la medianoche.
            </small>
          </div>
        )}
      </div>

      <div className="settings-block">
        <span className="field-label">Zonas de delivery</span>
        <small className="hint">
          Si cargás zonas, el cliente elige la suya en el checkout y el costo se suma al
          total. Sin zonas, el delivery no cobra envío.
        </small>
        {zones.length > 0 && (
          <ul className="zone-list">
            {zones.map((z, i) => (
              <li key={i}>
                <span>{z.name}</span>
                <span className="delta">
                  {Number(z.fee) > 0 ? `$ ${Number(z.fee).toLocaleString('es-AR')}` : 'Sin costo'}
                </span>
                <button className="link danger" onClick={() => removeZone(i)}>✕</button>
              </li>
            ))}
          </ul>
        )}
        <div className="editor-add-option">
          <input
            placeholder="Zona (ej: Centro)"
            value={newZone.name}
            onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
          />
          <input
            placeholder="$ envío"
            type="number"
            inputMode="decimal"
            value={newZone.fee}
            onChange={(e) => setNewZone({ ...newZone, fee: e.target.value })}
          />
          <button className="btn-small" onClick={addZone}>Agregar</button>
        </div>
      </div>

      <div className="settings-block">
        <span className="field-label">Mercado Pago</span>
        {mpConfigured && (
          <p className="success">✓ Configurado — tus clientes pueden pagar online.</p>
        )}
        <input
          className="settings-input"
          type="password"
          value={mpToken}
          onChange={(e) => { setMpToken(e.target.value); setSaved(false) }}
          placeholder={mpConfigured ? 'Pegar un token nuevo para reemplazar' : 'Access Token de producción (APP_USR-…)'}
        />
        <small className="hint">
          Se obtiene en Mercado Pago → Tus integraciones → Credenciales de producción.
          Se guarda de forma segura y nunca es visible en la tienda.
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
