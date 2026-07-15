import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { money } from '../lib/CartContext'

const BASE_DOMAIN = 'fornistore.com'

// ============================================================
// Panel del dueño de la plataforma (fornistore.com/panel)
// Lista de clientes, métricas, alta de tiendas y accesos.
// ============================================================
export default function PlatformPanel() {
  const [session, setSession] = useState(null)
  const [isAdmin, setIsAdmin] = useState(null) // null = verificando
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      if (session) {
        const { data } = await supabase
          .from('platform_admins')
          .select('user_id')
          .eq('user_id', session.user.id)
          .maybeSingle()
        setIsAdmin(!!data)
      }
      setChecking(false)
    }
    check()
  }, [])

  if (checking) return <div className="screen-msg">Verificando…</div>
  if (!session) return <PlatformLogin onLogin={() => window.location.reload()} />
  if (!isAdmin)
    return (
      <div className="screen-msg">
        <h1>Sin acceso</h1>
        <p>Esta cuenta no es administradora de la plataforma.</p>
        <button className="link" onClick={async () => { await supabase.auth.signOut(); window.location.reload() }}>
          Salir
        </button>
      </div>
    )
  return <Dashboard />
}

function PlatformLogin({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [sending, setSending] = useState(false)

  async function login() {
    setSending(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email o contraseña incorrectos.')
      setSending(false)
      return
    }
    onLogin()
  }

  return (
    <div className="admin-login">
      <h1>Fornistore</h1>
      <p className="desc">Panel de la plataforma</p>
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        Contraseña
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && login()}
        />
      </label>
      {error && <p className="error">{error}</p>}
      <button className="btn-primary full" disabled={sending} onClick={login}>
        {sending ? 'Entrando…' : 'Entrar'}
      </button>
    </div>
  )
}

const EMPTY_TENANT = {
  name: '',
  subdomain: '',
  business_type: 'gastronomy',
  primary_color: '#c62828',
}

