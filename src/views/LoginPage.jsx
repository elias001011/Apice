import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const navigate = useNavigate()
  const { login, guestLogin } = useAuth()

  const [isGuestMode, setIsGuestMode] = useState(false)
  const [guestName, setGuestName] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      await login(email, password)
      // O App.jsx cuida do redirecionamento
    } catch (err) {
      console.error('Login error:', err)
      setError('E-mail ou senha inválidos. Tente novamente.')
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
              <svg viewBox="0 0 24 24" fill="none" stroke="#0f0f0f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 17 9 11 13 15 21 7" />
                <polyline points="14 7 21 7 21 14" />
              </svg>
            </div>
            <div className="login-title">Ápice</div>
            <div className="login-sub">
              <strong>Chegue ao seu ápice no ENEM!</strong>
              <br />
              Sua preparação com o poder da inteligência artificial
            </div>
          </div>

          <form onSubmit={handleLogin} className="login-card anim anim-d2">
            {error && <div className="error-msg">{error}</div>}
            
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
              <label className="input-label">
                Senha
                <Link to="/esqueci-senha" className="login-forgot">
                  Esqueci minha senha
                </Link>
              </label>
              <input 
                type="password" 
                className="input-field" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button className="btn-primary" style={{ marginTop: 4 }} type="submit" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

            <div className="login-separator">
              <div className="login-sep-line" />
              <span>Ou apenas local</span>
              <div className="login-sep-line" />
            </div>

            {!isGuestMode ? (
              <button 
                className="login-btn-guest" 
                type="button"
                onClick={() => setIsGuestMode(true)}
              >
                Continuar como convidado
              </button>
            ) : (
              <div className="guest-flow anim anim-scale" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Seu nome" 
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  autoFocus
                  required
                />
                <button 
                  className="btn-primary" 
                  type="button" 
                  onClick={() => guestLogin(guestName)}
                  disabled={!guestName.trim()}
                >
                  Confirmar e entrar
                </button>
                <button 
                  className="guest-back" 
                  type="button" 
                  onClick={() => setIsGuestMode(false)}
                >
                  Voltar para login
                </button>
              </div>
            )}
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
    font-size: 12px;
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
    background: radial-gradient(circle, rgba(200, 240, 96, 0.06) 0%, transparent 65%);
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
  }

  .login-logo svg {
    width: 26px;
    height: 26px;
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
    font-size: 13px;
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
    font-size: 11px;
    color: var(--text2);
    text-decoration: none;
    float: right;
    margin-top: -2px;
    transition: color 0.2s;
  }

  .login-forgot:hover {
    color: var(--accent);
  }

  .login-separator {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 1.25rem 0;
  }

  .login-separator span {
    font-size: 11px;
    color: var(--text3);
    white-space: nowrap;
  }

  .login-sep-line {
    flex: 1;
    height: 0.5px;
    background: var(--border);
  }

  .login-btn-guest {
    width: 100%;
    background: transparent;
    border: 1.5px solid var(--border2);
    border-radius: var(--radius-sm);
    padding: 11px;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    color: var(--text2);
    cursor: pointer;
    transition: all 0.2s, transform 0.1s;
  }

  .login-btn-guest:hover { border-color: var(--accent); color: var(--text); background: rgba(200, 240, 96, 0.05); }
  .login-btn-guest:active { transform: scale(0.98); }

  .guest-back {
    background: none;
    border: none;
    color: var(--text3);
    font-size: 11px;
    cursor: pointer;
    margin-top: 4px;
    text-decoration: underline;
  }

  .guest-back:hover { color: var(--text2); }

  .login-footer {
    text-align: center;
    margin-top: 1.5rem;
    font-size: 12px;
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
