import React from 'react'
import { Link } from 'react-router-dom'
import { POLICY_URL } from '../services/policyConsent.js'

export function Footer() {
  return (
    <footer className="footer">
      <style>{footerCss}</style>
      <div className="footer-container">
        
        {/* Coluna 1: Logo e Descrição */}
        <div className="footer-col footer-brand">
          <Link to="/home" className="footer-logo">
            Áp<em>i</em>ce
          </Link>
          <p className="footer-tagline">
            Sua jornada rumo à nota 1000 no ENEM com o poder da Inteligência Artificial.
          </p>
          <div className="footer-socials">
            <a href="#" aria-label="Instagram" className="social-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            </a>
            <a href="#" aria-label="LinkedIn" className="social-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
            </a>
            <a href="#" aria-label="WhatsApp" className="social-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 11-7.6-11.7 8.38 8.38 0 013.8.9L21 3z"/></svg>
            </a>
          </div>
        </div>

        {/* Coluna 2: Navegação */}
        <div className="footer-col">
          <h4 className="footer-title">Plataforma</h4>
          <ul className="footer-links">
            <li><Link to="/home">Início</Link></li>
            <li><Link to="/corretor">Corretor</Link></li>
            <li><Link to="/radar">Radar 1000</Link></li>
            <li><Link to="/conquistas">Conquistas</Link></li>
          </ul>
        </div>

        {/* Coluna 3: Contato */}
        <div className="footer-col">
          <h4 className="footer-title">Suporte</h4>
          <ul className="footer-contact">
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mini-icon"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              sac@apice.com
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mini-icon"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.81 12.81 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
              +55 54 9696-9655 (Elias)
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mini-icon"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.81 12.81 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
              +55 54 9604-0904 (Pedro)
            </li>
          </ul>
        </div>

        {/* Coluna 4: Legal */}
        <div className="footer-col">
          <h4 className="footer-title">Privacidade</h4>
          <ul className="footer-links">
            <li><a href={POLICY_URL} target="_blank" rel="noreferrer">Termos de uso</a></li>
            <li><a href={POLICY_URL} target="_blank" rel="noreferrer">Política de privacidade</a></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2025 Ápice. Todos os direitos reservados.</p>
      </div>
    </footer>
  )
}

const footerCss = `
  .footer {
    background: var(--bg2);
    border-top: 1px solid var(--border);
    padding: 3rem 1.5rem 1.5rem;
    margin-top: 2rem;
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
    gap: 2rem;
  }

  @media (max-width: 900px) {
    .footer-container {
      grid-template-columns: 1fr 1fr;
    }
  }

  @media (max-width: 600px) {
    .footer-container {
      grid-template-columns: 1fr;
      text-align: center;
      gap: 2.5rem;
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

  .footer-tagline {
    font-size: 0.85rem;
    color: var(--text2);
    line-height: 1.6;
    margin-bottom: 1.25rem;
  }

  .footer-socials {
    display: flex;
    gap: 12px;
  }

  @media (max-width: 600px) {
    .footer-socials {
      justify-content: center;
    }
  }

  .social-icon {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--bg3);
    color: var(--text2);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    border: 1px solid var(--border);
  }

  .social-icon:hover {
    background: var(--accent-dim);
    border-color: var(--accent);
    color: var(--accent);
    transform: translateY(-2px);
  }

  .social-icon svg {
    width: 18px;
    height: 18px;
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

  .mini-icon {
    width: 14px;
    height: 14px;
    color: var(--accent);
    flex-shrink: 0;
  }

  @media (max-width: 600px) {
    .footer-contact li {
      justify-content: center;
    }
  }

  .footer-bottom {
    max-width: 1200px;
    margin: 2.5rem auto 0;
    padding-top: 1.5rem;
    border-top: 0.5px solid var(--border);
    text-align: center;
  }

  .footer-bottom p {
    font-size: 0.75rem;
    color: var(--text3);
  }
`
