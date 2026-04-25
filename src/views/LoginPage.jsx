import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import {
  clearLoginThrottle,
  getLoginThrottleMessage,
  getLoginThrottleState,
  recordLoginFailure,
} from '../services/loginThrottle.js'
import {
  isInvalidLoginError,
  isUnconfirmedAccountError,
  normalizeIdentityError,
} from '../services/identityAuth.js'
import { POLICY_URL } from '../services/policyConsent.js'
import { EmailSuggestions } from '../ui/EmailSuggestions.jsx'

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
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [throttleTick, setThrottleTick] = useState(() => Date.now())
  
  const { login, loginAsGuest } = useAuth()
  const normalizedEmail = email.trim()
  const throttleState = getLoginThrottleState(normalizedEmail, throttleTick)
  const throttleMessage = getLoginThrottleMessage(throttleState)

  useEffect(() => {
    if (!throttleState.isLocked) return undefined

    const intervalId = window.setInterval(() => {
      setThrottleTick(Date.now())
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [throttleState.email, throttleState.isLocked])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')

    if (throttleState.isLocked) {
      return
    }

    setLoading(true)
    
    try {
      await login(normalizedEmail, password)
      clearLoginThrottle(normalizedEmail)
      // O App.jsx cuida do redirecionamento
    } catch (err) {
      console.error('Login error details:', err)
      if (isUnconfirmedAccountError(err)) {
        clearLoginThrottle(normalizedEmail)
        setError('E-mail não confirmado. Verifique sua caixa de entrada para ativar sua conta.')
      } else if (isInvalidLoginError(err)) {
        recordLoginFailure(normalizedEmail)
        setThrottleTick(Date.now())
        setError('E-mail ou senha inválidos. Tente novamente.')
      } else {
        setError(normalizeIdentityError(err) || 'Não foi possível entrar. Tente novamente mais tarde.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGuestLogin = async () => {
    setError('')
    setLoading(true)

    try {
      await loginAsGuest()
      // O App.jsx cuida do redirecionamento
    } catch (err) {
      setError(err?.message || 'Não foi possível entrar como convidado agora.')
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
            {throttleMessage && (
              <div className="throttle-msg" role="status" aria-live="polite">
                {throttleMessage}
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
                list="login-email-list"
              />
              <EmailSuggestions id="login-email-list" value={email} />
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

            <button className="btn-primary" style={{ marginTop: 12 }} type="submit" disabled={loading || throttleState.isLocked}>
              {loading
                ? 'Entrando...'
                : throttleState.isLocked
                  ? `Aguarde ${formatThrottleTime(throttleState.remainingMs)}`
                  : 'Entrar'}
            </button>

            <button
              className="btn-secondary"
              style={{ marginTop: 12, width: '100%' }}
              type="button"
              onClick={handleGuestLogin}
              disabled={loading}
            >
              Entrar como convidado
            </button>

            <div className="guest-msg">
              Modo convidado usa só os dados deste navegador. Se sair sem criar uma conta nova, tudo será apagado.
            </div>
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

  .throttle-msg {
    background: rgba(255, 171, 64, 0.12);
    color: var(--amber);
    padding: 10px 12px;
    border-radius: 12px;
    font-size: 0.8rem;
    margin-bottom: 15px;
    text-align: center;
    border: 1px solid rgba(255, 171, 64, 0.24);
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
    max-width: 480px;
    position: relative;
    z-index: 1;
    background: var(--bg2);
    padding: 3rem 2.5rem;
    border-radius: 32px;
    border: 1.5px solid var(--border);
    box-shadow: 0 40px 100px rgba(0, 0, 0, 0.4);
  }

  @media (max-width: 600px) {
    .login-wrap {
      max-width: 100%;
      padding: 2rem 1.5rem;
      border: none;
      background: transparent;
      box-shadow: none;
    }
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
    mask-image: url('/favicon.svg');
    -webkit-mask-image: url('/favicon.svg');
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

  .guest-msg {
    margin-top: 0.9rem;
    font-size: 0.78rem;
    line-height: 1.55;
    color: var(--text3);
    text-align: center;
  }

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

function formatThrottleTime(ms) {
  const totalSeconds = Math.max(1, Math.ceil(Number(ms) / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`
  }

  return `${seconds}s`
}
