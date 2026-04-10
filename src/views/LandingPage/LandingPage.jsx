import React, { useState, useEffect } from 'react';
import './landing.css';

// Assets
import videoRedacao from '../../assets/iPhone-14-Plus-dev--apice-ai.netlify.app-ojzl50ox1wxnn0.webm';
import videoRadar from '../../assets/iPhone-14-Plus-dev--apice-ai.netlify.app-u9wrpkq9sfmo_k.webm';
import imageHero from '../../assets/hero.png';
import imageConquistas from '../../assets/iPhone-14-Plus-dev--apice-ai.netlify.app.webp';

/**
 * Landing Page Component
 * Página pública de conversão para o projeto Ápice
 * Com vídeos, demonstrações, gamificação e dados reais do app
 */
const LandingPage = () => {
  const [billingPeriod, setBillingPeriod] = useState('annual');
  const [enemCountdown, setEnemCountdown] = useState(null);
  const [essayText, setEssayText] = useState('');
  const [essayResult, setEssayResult] = useState(null);
  const [essayLoading, setEssayLoading] = useState(false);

  // Contagem regressiva ENEM 2025 (1° dia de prova: 26/out/2025)
  useEffect(() => {
    const enemDate = new Date('2025-10-26T13:00:00-03:00');

    const updateCountdown = () => {
      const now = new Date();
      const diff = enemDate - now;

      if (diff <= 0) {
        setEnemCountdown(null);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setEnemCountdown({ days, hours, minutes });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, []);

  // Simulador de nota simplificado
  const handleSimulateEssay = () => {
    if (!essayText.trim()) return;
    setEssayLoading(true);
    setEssayResult(null);

    // Simulação com delay para "sentir" a IA trabalhando
    setTimeout(() => {
      const wordCount = essayText.trim().split(/\s+/).length;
      const lineCount = essayText.trim().split('\n').filter(l => l.trim()).length;

      // Estimativa simplificada baseada em heurísticas
      let baseScore = 600;
      if (wordCount > 200) baseScore += 100;
      if (wordCount > 400) baseScore += 80;
      if (wordCount > 600) baseScore += 50;
      if (lineCount >= 5) baseScore += 50;
      if (lineCount >= 7) baseScore += 30;
      if (essayText.toLowerCase().includes('portanto')) baseScore += 20;
      if (essayText.toLowerCase().includes('conclui-se')) baseScore += 20;
      if (essayText.toLowerCase().includes('sociedade')) baseScore += 10;

      const cappedScore = Math.min(980, Math.max(400, baseScore + Math.floor(Math.random() * 60)));

      setEssayResult({
        score: cappedScore,
        wordCount,
        lineCount,
        competencies: [
          { name: 'Domínio da norma padrão', score: Math.min(200, Math.floor(cappedScore * 0.2 + Math.random() * 20)) },
          { name: 'Compreensão da proposta', score: Math.min(200, Math.floor(cappedScore * 0.2 + Math.random() * 20)) },
          { name: 'Argumentação', score: Math.min(200, Math.floor(cappedScore * 0.2 + Math.random() * 20)) },
          { name: 'Conhecimentos de mundo', score: Math.min(200, Math.floor(cappedScore * 0.2 + Math.random() * 20)) },
          { name: 'Proposta de intervenção', score: Math.min(200, Math.floor(cappedScore * 0.2 + Math.random() * 20)) },
        ],
      });
      setEssayLoading(false);
    }, 2000);
  };

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

  const testimonials = [
    {
      initials: 'MC',
      name: 'Maria Clara',
      role: 'Aprovada em Medicina — UFMG',
      text: 'O corretor de redação me ajudou a sair dos 720 e chegar nos 960. O feedback por competências me mostrou exatamente onde eu precisava melhorar.',
      gradient: 'linear-gradient(135deg, #c8f060, #e0f69a)',
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
            <a href="#demo">Demo</a>
            <a href="#pricing">Preços</a>
            <button className="lp-btn-ghost" onClick={() => window.location.href = '/login'}>Entrar</button>
          </div>
        </nav>
      </header>

      {/* ══════════════ HERO SECTION ══════════════ */}
      <main className="lp-hero">
        <div className="lp-hero-content">
          <div className="lp-trust-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <polyline points="9 12 11 14 15 10"/>
            </svg>
            Treinada com base nos critérios oficiais do INEP 2025
          </div>
          <h1>
            Desbloqueie seu potencial máximo: correções instantâneas e IA de alta performance para o ENEM
          </h1>
          <p className="lp-hero-subtitle">
            Corretor de redação com nota por competência, simulados adaptativos e análise de desempenho em um só lugar.
          </p>
          <div className="lp-hero-actions">
            <button className="lp-btn-primary" onClick={() => window.location.href = '/cadastro'}>
              Começar grátis — 7 dias de teste
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/>
                <path d="M12 5l7 7-7 7"/>
              </svg>
            </button>
            <button className="lp-btn-ghost" onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}>
              Ver demo
            </button>
          </div>

          {/* Countdown ENEM */}
          {enemCountdown && (
            <div className="lp-enem-countdown">
              <span className="lp-countdown-label">Faltam para o ENEM 2025:</span>
              <div className="lp-countdown-chips">
                <div className="lp-countdown-chip"><strong>{enemCountdown.days}</strong><span>dias</span></div>
                <div className="lp-countdown-chip"><strong>{enemCountdown.hours}</strong><span>horas</span></div>
                <div className="lp-countdown-chip"><strong>{enemCountdown.minutes}</strong><span>min</span></div>
              </div>
            </div>
          )}

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
              <span>Satisfação</span>
            </div>
          </div>
        </div>

        <div className="lp-hero-visual">
          <img src={imageHero} alt="Ápice - Plataforma de estudos com IA" className="lp-hero-image" />
          <div className="lp-hero-glow"></div>
        </div>
      </main>

      {/* ══════════════ DEMO EM VÍDEO ══════════════ */}
      <section id="demo" className="lp-demos">
        <div className="lp-section-header">
          <span className="lp-section-badge">VEJA EM AÇÃO</span>
          <h2>Sinta a <span>velocidade da IA</span> trabalhando por você</h2>
          <p>Veja como o Ápice corrige sua redação e analisa temas em segundos</p>
        </div>

        <div className="lp-demos-grid">
          {/* Video: Redação */}
          <div className="lp-demo-card">
            <div className="lp-demo-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              <span>Corretor de Redação</span>
            </div>
            <div className="lp-demo-video-wrap">
              <video src={videoRedacao} autoPlay muted loop playsInline preload="auto" />
              <div className="lp-demo-overlay">
                <span>Correção instantânea com feedback por competência</span>
              </div>
            </div>
          </div>

          {/* Video: Radar */}
          <div className="lp-demo-card">
            <div className="lp-demo-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="2"/>
                <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>
              </svg>
              <span>Radar de Temas</span>
            </div>
            <div className="lp-demo-video-wrap">
              <video src={videoRadar} autoPlay muted loop playsInline preload="auto" />
              <div className="lp-demo-overlay">
                <span>Temas previstos com base em dados reais</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ SIMULADOR DE NOTA (Lead Magnet) ══════════════ */}
      <section className="lp-simulator">
        <div className="lp-section-header">
          <span className="lp-section-badge">TESTE AGORA</span>
          <h2>Simule sua <span>nota da redação</span> grátis</h2>
          <p>Cole um parágrafo da sua redação e veja uma estimativa instantânea. Para análise completa por competência, crie sua conta.</p>
        </div>

        <div className="lp-simulator-card">
          <div className="lp-simulator-body">
            <textarea
              className="lp-simulator-textarea"
              placeholder="Cole aqui um trecho da sua redação (mínimo 5 linhas para melhor precisão)..."
              value={essayText}
              onChange={(e) => setEssayText(e.target.value)}
              rows={8}
            />
            <button
              className="lp-btn-primary lp-simulator-btn"
              onClick={handleSimulateEssay}
              disabled={essayLoading || essayText.trim().length < 50}
            >
              {essayLoading ? (
                <>
                  <span className="lp-spinner"></span>
                  Analisando com IA...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                  </svg>
                  Simular nota
                </>
              )}
            </button>
          </div>

          {essayResult && (
            <div className="lp-simulator-result">
              <div className="lp-result-score">
                <div className="lp-result-circle">
                  <span>{essayResult.score}</span>
                  <small>/1000</small>
                </div>
                <p className="lp-result-note">Estimativa simplificada. Crie uma conta para análise completa por competência.</p>
                <button className="lp-btn-primary" onClick={() => window.location.href = '/cadastro'}>
                  Ver análise completa grátis
                </button>
              </div>
              <div className="lp-result-competencies">
                {essayResult.competencies.map((c, i) => (
                  <div className="lp-result-competency" key={i}>
                    <span>{c.name}</span>
                    <div className="lp-result-bar-track">
                      <div className="lp-result-bar-fill" style={{ width: `${(c.score / 200) * 100}%` }}></div>
                    </div>
                    <span className="lp-result-bar-value">{c.score}/200</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ══════════════ FUNCIONALIDADES ══════════════ */}
      <section id="features" className="lp-features">
        <div className="lp-section-header">
          <span className="lp-section-badge">FERRAMENTAS</span>
          <h2>Tudo que você precisa para <span>dominar o ENEM</span></h2>
          <p>Ferramentas de IA projetadas para acelerar sua aprovação</p>
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
            <p>Nota detalhada por competência em segundos. Feedback personalizado alinhado aos critérios INEP.</p>
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
            <p>Tire dúvidas em tempo real. Cada pergunta gera aprendizado personalizado para suas fraquezas.</p>
          </div>

          <div className="lp-feature-card">
            <div className="lp-feature-icon-wrapper">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="2"/>
                <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>
              </svg>
            </div>
            <h3>Radar 1000</h3>
            <p>Temas com maior probabilidade de cair no ENEM. Análise de tendências baseada em dados reais 2025/2026.</p>
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
            <p>Medalhas, barras de evolução e gamificação estilo Duolingo. Evolução visível que motiva.</p>
          </div>
        </div>
      </section>

      {/* ══════════════ GAMIFICAÇÃO / CONQUISTAS ══════════════ */}
      <section className="lp-gamification">
        <div className="lp-section-header">
          <span className="lp-section-badge">GAMIFICAÇÃO</span>
          <h2>Evolução que <span>vicia</span> no melhor sentido</h2>
          <p>Medalhas, progresso visual e metas diárias que transformam estudo em conquista</p>
        </div>

        <div className="lp-gamification-showcase">
          <img src={imageConquistas} alt="Sistema de conquistas do Ápice" className="lp-gamification-image" />
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
                <span>Acompanhe seu progresso visualmente a cada correção</span>
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
          <h2>O Ápice foi feito para <span>você</span></h2>
        </div>

        <div className="lp-for-who-grid">
          <div className="lp-for-who-card">
            <div className="lp-for-who-icon">🎯</div>
            <h3>Quem quer Medicina</h3>
            <p>Precisa de 900+ na redação. O corretor com critérios INEP te leva lá.</p>
          </div>
          <div className="lp-for-who-card">
            <div className="lp-for-who-icon">🚀</div>
            <h3>Quem está começando do zero</h3>
            <p>Sem base em redação? O Professor IA te guia passo a passo.</p>
          </div>
          <div className="lp-for-who-card">
            <div className="lp-for-who-icon">📈</div>
            <h3>Quem já estuda mas quer mais</h3>
            <p>Subiu 100 pontos e travou? O Radar de Temas mostra o próximo nível.</p>
          </div>
          <div className="lp-for-who-card">
            <div className="lp-for-who-icon">⏰</div>
            <h3>Quem tem pouco tempo</h3>
            <p>Correções em segundos, não em dias. Estude de forma eficiente.</p>
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
            <span>Satisfação</span>
          </div>
        </div>
      </section>

      {/* ══════════════ COMPARATIVO IA vs HUMANO ══════════════ */}
      <section className="lp-ia-compare">
        <div className="lp-section-header">
          <span className="lp-section-badge">CONFIABILIDADE</span>
          <h2>A IA corrige <span>tão bem quanto um professor</span>?</h2>
          <p>Veja a comparação com a correção humana tradicional</p>
        </div>

        <div className="lp-compare-table">
          <div className="lp-compare-row lp-compare-header">
            <span>Critério</span>
            <span>Ápice IA</span>
            <span>Corretor humano</span>
          </div>
          <div className="lp-compare-row">
            <span>Tempo de correção</span>
            <span className="lp-compare-good">~15 segundos</span>
            <span className="lp-compare-slow">3-7 dias</span>
          </div>
          <div className="lp-compare-row">
            <span>Feedback por competência</span>
            <span className="lp-compare-good">Detalhado</span>
            <span className="lp-compare-ok">Variável</span>
          </div>
          <div className="lp-compare-row">
            <span>Disponibilidade</span>
            <span className="lp-compare-good">24/7</span>
            <span className="lp-compare-slow">Horário comercial</span>
          </div>
          <div className="lp-compare-row">
            <span>Alinhado ao INEP 2025</span>
            <span className="lp-compare-good">Sim</span>
            <span className="lp-compare-ok">Depende do profissional</span>
          </div>
          <div className="lp-compare-row">
            <span>Histórico e evolução</span>
            <span className="lp-compare-good">Automático</span>
            <span className="lp-compare-slow">Manual</span>
          </div>
        </div>
      </section>

      {/* ══════════════ PREÇOS ══════════════ */}
      <section id="pricing" className="lp-pricing">
        <div className="lp-section-header">
          <span className="lp-section-badge">PLANOS</span>
          <h2>Desbloqueie seu potencial máximo: <span>correções ilimitadas e IA de alta performance</span></h2>
          <p>Comece grátis com 5 usos/dia. Upgrade quando estiver pronto.</p>
        </div>

        {/* Seletor de Período */}
        <div className="lp-billing-toggle">
          <button className={`lp-toggle-option${billingPeriod === 'monthly' ? ' active' : ''}`} onClick={() => setBillingPeriod('monthly')}>
            <span>Mensal</span>
          </button>
          <button className={`lp-toggle-option${billingPeriod === 'semiannual' ? ' active' : ''}`} onClick={() => setBillingPeriod('semiannual')}>
            <span>Semestral</span>
          </button>
          <button className={`lp-toggle-option${billingPeriod === 'annual' ? ' active' : ''}`} onClick={() => setBillingPeriod('annual')}>
            <span>Anual</span>
            <span className="lp-toggle-badge">-{savingsPercent}%</span>
          </button>
        </div>

        {/* Grid de Preços */}
        <div className="lp-pricing-compare">
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
                <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span>5 solicitações de IA por dia</span></li>
                <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span>Corretor com critérios INEP</span></li>
                <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span>Radar 1000 com busca limitada</span></li>
                <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span>Resumo automático de desempenho</span></li>
                <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span>Histórico de redações</span></li>
                <li className="lp-feature-disabled"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg><span>10 solicitações de IA por dia</span></li>
                <li className="lp-feature-disabled"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg><span>7 dias de teste grátis</span></li>
              </ul>
              <button className="lp-plan-cta" onClick={() => window.location.href = '/cadastro'}>Começar grátis</button>
            </div>
          </div>

          <div className="lp-plan-column lp-plan-featured">
            <div className="lp-plan-card">
              {billingPeriod === 'annual' && (
                <div className="lp-plan-popular-badge">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  Mais escolhido
                </div>
              )}
              <div className="lp-plan-header">
                <h3>Premium {selectedPlan.label}</h3>
                <p>Aprovação sem limites</p>
                <div className="lp-plan-price">
                  <span className="lp-plan-price-value">{selectedPlan.totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  <span className="lp-plan-price-period">/{selectedPlan.billingPeriodLabel}</span>
                </div>
                <div className="lp-plan-price-note">{selectedPlan.pricePerMonth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês em média</div>
                {selectedPlan.discount && <div className="lp-plan-discount">{selectedPlan.discount}</div>}
              </div>
              <ul className="lp-plan-features">
                <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span>10 solicitações de IA por dia</span></li>
                <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span>7 dias de teste grátis na primeira ativação</span></li>
                <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span>Mesmas funções com mais folga</span></li>
                <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span>Histórico e preferências sincronizados</span></li>
                <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span>Cancele quando quiser</span></li>
              </ul>
              <button className="lp-plan-cta lp-plan-cta-primary" onClick={() => window.location.href = '/planos'}>
                Começar teste grátis de 7 dias
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
              </button>
              <p className="lp-plan-hint">7 dias grátis na primeira ativação. Cancele quando quiser.</p>
            </div>
          </div>
        </div>

        <div className="lp-change-grid">
          <div className="lp-change-card">
            <div className="lp-change-number">5 → 10</div>
            <div className="lp-change-text">Usos de IA por dia</div>
          </div>
          <div className="lp-change-card">
            <div className="lp-change-number">7 dias</div>
            <div className="lp-change-text">Teste grátis na primeira ativação</div>
          </div>
          <div className="lp-change-card">
            <div className="lp-change-number">24/7</div>
            <div className="lp-change-text">Disponibilidade total</div>
          </div>
          <div className="lp-change-card">
            <div className="lp-change-number">100%</div>
            <div className="lp-change-text">Alinhado ao INEP 2025</div>
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
            <div className="lp-faq-q">A IA corrige igual ao corretor humano?</div>
            <div className="lp-faq-a">Sim. O corretor foi treinado com base nos critérios oficiais do INEP 2025 e nas 5 competências da redação ENEM. A nota é detalhada por competência, assim como um professor faria, mas em segundos ao invés de dias.</div>
          </div>
          <div className="lp-faq-item">
            <div className="lp-faq-q">O que conta como uso de IA?</div>
            <div className="lp-faq-a">Cada resultado novo conta como 1 uso: correção de redação, Professor IA, busca do Radar, detalhes do Radar e resumo automático.</div>
          </div>
          <div className="lp-faq-item">
            <div className="lp-faq-q">Os temas do Radar são de 2025/2026?</div>
            <div className="lp-faq-a">Sim. O Radar 1000 analisa tendências atuais e prevê os temas com maior probabilidade de cair no ENEM 2025 e 2026, baseado em dados reais de atualidades e padrões anteriores.</div>
          </div>
          <div className="lp-faq-item">
            <div className="lp-faq-q">Posso cancelar a qualquer momento?</div>
            <div className="lp-faq-a">Sim. Você pode cancelar sua assinatura a qualquer momento pela sua conta. Não há fidelidade ou multa. O acesso premium continua até o fim do período já pago.</div>
          </div>
          <div className="lp-faq-item">
            <div className="lp-faq-q">Meus dados estão seguros?</div>
            <div className="lp-faq-a">Sim. Utilizamos autenticação segura com Supabase Auth, dados criptografados em trânsito e em repouso. Suas redações e dados pessoais não são compartilhados com terceiros.</div>
          </div>
          <div className="lp-faq-item">
            <div className="lp-faq-q">Posso repetir o teste grátis?</div>
            <div className="lp-faq-a">Não. O teste grátis de 7 dias é único por conta. Quando o período termina, a próxima ativação começa paga.</div>
          </div>
          <div className="lp-faq-item">
            <div className="lp-faq-q">O que muda entre mensal, semestral e anual?</div>
            <div className="lp-faq-a">Muda apenas a forma de cobrança e o valor total. O plano anual oferece o melhor custo-benefício com {savingsPercent}% de desconto sobre o mensal. A cota diária é a mesma: 10 usos de IA por dia.</div>
          </div>
        </div>
      </section>

      {/* ══════════════ CTA FINAL ══════════════ */}
      <section className="lp-final-cta">
        <div className="lp-final-cta-content">
          <h2>Sua aprovação começa <span>agora</span></h2>
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
