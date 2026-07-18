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

  // Identidad del tenant: color y logo desde settings
  const accent =
    tenant?.settings?.primary_color || tenant?.primary_color || '#4a5d33'
  const logo = tenant?.settings?.logo_url || tenant?.logo_url || null

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
    <div className="admin-login-wrap" style={{ '--lg-accent': accent }}>
      <style>{`
        .admin-login-wrap {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background:
            radial-gradient(
              1200px 600px at 50% -10%,
              color-mix(in srgb, var(--lg-accent) 14%, transparent),
              transparent 70%
            );
        }
        .admin-login-card {
          background: #fff;
          border-radius: 20px;
          box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.08),
            0 2px 8px color-mix(in srgb, var(--lg-accent) 12%, transparent);
          padding: 0 36px 28px;
          width: 100%;
          max-width: 400px;
          text-align: center;
          overflow: hidden;
        }
        .admin-login-topbar {
          height: 6px;
          margin: 0 -36px 34px;
          background: linear-gradient(
            90deg,
            var(--lg-accent),
            color-mix(in srgb, var(--lg-accent) 55%, #fff)
          );
        }
        .admin-login-logo {
          width: 88px;
          height: 88px;
          border-radius: 50%;
          object-fit: cover;
          margin: 0 auto 14px;
          display: block;
          border: 3px solid color-mix(in srgb, var(--lg-accent) 35%, #fff);
          box-shadow: 0 0 0 4px color-mix(in srgb, var(--lg-accent) 10%, transparent);
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
          border-color: var(--lg-accent);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--lg-accent) 15%, transparent);
        }
        .admin-login-card input::placeholder {
          color: #b5b0a4;
        }
        .admin-login-card .btn-primary {
          background: var(--lg-accent);
        }
        .admin-login-footer {
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px dashed #e2ddd2;
          font-size: 13px;
          color: #8a8578;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .admin-login-footer a {
          color: #6b6555;
          font-weight: 600;
        }
        .fornistore-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border-radius: 5px;
          background: #1f1d18;
          color: #fff;
          font-size: 11px;
          font-weight: 800;
          flex-shrink: 0;
        }
      `}</style>

      <div className="admin-login-card">
        <div className="admin-login-topbar" />

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
          <span className="fornistore-badge">F</span>
          <span>
            Tienda impulsada por{' '}
            <a href="https://fornistore.com" target="_blank" rel="noreferrer">
              Fornistore
            </a>
          </span>
        </p>
      </div>
    </div>
  )
}
