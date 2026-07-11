import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTenant } from '../lib/TenantContext'

export default function AdminLogin() {
  const { tenant } = useTenant()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [sending, setSending] = useState(false)

  async function login(e) {
    e?.preventDefault?.()
    setSending(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email o contraseña incorrectos.')
      setSending(false)
      return
    }
    navigate('/admin')
  }

  return (
    <div className="admin-login">
      <h1>{tenant.name}</h1>
      <p className="desc">Panel de administración</p>
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
