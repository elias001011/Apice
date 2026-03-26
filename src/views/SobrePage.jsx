import { Link } from 'react-router-dom'
import { POLICY_URL } from '../services/policyConsent.js'

export function SobrePage() {
  return (
    <>
      <style>{sobreCss}</style>
      <Link to="/perfil" className="back-link">
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
        Voltar ao perfil
      </Link>

      <div className="sobre-logo anim anim-d1">
        <div className="sobre-mark">
            <div className="logo-icon" />
        </div>
        <div className="sobre-nome">Ápice</div>
        <div className="sobre-versao">Versão 1.1</div>
      </div>

      <div className="sobre-missao anim anim-d2">
        O Ápice nasceu com um propósito simples: <strong>dar ao aluno de escola pública as mesmas ferramentas que os alunos de cursinho particular têm.</strong> Com inteligência artificial acessível e objetiva, queremos ajudar cada estudante a chegar no seu ápice — seja lá qual for a sua nota de corte.
      </div>

      <div className="card anim anim-d3">
        <a href={POLICY_URL} target="_blank" rel="noreferrer" className="settings-item" style={{ textDecoration: 'none' }}>
          <div className="settings-left">
            <div className="settings-icon">
              <svg viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div className="settings-name">Termos de uso</div>
          </div>
          <div className="settings-chevron"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg></div>
        </a>
        <a href={POLICY_URL} target="_blank" rel="noreferrer" className="settings-item" style={{ textDecoration: 'none' }}>
          <div className="settings-left">
            <div className="settings-icon">
              <svg viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </div>
            <div className="settings-name">Política de privacidade</div>
          </div>
          <div className="settings-chevron"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg></div>
        </a>
      </div>
    </>
  )
}

const sobreCss = `
  .sobre-logo {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem 0 1.5rem;
  }
  .sobre-mark {
    width: 60px;
    height: 60px;
    background: var(--accent);
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
    position: relative;
    color: #0f0f0f;
  }
  .sobre-mark::after {
    content: '';
    position: absolute;
    top: -5px;
    right: -5px;
    width: 10px;
    height: 10px;
    background: var(--accent);
    clip-path: polygon(50% 0%, 61% 35%, 100% 50%, 61% 65%, 50% 100%, 39% 65%, 0% 50%, 39% 35%);
    opacity: 0.5;
  }
  .sobre-mark .logo-icon {
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
  .sobre-nome {
    font-family: 'DM Serif Display', serif;
    font-size: 28px;
    color: var(--text);
  }
  .sobre-versao {
    font-size: 0.8rem;
    color: var(--text3);
    margin-top: 4px;
  }
  .sobre-missao {
    background: var(--card-dark);
    border: 1.5px solid var(--border);
    border-radius: 24px;
    padding: 1.5rem;
    font-size: 0.95rem;
    color: var(--text2);
    line-height: 1.65;
    text-align: center;
    margin-bottom: 1.25rem;
  }
  .sobre-missao strong {
    color: var(--accent);
    font-weight: 500;
  }
`
