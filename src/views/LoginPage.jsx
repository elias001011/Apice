import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import { POLICY_URL, loadPolicyConsent, savePolicyConsent } from '../services/policyConsent.js'

// Ícone olho aberto
function EyeOpen() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

// Ícone olho fechado
function EyeOff() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [acceptedPolicies, setAcceptedPolicies] = useState(() => loadPolicyConsent())
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const { login } = useAuth()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')

    if (!acceptedPolicies) {
      setError('Você precisa aceitar os Termos de uso e a Política de privacidade para entrar.')
      return
    }

    setLoading(true)
    
    try {
      await login(email, password)
      // O App.jsx cuida do redirecionamento
    } catch (err) {
      console.error('Login error details:', err)
      const msg = err.message || err.error_description || 'E-mail ou senha inválidos. Tente novamente.'
      
      if (msg.includes('not confirmed')) {
        setError('E-mail não confirmado. Verifique sua caixa de entrada para ativar sua conta.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{loginCss}</style>
      <div className="login-page">
        <div className="login-glow" aria-hidden="true" />
        <div className="login-wrap">
          <div className="login-top anim anim-d1">
            <div className="login-logo" aria-hidden="true">
              <div className="logo-icon" />
            </div>
            <div className="login-title">Ápice</div>
            <div className="login-sub">
              <strong>Chegue ao seu ápice no ENEM!</strong>
              <br />
              Sua preparação com o poder da inteligência artificial
            </div>
          </div>

          <form onSubmit={handleLogin} className="login-card anim anim-d2">
            {error && (
              <div className="error-msg" role="alert" aria-live="assertive">
                {error}
              </div>
            )}
            
            <div className="login-input-group">
              <label className="input-label">E-mail</label>
              <input 
                type="email" 
                className="input-field" 
                placeholder="seu@email.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="login-input-group">
              <label className="input-label">Senha</label>
              <div className="pass-wrap">
                <input 
                  type={showPass ? 'text' : 'password'}
                  className="input-field" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="pass-toggle"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPass ? <EyeOff /> : <EyeOpen />}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                <Link to="/esqueci-senha" className="login-forgot">
                  Esqueci minha senha
                </Link>
              </div>
            </div>

            <label className="login-terms">
              <input
                type="checkbox"
                checked={acceptedPolicies}
                onChange={(e) => {
                  const next = e.target.checked
                  setAcceptedPolicies(next)
                  savePolicyConsent(next)
                }}
              />
              <span>
                Li e aceito os <a href={POLICY_URL} target="_blank" rel="noreferrer">Termos de uso</a> e a <a href={POLICY_URL} target="_blank" rel="noreferrer">Política de privacidade</a>.
              </span>
            </label>

            {!acceptedPolicies && (
              <p className="login-terms-note" aria-live="polite">
                Você precisa aceitar os termos para entrar.
              </p>
            )}

            <button className="btn-primary" style={{ marginTop: 4 }} type="submit" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="login-footer anim anim-d3">
            Ainda não tem conta? <Link to="/cadastro">Criar conta gratuita</Link>
          </div>
        </div>
      </div>
    </>
  )
}

const loginCss = `
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

  .login-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem 1rem;
    position: relative;
  }

  .login-glow {
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

  .login-wrap {
    width: 100%;
    max-width: 460px;
    position: relative;
    z-index: 1;
  }

  .login-top {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 2rem;
  }

  .login-logo {
    width: 56px;
    height: 56px;
    background: var(--accent);
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1.25rem;
    position: relative;
    flex-shrink: 0;
    color: #0f0f0f;
  }

  .login-logo .logo-icon {
    width: 26px;
    height: 26px;
    background-color: currentColor;
    mask-image: url('/favicon_nova.svg');
    -webkit-mask-image: url('/favicon_nova.svg');
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
  }

  .login-logo::after {
    content: '';
    position: absolute;
    top: -6px;
    right: -6px;
    width: 12px;
    height: 12px;
    background: var(--accent);
    clip-path: polygon(50% 0%, 61% 35%, 100% 50%, 61% 65%, 50% 100%, 39% 65%, 0% 50%, 39% 35%);
    opacity: 0.5;
  }

  .login-title {
    font-family: 'DM Serif Display', serif;
    font-size: 32px;
    color: var(--text);
    letter-spacing: -0.5px;
    margin-bottom: 6px;
  }

  .login-sub {
    font-size: 0.85rem;
    color: var(--text2);
    text-align: center;
    line-height: 1.55;
  }

  .login-card {
    background: var(--bg2);
    border: 1.5px solid var(--border2);
    border-radius: 24px;
    padding: 2rem;
  }

  .login-input-group {
    margin-bottom: 14px;
  }

  .login-forgot {
    font-size: 0.75rem;
    color: var(--text2);
    text-decoration: none;
    transition: color 0.2s;
  }

  .login-forgot:hover {
    color: var(--accent);
  }

  .pass-wrap {
    position: relative;
  }

  .pass-wrap .input-field {
    padding-right: 42px;
    width: 100%;
  }

  .pass-toggle {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text3);
    display: flex;
    align-items: center;
    padding: 0;
    transition: color 0.2s;
  }

  .pass-toggle:hover { color: var(--text); }

  .login-terms {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    margin: 1rem 0 1rem;
    font-size: 0.8rem;
    color: var(--text2);
    line-height: 1.5;
  }

  .login-terms input[type="checkbox"] {
    width: 16px;
    height: 16px;
    margin-top: 2px;
    accent-color: var(--accent);
    flex-shrink: 0;
  }

  .login-terms a {
    color: var(--accent);
    text-decoration: none;
    font-weight: 500;
  }

  .login-terms a:hover {
    text-decoration: underline;
  }

  .login-terms-note {
    margin: -0.35rem 0 1rem 26px;
    font-size: 0.75rem;
    color: var(--amber);
    line-height: 1.45;
  }

  .login-footer {
    text-align: center;
    margin-top: 1.5rem;
    font-size: 0.8rem;
    color: var(--text3);
  }

  .login-footer a {
    color: var(--accent);
    text-decoration: none;
    font-weight: 500;
  }

  .login-footer a:hover { text-decoration: underline; }

  @media (max-width: 480px) {
    .login-page {
      padding: 1.25rem 0.875rem;
      align-items: flex-start;
      padding-top: 2.5rem;
    }
    .login-logo {
      width: 50px;
      height: 50px;
      border-radius: 15px;
    }
    .login-logo svg {
      width: 22px;
      height: 22px;
    }
    .login-title {
      font-size: 28px;
    }
    .login-card {
      padding: 1.25rem;
      border-radius: 20px;
    }
    .login-top {
      margin-bottom: 1.5rem;
    }
  }

  @media (max-width: 360px) {
    .login-page {
      padding: 1rem 0.75rem;
      padding-top: 2rem;
    }
    .login-card {
      padding: 1rem;
    }
  }
`
