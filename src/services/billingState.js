/**
 * Gerenciamento do estado de billing (pagamento e estados legados)
 * 
 * COMO FUNCIONA:
 * - Estado salvo no localStorage na chave 'apice:billing-state:v1'
 * - 3 status possíveis: 'free' (gratuito), 'trial' (legado), 'paid' (pago)
 * - O fluxo atual de planos é pago via AbacatePay API v2.
 * - Estados trial continuam normalizados apenas para compatibilidade com contas antigas.
 * 
 * FLUXO DE PAGAMENTO:
 * 1. Usuário clica "Assinar agora" → handleCheckout(plan)
 * 2. Backend cria checkout sem cupom (valor normal)
 * 3. Usuário paga no AbacatePay
 * 4. Ao retornar, frontend verifica e chama markPlanPaid()
 * 5. status='paid', paidAt = agora
 */

const BILLING_STATE_KEY = 'apice:billing-state:v1'
const LEGACY_PLAN_TIER_KEY = 'apice:plan:tier'
const BILLING_STATE_UPDATED_EVENT = 'apice:billing-state-updated'
const ACCOUNT_STATE_UPDATED_EVENT = 'apice:account-state-updated'
const USAGE_UPDATED_EVENT = 'apice:free-plan-usage-updated'

/** Duração de estados trial legados em dias */
export const TRIAL_DAYS = 7

const VALID_STATUSES = new Set(['free', 'trial', 'paid'])
const STATUS_ALIASES = {
  free: 'free',
  trial: 'trial',
  paid: 'paid',
  pro: 'paid',
  premium: 'paid',
}
const TRIAL_KIND_ALIASES = {
  standard: 'standard',
  trial: 'standard',
  default: 'standard',
  welcome: 'welcome',
  gifted: 'welcome',
  gift: 'welcome',
}

const PLAN_PERIOD_MONTHS = {
  monthly: 1,
  monthly_one_time: 1,
  semiannual: 6,
  annual: 12,
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function nowIso() {
  return new Date().toISOString()
}

function normalizeText(value) {
  return String(value ?? '').trim()
}

function normalizeStatus(value) {
  const normalized = normalizeText(value).toLowerCase()
  return STATUS_ALIASES[normalized] || 'free'
}

function normalizePlanKey(value) {
  const normalized = normalizeText(value).toLowerCase()
  if (['monthly', 'monthly_one_time', 'semiannual', 'annual'].includes(normalized)) {
    return normalized
  }
  return ''
}

function normalizeBillingMode(value) {
  const normalized = normalizeText(value).toLowerCase().replace(/[\s-]+/g, '_')
  if (['one_time', 'payment', 'checkout', 'single', 'single_payment'].includes(normalized)) {
    return 'one_time'
  }
  if (['subscription', 'recurring', 'recorrente'].includes(normalized)) {
    return 'subscription'
  }
  return ''
}

function normalizeIsoDate(value) {
  const text = normalizeText(value)
  if (!text) return ''

  const date = new Date(text)
  if (!Number.isFinite(date.getTime())) return ''

  return date.toISOString()
}

function normalizeBoolean(value) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true
    if (['false', '0', 'no', 'off'].includes(normalized)) return false
  }
  return false
}

function normalizeTrialKind(value) {
  const normalized = normalizeText(value).toLowerCase().replace(/[\s-]+/g, '_')
  return TRIAL_KIND_ALIASES[normalized] || ''
}

function buildDefaultState() {
  const iso = nowIso()
  return {
    status: 'free',
    planKey: '',
    trialKind: '',
    trialUsedAt: '',
    trialStartedAt: '',
    trialEndsAt: '',
    paidAt: '',
    checkoutId: '',
    externalId: '',
    subscriptionId: '',
    billingMode: '',
    subscriptionActive: false,
    cancelAtPeriodEnd: false,
    cancellationRequestedAt: '',
    cancelledAt: '',
    accessEndsAt: '',
    remoteStatus: '',
    updatedAt: iso,
  }
}

