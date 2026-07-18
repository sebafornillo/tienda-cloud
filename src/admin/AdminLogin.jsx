import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTenant } from '../lib/TenantContext'

export default function AdminLogin() {
  const { tenant } = useTenant()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState(null)
  const [sending, setSending] = useState(false)

  const logo = tenant.settings?.logo_url
  const whatsapp = tenant.settings?.whatsapp

  async function login(e) {
    e?.preventDefault?.()
    if (!email.trim() || !password) {
      setError('Completá email y contraseña.')
      return
    }
    setSending(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) {
      setError(
        error.message?.includes('Invalid login')
          ? 'Email o contraseña incorrectos.'
          : 'No pudimos conectar. Revisá tu internet y probá de nuevo.'
      )
      setSending(false)
      return
    }
    navigate('/admin')
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={login}>
        {logo ? (
          <img className="login-logo" src={logo} alt={tenant.name} />
        ) : (
          <div className="login-logo-fallback">{tenant.name.charAt(0)}</div>
        )}
        <h1>{tenant.name}</h1>
        <p className="desc">Panel de administración</p>

        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
          />
        </label>
        <label>
          Contraseña
          <div className="pass-field">
            <input
              type={showPass ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            <button
              type="button"
              className="pass-toggle"
              onClick={() => setShowPass((v) => !v)}
              aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPass ? '🙈' : '👁️'}
            </button>
          </div>
        </label>

        {error && <p className="error">{error}</p>}

        <button className="btn-primary full" type="submit" disabled={sending}>
          {sending ? 'Entrando…' : 'Entrar a mi tienda'}
        </button>

        {whatsapp && (
          <p className="login-help">
            ¿Problemas para entrar?{' '}
            <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">
              Escribinos
            </a>
          </p>
        )}
        <p className="login-powered">
          ⚡ Tienda impulsada por{' '}
          <a href="https://www.fornistore.com" target="_blank" rel="noreferrer">
            Fornistore
          </a>
        </p>
      </form>
    </div>
  )
}
