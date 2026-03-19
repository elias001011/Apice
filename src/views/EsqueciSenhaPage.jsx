import { Link, useNavigate } from 'react-router-dom'

export function EsqueciSenhaPage() {
  const navigate = useNavigate()

  return (
    <>
      <style>{esqueciSenhaCss}</style>
<<<<<<< HEAD
      <div className="wrap">
        <div className="top anim anim-d1">
          <div className="icon-wrap">
            <svg viewBox="0 0 24 24">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <div className="page-title">Recuperar senha</div>
          <div className="page-sub">Informe seu e-mail e enviaremos um link para redefinir sua senha.</div>
        </div>

        <div className="card-form anim anim-d2">
          <div style={{ marginBottom: 14 }}>
            <label className="input-label">E-mail cadastrado</label>
            <input type="email" className="input-field" placeholder="seu@email.com" />
          </div>
          <button className="btn-primary" onClick={() => navigate('/login')} type="button" style={{ width: '100%' }}>
            Enviar link de recuperação
          </button>
        </div>

        <div className="footer anim anim-d3">
          Lembrou a senha? <Link to="/login">Voltar ao login</Link>
=======
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
            <div className="es-sub">Informe seu e-mail e enviaremos um link para redefinir sua senha.</div>
          </div>

          <div className="es-card anim anim-d2">
            <div style={{ marginBottom: 14 }}>
              <label className="input-label">E-mail cadastrado</label>
              <input type="email" className="input-field" placeholder="seu@email.com" />
            </div>
            <button className="btn-primary" onClick={() => navigate('/login')} type="button">
              Enviar link de recuperação
            </button>
          </div>

          <div className="es-footer anim anim-d3">
            Lembrou a senha? <Link to="/login">Voltar ao login</Link>
          </div>
>>>>>>> b7e1c44 (Initial commit)
        </div>
      </div>
    </>
  )
}

const esqueciSenhaCss = `
<<<<<<< HEAD
  body {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 2rem;
    background: var(--bg);
  }

  body::before {
    content: '';
=======
  .es-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem 1rem;
    position: relative;
  }

  .es-glow {
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

  .wrap {
    width: 500px;
    max-width: 100%;
  }

  .top {
=======
    z-index: 0;
  }

  .es-wrap {
    width: 100%;
    max-width: 460px;
    position: relative;
    z-index: 1;
  }

  .es-top {
>>>>>>> b7e1c44 (Initial commit)
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 2rem;
  }

<<<<<<< HEAD
  .icon-wrap {
=======
  .es-icon {
>>>>>>> b7e1c44 (Initial commit)
    width: 56px;
    height: 56px;
    background: var(--bg2);
    border: 1.5px solid var(--border2);
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1rem;
<<<<<<< HEAD
  }

  .icon-wrap svg {
=======
    flex-shrink: 0;
  }

  .es-icon svg {
>>>>>>> b7e1c44 (Initial commit)
    width: 22px;
    height: 22px;
    stroke: var(--text2);
    fill: none;
    stroke-width: 1.5;
  }

<<<<<<< HEAD
  .page-title {
=======
  .es-title {
>>>>>>> b7e1c44 (Initial commit)
    font-family: 'DM Serif Display', serif;
    font-size: 26px;
    color: var(--text);
    text-align: center;
    margin-bottom: 6px;
  }

<<<<<<< HEAD
  .page-sub {
    font-size: 13px;
    color: var(--text2);
    text-align: center;
    line-height: 1.5;
  }

  .card-form {
=======
  .es-sub {
    font-size: 13px;
    color: var(--text2);
    text-align: center;
    line-height: 1.55;
    max-width: 320px;
  }

  .es-card {
>>>>>>> b7e1c44 (Initial commit)
    background: var(--bg2);
    border: 1.5px solid var(--border2);
    border-radius: 24px;
    padding: 2rem;
  }

<<<<<<< HEAD
  .footer {
=======
  .es-footer {
>>>>>>> b7e1c44 (Initial commit)
    text-align: center;
    margin-top: 1.5rem;
    font-size: 12px;
    color: var(--text3);
  }

<<<<<<< HEAD
  .footer a {
=======
  .es-footer a {
>>>>>>> b7e1c44 (Initial commit)
    color: var(--accent);
    text-decoration: none;
    font-weight: 500;
  }
<<<<<<< HEAD
=======

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
      font-size: 22px;
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
>>>>>>> b7e1c44 (Initial commit)
`