function normalizeState(rawState) {
  const base = buildDefaultState()

  if (!rawState || typeof rawState !== 'object') {
    return base
  }

  const status = normalizeStatus(rawState.status ?? rawState.planStatus ?? rawState.tier)
  const planKey = normalizePlanKey(rawState.planKey ?? rawState.selectedPlan ?? rawState.productKey)
  const trialKind = normalizeTrialKind(rawState.trialKind ?? rawState.trialType ?? rawState.billingType)
  const trialUsedAt = normalizeIsoDate(rawState.trialUsedAt ?? rawState.trialRedeemedAt ?? rawState.trialStartedAt)
  const trialStartedAt = normalizeIsoDate(rawState.trialStartedAt ?? rawState.trialUsedAt ?? rawState.trialRedeemedAt)
  const trialEndsAt = normalizeIsoDate(rawState.trialEndsAt ?? rawState.trialExpiresAt)
  const paidAt = normalizeIsoDate(rawState.paidAt ?? rawState.paidSince ?? rawState.activeSince)

  const normalized = {
    ...base,
    status,
    planKey,
    trialKind,
    trialUsedAt,
    trialStartedAt,
    trialEndsAt,
    paidAt,
    checkoutId: normalizeText(rawState.checkoutId ?? rawState.checkout_id),
    externalId: normalizeText(rawState.externalId ?? rawState.external_id),
    subscriptionId: normalizeText(rawState.subscriptionId ?? rawState.subscription_id),
    billingMode: normalizeBillingMode(rawState.billingMode ?? rawState.checkoutMode ?? rawState.paymentMode),
    subscriptionActive: normalizeBoolean(rawState.subscriptionActive ?? rawState.subscription_active),
    cancelAtPeriodEnd: normalizeBoolean(rawState.cancelAtPeriodEnd ?? rawState.cancel_at_period_end),
    cancellationRequestedAt: normalizeIsoDate(rawState.cancellationRequestedAt ?? rawState.cancelRequestedAt),
    cancelledAt: normalizeIsoDate(rawState.cancelledAt ?? rawState.subscriptionCancelledAt),
    accessEndsAt: normalizeIsoDate(rawState.accessEndsAt ?? rawState.currentPeriodEnd ?? rawState.periodEndsAt),
    remoteStatus: normalizeText(rawState.remoteStatus ?? rawState.billingStatus),
    updatedAt: normalizeIsoDate(rawState.updatedAt ?? rawState.savedAt ?? rawState.modifiedAt) || base.updatedAt,
  }

  if (normalized.status === 'trial') {
    if (!normalized.trialKind) {
      normalized.trialKind = 'standard'
    }

    const trialEndsAtDate = normalized.trialEndsAt ? new Date(normalized.trialEndsAt) : null
    if (!trialEndsAtDate || !Number.isFinite(trialEndsAtDate.getTime())) {
      const fallbackDays = TRIAL_DAYS
      const trialStartedAtDate = normalized.trialStartedAt ? new Date(normalized.trialStartedAt) : null
      if (trialStartedAtDate && Number.isFinite(trialStartedAtDate.getTime())) {
        normalized.trialEndsAt = new Date(
          trialStartedAtDate.getTime() + (fallbackDays * 24 * 60 * 60 * 1000),
        ).toISOString()
      }
    }

    const resolvedTrialEndsAtDate = normalized.trialEndsAt ? new Date(normalized.trialEndsAt) : null
    if (!resolvedTrialEndsAtDate || !Number.isFinite(resolvedTrialEndsAtDate.getTime()) || resolvedTrialEndsAtDate.getTime() <= Date.now()) {
      normalized.status = 'free'
    }
  }

  if (normalized.status === 'free' && !normalized.trialKind && normalized.trialStartedAt) {
    normalized.trialKind = 'standard'
  }

  if (normalized.status === 'paid' && normalized.accessEndsAt && (normalized.cancelAtPeriodEnd || normalized.billingMode === 'one_time')) {
    const accessEndsAtDate = new Date(normalized.accessEndsAt)
    if (Number.isFinite(accessEndsAtDate.getTime()) && accessEndsAtDate.getTime() <= Date.now()) {
      normalized.status = 'free'
      normalized.planKey = ''
      normalized.subscriptionActive = false
      normalized.billingMode = ''
    }
  }

  if (!VALID_STATUSES.has(normalized.status)) {
    normalized.status = 'free'
  }

  return normalized
}

