import {
  getCurrentPlanTier,
  getFreePlanUsageRows,
  getFreePlanUsageSnapshot,
  AI_DAILY_LIMIT,
} from './freePlanUsage.js'

// ── Configuração de Features Premium ──────────────────────────────────────────
// Adicione aqui qualquer feature que seja exclusiva do plano pro.
const PREMIUM_FEATURES = {
  // Exemplos futuros:
  // unlimitedEssays: { label: 'Correções ilimitadas' },
  // advancedRadar: { label: 'Radar avançado com IA' },
  // detailedFeedback: { label: 'Feedback detalhado por competência' },
}

// ── Threshold do gatilho suave (Gatilho 2) ────────────────────────────────────
// Após X usos de uma feature específica no mesmo dia, dispara o convite.
// Não bloqueia o acesso — apenas informa sobre o Premium de forma amigável.
export const SOFT_TRIGGER_THRESHOLDS = {
  essayCorrection: 3,   // Após 3ª correção de redação → convite
  radarSearch: 4,       // Após 4ª busca no radar → convite
  themeDynamic: 2,      // Após 2º tema dinâmico → convite
}

// ═══════════════════════════════════════════════════════════════════════════════
// Gatilho 1: Cota diária finalizada
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Retorna true se a cota diária de IA do usuário free está esgotada.
 * Usuários pro nunca têm cota bloqueada.
 */
export function isQuotaBlocked() {
  if (getCurrentPlanTier() !== 'free') return false
  const rows = getFreePlanUsageRows()
  return rows[0]?.blocked ?? false
}

/**
 * Retorna o percentual de uso da cota (0–100).
 */
export function getQuotaPercent() {
  const rows = getFreePlanUsageRows()
  return rows[0]?.percent ?? 0
}

/**
 * Retorna informações detalhadas da cota para exibição em UI.
 */
