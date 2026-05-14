import React from 'react'
import { Link } from 'react-router-dom'
import { POLICY_URL } from '../services/policyConsent.js'

const SUPPORT_EMAIL = 'elias.juriatti@outlook.com'
const SUPPORT_PHONE = '+55 54 9604-0904'
const WHATSAPP_URL = 'https://wa.me/555496040904'
const INSTAGRAM_ELIAS = 'https://instagram.com/elias_jrnunes'
const INSTAGRAM_PEDRO = 'https://instagram.com/pedro.mkds'
const PROJECT_GITHUB = 'https://github.com/elias001011/Apice'
const FEEDBACK_EMAIL = 'elias.juriatti@outlook.com'
const BUG_REPORT_EMAIL = 'elias.juriatti@outlook.com'
const CONNECTA_URL = 'https://connectadigital.netlify.app/'

function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
      <path d="m4 8 8 6 8-6" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5.5 3.5h3.2l1.6 4-2 1.6a16.6 16.6 0 0 0 6.7 6.7l1.6-2 4 1.6v3.2a2 2 0 0 1-2.2 2A17.8 17.8 0 0 1 4.3 5.7a2 2 0 0 1 1.2-2.2Z" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        stroke="none"
        d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.4 7.86 10.96.58.1.79-.24.79-.55 0-.27-.01-.99-.02-1.95-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.78 2.7 1.27 3.36.97.1-.73.4-1.27.72-1.56-2.53-.29-5.18-1.27-5.18-5.65 0-1.25.44-2.28 1.18-3.08-.12-.29-.51-1.44.11-3 0 0 .96-.31 3.14 1.18a10.84 10.84 0 0 1 5.72 0c2.17-1.49 3.14-1.18 3.14-1.18.62 1.56.23 2.71.11 3 .74.8 1.18 1.83 1.18 3.08 0 4.39-2.66 5.36-5.2 5.64.41.35.77 1.05.77 2.12 0 1.53-.01 2.77-.01 3.15 0 .3.2.65.8.54A11.52 11.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"
      />
    </svg>
  )
}

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="footer">
      <style>{footerCss}</style>
      <div className="footer-container">
        <div className="footer-col footer-brand">
          <Link to="/home" className="footer-logo">
            Áp<em>i</em>ce
          </Link>
          <p className="footer-tagline">
            Redação, Radar 1000 e organização da preparação do ENEM em um só lugar.
          </p>
          <div className="footer-socials" aria-label="Redes sociais e projeto">
            <a
              href={INSTAGRAM_ELIAS}
              target="_blank"
              rel="noreferrer"
              className="footer-social-btn"
              aria-label="Instagram de Elias"
              title="Instagram de Elias"
            >
              <InstagramIcon />
            </a>
            <a
              href={INSTAGRAM_PEDRO}
              target="_blank"
              rel="noreferrer"
              className="footer-social-btn"
              aria-label="Instagram de Pedro"
              title="Instagram de Pedro"
            >
              <InstagramIcon />
            </a>
            <a
              href={PROJECT_GITHUB}
              target="_blank"
              rel="noreferrer"
              className="footer-social-btn"
              aria-label="GitHub do projeto"
              title="GitHub do projeto"
            >
              <GithubIcon />
            </a>
          </div>
        </div>

        <div className="footer-col">
          <h4 className="footer-title">Plataforma</h4>
          <ul className="footer-links">
            <li><Link to="/home">Início</Link></li>
            <li><Link to="/corretor">Corretor</Link></li>
            <li><Link to="/radar">Radar 1000</Link></li>
            <li><Link to="/conquistas">Conquistas</Link></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4 className="footer-title">Suporte</h4>
          <ul className="footer-contact">
            <li className="footer-contact-item">
              <span className="footer-contact-icon" aria-hidden="true">
                <EmailIcon />
              </span>
              <div className="footer-contact-content">
                <span className="footer-contact-label">Email</span>
                <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
              </div>
            </li>
            <li className="footer-contact-item">
              <span className="footer-contact-icon" aria-hidden="true">
                <PhoneIcon />
              </span>
              <div className="footer-contact-content">
                <span className="footer-contact-label">WhatsApp / telefone</span>
                <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">{SUPPORT_PHONE}</a>
              </div>
            </li>
          </ul>
        </div>

        <div className="footer-col">
          <h4 className="footer-title">Feedback</h4>
          <ul className="footer-contact">
            <li className="footer-contact-item">
              <span className="footer-contact-icon" aria-hidden="true">
                <EmailIcon />
              </span>
              <div className="footer-contact-content">
                <span className="footer-contact-label">Enviar feedback</span>
                <a href={`mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent('Feedback - Ápice')}`}>Sugestões e elogios</a>
              </div>
            </li>
            <li className="footer-contact-item">
              <span className="footer-contact-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31C15.55 19.37 13.85 20 12 20zm6.31-3.1L7.1 5.69C8.45 4.63 10.15 4 12 4c4.42 0 8 3.58 8 8 0 1.85-.63 3.55-1.69 4.9z" />
                </svg>
              </span>
              <div className="footer-contact-content">
                <span className="footer-contact-label">Relatar bug</span>
                <a href={`mailto:${BUG_REPORT_EMAIL}?subject=${encodeURIComponent('Relatar bug - Ápice')}&body=${encodeURIComponent('Descreva o bug encontrado:\n\nPassos para reproduzir:\n1. \n2. \n3. \n\nComportamento esperado:\n\nComportamento observado:\n\nDispositivo/navegador:\n')}`}>Reportar problema</a>
              </div>
            </li>
          </ul>
        </div>

        <div className="footer-col">
          <h4 className="footer-title">Legal</h4>
          <div className="footer-legal-actions">
            <a href={POLICY_URL} target="_blank" rel="noreferrer" className="footer-legal-link">
              Termos de uso
            </a>
            <a href={POLICY_URL} target="_blank" rel="noreferrer" className="footer-legal-link">
              Política de privacidade
            </a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-developed-logos">
          <a href={CONNECTA_URL} target="_blank" rel="noreferrer" aria-label="Acessar Connecta Digital">
            <img src="/developed_by_connecta.svg" alt="Desenvolvido por Connecta" className="logo-connecta" />
          </a>
        </div>
        <p>© {currentYear} Ápice. Todos os direitos reservados.</p>
      </div>
    </footer>
  )
}

