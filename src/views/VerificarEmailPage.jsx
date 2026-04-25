import { useEffect } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'

export function VerificarEmailPage() {
  const location = useLocation()
  const navigate = useNavigate()

  // Pega o email passado pelo CadastroPage via state
  const email = location.state?.email || ''

  // Se não vier email na rota, redireciona para cadastro
  useEffect(() => {
    if (!email) {
      navigate('/cadastro', { replace: true })
    }
  }, [email, navigate])

  return (
    <>
      <style>{verifCss}</style>
      <div className="verif-page">
        <div className="verif-glow" aria-hidden="true" />
        <div className="verif-wrap">

          {/* Logo */}
          <div className="verif-logo-wrap anim anim-d1">
            <Link to="/login" className="verif-logo" style={{ textDecoration: 'none' }}>
              <div className="logo-icon" />
            </Link>
          </div>

          <div className="verif-card anim anim-d2">
            {/* Ícone envelope */}
            <div className="verif-envelope">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="3" />
                <polyline points="2,4 12,13 22,4" />
              </svg>
            </div>

            <h1 className="verif-title">Verifique seu e-mail</h1>
            <p className="verif-desc">
              Enviamos um link de confirmação para
            </p>
            <p className="verif-email">{email}</p>
            <p className="verif-desc" style={{ marginTop: '0.5rem' }}>
              Abra o e-mail e clique no link para ativar sua conta. Após confirmar, você será redirecionado automaticamente.
            </p>

            <div className="verif-spam-notice">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div>
                <strong>Não recebeu o e-mail?</strong>
                <span>Verifique a caixa de spam ou lixo eletrônico. O link de confirmação tem validade de 24 horas.</span>
              </div>
            </div>
          </div>

          <div className="verif-footer anim anim-d3">
            <Link to="/login">← Voltar ao login</Link>
          </div>
        </div>
      </div>
    </>
  )
}

const verifCss = `
  .verif-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem 1rem;
    position: relative;
  }

  .verif-glow {
    position: fixed;
    top: -200px;
    left: 50%;
    transform: translateX(-50%);
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(var(--accent-rgb), 0.07) 0%, transparent 65%);
    pointer-events: none;
    z-index: 0;
  }

  .verif-wrap {
    width: 100%;
    max-width: 460px;
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .verif-logo-wrap {
    margin-bottom: 1.75rem;
  }

  .verif-logo {
    width: 52px;
    height: 52px;
    background: var(--accent);
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #0f0f0f;
  }

  .verif-logo .logo-icon {
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

  .verif-card {
    background: var(--bg2);
    border: 1.5px solid var(--border2);
    border-radius: 24px;
    padding: 2.5rem 2rem;
    width: 100%;
    text-align: center;
  }

  .verif-envelope {
    width: 72px;
    height: 72px;
    background: rgba(var(--accent-rgb), 0.1);
    border: 1.5px solid rgba(var(--accent-rgb), 0.25);
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1.5rem;
    color: var(--accent);
    animation: envelope-pulse 2.5s ease-in-out infinite;
  }

  .verif-envelope svg {
    width: 36px;
    height: 36px;
  }

  @keyframes envelope-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(var(--accent-rgb), 0.18); }
    50% { box-shadow: 0 0 0 10px rgba(var(--accent-rgb), 0); }
  }

  .verif-title {
    font-family: 'DM Serif Display', serif;
    font-size: 1.7rem;
    color: var(--text);
    margin-bottom: 0.75rem;
    font-weight: 400;
  }

  .verif-desc {
    font-size: 0.9rem;
    color: var(--text2);
    line-height: 1.6;
    margin: 0;
  }

  .verif-email {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--accent);
    margin: 0.2rem 0 0;
    word-break: break-all;
  }

  .verif-spam-notice {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem 1.15rem;
    margin-top: 1.25rem;
    border-radius: 16px;
    background: var(--bg3);
    border: 1px solid var(--border);
  }

  .verif-spam-notice svg {
    flex-shrink: 0;
    color: var(--accent);
    margin-top: 2px;
  }

  .verif-spam-notice div {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .verif-spam-notice strong {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text);
  }

  .verif-spam-notice span {
    font-size: 0.78rem;
    color: var(--text2);
    line-height: 1.5;
  }

  .verif-hint {
    font-size: 0.78rem;
    color: var(--text3, var(--text2));
    margin-top: 1rem;
    opacity: 0.7;
  }

  .verif-footer {
    margin-top: 1.5rem;
    font-size: 0.82rem;
    color: var(--text3, var(--text2));
  }

  .verif-footer a {
    color: var(--accent);
    text-decoration: none;
    font-weight: 500;
  }

  .verif-footer a:hover {
    text-decoration: underline;
  }

  @media (max-width: 480px) {
    .verif-card { padding: 1.75rem 1.25rem; }
    .verif-title { font-size: 1.45rem; }
  }
`
