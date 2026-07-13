import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTenant } from '../lib/TenantContext'

export default function AdminLayout() {
  const { tenant } = useTenant()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        navigate('/admin/login')
        return
      }
      // Verifica membresía en este tenant
      const { data } = await supabase
        .from('tenant_users')
        .select('role')
        .eq('tenant_id', tenant.id)
        .eq('user_id', session.user.id)
        .maybeSingle()
      if (!data) {
        await supabase.auth.signOut()
        navigate('/admin/login')
        return
      }
      setAuthorized(true)
      setChecking(false)
    }
    check()
  }, [tenant.id, navigate])

  async function logout() {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  if (checking || !authorized) return <div className="screen-msg">Verificando…</div>

  return (
    <div className="admin">
      <header className="admin-header">
        <strong>{tenant.name}</strong>
        <nav>
          <NavLink to="/admin" end>Pedidos</NavLink>
          <NavLink to="/admin/productos">Productos</NavLink>
          <NavLink to="/admin/historial">Historial</NavLink>
          <NavLink to="/admin/config">Mi tienda</NavLink>
        </nav>
        <button className="link" onClick={logout}>Salir</button>
      </header>
      <Outlet />
    </div>
  )
}
