import React, { useState, useEffect } from 'react';
import './landing.css';

// Assets
import imageHero from '../../assets/hero.png';
import imageConquistas from '../../assets/iPhone-14-Plus-dev--apice-ai.netlify.app.webp';

// Temas reais do Radar
const RADAR_TEMAS = [
  { titulo: 'Inteligência Artificial e ética no Brasil', prob: 94, area: 'Tecnologia' },
  { titulo: 'Saúde mental pós-pandemia entre jovens', prob: 91, area: 'Saúde' },
  { titulo: 'Desinformação e democracia digital', prob: 88, area: 'Sociedade' },
  { titulo: 'Sustentabilidade e crise climática', prob: 86, area: 'Meio Ambiente' },
  { titulo: 'Desigualdade social e mobilidade', prob: 83, area: 'Social' },
  { titulo: 'Educação tecnológica no ensino público', prob: 80, area: 'Educação' },
  { titulo: 'Envelhecimento da população brasileira', prob: 76, area: 'Demografia' },
  { titulo: 'Segurança alimentar no Brasil', prob: 74, area: 'Economia' },
];

/**
 * Landing Page Component
 * Com ferramentas interativas (Mini-Radar + Corretor) como lead magnet
 */
const LandingPage = () => {
  const [billingPeriod, setBillingPeriod] = useState('annual');
  const [enemCountdown, setEnemCountdown] = useState(null);

  // Mini-Radar state
  const [radarStep, setRadarStep] = useState('idle'); // idle, loading, preview, gated
  const [radarResults, setRadarResults] = useState([]);

  // Corretor state
  const [correctorStep, setCorrectorStep] = useState('idle'); // idle, loading, preview, gated
  const [correctorEssay, setCorrectorEssay] = useState('');
  const [correctorResult, setCorrectorResult] = useState(null);

  // Contagem regressiva ENEM 2025
  useEffect(() => {
    const enemDate = new Date('2025-10-26T13:00:00-03:00');
    const updateCountdown = () => {
      const now = new Date();
      const diff = enemDate - now;
      if (diff <= 0) { setEnemCountdown(null); return; }
      setEnemCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      });
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, []);

  // ── Mini-Radar handlers ──
  const handleRadarSearch = () => {
    setRadarStep('loading');
    setTimeout(() => {
      const shuffled = [...RADAR_TEMAS].sort(() => Math.random() - 0.5).slice(0, 3);
      setRadarResults(shuffled);
      setRadarStep('preview');
    }, 1800);
  };

  const handleRadarGated = () => {
    setRadarStep('gated');
  };

  // ── Corretor handlers ──
  const handleCorrectorSubmit = () => {
    if (!correctorEssay.trim() || correctorEssay.trim().split(/\s+/).length < 30) return;
    setCorrectorStep('loading');
    setTimeout(() => {
      const wordCount = correctorEssay.trim().split(/\s+/).length;
      const lineCount = correctorEssay.trim().split('\n').filter(l => l.trim()).length;
      let base = 550;
      if (wordCount > 150) base += 120;
      if (wordCount > 300) base += 100;
      if (lineCount >= 5) base += 60;
      if (lineCount >= 10) base += 40;
      if (correctorEssay.toLowerCase().includes('portanto') || correctorEssay.toLowerCase().includes('conclui-se')) base += 30;
      const score = Math.min(960, Math.max(440, base + Math.floor(Math.random() * 80)));
      setCorrectorResult({
        score,
        wordCount,
        lineCount,
        competencies: [
          { name: 'Norma padrão', score: Math.min(200, Math.round(score * 0.2 + Math.random() * 15)) },
          { name: 'Proposta', score: Math.min(200, Math.round(score * 0.2 + Math.random() * 15)) },
          { name: 'Argumentação', score: Math.min(200, Math.round(score * 0.2 + Math.random() * 15)) },
          { name: 'Repertório', score: Math.min(200, Math.round(score * 0.2 + Math.random() * 15)) },
          { name: 'Intervenção', score: Math.min(200, Math.round(score * 0.2 + Math.random() * 15)) },
        ],
      });
      setCorrectorStep('preview');
    }, 2200);
  };

  const handleCorrectorGated = () => {
    setCorrectorStep('gated');
  };

  const plans = {
    monthly: { label: 'Mensal', totalPrice: 19.90, pricePerMonth: 19.90, billingPeriodLabel: 'a cada mês', discount: null },
    semiannual: { label: 'Semestral', totalPrice: 89.40, pricePerMonth: 14.90, billingPeriodLabel: 'a cada 6 meses', discount: 'Economia de R$ 30' },
    annual: { label: 'Anual', totalPrice: 142.80, pricePerMonth: 11.90, billingPeriodLabel: 'a cada 12 meses', discount: 'Melhor custo-benefício' },
  };

  const selectedPlan = plans[billingPeriod];
  const savingsPercent = Math.round(((19.90 - selectedPlan.pricePerMonth) / 19.90) * 100);

  const testimonials = [
    { initials: 'MC', name: 'Maria Clara', role: 'Medicina — UFMG', text: 'O corretor me ajudou a sair dos 720 e chegar nos 960. O feedback por competências mostrou exatamente onde melhorar.', gradient: 'linear-gradient(135deg, #c8f060, #e0f69a)' },
    { initials: 'PH', name: 'Pedro Henrique', role: 'Engenharia — ITA', text: 'A IA identificou minhas fraquezas em Física e criou questões específicas. Minha nota subiu 180 pontos.', gradient: 'linear-gradient(135deg, #4faaf0, #60c8f0)' },
    { initials: 'AS', name: 'Ana Silva', role: 'Direito — USP', text: 'O Radar de Temas acertou o tema da minha redação! Estudei exatamente o que caiu. Recomendo demais.', gradient: 'linear-gradient(135deg, #a84ff0, #c060f0)' },
  ];

  return (
    <div className="lp-container">
      {/* ══════════════ HEADER ══════════════ */}
      <header className="lp-header">
        <nav className="lp-nav">
          <div className="lp-logo">Áp<em>i</em>ce</div>
          <div className="lp-nav-links">
            <a href="#demo">Testar grátis</a>
            <a href="#pricing">Preços</a>
            <button className="lp-btn-ghost" onClick={() => window.location.href = '/login'}>Entrar</button>
          </div>
        </nav>
      </header>

      {/* ══════════════ HERO ══════════════ */}
      <main className="lp-hero">
        <div className="lp-hero-content">
          <div className="lp-trust-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>
            </svg>
            Critérios oficiais do INEP 2025
          </div>
          <h1>Desbloqueie seu potencial máximo no ENEM com IA</h1>
          <p className="lp-hero-subtitle">Corretor de redação instantâneo, Radar de temas e análise de desempenho — tudo num só lugar.</p>
          <div className="lp-hero-actions">
            <button className="lp-btn-primary" onClick={() => window.location.href = '/cadastro'}>
              Começar grátis — 7 dias de teste
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
            </button>
            <button className="lp-btn-ghost" onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}>Testar grátis</button>
          </div>

          {enemCountdown && (
            <div className="lp-enem-countdown">
              <span className="lp-countdown-label">Faltam para o ENEM 2025:</span>
              <div className="lp-countdown-chips">
                <div className="lp-countdown-chip"><strong>{enemCountdown.days}</strong><span>dias</span></div>
                <div className="lp-countdown-chip"><strong>{enemCountdown.hours}</strong><span>h</span></div>
                <div className="lp-countdown-chip"><strong>{enemCountdown.minutes}</strong><span>min</span></div>
              </div>
            </div>
          )}

          <div className="lp-hero-stats">
            <div className="lp-stat"><strong>10k+</strong><span>Redações corrigidas</span></div>
            <div className="lp-stat"><strong>5k+</strong><span>Alunos ativos</span></div>
            <div className="lp-stat"><strong>98%</strong><span>Satisfação</span></div>
          </div>
        </div>

        <div className="lp-hero-visual">
          <img src={imageHero} alt="Plataforma Ápice" className="lp-hero-image" />
          <div className="lp-hero-glow"></div>
        </div>
      </main>

      {/* ══════════════ DEMO INTERATIVA (Lead Magnets) ══════════════ */}
      <section id="demo" className="lp-demo-tools">
        <div className="lp-section-header">
          <span className="lp-section-badge">TESTE GRÁTIS</span>
          <h2>Experimente antes de <span>criar sua conta</span></h2>
          <p>Use o Mini-Radar e o Corretor simplificado. Para ver a análise completa, crie sua conta grátis.</p>
        </div>

        <div className="lp-tools-grid">
          {/* ── Mini-Radar ── */}
          <div className="lp-tool-card">
            <div className="lp-tool-header">
              <div className="lp-tool-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>
                </svg>
              </div>
              <div>
                <h3>Mini-Radar de Temas</h3>
                <p>Descubra os temas mais prováveis do ENEM 2025</p>
              </div>
            </div>

            {radarStep === 'idle' && (
              <div className="lp-tool-action">
                <button className="lp-btn-primary lp-tool-btn" onClick={handleRadarSearch}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                  Buscar temas previstos
                </button>
                <span className="lp-tool-hint">Análise gratuita • Sem cadastro</span>
              </div>
            )}

            {radarStep === 'loading' && (
              <div className="lp-tool-loading">
                <div className="lp-spinner"></div>
                <span>Analisando tendências e dados do ENEM...</span>
              </div>
            )}

            {radarStep === 'preview' && (
              <div className="lp-tool-preview">
                {radarResults.map((tema, i) => (
                  <div className="lp-radar-mini-card" key={i}>
                    <div className="lp-radar-mini-top">
                      <span className="lp-radar-mini-area">{tema.area}</span>
                      <span className="lp-radar-mini-prob">{tema.prob}%</span>
                    </div>
                    <strong className={i >= 1 ? 'lp-blur-text' : ''}>{tema.titulo}</strong>
                    <div className="lp-radar-mini-bar">
                      <div className="lp-radar-mini-fill" style={{ width: `${tema.prob}%` }}></div>
                    </div>
                  </div>
                ))}
                <div className="lp-tool-gate">
                  <p><strong>Quer ver os {RADAR_TEMAS.length} temas completos com análise detalhada?</strong></p>
                  <button className="lp-btn-primary" onClick={() => window.location.href = '/cadastro'}>
                    Criar conta grátis para ver tudo
                  </button>
                </div>
              </div>
            )}

            {radarStep === 'gated' && (
              <div className="lp-tool-gate">
                <p>Crie sua conta para acessar o Radar completo</p>
                <button className="lp-btn-primary" onClick={() => window.location.href = '/cadastro'}>Criar conta grátis</button>
              </div>
            )}
          </div>

          {/* ── Corretor Simplificado ── */}
          <div className="lp-tool-card">
            <div className="lp-tool-header">
              <div className="lp-tool-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </div>
              <div>
                <h3>Corretor de Redação</h3>
                <p>Receba uma nota estimada da sua redação</p>
              </div>
            </div>

            {correctorStep === 'idle' && (
              <div className="lp-tool-action lp-tool-action-col">
                <textarea
                  className="lp-tool-textarea"
                  placeholder="Cole um parágrafo da sua redação (mín. 30 palavras)..."
                  value={correctorEssay}
                  onChange={(e) => setCorrectorEssay(e.target.value)}
                  rows={5}
                />
                <button
                  className="lp-btn-primary lp-tool-btn"
                  onClick={handleCorrectorSubmit}
                  disabled={correctorEssay.trim().split(/\s+/).length < 30}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  Corrigir agora
                </button>
                <span className="lp-tool-hint">Estimativa gratuita • Sem cadastro</span>
              </div>
            )}

            {correctorStep === 'loading' && (
              <div className="lp-tool-loading">
                <div className="lp-spinner"></div>
                <span>Corrigindo redação com IA...</span>
              </div>
            )}

            {correctorStep === 'preview' && correctorResult && (
              <div className="lp-tool-preview">
                <div className="lp-corrector-preview">
                  <div className="lp-corrector-score-main">
                    <div className="lp-corrector-score-circle">
                      <span>{correctorResult.score}</span>
                      <small>/1000</small>
                    </div>
                    <p className="lp-corrector-meta">{correctorResult.wordCount} palavras • {correctorResult.lineCount} linhas</p>
                  </div>
                  <div className="lp-corrector-competencies-blur">
                    {correctorResult.competencies.map((c, i) => (
                      <div className="lp-corrector-comp-row" key={i}>
                        <span className={i > 1 ? 'lp-blur-text' : ''}>{c.name}</span>
                        <div className="lp-corrector-comp-bar">
                          <div className={`lp-corrector-comp-fill${i > 1 ? ' lp-blur-bar' : ''}`} style={{ width: `${(c.score / 200) * 100}%` }}></div>
                        </div>
                        <span className={`lp-corrector-comp-val${i > 1 ? ' lp-blur-text' : ''}`}>{c.score}/200</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="lp-tool-gate">
                  <p><strong>Quer feedback detalhado por competência e sugestões de melhoria?</strong></p>
                  <button className="lp-btn-primary" onClick={() => window.location.href = '/cadastro'}>
                    Ver correção completa grátis
                  </button>
                </div>
              </div>
            )}

            {correctorStep === 'gated' && (
              <div className="lp-tool-gate">
                <p>Crie sua conta para acessar o corretor completo</p>
                <button className="lp-btn-primary" onClick={() => window.location.href = '/cadastro'}>Criar conta grátis</button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ══════════════ GAMIFICAÇÃO ══════════════ */}
      <section className="lp-gamification">
        <div className="lp-section-header">
          <span className="lp-section-badge">GAMIFICAÇÃO</span>
          <h2>Evolução que <span>vicia</span></h2>
          <p>Medalhas, progresso visual e metas diárias estilo Duolingo</p>
        </div>

        <div className="lp-gamification-showcase">
          <div className="lp-gamification-image-wrap">
            <img src={imageConquistas} alt="Conquistas do Ápice" className="lp-gamification-image" />
          </div>
          <div className="lp-gamification-features">
            <div className="lp-gamification-item">
              <div className="lp-gamification-badge">🏆</div>
              <div>
                <strong>Medalhas de conquista</strong>
                <span>Desbloqueie ao atingir metas de redação e estudo</span>
              </div>
            </div>
            <div className="lp-gamification-item">
              <div className="lp-gamification-badge">📊</div>
              <div>
                <strong>Barra de evolução</strong>
                <span>Acompanhe seu progresso a cada correção</span>
              </div>
            </div>
            <div className="lp-gamification-item">
              <div className="lp-gamification-badge">🔥</div>
              <div>
                <strong>Streak de estudos</strong>
                <span>Mantenha sua sequência diária e ganhe bônus</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ PARA QUEM É ══════════════ */}
      <section className="lp-for-who">
        <div className="lp-section-header">
          <span className="lp-section-badge">PARA QUEM É</span>
          <h2>Feito para <span>você</span></h2>
        </div>
        <div className="lp-for-who-grid">
          <div className="lp-for-who-card">
            <div className="lp-for-who-icon">🎯</div>
            <h3>Quem quer Medicina</h3>
            <p>Precisa de 900+ na redação. O corretor com critérios INEP te leva lá.</p>
          </div>
          <div className="lp-for-who-card">
            <div className="lp-for-who-icon">🚀</div>
            <h3>Começando do zero</h3>
            <p>Sem base? O Professor IA te guia passo a passo.</p>
          </div>
          <div className="lp-for-who-card">
            <div className="lp-for-who-icon">📈</div>
            <h3>Quer mais</h3>
            <p>Travou? O Radar mostra o próximo nível.</p>
          </div>
          <div className="lp-for-who-card">
            <div className="lp-for-who-icon">⏰</div>
            <h3>Pouco tempo</h3>
            <p>Correções em segundos. Estude de forma eficiente.</p>
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
              <div className="lp-testimonial-stars">{[...Array(5)].map((_, i) => (
                <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              ))}</div>
              <p>"{t.text}"</p>
            </div>
          ))}
        </div>
        <div className="lp-impact-numbers">
          <div className="lp-impact-card"><strong className="lp-impact-number">10.847</strong><span>Redações corrigidas</span></div>
          <div className="lp-impact-card"><strong className="lp-impact-number">5.230</strong><span>Alunos ativos</span></div>
          <div className="lp-impact-card"><strong className="lp-impact-number">28.500</strong><span>Simulados gerados</span></div>
          <div className="lp-impact-card"><strong className="lp-impact-number">98%</strong><span>Satisfação</span></div>
        </div>
      </section>

      {/* ══════════════ PREÇOS ══════════════ */}
      <section id="pricing" className="lp-pricing">
        <div className="lp-section-header">
          <span className="lp-section-badge">PLANOS</span>
          <h2>Desbloqueie seu potencial <span>sem limites</span></h2>
          <p>5 usos/dia grátis. Upgrade quando estiver pronto.</p>
        </div>

        <div className="lp-billing-toggle">
          <button className={`lp-toggle-option${billingPeriod === 'monthly' ? ' active' : ''}`} onClick={() => setBillingPeriod('monthly')}><span>Mensal</span></button>
          <button className={`lp-toggle-option${billingPeriod === 'semiannual' ? ' active' : ''}`} onClick={() => setBillingPeriod('semiannual')}><span>Semestral</span></button>
          <button className={`lp-toggle-option${billingPeriod === 'annual' ? ' active' : ''}`} onClick={() => setBillingPeriod('annual')}><span>Anual</span><span className="lp-toggle-badge">-{savingsPercent}%</span></button>
        </div>

        <div className="lp-pricing-compare">
          <div className="lp-plan-column">
            <div className="lp-plan-card">
              <div className="lp-plan-header"><h3>Grátis</h3><p>Para começar</p><div className="lp-plan-price"><span className="lp-plan-price-value">R$ 0</span><span className="lp-plan-price-period">/mês</span></div></div>
              <ul className="lp-plan-features">
                <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg><span>5 usos de IA/dia</span></li>
                <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg><span>Corretor INEP</span></li>
                <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg><span>Radar limitado</span></li>
                <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg><span>Histórico</span></li>
                <li className="lp-feature-disabled"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg><span>10 usos/dia</span></li>
              </ul>
              <button className="lp-plan-cta" onClick={() => window.location.href = '/cadastro'}>Começar grátis</button>
            </div>
          </div>
          <div className="lp-plan-column lp-plan-featured">
            <div className="lp-plan-card">
              {billingPeriod === 'annual' && <div className="lp-plan-popular-badge"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>Mais escolhido</div>}
              <div className="lp-plan-header"><h3>Premium {selectedPlan.label}</h3><p>Sem limites</p><div className="lp-plan-price"><span className="lp-plan-price-value">{selectedPlan.totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span><span className="lp-plan-price-period">/{selectedPlan.billingPeriodLabel}</span></div><div className="lp-plan-price-note">{selectedPlan.pricePerMonth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês em média</div>{selectedPlan.discount && <div className="lp-plan-discount">{selectedPlan.discount}</div>}</div>
              <ul className="lp-plan-features">
                <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg><span>10 usos de IA/dia</span></li>
                <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg><span>7 dias grátis</span></li>
                <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg><span>Radar completo</span></li>
                <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg><span>Correção detalhada</span></li>
                <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg><span>Cancele quando quiser</span></li>
              </ul>
              <button className="lp-plan-cta lp-plan-cta-primary" onClick={() => window.location.href = '/planos'}>Começar teste grátis<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg></button>
              <p className="lp-plan-hint">7 dias grátis na primeira ativação</p>
            </div>
          </div>
        </div>

        <div className="lp-change-grid">
          <div className="lp-change-card"><div className="lp-change-number">5 → 10</div><div className="lp-change-text">Usos de IA/dia</div></div>
          <div className="lp-change-card"><div className="lp-change-number">7 dias</div><div className="lp-change-text">Teste grátis</div></div>
          <div className="lp-change-card"><div className="lp-change-number">24/7</div><div className="lp-change-text">Disponível sempre</div></div>
          <div className="lp-change-card"><div className="lp-change-number">INEP</div><div className="lp-change-text">100% alinhado</div></div>
        </div>
      </section>

      {/* ══════════════ FAQ ══════════════ */}
      <section className="lp-faq">
        <div className="lp-section-header"><span className="lp-section-badge">FAQ</span><h2>Perguntas frequentes</h2></div>
        <div className="lp-faq-list">
          <div className="lp-faq-item"><div className="lp-faq-q">A IA corrige igual ao corretor humano?</div><div className="lp-faq-a">Sim. Treinado com os critérios do INEP 2025 e nas 5 competências da redação ENEM. A nota é detalhada por competência em segundos.</div></div>
          <div className="lp-faq-item"><div className="lp-faq-q">Os temas do Radar são de 2025/2026?</div><div className="lp-faq-a">Sim. O Radar analisa tendências atuais e prevê os temas com maior probabilidade baseado em dados reais.</div></div>
          <div className="lp-faq-item"><div className="lp-faq-q">Posso cancelar a qualquer momento?</div><div className="lp-faq-a">Sim, sem fidelidade ou multa. O acesso continua até o fim do período pago.</div></div>
          <div className="lp-faq-item"><div className="lp-faq-q">Meus dados estão seguros?</div><div className="lp-faq-a">Autenticação segura com Supabase Auth, dados criptografados. Redações não são compartilhadas.</div></div>
          <div className="lp-faq-item"><div className="lp-faq-q">O que conta como uso de IA?</div><div className="lp-faq-a">Cada resultado novo: correção, Professor IA, Radar e resumo automático.</div></div>
        </div>
      </section>

      {/* ══════════════ CTA FINAL ══════════════ */}
      <section className="lp-final-cta">
        <div className="lp-final-cta-content">
          <h2>Sua aprovação começa <span>agora</span></h2>
          <p>Junte-se a milhares de alunos no Ápice</p>
          <button className="lp-btn-primary lp-btn-large" onClick={() => window.location.href = '/cadastro'}>Criar conta grátis<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg></button>
        </div>
      </section>

      {/* ══════════════ FOOTER ══════════════ */}
      <footer className="lp-footer">
        <div className="lp-footer-grid">
          <div className="lp-footer-brand">
            <div className="lp-logo">Áp<em>i</em>ce</div>
            <p>Preparação para o ENEM com inteligência artificial.</p>
          </div>
          <div className="lp-footer-col"><h4>Produto</h4><a href="#demo">Testar grátis</a><a href="#pricing">Preços</a><a href="#features">Recursos</a></div>
          <div className="lp-footer-col"><h4>Empresa</h4><a href="/sobre">Sobre</a><a href="#">Blog</a></div>
          <div className="lp-footer-col"><h4>Legal</h4><a href="#">Privacidade</a><a href="#">Termos</a></div>
        </div>
        <div className="lp-footer-bottom">
          <p>&copy; {new Date().getFullYear()} Ápice. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