function Dashboard() {
  const [tenants, setTenants] = useState([])
  const [orders, setOrders] = useState([])
  const [creating, setCreating] = useState(null) // null | EMPTY_TENANT
  const [ownerFor, setOwnerFor] = useState(null) // tenant | null
  const [editDomain, setEditDomain] = useState(null) // tenant | null
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  async function load() {
    const [t, o] = await Promise.all([
      supabase.from('tenants').select('*').order('created_at', { ascending: false }),
      supabase
        .from('orders')
        .select('tenant_id, total, status, created_at')
        .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
        .limit(5000),
    ])
    setTenants(t.data || [])
    setOrders(o.data || [])
  }

  useEffect(() => {
    load()
  }, [])

  const statsByTenant = useMemo(() => {
    const map = new Map()
    for (const o of orders) {
      const s = map.get(o.tenant_id) || { orders: 0, revenue: 0 }
      if (o.status === 'delivered') {
        s.orders += 1
        s.revenue += Number(o.total)
      }
      map.set(o.tenant_id, s)
    }
    return map
  }, [orders])

  const totals = useMemo(() => {
    let orders30 = 0
    let revenue30 = 0
    for (const s of statsByTenant.values()) {
      orders30 += s.orders
      revenue30 += s.revenue
    }
    return { orders30, revenue30 }
  }, [statsByTenant])

  function normalizeSubdomain(v) {
    return v
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9-]/g, '')
  }

  async function createTenant() {
    setBusy(true)
    setMsg(null)
    const { error } = await supabase.from('tenants').insert({
      name: creating.name.trim(),
      subdomain: creating.subdomain,
      business_type: creating.business_type,
      settings: {
        logo_url: null,
        banner_url: null,
        primary_color: creating.primary_color,
        whatsapp: null,
        mp_public_key: null,
        opening_hours: null,
        delivery_zones: [],
        currency: 'ARS',
      },
    })
    setBusy(false)
    if (error) {
      setMsg(
        error.code === '23505'
          ? 'Ese subdominio ya está en uso, elegí otro.'
          : 'No se pudo crear la tienda.'
      )
      return
    }
    setCreating(null)
    load()
  }

  async function toggleActive(t) {
    await supabase.from('tenants').update({ is_active: !t.is_active }).eq('id', t.id)
    load()
  }

  async function saveDomain() {
    setBusy(true)
    const value = editDomain.custom_domain?.trim() || null
    const { error } = await supabase
      .from('tenants')
      .update({ custom_domain: value })
      .eq('id', editDomain.id)
    setBusy(false)
    if (error) {
      setMsg('No se pudo guardar (¿dominio ya usado por otra tienda?).')
      return
    }
    setEditDomain(null)
    load()
  }

  async function createOwner(e) {
    setBusy(true)
    setMsg(null)
    const { data, error } = await supabase.functions.invoke('create-owner', {
      body: {
        email: ownerFor.email.trim(),
        password: ownerFor.password,
        tenant_id: ownerFor.id,
      },
    })
    setBusy(false)
    if (error || data?.error) {
      setMsg(data?.error || 'No se pudo crear el acceso.')
      return
    }
    setOwnerFor(null)
    setMsg('✓ Acceso creado. Pasale email y contraseña al cliente.')
  }

  return (
    <div className="admin platform">
      <header className="admin-header">
        <strong>Fornistore · Panel</strong>
        <nav />
        <button
          className="link"
          onClick={async () => {
            await supabase.auth.signOut()
            window.location.reload()
          }}
        >
          Salir
        </button>
      </header>

      <div className="admin-page">
        <div className="kpi-grid">
          <div className="kpi-card">
            <span className="kpi-value">{tenants.filter((t) => t.is_active).length}</span>
            <span className="kpi-label">Tiendas activas</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-value">{totals.orders30}</span>
            <span className="kpi-label">Pedidos entregados (30d)</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-value">{money(totals.revenue30)}</span>
            <span className="kpi-label">Facturado por tus clientes (30d)</span>
          </div>
        </div>

        <div className="page-title-row">
          <h1>Clientes</h1>
          <button className="btn-primary" onClick={() => setCreating({ ...EMPTY_TENANT })}>
            Nueva tienda
          </button>
        </div>

        {msg && <p className={msg.startsWith('✓') ? 'success' : 'error'}>{msg}</p>}

        <ul className="tenant-list">
          {tenants.map((t) => {
            const s = statsByTenant.get(t.id) || { orders: 0, revenue: 0 }
            return (
              <li key={t.id} className={t.is_active ? '' : 'inactive'}>
                <div
                  className="tenant-color"
                  style={{ background: t.settings?.primary_color || '#111' }}
                />
                <div className="tenant-info">
                  <strong>{t.name}</strong>
                  <small>
                    <a
                      href={`https://${t.subdomain}.${BASE_DOMAIN}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t.subdomain}.{BASE_DOMAIN}
                    </a>
                    {t.custom_domain && <> · {t.custom_domain}</>}
                    {' · '}
                    {t.business_type === 'gastronomy' ? 'Gastronomía' : 'E-commerce'}
                  </small>
                </div>
                <div className="tenant-stats">
                  <span>{s.orders} pedidos</span>
                  <strong>{money(s.revenue)}</strong>
                  <small>últimos 30 días</small>
                </div>
                <div className="tenant-actions">
                  <a
                    className="link"
                    href={`https://${t.subdomain}.${BASE_DOMAIN}/admin/login`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Panel
                  </a>
                  <button
                    className="link"
                    onClick={() => setOwnerFor({ ...t, email: '', password: '' })}
                  >
                    Crear acceso
                  </button>
                  <button
                    className="link"
                    onClick={() => setEditDomain({ ...t, custom_domain: t.custom_domain || '' })}
                  >
                    Dominio
                  </button>
                  <button className="link danger" onClick={() => toggleActive(t)}>
                    {t.is_active ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {creating && (
        <div className="modal-backdrop" onClick={() => setCreating(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-body form">
              <h2>Nueva tienda</h2>
              <label>
                Nombre del negocio
                <input
                  value={creating.name}
                  onChange={(e) => setCreating({ ...creating, name: e.target.value })}
                  placeholder="Ej: Mateando SF"
                />
              </label>
              <label>
                Subdominio
                <input
                  value={creating.subdomain}
                  onChange={(e) =>
                    setCreating({ ...creating, subdomain: normalizeSubdomain(e.target.value) })
                  }
                  placeholder="mateando"
                />
                <small className="hint">
                  La tienda quedará en{' '}
                  <strong>{creating.subdomain || 'subdominio'}.{BASE_DOMAIN}</strong>
                </small>
              </label>
              <label>
                Rubro
                <select
                  value={creating.business_type}
                  onChange={(e) => setCreating({ ...creating, business_type: e.target.value })}
                >
                  <option value="gastronomy">Gastronomía</option>
                  <option value="ecommerce">E-commerce / Productos</option>
                </select>
              </label>
              <label>
                Color de marca inicial
                <input
                  type="color"
                  value={creating.primary_color}
                  onChange={(e) => setCreating({ ...creating, primary_color: e.target.value })}
                />
              </label>
              {msg && <p className="error">{msg}</p>}
              <button
                className="btn-primary full"
                disabled={!creating.name.trim() || !creating.subdomain || busy}
                onClick={createTenant}
              >
                {busy ? 'Creando…' : 'Crear tienda'}
              </button>
            </div>
            <button className="modal-close" onClick={() => setCreating(null)} aria-label="Cerrar">✕</button>
          </div>
        </div>
      )}

      {ownerFor && (
        <div className="modal-backdrop" onClick={() => setOwnerFor(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-body form">
              <h2>Acceso para {ownerFor.name}</h2>
              <p className="desc">
                Creá el email y contraseña con los que el dueño entra a su panel.
              </p>
              <label>
                Email del dueño
                <input
                  type="email"
                  value={ownerFor.email}
                  onChange={(e) => setOwnerFor({ ...ownerFor, email: e.target.value })}
                />
              </label>
              <label>
                Contraseña
                <input
                  value={ownerFor.password}
                  onChange={(e) => setOwnerFor({ ...ownerFor, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                />
              </label>
              {msg && <p className="error">{msg}</p>}
              <button
                className="btn-primary full"
                disabled={!ownerFor.email.trim() || ownerFor.password.length < 6 || busy}
                onClick={createOwner}
              >
                {busy ? 'Creando…' : 'Crear acceso'}
              </button>
            </div>
            <button className="modal-close" onClick={() => setOwnerFor(null)} aria-label="Cerrar">✕</button>
          </div>
        </div>
      )}

      {editDomain && (
        <div className="modal-backdrop" onClick={() => setEditDomain(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-body form">
              <h2>Dominio propio de {editDomain.name}</h2>
              <p className="desc">
                El dominio del cliente (ej: www.mateandosf.com). Antes de cargarlo acá,
                agregalo en Vercel y pedile al cliente que apunte su DNS.
              </p>
              <label>
                Dominio (vacío = solo subdominio)
                <input
                  value={editDomain.custom_domain}
                  onChange={(e) =>
                    setEditDomain({ ...editDomain, custom_domain: e.target.value.toLowerCase().trim() })
                  }
                  placeholder="www.mateandosf.com"
                />
              </label>
              {msg && <p className="error">{msg}</p>}
              <button className="btn-primary full" disabled={busy} onClick={saveDomain}>
                {busy ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
            <button className="modal-close" onClick={() => setEditDomain(null)} aria-label="Cerrar">✕</button>
          </div>
        </div>
      )}
    </div>
  )
}