function legacyStateFromPlanTier(planTier) {
  const normalizedTier = normalizeStatus(planTier)
  return {
    ...buildDefaultState(),
    status: normalizedTier === 'paid' ? 'paid' : normalizedTier,
  }
}

function readRawStoredState() {
  if (!canUseStorage()) {
    return buildDefaultState()
  }

  try {
    const raw = localStorage.getItem(BILLING_STATE_KEY)
    if (raw) {
      return normalizeState(JSON.parse(raw))
    }
  } catch {
    // ignore parse issues and fall back to legacy state
  }

  try {
    const legacyTier = localStorage.getItem(LEGACY_PLAN_TIER_KEY)
    if (legacyTier) {
      return legacyStateFromPlanTier(legacyTier)
    }
  } catch {
    // ignore
  }

  return buildDefaultState()
}

function persistState(state) {
  if (!canUseStorage()) return

  const normalized = normalizeState(state)
  localStorage.setItem(BILLING_STATE_KEY, JSON.stringify(normalized))
  localStorage.setItem(LEGACY_PLAN_TIER_KEY, normalized.status === 'free' ? 'free' : 'paid')

  window.dispatchEvent(new CustomEvent(BILLING_STATE_UPDATED_EVENT))
  window.dispatchEvent(new CustomEvent(USAGE_UPDATED_EVENT))
  window.dispatchEvent(new CustomEvent(ACCOUNT_STATE_UPDATED_EVENT))
}

export function getBillingState() {
  const state = readRawStoredState()

  if (!canUseStorage()) {
    return state
  }

  const normalized = normalizeState(state)
  if (JSON.stringify(normalized) !== JSON.stringify(state)) {
    persistState(normalized)
  }

  return normalized
}

export function getCurrentBillingStatus() {
  return getBillingState().status
}

export function getCurrentPlanTier() {
  return getCurrentBillingStatus() === 'free' ? 'free' : 'paid'
}

function isTrialActiveState(state) {
  if (!state || state.status !== 'trial') return false

  const trialEndsAtDate = state.trialEndsAt ? new Date(state.trialEndsAt) : null
  return Boolean(trialEndsAtDate && Number.isFinite(trialEndsAtDate.getTime()) && trialEndsAtDate.getTime() > Date.now())
}



/** Compatibilidade: retorna true se há registro legado de trial. */
export function hasUsedTrial() {
  const state = getBillingState()
  return Boolean(state.trialUsedAt || state.trialStartedAt || state.trialEndsAt)
}

/** Compatibilidade: retorna true se um trial legado está ativo agora. */
export function isTrialActive() {
  return isTrialActiveState(getBillingState())
}

/** Compatibilidade: usado apenas por fluxos legados. */
export function canStartTrial() {
  const state = getBillingState()
  return state.status === 'free' && !hasUsedTrial()
}

export function getTrialEndsAt() {
  return getBillingState().trialEndsAt || ''
}

export function getPlanAccessEndsAt({ planKey = '', paidAt = '' } = {}) {
  const safePlanKey = normalizePlanKey(planKey) || 'monthly'
  const months = PLAN_PERIOD_MONTHS[safePlanKey] || 1
  const startDate = new Date(normalizeIsoDate(paidAt) || nowIso())
  if (!Number.isFinite(startDate.getTime())) return ''
  const endDate = new Date(startDate.getTime())
  endDate.setMonth(endDate.getMonth() + months)
  return endDate.toISOString()
}

export function saveBillingState(partialState = {}) {
  const current = getBillingState()
  const next = normalizeState({
    ...current,
    ...partialState,
    updatedAt: nowIso(),
  })

  persistState(next)
  return next
}

