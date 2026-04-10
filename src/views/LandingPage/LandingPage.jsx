import React from 'react';
import './landing.css';

/**
 * Landing Page Component (Separated Branch)
 * This page is part of the LandingPage branch and should not be merged to dev yet.
 */
const LandingPage = () => {
  return (
    <div className="lp-container">
      <header className="lp-header">
        <nav className="lp-nav">
          <div className="lp-logo">ÁPICE <span>V2</span></div>
          <div className="lp-nav-links">
            <a href="#features">Recursos</a>
            <a href="#about">Sobre</a>
            <button className="lp-cta-secondary" onClick={() => window.location.href = '/login'}>Entrar</button>
          </div>
        </nav>
      </header>

      <main className="lp-hero">
        <div className="lp-hero-content">
          <div className="lp-badge">EM BREVE</div>
          <h1>Uma Nova Maneira de Alcançar o <span>Ápice</span></h1>
          <p>
            Estamos construindo algo incrível para transformar a sua jornada de estudos. 
            Uma experiência totalmente redesenhada, rápida e inteligente.
          </p>
          <div className="lp-hero-actions">
            <button className="lp-cta-primary">Garantir Acesso Antecipado</button>
            <button className="lp-cta-ghost">Saiba Mais</button>
          </div>
        </div>
        <div className="lp-hero-visual">
          <div className="lp-visual-blob"></div>
          {/* O usuário pode adicionar uma imagem ou ilustração aqui mais tarde */}
        </div>
      </main>

      <section id="features" className="lp-features">
        <h2>O que há de novo?</h2>
        <div className="lp-feature-grid">
          <div className="lp-feature-card">
            <div className="lp-feature-icon">🚀</div>
            <h3>Alta Performance</h3>
            <p>Carregamento instantâneo e transições suaves.</p>
          </div>
          <div className="lp-feature-card">
            <div className="lp-feature-icon">🧠</div>
            <h3>IA Aprimorada</h3>
            <p>Correções e tutorias ainda mais precisos.</p>
          </div>
          <div className="lp-feature-card">
            <div className="lp-feature-icon">🎨</div>
            <h3>Design Premium</h3>
            <p>Interface moderna focada em produtividade.</p>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <p>&copy; {new Date().getFullYear()} Ápice. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
