import { Link, useNavigate } from 'react-router-dom'

export function LoginPage() {
  const navigate = useNavigate()

  return (
    <>
      <style>{loginCss}</style>
<<<<<<< HEAD
      <div className="login-wrap">
        <div className="login-top anim anim-d1">
          <div className="logo-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="#0f0f0f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 17 9 11 13 15 21 7" />
              <polyline points="14 7 21 7 21 14" />
            </svg>
          </div>
          <div className="login-title">Ápice</div>
          <div className="login-sub">
            Sua preparação para o ENEM
            <br />
            com o poder da inteligência artificial
          </div>
        </div>

        <div className="login-card anim anim-d2">
          <div className="input-group">
            <label className="input-label">E-mail</label>
            <input type="email" className="input-field" placeholder="seu@email.com" />
          </div>

          <div className="input-group">
            <label className="input-label">
              Senha
              <Link to="/esqueci-senha" className="forgot">
                Esqueci minha senha
              </Link>
            </label>
            <input type="password" className="input-field" placeholder="••••••••" />
          </div>

          <button className="btn-primary" style={{ marginTop: 4 }} type="button" onClick={() => navigate('/home')}>
            Entrar
          </button>

          <div className="separator">
            <div className="sep-line"></div>
            <span>ou continue com</span>
            <div className="sep-line"></div>
          </div>

          <button className="btn-google" type="button">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Entrar com Google
          </button>
        </div>

        <div className="login-footer anim anim-d3">
          Ainda não tem conta? <Link to="/cadastro">Criar conta gratuita</Link>
=======
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
              Sua preparação para o ENEM
              <br />
              com o poder da inteligência artificial
            </div>
          </div>

          <div className="login-card anim anim-d2">
            <div className="login-input-group">
              <label className="input-label">E-mail</label>
              <input type="email" className="input-field" placeholder="seu@email.com" />
            </div>

            <div className="login-input-group">
              <label className="input-label">
                Senha
                <Link to="/esqueci-senha" className="login-forgot">
                  Esqueci minha senha
                </Link>
              </label>
              <input type="password" className="input-field" placeholder="••••••••" />
            </div>

            <button className="btn-primary" style={{ marginTop: 4 }} type="button" onClick={() => navigate('/home')}>
              Entrar
            </button>

            <div className="login-separator">
              <div className="login-sep-line" />
              <span>ou continue com</span>
              <div className="login-sep-line" />
            </div>

            <button className="login-btn-google" type="button">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Entrar com Google
            </button>
          </div>

          <div className="login-footer anim anim-d3">
            Ainda não tem conta? <Link to="/cadastro">Criar conta gratuita</Link>
          </div>
>>>>>>> b7e1c44 (Initial commit)
        </div>
      </div>
    </>
  )
}

const loginCss = `
<<<<<<< HEAD
  body {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 2rem;
  }

  body::before {
    content: '';
=======
  .login-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem 1rem;
    position: relative;
  }

  .login-glow {
>>>>>>> b7e1c44 (Initial commit)
    position: fixed;
    top: -200px;
    left: 50%;
    transform: translateX(-50%);
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(200, 240, 96, 0.06) 0%, transparent 65%);
    pointer-events: none;
<<<<<<< HEAD
  }

  .login-wrap {
    width: 500px;
    max-width: 100%;
=======
    z-index: 0;
  }

  .login-wrap {
    width: 100%;
    max-width: 460px;
    position: relative;
    z-index: 1;
>>>>>>> b7e1c44 (Initial commit)
  }

  .login-top {
    display: flex;
    flex-direction: column;
    align-items: center;
<<<<<<< HEAD
    margin-bottom: 2.25rem;
  }

  .logo-mark {
    width: 58px;
    height: 58px;
=======
    margin-bottom: 2rem;
  }

  .login-logo {
    width: 56px;
    height: 56px;
>>>>>>> b7e1c44 (Initial commit)
    background: var(--accent);
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1.25rem;
    position: relative;
<<<<<<< HEAD
  }

  .logo-mark svg {
=======
    flex-shrink: 0;
  }

  .login-logo svg {
>>>>>>> b7e1c44 (Initial commit)
    width: 26px;
    height: 26px;
  }

<<<<<<< HEAD
  .logo-mark::after {
=======
  .login-logo::after {
>>>>>>> b7e1c44 (Initial commit)
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

<<<<<<< HEAD
  .input-group { margin-bottom: 14px; }

  .forgot {
=======
  .login-input-group {
    margin-bottom: 14px;
  }

  .login-forgot {
>>>>>>> b7e1c44 (Initial commit)
    font-size: 11px;
    color: var(--text2);
    text-decoration: none;
    float: right;
    margin-top: -2px;
    transition: color 0.2s;
  }

<<<<<<< HEAD
  .forgot:hover { color: var(--accent); }

  .separator {
=======
  .login-forgot:hover {
    color: var(--accent);
  }

  .login-separator {
>>>>>>> b7e1c44 (Initial commit)
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 1.25rem 0;
  }

<<<<<<< HEAD
  .separator span {
=======
  .login-separator span {
>>>>>>> b7e1c44 (Initial commit)
    font-size: 11px;
    color: var(--text3);
    white-space: nowrap;
  }

<<<<<<< HEAD
  .sep-line { flex: 1; height: 0.5px; background: var(--border); }

  .btn-google {
=======
  .login-sep-line {
    flex: 1;
    height: 0.5px;
    background: var(--border);
  }

  .login-btn-google {
>>>>>>> b7e1c44 (Initial commit)
    width: 100%;
    background: transparent;
    border: 1.5px solid var(--border2);
    border-radius: var(--radius-sm);
    padding: 11px;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    color: var(--text2);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: border-color 0.2s, color 0.2s, transform 0.1s;
  }

<<<<<<< HEAD
  .btn-google:hover { border-color: var(--accent); color: var(--text); }
  .btn-google:active { transform: scale(0.98); }
  .btn-google svg { width: 16px; height: 16px; }
=======
  .login-btn-google:hover { border-color: var(--accent); color: var(--text); }
  .login-btn-google:active { transform: scale(0.98); }
  .login-btn-google svg { width: 16px; height: 16px; }
>>>>>>> b7e1c44 (Initial commit)

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
<<<<<<< HEAD
`

=======

  /* ── MOBILE ── */
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
>>>>>>> b7e1c44 (Initial commit)