export function setBillingStatus(status, {
  planKey = '',
  checkoutId = '',
  externalId = '',
  subscriptionId = '',
  billingMode = '',
  trialStartedAt = '',
  trialEndsAt = '',
  paidAt = '',
  trialKind = '',
  subscriptionActive,
  cancelAtPeriodEnd,
  cancellationRequestedAt = '',
  cancelledAt = '',
  accessEndsAt = '',
  remoteStatus = '',
} = {}) {
  const normalizedStatus = normalizeStatus(status)
  const current = getBillingState()
  const normalizedTrialKind = normalizeTrialKind(trialKind) || normalizeTrialKind(current.trialKind) || 'standard'

  const next = {
    ...current,
    status: normalizedStatus,
    planKey: normalizePlanKey(planKey) || current.planKey,
    trialKind: current.trialKind || '',
    checkoutId: normalizeText(checkoutId) || current.checkoutId,
    externalId: normalizeText(externalId) || current.externalId,
    subscriptionId: normalizeText(subscriptionId) || current.subscriptionId,
    billingMode: normalizeBillingMode(billingMode) || current.billingMode,
    trialStartedAt: normalizeIsoDate(trialStartedAt) || current.trialStartedAt,
    trialEndsAt: normalizeIsoDate(trialEndsAt) || current.trialEndsAt,
    paidAt: normalizeIsoDate(paidAt) || current.paidAt,
    subscriptionActive: typeof subscriptionActive === 'undefined' ? current.subscriptionActive : normalizeBoolean(subscriptionActive),
    cancelAtPeriodEnd: typeof cancelAtPeriodEnd === 'undefined' ? current.cancelAtPeriodEnd : normalizeBoolean(cancelAtPeriodEnd),
    cancellationRequestedAt: normalizeIsoDate(cancellationRequestedAt) || current.cancellationRequestedAt,
    cancelledAt: normalizeIsoDate(cancelledAt) || current.cancelledAt,
    accessEndsAt: normalizeIsoDate(accessEndsAt) || current.accessEndsAt,
    remoteStatus: normalizeText(remoteStatus) || current.remoteStatus,
    updatedAt: nowIso(),
  }

  if (normalizedStatus === 'free') {
    next.checkoutId = normalizeText(checkoutId) || ''
    next.externalId = normalizeText(externalId) || ''
    next.subscriptionId = normalizeText(subscriptionId) || ''
    next.billingMode = ''
    next.paidAt = ''
    next.subscriptionActive = false
    next.cancelAtPeriodEnd = false
    next.accessEndsAt = ''
  }

  if (normalizedStatus === 'paid') {
    const resolvedBillingMode = normalizeBillingMode(billingMode) || next.billingMode || 'subscription'
    next.paidAt = normalizeIsoDate(paidAt) || nowIso()
    next.trialEndsAt = next.trialEndsAt || ''
    next.trialStartedAt = next.trialStartedAt || ''
    next.billingMode = resolvedBillingMode
    next.subscriptionActive = typeof subscriptionActive === 'undefined' ? resolvedBillingMode !== 'one_time' : normalizeBoolean(subscriptionActive)
    next.cancelAtPeriodEnd = typeof cancelAtPeriodEnd === 'undefined' ? false : normalizeBoolean(cancelAtPeriodEnd)
    next.accessEndsAt = normalizeIsoDate(accessEndsAt) || next.accessEndsAt || ''
  }

  if (normalizedStatus === 'trial') {
    const startedAt = normalizeIsoDate(trialStartedAt) || current.trialStartedAt || nowIso()
    const durationDays = TRIAL_DAYS
    const endsAt = normalizeIsoDate(trialEndsAt) || new Date(new Date(startedAt).getTime() + (durationDays * 24 * 60 * 60 * 1000)).toISOString()
    next.trialStartedAt = startedAt
    next.trialEndsAt = endsAt
    next.trialUsedAt = current.trialUsedAt || startedAt
    next.trialKind = normalizedTrialKind
    next.paidAt = ''
  }

  persistState(next)
  return next
}

/**
 * Compatibilidade: inicia estado trial legado.
 */