export function getQuotaInfo() {
  const rows = getFreePlanUsageRows()
  const row = rows[0] || { used: 0, limit: AI_DAILY_LIMIT, remaining: AI_DAILY_LIMIT, percent: 0, blocked: false }
  return {
    used: row.used,
    limit: row.limit,
    remaining: row.remaining,
    percent: row.percent,
    blocked: row.blocked,
    isPro: getCurrentPlanTier() !== 'free',
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Gatilho 2: X usos de uma feature → convite suave
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Retorna true se o usuário acabou de atingir exatamente o threshold de usos
 * para a feature dada. Ideal para chamar APÓS registrar o uso (consumeFreePlan).
 * 
 * Não bloqueia — é um gatilho de convite, não de restrição.
 */
export function shouldShowSoftUpgradeTrigger(featureKey) {
  if (getCurrentPlanTier() !== 'free') return false
  const threshold = SOFT_TRIGGER_THRESHOLDS[featureKey]
  if (!threshold) return false

  const snapshot = getFreePlanUsageSnapshot()
  const used = snapshot?.counts?.[featureKey] ?? 0

  // Dispara exatamente quando atinge o threshold (não em todo uso acima dele)
  return used === threshold
}

// ═══════════════════════════════════════════════════════════════════════════════
// Gatilho 3: Feature restrita ao Premium
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Retorna true se a feature é exclusiva de usuários pro.
 */
export function isPremiumFeature(featureKey) {
  return Object.prototype.hasOwnProperty.call(PREMIUM_FEATURES, featureKey)
}

/**
 * Retorna true se o usuário pode acessar a feature.
 * Usuários free NÃO podem acessar features marcadas como premium.
 */
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

/**
 * Retorna o título e subtítulo contextuais para o UpgradeModal
 * com base no motivo do gatilho.
 */
export function getUpgradeModalContent(reason, featureLabel = '') {
  switch (reason) {
    case UPGRADE_REASONS.QUOTA_BLOCKED:
      return {
        icon: '🚀',
        title: 'Sua cota hoje acabou',
        subtitle: 'Você utilizou todas as solicitações de IA do plano gratuito hoje. Com o Premium, você tem uso ilimitado — todos os dias.',
      }
    case UPGRADE_REASONS.SOFT_INVITE:
      return {
        icon: '⭐',
        title: 'Você está indo muito bem!',
        subtitle: `Continue evoluindo sem limites. O plano Premium remove as restrições diárias e desbloqueia funcionalidades exclusivas.`,
      }
    case UPGRADE_REASONS.PREMIUM_FEATURE:
      return {
        icon: '🔒',
        title: 'Funcionalidade Premium',
        subtitle: `${featureLabel ? `"${featureLabel}" é` : 'Essa funcionalidade é'} exclusiva do plano Premium. Faça upgrade para desbloquear.`,
      }
    default:
      return {
        icon: '✨',
        title: 'Conheça o Ápice Premium',
        subtitle: 'Remova limites, acesse recursos exclusivos e conquiste o 1000 no ENEM sem restrições.',
      }
  }
}

/**
 * Vantagens do plano Premium para exibição no modal e na página de planos.
 */
export const PREMIUM_BENEFITS = [
  { icon: '♾️', label: 'Correções de redação ilimitadas por dia' },
  { icon: '⚡', label: 'Geração de temas dinâmicos sem limite' },
  { icon: '🔍', label: 'Buscas no Radar 1000 sem restrição' },
  { icon: '📊', label: 'Análise de desempenho avançada' },
  { icon: '🎯', label: 'Feedback detalhado por competência ENEM' },
  { icon: '☁️', label: 'Sincronização em nuvem prioritária' },
]

/**
 * O que o plano Free inclui (para a tabela comparativa).
 */
export const FREE_PLAN_FEATURES = [
  { label: `${AI_DAILY_LIMIT} solicitações de IA por dia`, included: true },
  { label: 'Corretor com critérios INEP', included: true },
  { label: 'Radar 1000 com busca limitada e detalhes salvos', included: true },
  { label: 'Resumo automático de desempenho', included: true },
  { label: 'Histórico de redações', included: true },
  { label: 'Personalização de aparência', included: true },
  { label: 'Correções ilimitadas', included: false },
  { label: 'Temas dinâmicos ilimitados', included: false },
  { label: 'Análise avançada de desempenho', included: false },
  { label: 'Feedback por competência', included: false },
]

/**
 * O que o plano Premium inclui (para a tabela comparativa).
 */
export const PREMIUM_PLAN_FEATURES = [
  { label: 'Correções de redação ilimitadas', included: true },
  { label: 'Temas dinâmicos ilimitados', included: true },
  { label: 'Buscas no Radar sem limite', included: true },
  { label: 'Histórico completo de redações', included: true },
  { label: 'Personalização de aparência', included: true },
  { label: 'Análise avançada de desempenho', included: true },
  { label: 'Feedback detalhado por competência', included: true },
  { label: 'Suporte prioritário', included: true },
  { label: 'Acesso antecipado a novidades', included: true },
]

// Preços dos planos (em reais, relativos ao custo mensal)
export const PRICING_PLANS = [
  {
    key: 'monthly',
    label: 'Mensal',
    pricePerMonth: 19.90,
    totalPrice: 19.90,
    billingLabel: 'cobrado mensalmente',
    discount: null,
    checkoutUrl: 'https://app.abacatepay.com/pay/bill_JUQP4nTnLj240zdDpMHh2hxW', // AbacatePay link
  },
  {
    key: 'semiannual',
    label: 'Semestral',
    pricePerMonth: 14.90,
    totalPrice: 89.40,
    billingLabel: 'cobrado semestralmente (R$ 89,40)',
    discount: '25% off',
    checkoutUrl: 'https://app.abacatepay.com/pay/bill_MGmjgGeLYQ00Km5hTEeXP3SB', // AbacatePay link
    recommended: false,
  },
  {
    key: 'annual',
    label: 'Anual',
    pricePerMonth: 11.90,
    totalPrice: 142.80,
    billingLabel: 'cobrado anualmente (R$ 142,80)',
    discount: '40% off',
    checkoutUrl: 'https://app.abacatepay.com/pay/bill_Et2su1W0zFhZbm2KURD01zMY', // AbacatePay link
    recommended: true,
  },
]
