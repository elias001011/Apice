import { Link, useNavigate } from 'react-router-dom'

export function EsqueciSenhaPage() {
  const navigate = useNavigate()

  return (
    <>
      <style>{esqueciSenhaCss}</style>
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
        </div>
      </div>
    </>
  )
}

const esqueciSenhaCss = `
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
    position: fixed;
    top: -200px;
    left: 50%;
    transform: translateX(-50%);
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(200, 240, 96, 0.06) 0%, transparent 65%);
    pointer-events: none;
  }

  .wrap {
    width: 500px;
    max-width: 100%;
  }

  .top {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 2rem;
  }

  .icon-wrap {
    width: 56px;
    height: 56px;
    background: var(--bg2);
    border: 1.5px solid var(--border2);
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1rem;
  }

  .icon-wrap svg {
    width: 22px;
    height: 22px;
    stroke: var(--text2);
    fill: none;
    stroke-width: 1.5;
  }

  .page-title {
    font-family: 'DM Serif Display', serif;
    font-size: 26px;
    color: var(--text);
    text-align: center;
    margin-bottom: 6px;
  }

  .page-sub {
    font-size: 13px;
    color: var(--text2);
    text-align: center;
    line-height: 1.5;
  }

  .card-form {
    background: var(--bg2);
    border: 1.5px solid var(--border2);
    border-radius: 24px;
    padding: 2rem;
  }

  .footer {
    text-align: center;
    margin-top: 1.5rem;
    font-size: 12px;
    color: var(--text3);
  }

  .footer a {
    color: var(--accent);
    text-decoration: none;
    font-weight: 500;
  }
`
