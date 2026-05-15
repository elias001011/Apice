/**
 * Gatilhos de upgrade e configuração de planos
 * 
 * COMO FUNCIONA:
 * - 3 gatilhos de upgrade: cota bloqueada, convite suave, feature premium
 * - Cota gratuita: 5 usos/dia | Cota paga: 20 usos/dia
 * - Planos: Mensal (R$19,90), Semestral (R$89,40), Anual (R$142,80)
 * - Pagamento unico: acesso_mensal libera 1 mes sem recorrencia
 * 
 * PRODUCT IDs (AbacatePay API v2):
 * - Cada produto deve existir no dashboard AbacatePay com mesmo ID
 * - O checkout usa /v2/subscriptions/create com items[].id apontando para esses produtos
 * - A chave do gateway em produção deve vir de ABACATE_V2 no Netlify
 */

import {
  AI_DAILY_LIMIT,
  GUEST_AI_DAILY_LIMIT,
  PAID_AI_DAILY_LIMIT,
  getCurrentAiDailyLimit,
  getCurrentBillingStatus,
  getCurrentPlanTier,
  getFreePlanUsageRows,
  getFreePlanUsageSnapshot,
} from './freePlanUsage.js'
import { isGuestSessionActive } from '../auth/sessionMode.js'

// ── Configuração de Features ─────────────────────────────────────────────────
// Hoje o upgrade mexe em cota e faturamento, não em um bloco de features
// totalmente novo. Mantemos essa lista preparada para futuras diferenças.
const PREMIUM_FEATURES = {}

// ── Threshold do gatilho suave ───────────────────────────────────────────────
// Após X usos de uma feature, mostra convite suave pra assinar
export const SOFT_TRIGGER_THRESHOLDS = {
  essayCorrection: 3,   // Após 3 correções de redação
  radarSearch: 4,       // Após 4 buscas no Radar
  themeDynamic: 2,      // Após 2 temas dinâmicos
}

function isPaidAccess() {
  return getCurrentPlanTier() !== 'free'
}

function getQuotaBlockedCopy() {
  const status = getCurrentBillingStatus()
  if (isGuestSessionActive()) {
    return {
      icon: '🚪',
      title: 'Seu limite do modo convidado acabou',
      subtitle: `Você usou as ${GUEST_AI_DAILY_LIMIT} solicitações de IA do modo convidado de hoje. Crie uma conta nova para continuar com cota separada e sincronização na nuvem.`,
    }
  }

  if (status === 'free') {
    return {
      icon: '🚀',
      title: 'Sua cota gratuita acabou',
      subtitle: `Você usou os ${AI_DAILY_LIMIT} usos gratuitos de IA de hoje. No plano pago, a cota sobe para ${PAID_AI_DAILY_LIMIT} usos por dia.`,
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
    isGuest: isGuestSessionActive(),
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
        subtitle: `O plano pago sobe sua cota para ${PAID_AI_DAILY_LIMIT} usos de IA por dia.`,
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
        subtitle: `A conta gratuita oferece ${AI_DAILY_LIMIT} usos de IA por dia. No plano pago, a cota sobe para ${PAID_AI_DAILY_LIMIT}.`,
      }
  }
}

// ── Benefícios do plano pago ─────────────────────────────────────────────────
export const PAID_PLAN_BENEFITS = [
  { icon: '⚡', label: `${PAID_AI_DAILY_LIMIT} solicitações de IA por dia` },
  { icon: '💳', label: 'Checkout pago pela AbacatePay API v2' },
  { icon: '🧠', label: 'As mesmas ferramentas do app com mais folga' },
  { icon: '☁️', label: 'Histórico e preferências sincronizados por conta' },
  { icon: '📅', label: 'Cobrança mensal, semestral, anual ou acesso avulso' },
  { icon: '🛟', label: 'Suporte mais próximo para assinatura' },
]

export const PREMIUM_BENEFITS = PAID_PLAN_BENEFITS

