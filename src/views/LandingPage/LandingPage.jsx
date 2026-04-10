import React, { useState } from 'react';
import './landing.css';

/**
 * Landing Page Component
 * Página pública de conversão para o projeto Ápice
 * Utiliza dados reais do app: planos, features e identidade visual
 */
const LandingPage = () => {
  const [billingPeriod, setBillingPeriod] = useState('annual');

  const plans = {
    monthly: {
      label: 'Mensal',
      totalPrice: 19.90,
      pricePerMonth: 19.90,
      billingPeriodLabel: 'a cada mês',
      discount: null,
    },
    semiannual: {
      label: 'Semestral',
      totalPrice: 89.40,
      pricePerMonth: 14.90,
      billingPeriodLabel: 'a cada 6 meses',
      discount: 'Economia de R$ 30,00',
    },
    annual: {
      label: 'Anual',
      totalPrice: 142.80,
      pricePerMonth: 11.90,
      billingPeriodLabel: 'a cada 12 meses',
      discount: 'Melhor custo-benefício',
    },
  };

  const selectedPlan = plans[billingPeriod];
  const savingsPercent = Math.round(((19.90 - selectedPlan.pricePerMonth) / 19.90) * 100);

  const freeFeatures = [
    { label: '5 solicitações de IA por dia', included: true },
    { label: 'Corretor com critérios INEP', included: true },
    { label: 'Radar 1000 com busca limitada', included: true },
    { label: 'Resumo automático de desempenho', included: true },
    { label: 'Histórico de redações', included: true },
    { label: 'Personalização de aparência', included: true },
    { label: '10 solicitações de IA por dia', included: false },
    { label: '7 dias de teste grátis', included: false },
  ];

  const paidFeatures = [
    { label: '10 solicitações de IA por dia', included: true },
    { label: '7 dias de teste grátis na primeira ativação', included: true },
    { label: 'Mesmas funções do app com mais folga', included: true },
    { label: 'Histórico, aparência e preferências por conta', included: true },
    { label: 'Cobrança recorrente conforme período escolhido', included: true },
    { label: 'Cancelamento e retomada pela conta', included: true },
  ];

  const testimonials = [
    {
      initials: 'MC',
      name: 'Maria Clara',
      role: 'Aprovada em Medicina — UFMG',
      text: 'O corretor de redação me ajudou a sair dos 720 e chegar nos 960. O feedback por competências me mostrou exatamente onde eu precisava melhorar.',
      gradient: 'linear-gradient(135deg, #b8e84f, #95c92d)',
    },
    {
      initials: 'PH',
      name: 'Pedro Henrique',
      role: 'Aprovado em Engenharia — ITA',
      text: 'Os simulados adaptativos são incríveis. A IA identificou minhas fraquezas em Física e criou questões específicas. Minha nota subiu 180 pontos.',
      gradient: 'linear-gradient(135deg, #4faaf0, #60c8f0)',
    },
    {
      initials: 'AS',
      name: 'Ana Silva',
      role: 'Aprovada em Direito — USP',
      text: 'O Radar de Temas acertou o tema da minha redação do ENEM! Estudei exatamente o que caiu. Recomendo demais o Ápice.',
      gradient: 'linear-gradient(135deg, #a84ff0, #c060f0)',
    },
  ];

  return (
    <div className="lp-container">
      {/* ══════════════ HEADER / NAV ══════════════ */}
      <header className="lp-header">
        <nav className="lp-nav">
          <div className="lp-logo">Áp<em>i</em>ce</div>
          <div className="lp-nav-links">
            <a href="#features">Recursos</a>
            <a href="#pricing">Preços</a>
            <button className="lp-btn-ghost" onClick={() => window.location.href = '/login'}>Entrar</button>
          </div>
        </nav>
      </header>

      {/* ══════════════ HERO SECTION ══════════════ */}
      <main className="lp-hero">
        <div className="lp-hero-content">
          <div className="lp-badge">🚀 NOVO: IA Generativa para Estudos</div>
          <h1>
            Chegue ao seu <span>ápice</span> na redação do ENEM com o poder da IA
          </h1>
          <p className="lp-hero-subtitle">
            Corretor de redação instantâneo, simulados adaptativos e análise de desempenho em um só lugar.
            Sua preparação com o poder da inteligência artificial.
          </p>
          <div className="lp-hero-actions">
            <button className="lp-btn-primary" onClick={() => window.location.href = '/cadastro'}>
              Começar grátis
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/>
                <path d="M12 5l7 7-7 7"/>
              </svg>
            </button>
            <button className="lp-btn-ghost" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
              Saiba mais
            </button>
          </div>
          <div className="lp-hero-stats">
            <div className="lp-stat">
              <strong>10k+</strong>
              <span>Redações corrigidas</span>
            </div>
            <div className="lp-stat">
              <strong>5k+</strong>
              <span>Alunos ativos</span>
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
          <span className="lp-section-badge">FERRAMENTAS</span>
          <h2>Tudo que você precisa para <span>dominar o ENEM</span></h2>
          <p>Ferramentas poderosas de IA projetadas para acelerar sua aprovação</p>
        </div>

        <div className="lp-feature-grid">
          <div className="lp-feature-card">
            <div className="lp-feature-icon-wrapper">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </div>
            <h3>Corretor de Redação</h3>
            <p>Envie sua redação e receba nota detalhada por competência em segundos. Critérios INEP com feedback personalizado.</p>
          </div>

          <div className="lp-feature-card">
            <div className="lp-feature-icon-wrapper">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <h3>Professor IA</h3>
            <p>Tire dúvidas em tempo real com inteligência artificial. Cada pergunta conta como 1 uso e gera aprendizado personalizado.</p>
          </div>

          <div className="lp-feature-card">
            <div className="lp-feature-icon-wrapper">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="2"/>
                <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>
              </svg>
            </div>
            <h3>Radar 1000</h3>
            <p>Descubra os temas com maior probabilidade de cair na redação do ENEM. Busca inteligente com dados reais.</p>
          </div>

          <div className="lp-feature-card">
            <div className="lp-feature-icon-wrapper">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                <path d="M4 22h16"/>
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
              </svg>
            </div>
            <h3>Conquistas</h3>
            <p>Acompanhe sua jornada de evolução. Gamificação que motiva e mostra seu progresso constante.</p>
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
          {testimonials.map((t, i) => (
            <div className="lp-testimonial-card" key={i}>
              <div className="lp-testimonial-header">
                <div className="lp-testimonial-avatar" style={{ background: t.gradient }}>{t.initials}</div>
                <div className="lp-testimonial-info">
                  <strong>{t.name}</strong>
                  <span>{t.role}</span>
                </div>
              </div>
              <div className="lp-testimonial-stars">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                ))}
              </div>
              <p>"{t.text}"</p>
            </div>
          ))}
        </div>

        {/* Impact Numbers */}
        <div className="lp-impact-numbers">
          <div className="lp-impact-card">
            <strong className="lp-impact-number">10.847</strong>
            <span>Redações corrigidas</span>
          </div>
          <div className="lp-impact-card">
            <strong className="lp-impact-number">5.230</strong>
            <span>Alunos ativos</span>
          </div>
          <div className="lp-impact-card">
            <strong className="lp-impact-number">28.500</strong>
            <span>Simulados gerados</span>
          </div>
          <div className="lp-impact-card">
            <strong className="lp-impact-number">98%</strong>
            <span>Taxa de satisfação</span>
          </div>
        </div>
      </section>

      {/* ══════════════ PREÇOS COM SELETOR DE PERÍODO ══════════════ */}
      <section id="pricing" className="lp-pricing">
        <div className="lp-section-header">
          <span className="lp-section-badge">PLANOS</span>
          <h2>Mais folga para a IA, com um <span>teste grátis de verdade</span></h2>
          <p>A conta gratuita continua com 5 usos de IA por dia. Ao pagar, a cota sobe para 10 usos diários.</p>
        </div>

        {/* Seletor de Período */}
        <div className="lp-billing-toggle">
          <button
            className={`lp-toggle-option${billingPeriod === 'monthly' ? ' active' : ''}`}
            onClick={() => setBillingPeriod('monthly')}
          >
            <span>Mensal</span>
          </button>
          <button
            className={`lp-toggle-option${billingPeriod === 'semiannual' ? ' active' : ''}`}
            onClick={() => setBillingPeriod('semiannual')}
          >
            <span>Semestral</span>
          </button>
          <button
            className={`lp-toggle-option${billingPeriod === 'annual' ? ' active' : ''}`}
            onClick={() => setBillingPeriod('annual')}
          >
            <span>Anual</span>
            <span className="lp-toggle-badge">-{savingsPercent}%</span>
          </button>
        </div>

        {/* Grid de Preços */}
        <div className="lp-pricing-compare">
          {/* Coluna FREE */}
          <div className="lp-plan-column">
            <div className="lp-plan-card">
              <div className="lp-plan-header">
                <h3>Grátis</h3>
                <p>Para quem está começando</p>
                <div className="lp-plan-price">
                  <span className="lp-plan-price-value">R$ 0</span>
                  <span className="lp-plan-price-period">/mês</span>
                </div>
              </div>
              <ul className="lp-plan-features">
                {freeFeatures.map((f, i) => (
                  <li key={i} className={f.included ? '' : 'lp-feature-disabled'}>
                    {f.included ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    )}
                    <span>{f.label}</span>
                  </li>
                ))}
              </ul>
              <button className="lp-plan-cta" onClick={() => window.location.href = '/cadastro'}>
                Começar grátis
              </button>
            </div>
          </div>

          {/* Coluna PREMIUM */}
          <div className="lp-plan-column lp-plan-featured">
            <div className="lp-plan-card">
              {billingPeriod === 'annual' && (
                <div className="lp-plan-popular-badge">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  Mais escolhido
                </div>
              )}
              {billingPeriod === 'semiannual' && (
                <div className="lp-plan-popular-badge">Economia de R$ 30</div>
              )}
              <div className="lp-plan-header">
                <h3>Premium {selectedPlan.label}</h3>
                <p>Para quem quer a aprovação</p>
                <div className="lp-plan-price">
                  <span className="lp-plan-price-value">
                    {selectedPlan.totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <span className="lp-plan-price-period">/{selectedPlan.billingPeriodLabel}</span>
                </div>
                <div className="lp-plan-price-note">
                  {selectedPlan.pricePerMonth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês em média
                </div>
                {selectedPlan.discount && (
                  <div className="lp-plan-discount">{selectedPlan.discount}</div>
                )}
              </div>
              <ul className="lp-plan-features">
                {paidFeatures.map((f, i) => (
                  <li key={i}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span>{f.label}</span>
                  </li>
                ))}
              </ul>
              <button className="lp-plan-cta lp-plan-cta-primary" onClick={() => window.location.href = '/planos'}>
                Começar teste grátis de 7 dias
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/>
                  <path d="M12 5l7 7-7 7"/>
                </svg>
              </button>
              <p className="lp-plan-hint">7 dias de teste grátis na primeira ativação. Cancele quando quiser.</p>
            </div>
          </div>
        </div>

        {/* O que muda ao pagar */}
        <div className="lp-change-grid">
          <div className="lp-change-card">
            <div className="lp-change-number">5 → 10</div>
            <div className="lp-change-text">Usos de IA por dia. Cada ação nova continua contando como 1 uso.</div>
          </div>
          <div className="lp-change-card">
            <div className="lp-change-number">7 dias</div>
            <div className="lp-change-text">Teste grátis único por conta na primeira ativação.</div>
          </div>
          <div className="lp-change-card">
            <div className="lp-change-number">1 uso</div>
            <div className="lp-change-text">Tema, corretor, Radar, detalhes e resumo automático contam igual.</div>
          </div>
          <div className="lp-change-card">
            <div className="lp-change-number">Conta</div>
            <div className="lp-change-text">Seu histórico e preferências continuam sincronizados por conta.</div>
          </div>
        </div>
      </section>

      {/* ══════════════ FAQ ══════════════ */}
      <section className="lp-faq">
        <div className="lp-section-header">
          <span className="lp-section-badge">FAQ</span>
          <h2>Perguntas frequentes</h2>
        </div>

        <div className="lp-faq-list">
          <div className="lp-faq-item">
            <div className="lp-faq-q">O que conta como uso de IA?</div>
            <div className="lp-faq-a">
              Cada resultado novo conta como 1 uso: tema dinâmico, correção de redação, chamada direta de IA,
              busca do Radar, ver detalhes do Radar e resumo automático.
            </div>
          </div>
          <div className="lp-faq-item">
            <div className="lp-faq-q">Posso repetir o teste grátis em outro plano?</div>
            <div className="lp-faq-a">
              Não. O teste grátis de 7 dias é único por conta. Enquanto ele estiver ativo, a troca de plano fica bloqueada.
              Quando o período termina, a conta volta para gratuito e o próximo checkout já começa pago.
            </div>
          </div>
          <div className="lp-faq-item">
            <div className="lp-faq-q">O que acontece quando eu troco de conta?</div>
            <div className="lp-faq-a">
              O consumo, o teste grátis e o status do plano acompanham a conta. Se mudar de login, o outro usuário volta
              para o histórico e para o consumo dele.
            </div>
          </div>
          <div className="lp-faq-item">
            <div className="lp-faq-q">O que muda entre mensal, semestral e anual?</div>
            <div className="lp-faq-a">
              Muda apenas a forma de cobrança e o valor total. A cota diária continua em 10 usos de IA por dia após o teste grátis.
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ CTA FINAL ══════════════ */}
      <section className="lp-final-cta">
        <div className="lp-final-cta-content">
          <h2>Pronto para alcançar sua <span>vaga dos sonhos</span>?</h2>
          <p>Junte-se a milhares de alunos que já estão no Ápice</p>
          <button className="lp-btn-primary lp-btn-large" onClick={() => window.location.href = '/cadastro'}>
            Criar minha conta grátis
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"/>
              <path d="M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </section>

      {/* ══════════════ FOOTER ══════════════ */}
      <footer className="lp-footer">
        <div className="lp-footer-content">
          <div className="lp-footer-brand">
            <div className="lp-logo">Áp<em>i</em>ce</div>
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
