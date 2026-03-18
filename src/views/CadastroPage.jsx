import { Link, useNavigate } from 'react-router-dom'

export function CadastroPage() {
  const navigate = useNavigate()

  return (
    <>
      <style>{cadastroCss}</style>
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
        </div>
      </div>
    </>
  )
}

const cadastroCss = `
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

  .logo-mark {
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
  }

  .logo-mark:hover {
    transform: scale(1.05);
    opacity: 0.9;
  }

  .logo-mark svg {
    width: 23px;
    height: 23px;
  }

  .page-title {
    font-family: 'DM Serif Display', serif;
    font-size: 28px;
    color: var(--text);
    letter-spacing: -0.4px;
    margin-bottom: 5px;
    text-align: center;
  }

  .page-sub {
    font-size: 13px;
    color: var(--text2);
    text-align: center;
  }

  .card-form {
    background: var(--bg2);
    border: 1.5px solid var(--border2);
    border-radius: 24px;
    padding: 2rem;
  }

  .input-group {
    margin-bottom: 13px;
  }

  .input-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 13px;
  }

  .terms {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin: 1rem 0;
  }

  .terms input[type="checkbox"] {
    width: 16px;
    height: 16px;
    margin-top: 1px;
    accent-color: var(--accent);
    flex-shrink: 0;
    cursor: pointer;
  }

  .terms label {
    font-size: 12px;
    color: var(--text2);
    line-height: 1.5;
    cursor: pointer;
  }

  .terms label a {
    color: var(--accent);
    text-decoration: none;
    font-weight: 500;
  }

  .btn-primary {
    width: 100%;
    margin-top: 5px;
  }

  .footer-login {
    text-align: center;
    margin-top: 1.5rem;
    font-size: 12px;
    color: var(--text3);
  }

  .footer-login a {
    color: var(--accent);
    text-decoration: none;
    font-weight: 500;
  }
`
