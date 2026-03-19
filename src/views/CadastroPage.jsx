import { Link, useNavigate } from 'react-router-dom'

export function CadastroPage() {
  const navigate = useNavigate()

  return (
    <>
      <style>{cadastroCss}</style>
<<<<<<< HEAD
      <div className="wrap">
        <div className="top anim anim-d1">
          <Link to="/login" className="logo-mark" style={{ textDecoration: 'none' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#0f0f0f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 17 9 11 13 15 21 7" />
              <polyline points="14 7 21 7 21 14" />
            </svg>
          </Link>
          <div className="page-title">Criar conta gratuita</div>
          <div className="page-sub">Comece a estudar para o ENEM hoje</div>
        </div>

        <div className="card-form anim anim-d2">
          <div className="input-row">
            <div>
              <label className="input-label">Nome</label>
              <input type="text" className="input-field" placeholder="Maria" />
            </div>
            <div>
              <label className="input-label">Sobrenome</label>
              <input type="text" className="input-field" placeholder="Alves" />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">E-mail</label>
            <input type="email" className="input-field" placeholder="seu@email.com" />
          </div>

          <div className="input-group">
            <label className="input-label">Escola</label>
            <input type="text" className="input-field" placeholder="Nome da sua escola (opcional)" />
          </div>

          <div className="input-group">
            <label className="input-label">Senha</label>
            <input type="password" className="input-field" placeholder="Mínimo 8 caracteres" />
          </div>

          <div className="input-group">
            <label className="input-label">Confirmar senha</label>
            <input type="password" className="input-field" placeholder="Repita a senha" />
          </div>

          <div className="terms">
            <input type="checkbox" id="termos" />
            <label htmlFor="termos">
              Concordo com os <Link to="/termos">Termos de uso</Link> e a <Link to="/privacidade">Política de privacidade</Link>
            </label>
          </div>

          <button className="btn-primary" onClick={() => navigate('/home')} type="button">
            Criar minha conta
          </button>
        </div>

        <div className="footer-login anim anim-d3">
          Já tem conta? <Link to="/login">Entrar</Link>
=======
      <div className="cad-page">
        <div className="cad-glow" aria-hidden="true" />
        <div className="cad-wrap">
          <div className="cad-top anim anim-d1">
            <Link to="/login" className="cad-logo" style={{ textDecoration: 'none' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#0f0f0f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 17 9 11 13 15 21 7" />
                <polyline points="14 7 21 7 21 14" />
              </svg>
            </Link>
            <div className="cad-title">Criar conta gratuita</div>
            <div className="cad-sub">Comece a estudar para o ENEM hoje</div>
          </div>

          <div className="cad-card anim anim-d2">
            <div className="cad-input-row">
              <div>
                <label className="input-label">Nome</label>
                <input type="text" className="input-field" placeholder="Maria" />
              </div>
              <div>
                <label className="input-label">Sobrenome</label>
                <input type="text" className="input-field" placeholder="Alves" />
              </div>
            </div>

            <div className="cad-input-group">
              <label className="input-label">E-mail</label>
              <input type="email" className="input-field" placeholder="seu@email.com" />
            </div>

            <div className="cad-input-group">
              <label className="input-label">Escola</label>
              <input type="text" className="input-field" placeholder="Nome da sua escola (opcional)" />
            </div>

            <div className="cad-input-group">
              <label className="input-label">Senha</label>
              <input type="password" className="input-field" placeholder="Mínimo 8 caracteres" />
            </div>

            <div className="cad-input-group">
              <label className="input-label">Confirmar senha</label>
              <input type="password" className="input-field" placeholder="Repita a senha" />
            </div>

            <div className="cad-terms">
              <input type="checkbox" id="termos" />
              <label htmlFor="termos">
                Concordo com os <Link to="/termos">Termos de uso</Link> e a <Link to="/privacidade">Política de privacidade</Link>
              </label>
            </div>

            <button className="btn-primary" onClick={() => navigate('/home')} type="button">
              Criar minha conta
            </button>
          </div>

          <div className="cad-footer anim anim-d3">
            Já tem conta? <Link to="/login">Entrar</Link>
          </div>
>>>>>>> b7e1c44 (Initial commit)
        </div>
      </div>
    </>
  )
}

const cadastroCss = `
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
  .cad-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem 1rem;
    position: relative;
  }

  .cad-glow {
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
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 2rem;
  }

  .logo-mark {
=======
    z-index: 0;
  }

  .cad-wrap {
    width: 100%;
    max-width: 460px;
    position: relative;
    z-index: 1;
  }

  .cad-top {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 1.75rem;
  }

  .cad-logo {
>>>>>>> b7e1c44 (Initial commit)
    width: 52px;
    height: 52px;
    background: var(--accent);
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1rem;
    position: relative;
    cursor: pointer;
    transition: transform 0.2s ease, opacity 0.2s ease;
<<<<<<< HEAD
  }

  .logo-mark:hover {
=======
    flex-shrink: 0;
  }

  .cad-logo:hover {
>>>>>>> b7e1c44 (Initial commit)
    transform: scale(1.05);
    opacity: 0.9;
  }

<<<<<<< HEAD
  .logo-mark svg {
=======
  .cad-logo svg {
>>>>>>> b7e1c44 (Initial commit)
    width: 23px;
    height: 23px;
  }

<<<<<<< HEAD
  .page-title {
    font-family: 'DM Serif Display', serif;
    font-size: 28px;
=======
  .cad-title {
    font-family: 'DM Serif Display', serif;
    font-size: 26px;
>>>>>>> b7e1c44 (Initial commit)
    color: var(--text);
    letter-spacing: -0.4px;
    margin-bottom: 5px;
    text-align: center;
  }

<<<<<<< HEAD
  .page-sub {
=======
  .cad-sub {
>>>>>>> b7e1c44 (Initial commit)
    font-size: 13px;
    color: var(--text2);
    text-align: center;
  }

<<<<<<< HEAD
  .card-form {
=======
  .cad-card {
>>>>>>> b7e1c44 (Initial commit)
    background: var(--bg2);
    border: 1.5px solid var(--border2);
    border-radius: 24px;
    padding: 2rem;
  }

<<<<<<< HEAD
  .input-group {
    margin-bottom: 13px;
  }

  .input-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
=======
  .cad-input-group {
    margin-bottom: 13px;
  }

  .cad-input-row {
    display: grid;
    grid-template-columns: 1fr;
>>>>>>> b7e1c44 (Initial commit)
    gap: 10px;
    margin-bottom: 13px;
  }

<<<<<<< HEAD
  .terms {
=======
  @media (min-width: 520px) {
    .cad-input-row {
      grid-template-columns: 1fr 1fr;
    }
  }

  .cad-terms {
>>>>>>> b7e1c44 (Initial commit)
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin: 1rem 0;
  }

<<<<<<< HEAD
  .terms input[type="checkbox"] {
=======
  .cad-terms input[type="checkbox"] {
>>>>>>> b7e1c44 (Initial commit)
    width: 16px;
    height: 16px;
    margin-top: 1px;
    accent-color: var(--accent);
    flex-shrink: 0;
    cursor: pointer;
  }

<<<<<<< HEAD
  .terms label {
=======
  .cad-terms label {
>>>>>>> b7e1c44 (Initial commit)
    font-size: 12px;
    color: var(--text2);
    line-height: 1.5;
    cursor: pointer;
  }

<<<<<<< HEAD
  .terms label a {
=======
  .cad-terms label a {
>>>>>>> b7e1c44 (Initial commit)
    color: var(--accent);
    text-decoration: none;
    font-weight: 500;
  }

<<<<<<< HEAD
  .btn-primary {
    width: 100%;
    margin-top: 5px;
  }

  .footer-login {
=======
  .cad-footer {
>>>>>>> b7e1c44 (Initial commit)
    text-align: center;
    margin-top: 1.5rem;
    font-size: 12px;
    color: var(--text3);
  }

<<<<<<< HEAD
  .footer-login a {
=======
  .cad-footer a {
>>>>>>> b7e1c44 (Initial commit)
    color: var(--accent);
    text-decoration: none;
    font-weight: 500;
  }
<<<<<<< HEAD
=======

  /* ── MOBILE ── */
  @media (max-width: 480px) {
    .cad-page {
      padding: 1.25rem 0.875rem;
      align-items: flex-start;
      padding-top: 2.5rem;
    }

    .cad-logo {
      width: 46px;
      height: 46px;
      border-radius: 14px;
    }

    .cad-logo svg {
      width: 20px;
      height: 20px;
    }

    .cad-title {
      font-size: 22px;
    }

    .cad-card {
      padding: 1.25rem;
      border-radius: 20px;
    }

    .cad-input-row {
      grid-template-columns: 1fr;
    }

    .cad-top {
      margin-bottom: 1.25rem;
    }
  }

  @media (max-width: 360px) {
    .cad-page {
      padding: 1rem 0.75rem;
      padding-top: 2rem;
    }

    .cad-card {
      padding: 1rem;
    }
  }
>>>>>>> b7e1c44 (Initial commit)
`
