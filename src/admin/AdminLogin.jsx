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

  const logo = tenant?.logo_url || tenant?.logo || null

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
    <div className="admin-login-wrap">
      <style>{`
        .admin-login-wrap {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .admin-login-card {
          background: #fff;
          border-radius: 20px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.07);
          padding: 40px 36px 28px;
          width: 100%;
          max-width: 400px;
          text-align: center;
        }
        .admin-login-card h1 {
          margin: 0 0 4px;
          font-size: 26px;
        }
        .admin-login-card .desc {
          margin: 0 0 24px;
          color: #8a8578;
          font-size: 15px;
        }
        .admin-login-card label {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 16px;
          font-size: 14px;
          font-weight: 600;
          color: #4a4a40;
          text-align: left;
        }
        .admin-login-card input {
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
        .admin-login-card input:focus {
          border-color: var(--color-primary, #4a5d33);
          box-shadow: 0 0 0 3px rgba(74, 93, 51, 0.12);
        }
        .admin-login-card input::placeholder {
          color: #b5b0a4;
        }
        .admin-login-logo {
          width: 88px;
          height: 88px;
          border-radius: 50%;
          object-fit: cover;
          margin: 0 auto 14px;
          display: block;
        }
        .admin-login-footer {
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px dashed #e2ddd2;
          font-size: 13px;
          color: #8a8578;
        }
        .admin-login-footer a {
          color: #6b6555;
          font-weight: 600;
        }
      `}</style>

      <div className="admin-login-card">
        {logo && <img src={logo} alt={tenant.name} className="admin-login-logo" />}

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

        <p className="admin-login-footer">
          ⚡ Tienda impulsada por{' '}
          <a href="https://fornistore.com" target="_blank" rel="noreferrer">
            Fornistore
          </a>
        </p>
      </div>
    </div>
  )
}
