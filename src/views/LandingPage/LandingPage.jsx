import React, { useEffect, useState } from 'react';
import './landing.css';
import { AI_DAILY_LIMIT, PAID_AI_DAILY_LIMIT } from '../../services/freePlanUsage.js';
import { POLICY_URL } from '../../services/policyConsent.js';

import imageHero from '../../assets/hero.png';
import imageConquistasDesktop from '../../assets/Captura de tela 2026-04-11 165237.png';
import imageConquistasMobile from '../../assets/iPhone-14-Plus-dev--apice-ai.netlify.app.webp';

const DISCOUNTS = { monthly: 0, semiannual: 25, annual: 40 };
const CONNECTA_URL = 'https://connectadigital.netlify.app/';

const RADAR_TEMAS = [
  { titulo: 'Inteligência Artificial e ética no Brasil', area: 'Tecnologia' },
  { titulo: 'Saúde mental pós-pandemia entre jovens', area: 'Saúde' },
  { titulo: 'Desinformação e democracia digital', area: 'Sociedade' },
];

const testimonials = [
  {
    initials: 'EJ',
    name: 'elias_jrnunes',
    role: 'Criador e usuário beta',
    text: 'O Ápice nasceu para organizar minha rotina de estudo e testar correções de redação com IA de um jeito mais prático.',
    gradient: 'linear-gradient(135deg, #c8f060, #e0f69a)',
  },
  {
    initials: 'PM',
    name: 'pedro.mkds',
    role: 'Usuário beta',
    text: 'A plataforma ajuda a revisar redações e transformar dúvidas em próximos passos mais claros durante o estudo.',
    gradient: 'linear-gradient(135deg, #4faaf0, #60c8f0)',
  },
  {
    initials: 'UB',
    name: 'Usuario Beta',
    role: 'Teste inicial',
    text: 'Ainda é um projeto em evolução, mas o corretor, o professor IA e os simulados já deixam a preparação mais organizada.',
    gradient: 'linear-gradient(135deg, #a84ff0, #c060f0)',
  },
];

const plans = {
  monthly: { label: 'Mensal', totalPrice: 19.90, pricePerMonth: 19.90, billingPeriodLabel: 'a cada mês' },
  semiannual: { label: 'Semestral', totalPrice: 89.40, pricePerMonth: 14.90, billingPeriodLabel: 'a cada 6 meses' },
  annual: { label: 'Anual', totalPrice: 142.80, pricePerMonth: 11.90, billingPeriodLabel: 'a cada 12 meses' },
};

