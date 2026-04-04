import {
  AI_DAILY_LIMIT,
  PAID_AI_DAILY_LIMIT,
  getCurrentAiDailyLimit,
  getCurrentBillingStatus,
  getCurrentPlanTier,
  getFreePlanUsageRows,
  getFreePlanUsageSnapshot,
} from './freePlanUsage.js'

// ── Configuração de Features ─────────────────────────────────────────────────
// Hoje o upgrade mexe em cota e faturamento, não em um bloco de features
// totalmente novo. Mantemos essa lista preparada para futuras diferenças.
const PREMIUM_FEATURES = {}

// ── Threshold do gatilho suave ───────────────────────────────────────────────
export const SOFT_TRIGGER_THRESHOLDS = {
  essayCorrection: 3,
  radarSearch: 4,
  themeDynamic: 2,
}

function isPaidAccess() {
  return getCurrentPlanTier() !== 'free'
}

function getQuotaBlockedCopy() {
  const status = getCurrentBillingStatus()
  if (status === 'free') {
    return {
      icon: '🚀',
      title: 'Sua cota gratuita acabou',
      subtitle: `Você usou os ${AI_DAILY_LIMIT} usos gratuitos de IA de hoje. No plano pago, a cota sobe para ${PAID_AI_DAILY_LIMIT} usos por dia, com teste grátis de 7 dias na primeira contratação.`,
    }
  }

  return {
    icon: '⏳',
    title: 'Sua cota de hoje acabou',
    subtitle: `Você já usou todos os ${PAID_AI_DAILY_LIMIT} usos de IA liberados hoje. A cota volta automaticamente na virada do dia.`,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Gatilho 1: Cota diária finalizada
// ═══════════════════════════════════════════════════════════════════════════════

export function isQuotaBlocked() {
  const rows = getFreePlanUsageRows()
  return rows[0]?.blocked ?? false
}

export function getQuotaPercent() {
  const rows = getFreePlanUsageRows()
  return rows[0]?.percent ?? 0
}

export function getQuotaInfo() {
  const rows = getFreePlanUsageRows()
  const row = rows[0] || {
    used: 0,
    limit: getCurrentAiDailyLimit(),
    remaining: getCurrentAiDailyLimit(),
    percent: 0,
    blocked: false,
    status: getCurrentBillingStatus(),
    accessTier: getCurrentPlanTier(),
  }

  return {
    used: row.used,
    limit: row.limit,
    remaining: row.remaining,
    percent: row.percent,
    blocked: row.blocked,
    status: row.status || getCurrentBillingStatus(),
    accessTier: row.accessTier || getCurrentPlanTier(),
    isPaidAccount: isPaidAccess(),
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Gatilho 2: X usos de uma feature → convite suave
// ═══════════════════════════════════════════════════════════════════════════════

export function shouldShowSoftUpgradeTrigger(featureKey) {
  if (getCurrentPlanTier() !== 'free') return false
  const threshold = SOFT_TRIGGER_THRESHOLDS[featureKey]
  if (!threshold) return false

  const snapshot = getFreePlanUsageSnapshot()
  const used = snapshot?.counts?.[featureKey] ?? 0
  return used === threshold
}

// ═══════════════════════════════════════════════════════════════════════════════
// Gatilho 3: Feature restrita ao plano pago
// ═══════════════════════════════════════════════════════════════════════════════

export function isPremiumFeature(featureKey) {
  return Object.prototype.hasOwnProperty.call(PREMIUM_FEATURES, featureKey)
}

export function canAccessFeature(featureKey) {
  if (!isPremiumFeature(featureKey)) return true
  return getCurrentPlanTier() !== 'free'
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers de contexto para o Modal
// ═══════════════════════════════════════════════════════════════════════════════

export const UPGRADE_REASONS = {
  QUOTA_BLOCKED: 'quota_blocked',
  SOFT_INVITE: 'soft_invite',
  PREMIUM_FEATURE: 'premium_feature',
}

export function getUpgradeModalContent(reason, featureLabel = '') {
  switch (reason) {
    case UPGRADE_REASONS.QUOTA_BLOCKED:
      return getQuotaBlockedCopy()
    case UPGRADE_REASONS.SOFT_INVITE:
      return {
        icon: '⭐',
        title: 'Você está evoluindo rápido',
        subtitle: `O plano pago sobe sua cota para ${PAID_AI_DAILY_LIMIT} usos de IA por dia e ainda começa com 7 dias de teste grátis na primeira contratação.`,
      }
    case UPGRADE_REASONS.PREMIUM_FEATURE:
      return {
        icon: '🔒',
        title: 'Recurso do plano pago',
        subtitle: `${featureLabel ? `"${featureLabel}" é` : 'Essa funcionalidade é'} exclusiva do plano pago.`,
      }
    default:
      return {
        icon: '✨',
        title: 'Conheça os planos do Ápice',
        subtitle: `A conta gratuita oferece ${AI_DAILY_LIMIT} usos de IA por dia. No plano pago, a cota sobe para ${PAID_AI_DAILY_LIMIT} e você ainda ganha 7 dias de teste grátis na primeira contratação.`,
      }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Benefícios e tabela de comparação
// ═══════════════════════════════════════════════════════════════════════════════

export const PAID_PLAN_BENEFITS = [
  { icon: '🔟', label: `${PAID_AI_DAILY_LIMIT} solicitações de IA por dia` },
  { icon: '🎁', label: '7 dias de teste grátis na primeira contratação' },
  { icon: '🧠', label: 'As mesmas ferramentas do app com mais folga' },
  { icon: '☁️', label: 'Histórico e preferências sincronizados por conta' },
  { icon: '📅', label: 'Cobrança mensal, semestral ou anual' },
  { icon: '🛟', label: 'Suporte mais próximo para assinatura' },
]

export const PREMIUM_BENEFITS = PAID_PLAN_BENEFITS

export const FREE_PLAN_FEATURES = [
  { label: `${AI_DAILY_LIMIT} solicitações de IA por dia`, included: true },
  { label: 'Corretor com critérios INEP', included: true },
  { label: 'Radar 1000 com busca limitada e detalhes salvos', included: true },
  { label: 'Resumo automático de desempenho', included: true },
  { label: 'Histórico de redações', included: true },
  { label: 'Personalização de aparência', included: true },
  { label: `${PAID_AI_DAILY_LIMIT} solicitações de IA por dia`, included: false },
  { label: 'Teste grátis de 7 dias', included: false },
]

export const PAID_PLAN_FEATURES = [
  { label: `${PAID_AI_DAILY_LIMIT} solicitações de IA por dia`, included: true },
  { label: 'Teste grátis de 7 dias na primeira compra', included: true },
  { label: 'Mesmas funções do app com mais folga', included: true },
  { label: 'Histórico, aparência e preferências por conta', included: true },
  { label: 'Cobrança recorrente conforme o período escolhido', included: true },
  { label: 'Cancelamento e retomada pela conta', included: true },
]

export const PREMIUM_PLAN_FEATURES = PAID_PLAN_FEATURES

export const PRICING_PLANS = [
  {
    key: 'monthly',
    label: 'Mensal',
    productId: 'prod_wHATFUYZASYUJfSYytySyLrn',
    totalPrice: 19.90,
    pricePerMonth: 19.90,
    billingLabel: 'Cobrança mensal depois do teste grátis',
    billingPeriodLabel: 'a cada mês',
    discount: null,
    trialDays: 7,
    recommended: false,
  },
  {
    key: 'semiannual',
    label: 'Semestral',
    productId: 'prod_NhxEgLzexPQh5PqXdjeXRkZx',
    totalPrice: 89.40,
    pricePerMonth: 14.90,
    billingLabel: 'Cobrança semestral depois do teste grátis',
    billingPeriodLabel: 'a cada 6 meses',
    discount: 'Economia no semestre',
    trialDays: 7,
    recommended: false,
  },
  {
    key: 'annual',
    label: 'Anual',
    productId: 'prod_PRxWqM0BCQtrL4JxARqSHYFM',
    totalPrice: 142.80,
    pricePerMonth: 11.90,
    billingLabel: 'Cobrança anual depois do teste grátis',
    billingPeriodLabel: 'a cada 12 meses',
    discount: 'Melhor custo-benefício',
    trialDays: 7,
    recommended: true,
  },
]

export function getPricingPlanByKey(planKey) {
  return PRICING_PLANS.find((plan) => plan.key === planKey) || PRICING_PLANS[0]
}

export function getPricingPlanByProductId(productId) {
  return PRICING_PLANS.find((plan) => plan.productId === productId) || null
}
