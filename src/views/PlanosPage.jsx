import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FREE_PLAN_FEATURES,
  PREMIUM_BENEFITS,
  PREMIUM_PLAN_FEATURES,
  PRICING_PLANS,
  getQuotaInfo,
} from '../services/upgradeTrigger.js'
import { getCurrentPlanTier } from '../services/freePlanUsage.js'

export function PlanosPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('annual')
  const planTier = getCurrentPlanTier()
  const isPro = planTier !== 'free'
  const quotaInfo = getQuotaInfo ? getQuotaInfo() : null

  const activePlan = PRICING_PLANS.find((p) => p.key === selectedPeriod) || PRICING_PLANS[0]

  const formatPrice = (value) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <>
      <style>{planosCss}</style>
      <div className="view-container">

        {/* Back link */}
        <Link to="/perfil" className="back-link">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Voltar ao perfil
        </Link>

        {/* Header */}
        <div className="planos-header anim anim-d1">
          <div className="planos-badge">Planos</div>
          <h1 className="planos-title">
            {isPro ? 'Você é Premium! 🎉' : 'Evolua para o Premium'}
          </h1>
          <p className="planos-subtitle">
            {isPro
              ? 'Obrigado por apoiar o Ápice. Você tem acesso a todos os recursos sem limites.'
              : 'Remova os limites diários e acesse ferramentas exclusivas para chegar ao 1000.'}
          </p>

          {/* Current plan badge */}
          <div className={`planos-current-badge ${isPro ? 'pro' : 'free'}`}>
            <span className="planos-current-dot" />
            Plano Atual: <strong>{isPro ? 'Premium' : 'Gratuito'}</strong>
            {!isPro && quotaInfo && (
              <span className="planos-quota-inline">
                · {quotaInfo.used}/{quotaInfo.limit} usos hoje
              </span>
            )}
          </div>
        </div>

        {!isPro && (
          <>
            {/* Period Selector */}
            <div className="planos-period-selector anim anim-d2">
              <div className="period-selector-inner">
                {PRICING_PLANS.map((plan) => (
                  <button
                    key={plan.key}
                    id={`period-${plan.key}`}
                    className={`period-btn ${selectedPeriod === plan.key ? 'active' : ''}`}
                    onClick={() => setSelectedPeriod(plan.key)}
                  >
                    <span className="period-btn-label">{plan.label}</span>
                    {plan.discount && (
                      <span className="period-btn-discount">{plan.discount}</span>
                    )}
                  </button>
                ))}
              </div>
              {activePlan.recommended && (
                <div className="period-recommended-hint">
                  ✨ Melhor custo-benefício
                </div>
              )}
            </div>

            {/* Pricing Cards */}
            <div className="planos-cards-grid anim anim-d2">
              {/* Free Card */}
              <div className="plan-card plan-card--free">
                <div className="plan-card-header">
                  <div className="plan-card-tier">Gratuito</div>
                  <div className="plan-card-price">
                    <span className="plan-price-value">R$ 0</span>
                    <span className="plan-price-period">/mês</span>
                  </div>
                  <p className="plan-card-desc">Bom para começar e explorar a plataforma.</p>
                </div>

                <div className="plan-card-features">
                  {FREE_PLAN_FEATURES.map((f) => (
                    <div key={f.label} className={`plan-feature-row ${f.included ? 'included' : 'excluded'}`}>
                      <span className="plan-feature-icon">
                        {f.included ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        )}
                      </span>
                      <span className="plan-feature-label">{f.label}</span>
                    </div>
                  ))}
                </div>

                <div className="plan-card-cta">
                  <div className="plan-cta-current">Plano atual</div>
                </div>
              </div>

              {/* Premium Card */}
              <div className="plan-card plan-card--premium">
                {activePlan.recommended && (
                  <div className="plan-recommended-tag">Mais popular</div>
                )}
                <div className="plan-card-header">
                  <div className="plan-card-tier premium">Premium ✦</div>
                  <div className="plan-card-price">
                    <span className="plan-price-value premium">{formatPrice(activePlan.pricePerMonth)}</span>
                    <span className="plan-price-period premium">/mês</span>
                  </div>
                  <p className="plan-card-desc">{activePlan.billingLabel}</p>
                  {activePlan.discount && (
                    <div className="plan-discount-badge">{activePlan.discount}</div>
                  )}
                </div>

                <div className="plan-card-features">
                  {PREMIUM_PLAN_FEATURES.map((f) => (
                    <div key={f.label} className="plan-feature-row included premium-item">
                      <span className="plan-feature-icon premium">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                      </span>
                      <span className="plan-feature-label">{f.label}</span>
                    </div>
                  ))}
                </div>

                <div className="plan-card-cta">
                  <a
                    id={`checkout-${activePlan.key}`}
                    href={activePlan.checkoutUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="plan-cta-btn"
                  >
                    Assinar Premium
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </a>
                  <p className="plan-cta-hint">
                    Cancele quando quiser. Sem taxas escondidas.
                  </p>
                </div>
              </div>
            </div>

            {/* Benefits section */}
            <div className="planos-benefits-section anim anim-d3">
              <div className="section-label">Por que fazer upgrade?</div>
              <div className="benefits-grid">
                {PREMIUM_BENEFITS.map((b) => (
                  <div key={b.label} className="benefit-item">
                    <span className="benefit-item-icon">{b.icon}</span>
                    <span className="benefit-item-label">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Pro user — benefits recap */}
        {isPro && (
          <div className="planos-pro-recap anim anim-d2">
            <div className="section-label">Seus benefícios ativos</div>
            <div className="benefits-grid">
              {PREMIUM_BENEFITS.map((b) => (
                <div key={b.label} className="benefit-item active">
                  <span className="benefit-item-icon">{b.icon}</span>
                  <span className="benefit-item-label">{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FAQ / Info */}
        <div className="planos-faq anim anim-d4">
          <div className="section-label">Perguntas frequentes</div>
          <div className="faq-list">
            {[
              {
                q: 'Posso cancelar a qualquer momento?',
                a: 'Sim. Não há fidelidade ou multa de cancelamento. Você continua com o Premium até o fim do período pago.',
              },
              {
                q: 'O que acontece se eu atingir o limite no plano gratuito?',
                a: `Após ${10} solicitações de IA por dia, você é pausado até a meia-noite. O Premium remove esse limite completamente.`,
              },
              {
                q: 'Meus dados e redações são mantidos se eu mudar de plano?',
                a: 'Sim. Todo o seu histórico de redações e progresso ficam salvos independente do plano.',
              },
            ].map((item) => (
              <div key={item.q} className="faq-item">
                <div className="faq-q">{item.q}</div>
                <div className="faq-a">{item.a}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  )
}

const planosCss = `
  /* ── HEADER ── */
  .planos-header {
    text-align: center;
    padding: 2rem 0 1.5rem;
  }

  .planos-badge {
    display: inline-block;
    padding: 4px 14px;
    background: var(--accent-dim2);
    color: var(--accent);
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 1rem;
  }

  .planos-title {
    font-family: 'DM Serif Display', serif;
    font-size: 2.2rem;
    color: var(--text);
    margin-bottom: 0.75rem;
    line-height: 1.15;
  }

  .planos-subtitle {
    font-size: 1rem;
    color: var(--text2);
    line-height: 1.65;
    max-width: 460px;
    margin: 0 auto 1.25rem;
  }

  .planos-current-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 16px;
    border-radius: 999px;
    font-size: 0.82rem;
    font-weight: 500;
    border: 1.5px solid var(--border2);
    background: var(--bg2);
    color: var(--text2);
  }

  .planos-current-badge.pro {
    border-color: var(--accent);
    background: var(--accent-dim);
    color: var(--accent);
  }

  .planos-current-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--text3);
    flex-shrink: 0;
  }

  .planos-current-badge.pro .planos-current-dot {
    background: var(--accent);
    box-shadow: 0 0 6px var(--accent);
  }

  .planos-quota-inline {
    opacity: 0.7;
    font-size: 0.78rem;
  }

  /* ── PERIOD SELECTOR ── */
  .planos-period-selector {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    margin: 1.5rem 0;
  }

  .period-selector-inner {
    display: flex;
    gap: 6px;
    background: var(--bg2);
    border: 1.5px solid var(--border);
    padding: 5px;
    border-radius: 16px;
  }

  .period-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 9px 20px;
    border-radius: 11px;
    border: none;
    background: transparent;
    cursor: pointer;
    transition: all 0.2s;
    min-width: 90px;
  }

  .period-btn.active {
    background: var(--accent);
    box-shadow: 0 4px 12px rgba(var(--accent-rgb), 0.3);
  }

  .period-btn-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text2);
    transition: color 0.2s;
  }

  .period-btn.active .period-btn-label {
    color: #0f0f0f;
  }

  .period-btn-discount {
    font-size: 0.65rem;
    font-weight: 700;
    color: var(--accent);
    background: var(--accent-dim);
    padding: 2px 7px;
    border-radius: 999px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .period-btn.active .period-btn-discount {
    background: rgba(0,0,0,0.15);
    color: #0f0f0f;
  }

  .period-recommended-hint {
    font-size: 0.78rem;
    color: var(--accent);
    font-weight: 600;
  }

  /* ── CARDS GRID ── */
  .planos-cards-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.25rem;
    margin-bottom: 2.5rem;
  }

  @media (max-width: 680px) {
    .planos-cards-grid { grid-template-columns: 1fr; }
  }

  .plan-card {
    background: var(--bg2);
    border: 1.5px solid var(--border);
    border-radius: 24px;
    padding: 1.75rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    position: relative;
    transition: border-color 0.2s;
  }

  .plan-card--premium {
    border-color: var(--accent);
    background: linear-gradient(160deg, rgba(var(--accent-rgb), 0.06), var(--bg2) 55%);
    box-shadow: 0 8px 32px rgba(var(--accent-rgb), 0.12);
  }

  .plan-recommended-tag {
    position: absolute;
    top: -13px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--accent);
    color: #0f0f0f;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.7px;
    padding: 4px 14px;
    border-radius: 999px;
    white-space: nowrap;
  }

  .plan-card-tier {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: var(--text3);
    margin-bottom: 0.5rem;
  }

  .plan-card-tier.premium {
    color: var(--accent);
  }

  .plan-card-price {
    display: flex;
    align-items: baseline;
    gap: 4px;
    margin-bottom: 0.25rem;
  }

  .plan-price-value {
    font-family: 'DM Serif Display', serif;
    font-size: 2.2rem;
    color: var(--text);
    line-height: 1;
  }

  .plan-price-value.premium {
    color: var(--accent);
  }

  .plan-price-period {
    font-size: 0.9rem;
    color: var(--text3);
    font-weight: 500;
  }

  .plan-price-period.premium {
    color: var(--accent);
    opacity: 0.7;
  }

  .plan-card-desc {
    font-size: 0.8rem;
    color: var(--text3);
    line-height: 1.5;
  }

  .plan-discount-badge {
    display: inline-flex;
    padding: 3px 10px;
    background: var(--accent);
    color: #0f0f0f;
    border-radius: 999px;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 4px;
    width: fit-content;
  }

  .plan-card-features {
    display: flex;
    flex-direction: column;
    gap: 9px;
    flex: 1;
  }

  .plan-feature-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .plan-feature-icon {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: rgba(var(--accent-rgb), 0.12);
    color: var(--accent);
  }

  .plan-feature-row.excluded .plan-feature-icon {
    background: var(--bg3);
    color: var(--text3);
    opacity: 0.5;
  }

  .plan-feature-label {
    font-size: 0.82rem;
    color: var(--text);
    font-weight: 500;
  }

  .plan-feature-row.excluded .plan-feature-label {
    color: var(--text3);
    opacity: 0.6;
    text-decoration: line-through;
    text-decoration-color: var(--text3);
  }

  .plan-feature-icon.premium {
    background: var(--accent);
    color: #0f0f0f;
  }

  .plan-cta-current {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 13px;
    background: var(--bg3);
    border: 1.5px solid var(--border2);
    border-radius: 14px;
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--text3);
  }

  .plan-cta-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 14px;
    background: var(--accent);
    color: #0f0f0f;
    border-radius: 14px;
    font-weight: 700;
    font-size: 1rem;
    text-decoration: none;
    transition: all 0.2s;
    box-shadow: 0 6px 20px rgba(var(--accent-rgb), 0.3);
  }

  .plan-cta-btn:hover {
    background: var(--accent2);
    transform: translateY(-2px);
    box-shadow: 0 10px 28px rgba(var(--accent-rgb), 0.4);
  }

  .plan-cta-hint {
    font-size: 0.72rem;
    color: var(--text3);
    text-align: center;
    margin-top: 8px;
    line-height: 1.4;
  }

  /* ── BENEFITS GRID ── */
  .planos-benefits-section,
  .planos-pro-recap {
    margin-bottom: 2rem;
  }

  .benefits-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 0.75rem;
  }

  @media (max-width: 600px) {
    .benefits-grid { grid-template-columns: 1fr; }
  }

  .benefit-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    background: var(--bg2);
    border: 1.5px solid var(--border);
    border-radius: 14px;
    transition: border-color 0.2s;
  }

  .benefit-item.active {
    border-color: var(--accent);
    background: var(--accent-dim);
  }

  .benefit-item-icon {
    font-size: 1.2rem;
    flex-shrink: 0;
  }

  .benefit-item-label {
    font-size: 0.82rem;
    color: var(--text);
    font-weight: 500;
    line-height: 1.35;
  }

  /* ── FAQ ── */
  .planos-faq {
    margin-bottom: 2rem;
  }

  .faq-list {
    display: flex;
    flex-direction: column;
    gap: 0;
    margin-top: 0.75rem;
    background: var(--bg2);
    border: 1.5px solid var(--border);
    border-radius: 18px;
    overflow: hidden;
  }

  .faq-item {
    padding: 1.1rem 1.25rem;
    border-bottom: 1px solid var(--border);
  }

  .faq-item:last-child { border-bottom: none; }

  .faq-q {
    font-size: 0.88rem;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 6px;
  }

  .faq-a {
    font-size: 0.82rem;
    color: var(--text2);
    line-height: 1.6;
  }
`
