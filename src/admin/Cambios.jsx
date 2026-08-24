import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useTenant } from '../lib/TenantContext'

const STATUS_LABEL = { pending: 'Pendiente', in_progress: 'En proceso', done: 'Hecho' }
const STATUS_CLASS = { pending: 'status-pending', in_progress: 'status-progress', done: 'status-done' }

export default function Cambios() {
  const { tenant } = useTenant()
  const sections = Array.isArray(tenant.settings?.landing_sections)
    ? tenant.settings.landing_sections
    : []
  const [requests, setRequests] = useState([])
  const [drafts, setDrafts] = useState({}) // section_key -> texto
  const [images, setImages] = useState({}) // section_key -> url ya subida
  const [uploadingImg, setUploadingImg] = useState(null) // section_key en subida
  const [sending, setSending] = useState(null)

  async function load() {
    const { data } = await supabase
      .from('landing_requests')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
    setRequests(data || [])
  }

  useEffect(() => {
    load()
  }, [tenant.id])

  async function uploadChangeImage(sectionKey, file) {
    if (!file) return
    setUploadingImg(sectionKey)
    const ext = file.name.split('.').pop().toLowerCase()
    const path = `${tenant.id}/changes/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`
    const { error } = await supabase.storage.from('products').upload(path, file, {
      cacheControl: '31536000',
      upsert: false,
    })
    if (!error) {
      const { data } = supabase.storage.from('products').getPublicUrl(path)
      setImages((imgs) => ({ ...imgs, [sectionKey]: data.publicUrl }))
    }
    setUploadingImg(null)
  }

  async function send(section) {
    const text = (drafts[section.key] || '').trim()
    if (!text) return
    setSending(section.key)
    const { error } = await supabase.from('landing_requests').insert({
      tenant_id: tenant.id,
      section_key: section.key,
      section_label: section.label,
      message: text,
      image_url: images[section.key] || null,
    })
    setSending(null)
    if (!error) {
      setDrafts((d) => ({ ...d, [section.key]: '' }))
      setImages((imgs) => ({ ...imgs, [section.key]: null }))
      load()
    }
  }

  function requestsFor(key) {
    return requests.filter((r) => r.section_key === key)
  }

  if (sections.length === 0) {
    return (
      <div className="admin-page">
        <h1>Cambios en tu página</h1>
        <p className="empty">
          Todavía no hay secciones configuradas para pedir cambios. Consultanos por
          WhatsApp mientras tanto.
        </p>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <h1>Cambios en tu página</h1>
      <p className="desc">
        Elegí la sección donde querés un cambio, contanos qué te gustaría (podés
        adjuntar una foto de referencia si aplica) y te avisamos cuando esté listo.
      </p>

      {sections.map((s) => (
        <div key={s.key} className="change-section">
          <h2>{s.label}</h2>
          {s.hint && <p className="hint">{s.hint}</p>}

          <textarea
            rows={3}
            placeholder="Ej: quiero que el texto diga..."
            value={drafts[s.key] || ''}
            onChange={(e) => setDrafts((d) => ({ ...d, [s.key]: e.target.value }))}
          />

          <div className="change-photo-row">
            {images[s.key] ? (
              <div className="change-photo-preview">
                <img src={images[s.key]} alt="" />
                <button
                  type="button"
                  className="link danger"
                  onClick={() => setImages((imgs) => ({ ...imgs, [s.key]: null }))}
                >
                  Quitar foto
                </button>
              </div>
            ) : (
              <label className="btn-upload small">
                {uploadingImg === s.key ? 'Subiendo…' : '📎 Adjuntar foto (opcional)'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  disabled={uploadingImg === s.key}
                  onChange={(e) => uploadChangeImage(s.key, e.target.files?.[0])}
                />
              </label>
            )}
          </div>

          <button
            className="btn-primary"
            disabled={!drafts[s.key]?.trim() || sending === s.key}
            onClick={() => send(s)}
          >
            {sending === s.key ? 'Enviando…' : 'Enviar pedido'}
          </button>

          {requestsFor(s.key).length > 0 && (
            <ul className="change-request-list">
              {requestsFor(s.key).map((r) => (
                <li key={r.id}>
                  <span className={`status-chip ${STATUS_CLASS[r.status]}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                  {r.image_url && (
                    <img className="change-request-thumb" src={r.image_url} alt="" />
                  )}
                  <p>{r.message}</p>
                  <small>{new Date(r.created_at).toLocaleDateString('es-AR')}</small>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}