import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import { clearVerificationPassword } from '../services/identityAuth.js'

export function ConfirmarEmailPage() {
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [redirectIn, setRedirectIn] = useState(3)

  const { confirmAccount } = useAuth()
  const navigate = useNavigate()
  const confirmAccountRef = useRef(confirmAccount)

  useEffect(() => {
    confirmAccountRef.current = confirmAccount
  }, [confirmAccount])

  useEffect(() => {
    const handleConfirm = async () => {
      const hash = window.location.hash
      if (hash) {
        const tokenMatch = hash.match(/confirmation_token=([^&]+)/)
        if (tokenMatch && tokenMatch[1]) {
          const token = tokenMatch[1]
          try {
            await confirmAccountRef.current(token)
            clearVerificationPassword()
            setSuccess(true)
          } catch (err) {
            console.error('Confirmation error:', err)
            setError('O link de confirmação parece inválido ou já foi utilizado.')
          } finally {
            setLoading(false)
          }
          return
        }
      }

      setError('Token de confirmação não encontrado.')
      setLoading(false)
    }

    handleConfirm()
  }, [])

  // Redireciona automaticamente para /home após sucesso
  useEffect(() => {
    if (!success) return
    if (redirectIn <= 0) {
      navigate('/home', { replace: true })
      return
    }
    const timer = setTimeout(() => setRedirectIn((p) => p - 1), 1000)
    return () => clearTimeout(timer)
  }, [success, redirectIn, navigate])

  return (
    <>
      <style>{confirmCss}</style>
      <div className="conf-page">
        <div className="conf-glow" aria-hidden="true" />
        <div className="conf-wrap">
          <div className="conf-card anim anim-d1">
            {loading ? (
              <div className="conf-loading">
                <div className="spinner"></div>
                <p>Confirmando sua conta...</p>
              </div>
            ) : success ? (
              <div className="conf-success">
                <div className="conf-icon success">✓</div>
                <h2>Conta Ativada!</h2>
                <p>Sua conta foi confirmada com sucesso. Você será redirecionado em instantes...</p>
                <div className="conf-redirect-bar">
                  <div className="conf-redirect-fill" style={{ animationDuration: '3s' }} />
                </div>
                <p className="conf-redirect-hint">Redirecionando em <strong>{redirectIn}s</strong>...</p>
                <Link to="/home" className="btn-primary" style={{ textDecoration: 'none', display: 'block', marginTop: 20 }}>
                  Ir agora para a página inicial
                </Link>
                <Link to="/login" className="conf-login-link">
                  Ir para o login
                </Link>
              </div>
            ) : (
              <div className="conf-error">
                <div className="conf-icon error">!</div>
                <h2>Ops! Houve um erro</h2>
                <p>{error}</p>
                <Link to="/login" className="btn-primary" style={{ textDecoration: 'none', display: 'block', marginTop: 20 }}>
                  Voltar ao Login
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

const confirmCss = `
  .conf-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }
  .conf-glow {
    position: fixed;
    top: -200px;
    left: 50%;
    transform: translateX(-50%);
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(200, 240, 96, 0.06) 0%, transparent 65%);
    pointer-events: none;
    z-index: 0;
  }
  .conf-wrap {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 400px;
  }
  .conf-card {
    background: var(--bg2);
    border: 1.5px solid var(--border2);
    border-radius: 24px;
    padding: 3rem 2rem;
    width: 100%;
    text-align: center;
  }
  .conf-icon {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    margin: 0 auto 1.5rem;
    font-weight: bold;
  }
  .conf-icon.success { background: var(--accent); color: #0f0f0f; }
  .conf-icon.error { background: rgba(234, 67, 53, 0.1); color: #ea4335; border: 1.5px solid rgba(234, 67, 53, 0.2); }

  h2 { font-family: 'DM Serif Display', serif; margin-bottom: 12px; font-size: 1.8rem; }
  p { color: var(--text2); font-size: 0.95rem; line-height: 1.6; }

  .conf-redirect-bar {
    height: 4px;
    background: var(--border);
    border-radius: 4px;
    overflow: hidden;
    margin: 1.25rem 0 0.5rem;
  }

  .conf-redirect-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 4px;
    width: 100%;
    animation: shrink linear forwards;
    transform-origin: left;
  }

  @keyframes shrink {
    from { width: 100%; }
    to { width: 0%; }
  }

  .conf-redirect-hint {
    font-size: 0.8rem !important;
    color: var(--text3, var(--text2)) !important;
    margin-bottom: 0 !important;
  }

  .conf-loading .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 15px;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .conf-login-link {
    display: block;
    margin-top: 10px;
    text-align: center;
    font-size: 0.82rem;
    color: var(--text2);
    text-decoration: none;
    transition: color 0.2s;
  }
  .conf-login-link:hover { color: var(--accent); text-decoration: underline; }
`