export function startTrial({ planKey = '', checkoutId = '', externalId = '' } = {}) {
  const current = getBillingState()

  if (current.status === 'paid') {
    return current
  }

  if (current.status === 'trial' && isTrialActiveState(current)) {
    return setBillingStatus('trial', {
      planKey: planKey || current.planKey,
      checkoutId: checkoutId || current.checkoutId,
      externalId: externalId || current.externalId,
      trialStartedAt: current.trialStartedAt,
      trialEndsAt: current.trialEndsAt,
    })
  }

  if (!canStartTrial()) {
    return current
  }

  const startedAt = nowIso()
  const endsAt = new Date(new Date(startedAt).getTime() + (TRIAL_DAYS * 24 * 60 * 60 * 1000)).toISOString()

  return setBillingStatus('trial', {
    planKey,
    checkoutId,
    externalId,
    trialKind: 'standard',
    trialStartedAt: startedAt,
    trialEndsAt: endsAt,
  })
}


/**
 * Marca o plano como pago (após confirmação do pagamento)
 * Mantém as datas de trial para histórico, mas limpa status de trial
 */
export function markPlanPaid({
  planKey = '',
  checkoutId = '',
  externalId = '',
  subscriptionId = '',
  paidAt = nowIso(),
  billingMode = 'subscription',
  accessEndsAt = '',
} = {}) {
  const current = getBillingState()
  const resolvedPlanKey = planKey || current.planKey
  const resolvedBillingMode = normalizeBillingMode(billingMode) || 'subscription'
  const resolvedPaidAt = normalizeIsoDate(paidAt) || nowIso()
  const resolvedAccessEndsAt = normalizeIsoDate(accessEndsAt)
    || (resolvedBillingMode === 'one_time' ? getPlanAccessEndsAt({ planKey: resolvedPlanKey, paidAt: resolvedPaidAt }) : '')

  return setBillingStatus('paid', {
    planKey: resolvedPlanKey,
    checkoutId: checkoutId || current.checkoutId,
    externalId: externalId || current.externalId,
    subscriptionId: subscriptionId || current.subscriptionId,
    trialStartedAt: current.trialStartedAt,
    trialEndsAt: current.trialEndsAt,
    paidAt: resolvedPaidAt,
    billingMode: resolvedBillingMode,
    subscriptionActive: resolvedBillingMode !== 'one_time',
    cancelAtPeriodEnd: false,
    cancellationRequestedAt: '',
    cancelledAt: '',
    accessEndsAt: resolvedAccessEndsAt,
    remoteStatus: '',
  })
}

export function clearBillingState() {
  if (!canUseStorage()) return
  localStorage.removeItem(BILLING_STATE_KEY)
  localStorage.removeItem(LEGACY_PLAN_TIER_KEY)
  window.dispatchEvent(new CustomEvent(BILLING_STATE_UPDATED_EVENT))
  window.dispatchEvent(new CustomEvent(USAGE_UPDATED_EVENT))
  window.dispatchEvent(new CustomEvent(ACCOUNT_STATE_UPDATED_EVENT))
}

export function subscribeBillingState(handler) {
  if (typeof window === 'undefined') return () => {}

  window.addEventListener(BILLING_STATE_UPDATED_EVENT, handler)
  return () => window.removeEventListener(BILLING_STATE_UPDATED_EVENT, handler)
}

export function emitBillingStateUpdated() {
  if (!canUseStorage()) return
  window.dispatchEvent(new CustomEvent(BILLING_STATE_UPDATED_EVENT))
}

export function getBillingStatusLabel(status = getCurrentBillingStatus()) {
  switch (normalizeStatus(status)) {
    case 'trial':
      return 'Temporário'
    case 'paid':
      return 'Plano pago'
    default:
      return 'Plano gratuito'
  }
}

export function getBillingStatusDescription(status = getCurrentBillingStatus()) {
  const state = getBillingState()
  switch (normalizeStatus(status)) {
    case 'trial':
      return `Acesso temporário legado de ${TRIAL_DAYS} dias`
    case 'paid':
      return state.cancelAtPeriodEnd ? 'Plano pago ativo até o fim do período' : 'Plano pago ativo'
    default:
      if (state.trialEndsAt) {
        return 'Acesso temporário expirado'
      }
      return 'Conta gratuita'
  }
}

export { normalizeState as normalizeBillingState }
