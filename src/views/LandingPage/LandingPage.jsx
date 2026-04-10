import React from 'react';
import './landing.css';

/**
 * Landing Page Component
 * Página pública de conversão para o projeto Ápice
 */
const LandingPage = () => {
  return (
    <div className="lp-container">
      {/* ══════════════ HEADER / NAV ══════════════ */}
      <header className="lp-header">
        <nav className="lp-nav">
          <div className="lp-logo">ÁPICE</div>
          <div className="lp-nav-links">
            <a href="#features">Recursos</a>
            <a href="#pricing">Preços</a>
            <button className="lp-cta-secondary" onClick={() => window.location.href = '/login'}>Entrar</button>
          </div>
        </nav>
      </header>

      {/* ══════════════ HERO SECTION ══════════════ */}
      <main className="lp-hero">
        <div className="lp-hero-content">
          <div className="lp-badge">🚀 NOVO: IA Generativa para Estudos</div>
          <h1>
            Chegue ao seu <span>Ápice</span> no ENEM com Inteligência Artificial
          </h1>
          <p className="lp-hero-subtitle">
            Corretor de redação instantâneo, simulados adaptativos e análise de desempenho em um só lugar.
          </p>
          <div className="lp-hero-actions">
            <button className="lp-cta-primary" onClick={() => window.location.href = '/cadastro'}>
              Começar Agora — É Grátis
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
            <button className="lp-cta-ghost" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
              Saiba Mais
            </button>
          </div>
          <div className="lp-hero-stats">
            <div className="lp-stat">
              <strong>10k+</strong>
              <span>Redações Corrigidas</span>
            </div>
            <div className="lp-stat">
              <strong>5k+</strong>
              <span>Alunos Ativos</span>
            </div>
            <div className="lp-stat">
              <strong>98%</strong>
              <span>Aprovação</span>
            </div>
          </div>
        </div>

        <div className="lp-hero-visual">
          <div className="lp-mockup-card">
            <div className="lp-mockup-header">
              <div className="lp-mockup-dots">
                <span></span><span></span><span></span>
              </div>
              <span className="lp-mockup-title">Corretor de Redação</span>
            </div>
            <div className="lp-mockup-body">
              <div className="lp-mockup-score">
                <div className="lp-score-circle">
                  <span>960</span>
                  <small>/1000</small>
                </div>
                <div className="lp-score-details">
                  <div className="lp-score-bar">
                    <span className="lp-bar-label">Competência 1</span>
                    <div className="lp-bar-track"><div className="lp-bar-fill" style={{ width: '95%' }}></div></div>
                  </div>
                  <div className="lp-score-bar">
                    <span className="lp-bar-label">Competência 2</span>
                    <div className="lp-bar-track"><div className="lp-bar-fill" style={{ width: '90%' }}></div></div>
                  </div>
                  <div className="lp-score-bar">
                    <span className="lp-bar-label">Competência 3</span>
                    <div className="lp-bar-track"><div className="lp-bar-fill" style={{ width: '98%' }}></div></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="lp-hero-glow"></div>
        </div>
      </main>

      {/* ══════════════ FUNCIONALIDADES ══════════════ */}
      <section id="features" className="lp-features">
        <div className="lp-section-header">
          <span className="lp-section-badge">COMO FUNCIONA</span>
          <h2>Tudo que você precisa para <span>dominar o ENEM</span></h2>
          <p>Ferramentas poderosas de IA projetadas para acelerar sua aprovação</p>
        </div>

        <div className="lp-feature-grid">
          {/* Feature 1 */}
          <div className="lp-feature-card">
            <div className="lp-feature-icon-wrapper">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <h3>Corretor de Redação</h3>
            <p>Nota 1000 em segundos com feedback detalhado por competência e sugestões personalizadas de melhoria.</p>
          </div>

          {/* Feature 2 */}
          <div className="lp-feature-card">
            <div className="lp-feature-icon-wrapper">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <h3>Simulados Inteligentes</h3>
            <p>Questões selecionadas pela IA com base no que você mais precisa estudar para maximizar sua nota.</p>
          </div>

          {/* Feature 3 */}
          <div className="lp-feature-card">
            <div className="lp-feature-icon-wrapper">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
            </div>
            <h3>Análise de Desempenho</h3>
            <p>Um mapa completo das suas dificuldades e evolução constante com gráficos interativos.</p>
          </div>

          {/* Feature 4 */}
          <div className="lp-feature-card">
            <div className="lp-feature-icon-wrapper">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </div>
            <h3>Radar de Temas</h3>
            <p>Preveja os temas mais quentes do ENEM com nossa análise de tendências baseada em dados reais.</p>
          </div>
        </div>
      </section>

      {/* ══════════════ PROVA SOCIAL ══════════════ */}
      <section className="lp-social-proof">
        <div className="lp-section-header">
          <span className="lp-section-badge">DEPOIMENTOS</span>
          <h2>Quem usa <span>Ápice</span> aprova</h2>
        </div>

        <div className="lp-testimonials-grid">
          {/* Testimonial 1 */}
          <div className="lp-testimonial-card">
            <div className="lp-testimonial-header">
              <div className="lp-testimonial-avatar">MC</div>
              <div className="lp-testimonial-info">
                <strong>Maria Clara</strong>
                <span>Aprovada em Medicina — UFMG</span>
              </div>
            </div>
            <div className="lp-testimonial-stars">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <p>"O corretor de redação me ajudou a sair dos 720 e chegar nos 960. O feedback por competências me mostrou exatamente onde eu precisava melhorar."</p>
          </div>

          {/* Testimonial 2 */}
          <div className="lp-testimonial-card">
            <div className="lp-testimonial-header">
              <div className="lp-testimonial-avatar" style={{ background: 'linear-gradient(135deg, #4faaf0, #60c8f0)' }}>PH</div>
              <div className="lp-testimonial-info">
                <strong>Pedro Henrique</strong>
                <span>Aprovado em Engenharia — ITA</span>
              </div>
            </div>
            <div className="lp-testimonial-stars">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <p>"Os simulados adaptativos são incríveis. A IA identificou minhas fraquezas em Física e criou questões específicas. Minha nota subiu 180 pontos."</p>
          </div>

          {/* Testimonial 3 */}
          <div className="lp-testimonial-card">
            <div className="lp-testimonial-header">
              <div className="lp-testimonial-avatar" style={{ background: 'linear-gradient(135deg, #a84ff0, #c060f0)' }}>AS</div>
              <div className="lp-testimonial-info">
                <strong>Ana Silva</strong>
                <span>Aprovada em Direito — USP</span>
              </div>
            </div>
            <div className="lp-testimonial-stars">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <p>"O Radar de Temas acertou o tema da minha redação do ENEM! Estudei exatamente o que caiu. Recomendo demais o Ápice."</p>
          </div>
        </div>

        {/* Impact Numbers */}
        <div className="lp-impact-numbers">
          <div className="lp-impact-card">
            <strong className="lp-impact-number">10.847</strong>
            <span>Redações Corrigidas</span>
          </div>
          <div className="lp-impact-card">
            <strong className="lp-impact-number">5.230</strong>
            <span>Alunos Ativos</span>
          </div>
          <div className="lp-impact-card">
            <strong className="lp-impact-number">28.500</strong>
            <span>Simulados Gerados</span>
          </div>
          <div className="lp-impact-card">
            <strong className="lp-impact-number">98%</strong>
            <span>Taxa de Satisfação</span>
          </div>
        </div>
      </section>

      {/* ══════════════ PREÇOS ══════════════ */}
      <section id="pricing" className="lp-pricing">
        <div className="lp-section-header">
          <span className="lp-section-badge">PLANOS</span>
          <h2>Escolha o plano ideal para <span>sua aprovação</span></h2>
          <p>Comece grátis e faça upgrade quando estiver pronto</p>
        </div>

        <div className="lp-pricing-grid">
          {/* Free Plan */}
          <div className="lp-pricing-card">
            <div className="lp-pricing-header">
              <h3>Grátis</h3>
              <p>Para quem está começando</p>
              <div className="lp-price">
                <span className="lp-price-value">R$ 0</span>
                <span className="lp-price-period">/mês</span>
              </div>
            </div>
            <ul className="lp-pricing-features">
              <li>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                3 redações por mês
              </li>
              <li>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                1 simulado por semana
              </li>
              <li>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Análise básica de desempenho
              </li>
              <li>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Radar de temas (acesso limitado)
              </li>
              <li className="lp-feature-disabled">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                IA avançada e feedback detalhado
              </li>
              <li className="lp-feature-disabled">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                Histórico ilimitado
              </li>
            </ul>
            <button className="lp-pricing-cta" onClick={() => window.location.href = '/cadastro'}>
              Começar Grátis
            </button>
          </div>

          {/* Premium Plan */}
          <div className="lp-pricing-card lp-pricing-featured">
            <div className="lp-pricing-popular-badge">MAIS POPULAR</div>
            <div className="lp-pricing-header">
              <h3>Premium</h3>
              <p>Para quem quer a aprovação</p>
              <div className="lp-price">
                <span className="lp-price-value">R$ 29,90</span>
                <span className="lp-price-period">/mês</span>
              </div>
            </div>
            <ul className="lp-pricing-features">
              <li>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Redações ilimitadas
              </li>
              <li>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Simulados ilimitados e adaptativos
              </li>
              <li>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Análise avançada com gráficos
              </li>
              <li>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Radar de temas completo
              </li>
              <li>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                IA avançada e feedback detalhado
              </li>
              <li>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Histórico e estatísticas completas
              </li>
            </ul>
            <button className="lp-pricing-cta lp-pricing-cta-primary" onClick={() => window.location.href = '/planos'}>
              Assinar Premium
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════ CTA FINAL ══════════════ */}
      <section className="lp-final-cta">
        <div className="lp-final-cta-content">
          <h2>Pronto para alcançar sua <span>vaga dos sonhos</span>?</h2>
          <p>Junte-se a milhares de alunos que já estão no Ápice</p>
          <button className="lp-cta-primary lp-cta-large" onClick={() => window.location.href = '/cadastro'}>
            Criar Minha Conta Grátis
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
        </div>
      </section>

      {/* ══════════════ FOOTER ══════════════ */}
      <footer className="lp-footer">
        <div className="lp-footer-content">
          <div className="lp-footer-brand">
            <div className="lp-logo">ÁPICE</div>
            <p>Transformando a preparação para o ENEM com inteligência artificial.</p>
          </div>

          <div className="lp-footer-links">
            <div className="lp-footer-col">
              <h4>Produto</h4>
              <a href="#features">Recursos</a>
              <a href="#pricing">Preços</a>
              <a href="/corretor">Corretor</a>
            </div>
            <div className="lp-footer-col">
              <h4>Empresa</h4>
              <a href="/sobre">Sobre</a>
              <a href="#">Blog</a>
              <a href="#">Contato</a>
            </div>
            <div className="lp-footer-col">
              <h4>Legal</h4>
              <a href="#">Privacidade</a>
              <a href="#">Termos de Uso</a>
              <a href="#">Cookies</a>
            </div>
          </div>
        </div>

        <div className="lp-footer-bottom">
          <p>&copy; {new Date().getFullYear()} Ápice. Todos os direitos reservados.</p>
          <div className="lp-footer-social">
            <a href="#" aria-label="Instagram">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
            </a>
            <a href="#" aria-label="Twitter">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/>
              </svg>
            </a>
            <a href="#" aria-label="YouTube">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/>
                <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