export default function LandingPage() {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });
  const [billingPeriod, setBillingPeriod] = useState('annual');

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (event) => setDarkMode(event.matches);
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  const selectedPlan = plans[billingPeriod];
  const goTo = (path) => { window.location.href = path; };

  return (
    <div className={`lp-container${darkMode ? ' lp-dark' : ' lp-light'}`}>
      <div className="lp-grid-bg" aria-hidden="true"></div>

      <button className="lp-theme-toggle" onClick={() => setDarkMode((value) => !value)} aria-label="Alternar tema">
        {darkMode ? '☀️' : '🌙'}
      </button>

      <header className="lp-header">
        <nav className="lp-nav">
          <div className="lp-logo">Áp<em>i</em>ce</div>
          <div className="lp-nav-links">
            <a href="#demo">Recursos</a>
            <a href="#pricing">Preços</a>
            <button className="lp-btn-ghost" onClick={() => goTo('/login')}>Entrar</button>
          </div>
        </nav>
      </header>

      <main className="lp-hero">
        <div className="lp-hero-content anim-in">
          <div className="lp-trust-badge">Projeto beta alinhado aos critérios do ENEM</div>
          <h1>Estude redação e ENEM com apoio de IA</h1>
          <p className="lp-hero-subtitle">
            Corretor de redação, Professor IA, radar de temas e simulados em uma plataforma em evolução, feita para rotina real de estudo.
          </p>
          <div className="lp-hero-actions">
            <button className="lp-btn-primary" onClick={() => goTo('/cadastro')}>Começar grátis</button>
            <button className="lp-btn-ghost" onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}>Ver recursos</button>
          </div>
          <div className="lp-hero-stats">
            <div className="lp-stat"><strong>100+</strong><span>Redações corrigidas</span></div>
            <div className="lp-stat"><strong>5+</strong><span>Usuários testando</span></div>
            <div className="lp-stat"><strong>Beta</strong><span>Produto em evolução</span></div>
          </div>
        </div>
        <div className="lp-hero-visual anim-in-right">
          <img src={imageHero} alt="Plataforma Ápice" className="lp-hero-image" />
          <div className="lp-hero-glow"></div>
        </div>
      </main>

      <div className="lp-cta-strip anim-in">
        <span>Mais de 5 usuários já estão testando o Ápice</span>
        <button className="lp-btn-primary" onClick={() => goTo('/cadastro')}>Criar conta grátis</button>
      </div>

      <section id="demo" className="lp-demo-tools">
        <div className="lp-section-header anim-in">
          <span className="lp-section-badge">RECURSOS</span>
          <h2>Ferramentas para estudar com <span>mais direção</span></h2>
          <p>O objetivo é apoiar sua rotina, sem prometer nota, aprovação ou substituir professor/corretor humano.</p>
        </div>

        <div className="lp-tools-grid">
          <div className="lp-tool-card anim-in-left">
            <div className="lp-tool-header">
              <div className="lp-tool-icon">🎯</div>
              <div><h3>Radar de temas</h3><p>Sugestões de tendências para orientar repertório e treino de redação.</p></div>
            </div>
            <div className="lp-tool-preview">
              {RADAR_TEMAS.map((tema) => (
                <div className="lp-radar-mini-card" key={tema.titulo}>
                  <div className="lp-radar-mini-top"><span className="lp-radar-mini-area">{tema.area}</span><span className="lp-radar-mini-prob">tendência</span></div>
                  <strong>{tema.titulo}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="lp-tool-card anim-in-right">
            <div className="lp-tool-header">
              <div className="lp-tool-icon">✍️</div>
              <div><h3>Corretor de redação</h3><p>Estimativa de nota e feedback por competências para revisar pontos de melhoria.</p></div>
            </div>
            <div className="lp-corrector-preview">
              <div className="lp-corrector-score-main">
                <div className="lp-corrector-score-circle"><span>100+</span><small>correções</small></div>
                <p className="lp-corrector-meta">Mais de 100 correções já realizadas em testes reais.</p>
              </div>
              <div className="lp-tool-gate"><button className="lp-btn-primary" onClick={() => goTo('/cadastro')}>Testar o corretor</button></div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="lp-gamification">
        <div className="lp-section-header anim-in">
          <span className="lp-section-badge">ACOMPANHAMENTO</span>
          <h2>Evolução visível, sem exagero</h2>
          <p>Histórico, conquistas e métricas ajudam você a perceber consistência ao longo do tempo.</p>
        </div>
        <div className="lp-gamification-showcase anim-scale">
          <div className="lp-gamification-image-wrap">
            <img src={imageConquistasDesktop} alt="Conquistas do Ápice" className="lp-gamification-image lp-gamification-img--desktop" />
            <img src={imageConquistasMobile} alt="Conquistas do Ápice" className="lp-gamification-image lp-gamification-img--mobile" />
            <div className="lp-gamification-glow"></div>
          </div>
          <div className="lp-gamification-features">
            <div className="lp-gamification-item"><div className="lp-gamification-badge">🏆</div><div><strong>Conquistas</strong><span>Metas para manter o ritmo.</span></div></div>
            <div className="lp-gamification-item"><div className="lp-gamification-badge">📊</div><div><strong>Histórico</strong><span>Acompanhe redações, simulados e evolução.</span></div></div>
            <div className="lp-gamification-item"><div className="lp-gamification-badge">🤖</div><div><strong>Professor IA</strong><span>Use como apoio para dúvidas e revisão.</span></div></div>
          </div>
        </div>
      </section>

      <section className="lp-social-proof">
        <div className="lp-section-header anim-in">
          <span className="lp-section-badge">AVALIAÇÕES</span>
          <h2>Primeiros testes do <span>Ápice</span></h2>
          <p>Depoimentos simples de uso beta, sem prometer aprovação ou resultado garantido.</p>
        </div>
        <div className="lp-testimonials-grid">
          {testimonials.map((item) => (
            <div className="lp-testimonial-card anim-in" key={item.name}>
              <div className="lp-testimonial-header">
                <div className="lp-testimonial-avatar" style={{ background: item.gradient }}>{item.initials}</div>
                <div className="lp-testimonial-info"><strong>{item.name}</strong><span>{item.role}</span></div>
              </div>
              <div className="lp-testimonial-stars">★★★★★</div>
              <p>"{item.text}"</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="lp-pricing">
        <div className="lp-section-header anim-in">
          <span className="lp-section-badge">PLANOS</span>
          <h2>Comece grátis e faça upgrade <span>se fizer sentido</span></h2>
          <p>{AI_DAILY_LIMIT} usos/dia grátis. O plano pago aumenta o limite para {PAID_AI_DAILY_LIMIT} usos/dia.</p>
        </div>
        <div className="lp-billing-toggle anim-in">
          <button className={`lp-toggle-option${billingPeriod === 'monthly' ? ' active' : ''}`} onClick={() => setBillingPeriod('monthly')}>Mensal</button>
          <button className={`lp-toggle-option${billingPeriod === 'semiannual' ? ' active' : ''}`} onClick={() => setBillingPeriod('semiannual')}>Semestral<span className="lp-toggle-badge">-{DISCOUNTS.semiannual}%</span></button>
          <button className={`lp-toggle-option${billingPeriod === 'annual' ? ' active' : ''}`} onClick={() => setBillingPeriod('annual')}>Anual<span className="lp-toggle-badge">-{DISCOUNTS.annual}%</span></button>
        </div>
        <div className="lp-pricing-compare">
          <div className="lp-plan-column anim-in-left"><div className="lp-plan-card"><div className="lp-plan-header"><h3>Grátis</h3><p>Para testar</p><div className="lp-plan-price"><span className="lp-plan-price-value">R$ 0</span><span className="lp-plan-price-period">/mês</span></div></div><button className="lp-plan-cta" onClick={() => goTo('/cadastro')}>Começar grátis</button></div></div>
          <div className="lp-plan-column lp-plan-featured anim-in-right"><div className="lp-plan-card"><div className="lp-plan-header"><h3>Premium {selectedPlan.label}</h3><p>{PAID_AI_DAILY_LIMIT} usos/dia</p><div className="lp-plan-price"><span className="lp-plan-price-value">{selectedPlan.totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span><span className="lp-plan-price-period">/{selectedPlan.billingPeriodLabel}</span></div><div className="lp-plan-price-note">{selectedPlan.pricePerMonth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês em média</div></div><button className="lp-plan-cta lp-plan-cta-primary" onClick={() => goTo('/planos')}>Ver planos</button></div></div>
        </div>
      </section>

      <section id="faq" className="lp-faq">
        <div className="lp-section-header anim-in"><span className="lp-section-badge">FAQ</span><h2>Perguntas frequentes</h2></div>
        <div className="lp-faq-list">
          <div className="lp-faq-item anim-in"><div className="lp-faq-q">A IA substitui um corretor humano?</div><div className="lp-faq-a">Não. Ela usa critérios do ENEM como apoio para estimar nota e apontar melhorias.</div></div>
          <div className="lp-faq-item anim-in"><div className="lp-faq-q">O Radar prevê o tema da prova?</div><div className="lp-faq-a">Não com garantia. Ele sugere tendências para orientar repertório e treino.</div></div>
          <div className="lp-faq-item anim-in"><div className="lp-faq-q">O projeto já está pronto?</div><div className="lp-faq-a">Ele está em fase beta e pode mudar conforme testes reais e feedback dos usuários.</div></div>
        </div>
      </section>

      <section className="lp-final-cta">
        <div className="lp-final-cta-content anim-scale">
          <h2>Teste o Ápice <span>sem promessa milagrosa</span></h2>
          <p>Uma plataforma beta para estudar redação e ENEM com mais organização.</p>
          <button className="lp-btn-primary lp-btn-large" onClick={() => goTo('/cadastro')}>Criar conta grátis</button>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer-grid anim-in">
          <div className="lp-footer-brand"><div className="lp-logo">Áp<em>i</em>ce</div><p>Preparação para o ENEM com inteligência artificial em fase beta.</p></div>
          <div className="lp-footer-col"><h4>Produto</h4><a href="#demo">Recursos</a><a href="#pricing">Preços</a><a href="#features">Acompanhamento</a></div>
          <div className="lp-footer-col"><h4>Conta</h4><a href="/login">Entrar</a><a href="/cadastro">Criar conta</a></div>
          <div className="lp-footer-col"><h4>Legal</h4><a href={POLICY_URL} target="_blank" rel="noreferrer">Privacidade</a><a href={POLICY_URL} target="_blank" rel="noreferrer">Termos</a></div>
        </div>
        <div className="lp-footer-bottom">
          <div className="lp-developed-logos"><a href={CONNECTA_URL} target="_blank" rel="noreferrer"><img src="/developed_by_connecta.svg" alt="Desenvolvido por Connecta" className="lp-logo-connecta" /></a></div>
          <p>&copy; {new Date().getFullYear()} Ápice. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
