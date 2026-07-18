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
      <style>{`
        .admin-login label {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 16px;
          font-size: 14px;
          font-weight: 600;
          color: #4a4a40;
          text-align: left;
        }
        .admin-login input {
          width: 100%;
          padding: 12px 14px;
          border: 1.5px solid #e2ddd2;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 400;
          font-family: inherit;
          outline: none;
          box-sizing: border-box;
          background: #fff;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .admin-login input:focus {
          border-color: var(--color-primary, #4a5d33);
          box-shadow: 0 0 0 3px rgba(74, 93, 51, 0.12);
        }
        .admin-login input::placeholder {
          color: #b5b0a4;
        }
      `}</style>

      {tenant?.logo_url && (
        <img
          src={tenant.logo_url}
          alt={tenant.name}
          style={{
            width: 88,
            height: 88,
            borderRadius: '50%',
            objectFit: 'cover',
            margin: '0 auto 12px',
            display: 'block',
          }}
        />
      )}

      <h1>{tenant.name}</h1>
      <p className="desc">Panel de administración</p>

      <label>
        Email
        <input
          type="email"
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </label>

      <label>
        Contraseña
        <input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && login()}
          autoComplete="current-password"
        />
      </label>

      {error && <p className="error">{error}</p>}

      <button className="btn-primary full" disabled={sending} onClick={login}>
        {sending ? 'Entrando…' : 'Entrar a mi tienda'}
      </button>
    </div>
  )
}