const footerCss = `
  .footer {
    background: var(--footer-surface);
    border-top: 1px solid var(--chrome-border);
    box-shadow: var(--footer-shadow);
    padding: 3rem 1.5rem 1.5rem;
    margin-top: 2rem;
    position: relative;
    overflow: hidden;
  }

  @media (min-width: 768px) {
    .footer {
      margin-top: 4rem;
    }
  }

  .footer-container {
    max-width: 1200px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1.5fr 1fr 1fr 1fr 1fr;
    gap: 1.6rem;
    position: relative;
    z-index: 1;
  }

  @media (max-width: 900px) {
    .footer-container {
      grid-template-columns: 1fr 1fr 1fr;
    }
  }

  @media (max-width: 600px) {
    .footer {
      padding: 2.75rem 1.25rem calc(2.75rem + var(--tab-h) + env(safe-area-inset-bottom));
    }

    .footer-container {
      grid-template-columns: 1fr;
      text-align: left;
      gap: 1.55rem;
      justify-items: stretch;
    }

    .footer-col {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }

    .footer-brand {
      max-width: none;
      align-items: flex-start;
    }

    .footer-links,
    .footer-contact {
      align-items: stretch;
      width: 100%;
    }

    .footer-socials {
      justify-content: flex-start;
    }

    .footer-links a {
      justify-content: flex-start;
      width: 100%;
    }

    .footer-contact {
      width: 100%;
      max-width: none;
      margin: 0;
    }

    .footer-contact-item {
      grid-template-columns: 30px minmax(0, 1fr);
      justify-items: start;
      text-align: left;
      gap: 10px;
    }

    .footer-contact-content {
      align-items: flex-start;
      text-align: left;
    }

    .footer-legal-actions {
      width: 100%;
      max-width: none;
      align-items: flex-start;
    }

    .footer-legal-link {
      justify-content: flex-start;
    }

    .footer-bottom {
      text-align: left;
    }
  }

  .footer-logo {
    font-family: 'DM Serif Display', serif;
    font-size: 1.6rem;
    color: var(--text);
    text-decoration: none;
    display: inline-block;
    margin-bottom: 1rem;
  }

  .footer-logo em {
    font-style: normal;
    color: var(--accent);
  }

  .footer-brand {
    max-width: 30ch;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .footer-tagline {
    font-size: 0.85rem;
    color: var(--text2);
    line-height: 1.6;
    margin-bottom: 0;
  }

  .footer-socials {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    margin-top: 1rem;
  }

  .footer-social-btn {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: var(--bg3);
    color: var(--text2);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    transition: transform 0.2s, color 0.2s, border-color 0.2s, background 0.2s;
    flex-shrink: 0;
  }

  .footer-social-btn:hover {
    transform: translateY(-2px);
    color: var(--accent);
    border-color: var(--accent);
    background: var(--accent-dim);
  }

  .footer-social-btn svg {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
  }

  .footer-title {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 1.25rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .footer-links, .footer-contact {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .footer-links a, .footer-contact-item {
    font-size: 0.9rem;
    color: var(--text2);
    text-decoration: none;
    transition: color 0.2s;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .footer-links a:hover {
    color: var(--accent);
  }

  .footer-contact {
    gap: 12px;
  }

  .footer-contact-item {
    display: grid;
    grid-template-columns: 32px minmax(0, 1fr);
    gap: 10px;
    align-items: center;
  }

  .footer-contact-icon {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    background: var(--accent-dim);
    color: var(--accent);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .footer-contact-icon svg {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
  }

  .footer-contact-content {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;
    min-width: 0;
  }

  .footer-contact-label {
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text3);
  }

  .footer-contact a {
    color: var(--text2);
    text-decoration: none;
    word-break: break-word;
  }

  .footer-contact a:hover {
    color: var(--accent);
  }

  .footer-legal-actions {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    align-items: flex-start;
  }

  .footer-legal-link {
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    min-height: 0;
    padding: 0.2rem 0;
    border: 0;
    background: transparent;
    color: var(--text2);
    font-size: 0.9rem;
    font-weight: 600;
    text-decoration: none;
    transition: transform 0.2s, color 0.2s, opacity 0.2s;
  }

  .footer-legal-link:hover {
    color: var(--accent);
    transform: translateX(2px);
  }

  .footer-bottom {
    max-width: 1200px;
    margin: 2rem auto 0;
    padding-top: 1.5rem;
    border-top: 0.5px solid var(--border);
    text-align: center;
    position: relative;
    z-index: 1;
  }

  .footer-developed-logos {
    display: flex;
    justify-content: center;
    margin-bottom: 1rem;
  }

  .footer-developed-logos a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .footer-developed-logos .logo-connecta {
    display: block;
    width: 240px;
    max-width: 100%;
    height: auto;
    transition: width 0.3s ease;
  }

  @media (max-width: 768px) {
    .footer-developed-logos .logo-connecta {
      width: 180px;
    }
  }

  .footer-bottom p {
    font-size: 0.75rem;
    color: var(--text3);
  }
`
