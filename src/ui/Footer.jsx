import React from 'react'
import { Link } from 'react-router-dom'
import { POLICY_URL } from '../services/policyConsent.js'

const SUPPORT_EMAIL = 'elias.juriatti@outlook.com'
const SUPPORT_PHONE = '+55 54 9604-0904'
const WHATSAPP_URL = 'https://wa.me/555496040904'
const INSTAGRAM_ELIAS = 'https://instagram.com/elias_jrnunes'
const INSTAGRAM_PEDRO = 'https://instagram.com/pedro.mkds'
const PROJECT_GITHUB = 'https://github.com/elias001011/Apice'

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
            <li>
              <span className="footer-contact-label">Email</span>
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            </li>
            <li>
              <span className="footer-contact-label">WhatsApp / telefone</span>
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">{SUPPORT_PHONE}</a>
            </li>
          </ul>
        </div>

        <div className="footer-col">
          <h4 className="footer-title">Redes e projeto</h4>
          <ul className="footer-links">
            <li><a href={INSTAGRAM_ELIAS} target="_blank" rel="noreferrer">@elias_jrnunes</a></li>
            <li><a href={INSTAGRAM_PEDRO} target="_blank" rel="noreferrer">@pedro.mkds</a></li>
            <li><a href={PROJECT_GITHUB} target="_blank" rel="noreferrer">GitHub do projeto</a></li>
            <li><a href={POLICY_URL} target="_blank" rel="noreferrer">Termos e privacidade</a></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© {currentYear} Ápice. Todos os direitos reservados.</p>
      </div>
    </footer>
  )
}

const footerCss = `
  .footer {
    background: linear-gradient(180deg, rgba(var(--accent-rgb), 0.03), transparent 28%), var(--bg2);
    border-top: 1px solid var(--border);
    padding: 3rem 1.5rem 1.5rem;
    margin-top: 2rem;
    position: relative;
    overflow: hidden;
  }

  .footer::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at top right, rgba(var(--accent-rgb), 0.08), transparent 45%);
    pointer-events: none;
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
    grid-template-columns: 1.5fr 1fr 1.5fr 1fr;
    gap: 1.6rem;
    position: relative;
    z-index: 1;
  }

  @media (max-width: 900px) {
    .footer-container {
      grid-template-columns: 1fr 1fr;
    }
  }

  @media (max-width: 600px) {
    .footer {
      padding: 2.75rem 1.25rem calc(2.75rem + var(--tab-h) + env(safe-area-inset-bottom));
    }

    .footer-container {
      grid-template-columns: 1fr;
      text-align: center;
      gap: 2rem;
      justify-items: center;
    }

    .footer-col {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .footer-brand {
      max-width: none;
    }

    .footer-links,
    .footer-contact {
      align-items: center;
      width: 100%;
    }

    .footer-links a {
      justify-content: center;
      width: 100%;
    }

    .footer-contact li {
      align-items: center;
      justify-content: center;
      width: 100%;
      text-align: center;
    }

    .footer-contact a {
      text-align: center;
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
  }

  .footer-tagline {
    font-size: 0.85rem;
    color: var(--text2);
    line-height: 1.6;
    margin-bottom: 0;
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

  .footer-links a, .footer-contact li {
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

  .footer-contact li {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
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

  .footer-bottom {
    max-width: 1200px;
    margin: 2rem auto 0;
    padding-top: 1.5rem;
    border-top: 0.5px solid var(--border);
    text-align: center;
    position: relative;
    z-index: 1;
  }

  .footer-bottom p {
    font-size: 0.75rem;
    color: var(--text3);
  }
`
