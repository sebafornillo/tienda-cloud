import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

// Dominio base del SaaS: cada tienda vive en <subdominio>.fornistore.com
const BASE_DOMAIN = 'fornistore.com'

const TenantContext = createContext(null)

// Devuelve { subdomain } | { customDomain } | { landing: true }
function resolveHost() {
  // 1) Override manual con ?tienda= (útil en dev y para pruebas)
  const params = new URLSearchParams(window.location.search)
  const forced = params.get('tienda')
  if (forced) {
    sessionStorage.setItem('tienda_dev', forced)
    return { subdomain: forced }
  }

  const host = window.location.hostname

  // 2) Entornos de desarrollo y el dominio de Vercel: usa la última tienda elegida
  const isDev =
    host === 'localhost' ||
    host.endsWith('.webcontainer.io') ||
    host.endsWith('.stackblitz.io') ||
    host.includes('local-credentialless') ||
    host.endsWith('.vercel.app')
  if (isDev) {
    return { subdomain: sessionStorage.getItem('tienda_dev') || 'burger' }
  }

  // 3) Subdominios del dominio base: burger.fornistore.com -> 'burger'
  if (host === BASE_DOMAIN || host === `www.${BASE_DOMAIN}`) {
    return { landing: true } // la raíz del SaaS no es una tienda
  }
  if (host.endsWith(`.${BASE_DOMAIN}`)) {
    return { subdomain: host.slice(0, -(BASE_DOMAIN.length + 1)) }
  }

  // 4) Cualquier otro dominio: es un dominio propio de un cliente
  return { customDomain: host }
}

export function TenantProvider({ children }) {
  const [tenant, setTenant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null) // 'not_found' | 'landing'

  useEffect(() => {
    async function load() {
      const target = resolveHost()

      if (target.landing) {
        setError('landing')
        setLoading(false)
        return
      }

      let data = null
      if (target.subdomain) {
        const res = await supabase
          .from('tenants')
          .select('*')
          .eq('is_active', true)
          .eq('subdomain', target.subdomain)
          .maybeSingle()
        data = res.data
      } else if (target.customDomain) {
        // Busca el dominio exacto y también su variante con/sin www
        const alt = target.customDomain.startsWith('www.')
          ? target.customDomain.slice(4)
          : `www.${target.customDomain}`
        const res = await supabase
          .from('tenants')
          .select('*')
          .eq('is_active', true)
          .in('custom_domain', [target.customDomain, alt])
          .maybeSingle()
        data = res.data
      }

      if (!data) {
        setError('not_found')
      } else {
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
