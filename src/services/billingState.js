const BILLING_STATE_KEY = 'apice:billing-state:v1'
const LEGACY_PLAN_TIER_KEY = 'apice:plan:tier'
const BILLING_STATE_UPDATED_EVENT = 'apice:billing-state-updated'
const ACCOUNT_STATE_UPDATED_EVENT = 'apice:account-state-updated'
const USAGE_UPDATED_EVENT = 'apice:free-plan-usage-updated'

export const TRIAL_DAYS = 7

const VALID_STATUSES = new Set(['free', 'trial', 'paid'])
const STATUS_ALIASES = {
  free: 'free',
  trial: 'trial',
  paid: 'paid',
  pro: 'paid',
  premium: 'paid',
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
  if (['monthly', 'semiannual', 'annual'].includes(normalized)) {
    return normalized
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

function buildDefaultState() {
  const iso = nowIso()
  return {
    status: 'free',
    planKey: '',
    trialUsedAt: '',
    trialStartedAt: '',
    trialEndsAt: '',
    paidAt: '',
    checkoutId: '',
    externalId: '',
    subscriptionId: '',
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
  const trialUsedAt = normalizeIsoDate(rawState.trialUsedAt ?? rawState.trialRedeemedAt ?? rawState.trialStartedAt)
  const trialStartedAt = normalizeIsoDate(rawState.trialStartedAt ?? rawState.trialUsedAt ?? rawState.trialRedeemedAt)
  const trialEndsAt = normalizeIsoDate(rawState.trialEndsAt ?? rawState.trialExpiresAt)
  const paidAt = normalizeIsoDate(rawState.paidAt ?? rawState.paidSince ?? rawState.activeSince)

  const normalized = {
    ...base,
    status,
    planKey,
    trialUsedAt,
    trialStartedAt,
    trialEndsAt,
    paidAt,
    checkoutId: normalizeText(rawState.checkoutId ?? rawState.checkout_id),
    externalId: normalizeText(rawState.externalId ?? rawState.external_id),
    subscriptionId: normalizeText(rawState.subscriptionId ?? rawState.subscription_id),
    updatedAt: normalizeIsoDate(rawState.updatedAt ?? rawState.savedAt ?? rawState.modifiedAt) || base.updatedAt,
  }

  if (normalized.status === 'trial') {
    const trialEndsAtDate = normalized.trialEndsAt ? new Date(normalized.trialEndsAt) : null
    if (!trialEndsAtDate || !Number.isFinite(trialEndsAtDate.getTime()) || trialEndsAtDate.getTime() <= Date.now()) {
      normalized.status = 'free'
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

export function hasUsedTrial() {
  const state = getBillingState()
  return Boolean(state.trialUsedAt || state.trialStartedAt || state.trialEndsAt)
}

export function isTrialActive() {
  const state = getBillingState()
  if (state.status !== 'trial') return false

  const trialEndsAtDate = state.trialEndsAt ? new Date(state.trialEndsAt) : null
  return Boolean(trialEndsAtDate && Number.isFinite(trialEndsAtDate.getTime()) && trialEndsAtDate.getTime() > Date.now())
}

export function canStartTrial() {
  const state = getBillingState()
  return state.status === 'free' && !hasUsedTrial()
}

export function getTrialEndsAt() {
  return getBillingState().trialEndsAt || ''
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

export function setBillingStatus(status, { planKey = '', checkoutId = '', externalId = '', subscriptionId = '', trialStartedAt = '', trialEndsAt = '', paidAt = '' } = {}) {
  const normalizedStatus = normalizeStatus(status)
  const current = getBillingState()

  const next = {
    ...current,
    status: normalizedStatus,
    planKey: normalizePlanKey(planKey) || current.planKey,
    checkoutId: normalizeText(checkoutId) || current.checkoutId,
    externalId: normalizeText(externalId) || current.externalId,
    subscriptionId: normalizeText(subscriptionId) || current.subscriptionId,
    trialStartedAt: normalizeIsoDate(trialStartedAt) || current.trialStartedAt,
    trialEndsAt: normalizeIsoDate(trialEndsAt) || current.trialEndsAt,
    paidAt: normalizeIsoDate(paidAt) || current.paidAt,
    updatedAt: nowIso(),
  }

  if (normalizedStatus === 'free') {
    next.checkoutId = normalizeText(checkoutId) || ''
    next.externalId = normalizeText(externalId) || ''
    next.subscriptionId = normalizeText(subscriptionId) || ''
    next.paidAt = ''
  }

  if (normalizedStatus === 'paid') {
    next.paidAt = normalizeIsoDate(paidAt) || nowIso()
    next.trialEndsAt = next.trialEndsAt || ''
    next.trialStartedAt = next.trialStartedAt || ''
  }

  if (normalizedStatus === 'trial') {
    const startedAt = normalizeIsoDate(trialStartedAt) || current.trialStartedAt || nowIso()
    const endsAt = normalizeIsoDate(trialEndsAt) || new Date(new Date(startedAt).getTime() + (TRIAL_DAYS * 24 * 60 * 60 * 1000)).toISOString()
    next.trialStartedAt = startedAt
    next.trialEndsAt = endsAt
    next.trialUsedAt = current.trialUsedAt || startedAt
    next.paidAt = ''
  }

  persistState(next)
  return next
}

export function startTrial({ planKey = '', checkoutId = '', externalId = '' } = {}) {
  const current = getBillingState()

  if (current.status === 'paid') {
    return current
  }

  if (current.status === 'trial' && isTrialActive()) {
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
    trialStartedAt: startedAt,
    trialEndsAt: endsAt,
  })
}

export function markPlanPaid({ planKey = '', checkoutId = '', externalId = '', subscriptionId = '', paidAt = nowIso() } = {}) {
  const current = getBillingState()

  return setBillingStatus('paid', {
    planKey: planKey || current.planKey,
    checkoutId: checkoutId || current.checkoutId,
    externalId: externalId || current.externalId,
    subscriptionId: subscriptionId || current.subscriptionId,
    trialStartedAt: current.trialStartedAt,
    trialEndsAt: current.trialEndsAt,
    paidAt,
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
      return 'Teste grátis'
    case 'paid':
      return 'Pago'
    default:
      return 'Gratuito'
  }
}

export function getBillingStatusDescription(status = getCurrentBillingStatus()) {
  switch (normalizeStatus(status)) {
    case 'trial':
      return `Teste grátis de ${TRIAL_DAYS} dias`
    case 'paid':
      return 'Plano pago ativo'
    default:
      return 'Conta gratuita'
  }
}

export { normalizeState as normalizeBillingState }
