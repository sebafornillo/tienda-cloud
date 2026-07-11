import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const TenantContext = createContext(null)

// Resuelve el subdominio. En localhost / StackBlitz se usa ?tienda=xxx
function resolveSubdomain() {
  const params = new URLSearchParams(window.location.search)
  const forced = params.get('tienda')
  if (forced) {
    sessionStorage.setItem('tienda_dev', forced)
    return forced
  }
  const host = window.location.hostname
  const isDev =
    host === 'localhost' ||
    host.endsWith('.webcontainer.io') ||
    host.endsWith('.stackblitz.io') ||
    host.includes('local-credentialless')
  if (isDev) return sessionStorage.getItem('tienda_dev') || 'burger'

  const parts = host.split('.')
  // subdominio.naptchap.com -> 'subdominio' | dominio propio -> se busca por custom_domain
  if (parts.length >= 3 && parts[0] !== 'www') return parts[0]
  return null
}

export function TenantProvider({ children }) {
  const [tenant, setTenant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      const sub = resolveSubdomain()
      let query = supabase.from('tenants').select('*').eq('is_active', true)
      query = sub
        ? query.eq('subdomain', sub)
        : query.eq('custom_domain', window.location.hostname)
      const { data, error } = await query.single()
      if (error || !data) setError('Tienda no encontrada')
      else {
        setTenant(data)
        document.title = data.name
        const color = data.settings?.primary_color || '#111111'
        document.documentElement.style.setProperty('--brand', color)
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <TenantContext.Provider value={{ tenant, loading, error }}>
      {children}
    </TenantContext.Provider>
  )
}

export const useTenant = () => useContext(TenantContext)
