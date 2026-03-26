import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'

export function EsqueciSenhaPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  
  const { auth } = useAuth()

  const handleRecovery = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await auth.requestPasswordRecovery(email)
      setSent(true)
    } catch (err) {
      console.error('Recovery error:', err)
      const rawMsg = String(err?.message || err?.error_description || '')
      if (/not found|no user|not registered|unknown email|não encontrado/i.test(rawMsg)) {
        setError('Não encontramos uma conta com esse e-mail.')
      } else {
        setError('Não foi possível enviar o link de recuperação. Verifique o e-mail e tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{esqueciSenhaCss}</style>
      <div className="es-page">
        <div className="es-glow" aria-hidden="true" />
        <div className="es-wrap">
          <div className="es-top anim anim-d1">
            <div className="es-icon">
              <svg viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </div>
            <div className="es-title">Recuperar senha</div>
            <div className="es-sub">
              {sent 
                ? 'Se existir uma conta com esse e-mail, um link de redefinição será enviado.' 
                : 'Informe seu e-mail e enviaremos um link para redefinir sua senha.'}
            </div>
          </div>

          <form onSubmit={handleRecovery} className="es-card anim anim-d2">
            {!sent ? (
              <>
                {error && <div className="error-msg">{error}</div>}
                <div style={{ marginBottom: 14 }}>
                  <label className="input-label">E-mail cadastrado</label>
                  <input 
                    type="email" 
                    className="input-field" 
                    placeholder="seu@email.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <button className="btn-primary" type="submit" disabled={loading}>
                  {loading ? 'Enviando...' : 'Enviar link de recuperação'}
                </button>
              </>
            ) : (
              <Link to="/login" className="btn-primary" style={{ textDecoration: 'none', display: 'block', textAlign: 'center' }}>
                Voltar ao Login
              </Link>
            )}
          </form>

          <div className="es-footer anim anim-d3">
            Lembrou a senha? <Link to="/login">Voltar ao login</Link>
          </div>
        </div>
      </div>
    </>
  )
}

const esqueciSenhaCss = `
  .error-msg {
    background: rgba(234, 67, 53, 0.1);
    color: #ea4335;
    padding: 10px;
    border-radius: 12px;
    font-size: 0.8rem;
    margin-bottom: 15px;
    text-align: center;
    border: 1px solid rgba(234, 67, 53, 0.2);
  }

  .es-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem 1rem;
    position: relative;
  }

  .es-glow {
    position: fixed;
    top: -200px;
    left: 50%;
    transform: translateX(-50%);
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(var(--accent-rgb), 0.06) 0%, transparent 65%);
    pointer-events: none;
    z-index: 0;
  }

  .es-wrap {
    width: 100%;
    max-width: 460px;
    position: relative;
    z-index: 1;
  }

  .es-top {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 2rem;
  }

  .es-icon {
    width: 56px;
    height: 56px;
    background: var(--bg2);
    border: 1.5px solid var(--border2);
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1rem;
    flex-shrink: 0;
  }

  .es-icon svg {
    width: 22px;
    height: 22px;
    stroke: var(--text2);
    fill: none;
    stroke-width: 1.5;
  }

  .es-title {
    font-family: 'DM Serif Display', serif;
    font-size: 1.7rem;
    color: var(--text);
    text-align: center;
    margin-bottom: 6px;
  }

  .es-sub {
    font-size: 0.85rem;
    color: var(--text2);
    text-align: center;
    line-height: 1.55;
    max-width: 320px;
  }

  .es-card {
    background: var(--bg2);
    border: 1.5px solid var(--border2);
    border-radius: 24px;
    padding: 2rem;
  }

  .es-footer {
    text-align: center;
    margin-top: 1.5rem;
    font-size: 0.8rem;
    color: var(--text3);
  }

  .es-footer a {
    color: var(--accent);
    text-decoration: none;
    font-weight: 500;
  }

  .es-footer a:hover {
    text-decoration: underline;
  }

  /* ── MOBILE ── */
  @media (max-width: 480px) {
    .es-page {
      padding: 1.25rem 0.875rem;
      align-items: center;
    }

    .es-icon {
      width: 50px;
      height: 50px;
      border-radius: 15px;
    }

    .es-icon svg {
      width: 20px;
      height: 20px;
    }

    .es-title {
      font-size: 1.45rem;
    }

    .es-card {
      padding: 1.25rem;
      border-radius: 20px;
    }

    .es-top {
      margin-bottom: 1.5rem;
    }
  }

  @media (max-width: 360px) {
    .es-page {
      padding: 1rem 0.75rem;
    }

    .es-card {
      padding: 1rem;
    }
  }
`