// ── Features do plano gratuito (para comparação) ─────────────────────────────
export const FREE_PLAN_FEATURES = [
  { label: `${AI_DAILY_LIMIT} solicitações de IA por dia`, included: true },
  { label: 'Corretor com critérios INEP', included: true },
  { label: 'Radar 1000 com busca limitada e detalhes salvos', included: true },
  { label: 'Análise local de desempenho', included: true },
  { label: 'Histórico de redações', included: true },
  { label: 'Personalização de aparência', included: true },
  { label: `${PAID_AI_DAILY_LIMIT} solicitações de IA por dia`, included: false },
  { label: 'Checkout pago com cupons autorizados na gateway', included: false },
]

// ── Features do plano pago (para comparação) ─────────────────────────────────
export const PAID_PLAN_FEATURES = [
  { label: `${PAID_AI_DAILY_LIMIT} solicitações de IA por dia`, included: true },
  { label: 'Cobrança recorrente pela AbacatePay API v2', included: true },
  { label: 'Mesmas funções do app com mais folga', included: true },
  { label: 'Histórico, aparência e preferências por conta', included: true },
  { label: 'Cobrança recorrente ou pagamento único mensal', included: true },
  { label: 'Cancelamento e retomada pela conta', included: true },
]

export const PREMIUM_PLAN_FEATURES = PAID_PLAN_FEATURES

// ── Definição dos planos de preço ────────────────────────────────────────────
// Cada plano deve ter um productId que existe no dashboard AbacatePay v2
// totalPrice é o valor total cobrado no período
// pricePerMonth é apenas informativo (totalPrice / meses no período)
export const PRICING_PLANS = [
  {
    key: 'welcome_one_time',
    label: 'Acesso por um mês de boas-vindas',
    productId: 'prod_6JhkhERfgGhggdZAcsd6xkSX',
    checkoutMode: 'payment',
    paymentFrequency: 'ONE_TIME',
    paymentMethods: ['PIX', 'CARD'],
    accessMonths: 1,
    totalPrice: 1.10,
    pricePerMonth: 1.10,
    billingLabel: 'Acesso por um mês de boas-vindas',
    billingPeriodLabel: 'por 1 mês',
    discount: 'Oferta de boas-vindas',
    recommended: false,
    purchaseLimit: 1,
    allowCoupons: false,
  },
  {
    key: 'monthly_one_time',
    label: 'Mensal avulso',
    productId: 'prod_pJ0DLHYr5Run1sRWFnq4wWx4',
    checkoutMode: 'payment',
    paymentFrequency: 'ONE_TIME',
    paymentMethods: ['PIX', 'CARD'],
    accessMonths: 1,
    totalPrice: 19.90,
    pricePerMonth: 19.90,
    billingLabel: 'Pagamento único de 1 mês',
    billingPeriodLabel: 'por 1 mês',
    discount: 'PIX ou cartão',
    recommended: false,
  },
  {
    key: 'monthly',
    label: 'Mensal',
    productId: 'prod_EAERmxx0z1YL4jNzweGbrYHU',
    abacateCycle: 'MONTHLY',
    totalPrice: 19.90,
    pricePerMonth: 19.90,
    billingLabel: 'Cobrança mensal recorrente',
    billingPeriodLabel: 'a cada mês',
    discount: null,
    recommended: false,
  },
  {
    key: 'semiannual',
    label: 'Semestral',
    productId: 'prod_NhxEgLzexPQh5PqXdjeXRkZx',
    abacateCycle: 'SEMIANNUALLY',
    totalPrice: 89.40,
    pricePerMonth: 14.90,
    billingLabel: 'Cobrança semestral recorrente',
    billingPeriodLabel: 'a cada 6 meses',
    discount: 'Economia no semestre',
    recommended: false,
  },
  {
    key: 'annual',
    label: 'Anual',
    productId: 'prod_EjA1dwgzNKNMj0fyGmtuStWE',
    abacateCycle: 'ANNUALLY',
    totalPrice: 142.80,
    pricePerMonth: 11.90,
    billingLabel: 'Cobrança anual recorrente',
    billingPeriodLabel: 'a cada 12 meses',
    discount: 'Melhor custo-benefício',
    recommended: true,
  },
]

export function getPricingPlanByKey(planKey) {
  return PRICING_PLANS.find((plan) => plan.key === planKey) || PRICING_PLANS.find((plan) => plan.key === 'monthly') || PRICING_PLANS[0]
}

export function getPricingPlanByProductId(productId) {
  return PRICING_PLANS.find((plan) => plan.productId === productId) || null
}
