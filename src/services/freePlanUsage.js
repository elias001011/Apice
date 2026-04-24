import {
  getBillingState,
  getCurrentPlanTier as getAccessPlanTier,
  setBillingStatus,
} from './billingState.js'

const USAGE_KEY = 'apice:free-plan-usage:v1'
const USAGE_UPDATE_EVENT = 'apice:free-plan-usage-updated'

export const AI_DAILY_LIMIT = 5
export const PAID_AI_DAILY_LIMIT = 10
export const MANUAL_AI_DAILY_LIMIT = PAID_AI_DAILY_LIMIT

export const FREE_PLAN_LIMITS = {
  themeDynamic: {
    label: 'Tema dinâmico',
  },
  essayCorrection: {
    label: 'Correção de redação',
  },
  directModelCall: {
    label: 'IA direta',
  },
  professorChat: {
    label: 'Professor IA',
  },
  radarSearch: {
    label: 'Radar: busca',
  },
  radarDetail: {
    label: 'Radar: ver detalhes',
  },
  userSummary: {
    label: 'Resumo automático',
  },
  otherAiRequest: {
    label: 'Outras chamadas de IA',
  },
}

const COUNTED_USAGE_KEYS = Object.keys(FREE_PLAN_LIMITS)

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function getAiUsageDayKey(referenceDate = new Date()) {
  const date = referenceDate instanceof Date ? referenceDate : new Date(referenceDate)
  if (!Number.isFinite(date.getTime())) {
    return getAiUsageDayKey(new Date())
  }
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function todayKey() {
  return getAiUsageDayKey()
}

function defaultState() {
  return {
    dayKey: todayKey(),
    counts: Object.fromEntries(
      COUNTED_USAGE_KEYS.map((key) => [key, 0]),
    ),
  }
}

function normalizeState(rawState) {
  const base = defaultState()
  if (!rawState || typeof rawState !== 'object') return base

  const dayKey = typeof rawState.dayKey === 'string' ? rawState.dayKey : base.dayKey
  const rawCounts = rawState.counts && typeof rawState.counts === 'object' ? rawState.counts : {}
  const counts = { ...base.counts }

  for (const key of Object.keys(counts)) {
    counts[key] = Number.isFinite(Number(rawCounts[key])) ? Number(rawCounts[key]) : 0
  }

  return {
    dayKey,
    counts,
  }
}

function readState() {
  if (!canUseStorage()) return defaultState()

  try {
    const raw = localStorage.getItem(USAGE_KEY)
    const parsed = raw ? normalizeState(JSON.parse(raw)) : defaultState()
    if (parsed.dayKey !== todayKey()) {
      return defaultState()
    }
    return parsed
  } catch {
    return defaultState()
  }
}

function writeState(state) {
  if (!canUseStorage()) return
  localStorage.setItem(USAGE_KEY, JSON.stringify(state))
  window.dispatchEvent(new CustomEvent(USAGE_UPDATE_EVENT))
}

function resolveUsageKey(featureKey) {
  const normalizedKey = String(featureKey ?? '').trim()
  if (normalizedKey && Object.prototype.hasOwnProperty.call(FREE_PLAN_LIMITS, normalizedKey)) {
    return normalizedKey
  }

  return 'otherAiRequest'
}

function getAiUsageCount(snapshot = readState()) {
  return COUNTED_USAGE_KEYS.reduce((total, key) => total + (Number(snapshot.counts[key] || 0) || 0), 0)
}

function buildAiUsageBreakdown(snapshot = readState()) {
  return COUNTED_USAGE_KEYS.map((key) => {
    const config = FREE_PLAN_LIMITS[key]
    const used = Number(snapshot.counts[key] || 0)

    return {
      key,
      label: config.label,
      used,
    }
  }).filter((row) => row.key !== 'otherAiRequest' || row.used > 0)
}

export function setPlanTier(tier) {
  const normalizedTier = String(tier ?? 'free').trim().toLowerCase() || 'free'
  if (normalizedTier === 'free') {
    setBillingStatus('free')
    return
  }

  if (normalizedTier === 'trial') {
    setBillingStatus('trial', {
      trialKind: 'standard',
    })
    return
  }

  setBillingStatus('paid')
}

export function getCurrentPlanTier() {
  return getAccessPlanTier()
}

export function getCurrentBillingStatus() {
  return getBillingState().status
}

export function getCurrentAiDailyLimit() {
  return getCurrentBillingStatus() === 'free' ? AI_DAILY_LIMIT : PAID_AI_DAILY_LIMIT
}

export function getFreePlanUsageSnapshot() {
  return readState()
}

export function getFreePlanUsageRows() {
  const snapshot = readState()
  const used = getAiUsageCount(snapshot)
  const status = getCurrentBillingStatus()
  const limit = getCurrentAiDailyLimit()
  const percent = limit > 0 ? Math.min((used / limit) * 100, 100) : 0

  return [{
    key: 'aiRequests',
    label: 'IA hoje',
    used,
    limit,
    remaining: Math.max(limit - used, 0),
    percent,
    blocked: used >= limit,
    status,
    accessTier: getCurrentPlanTier(),
    breakdown: buildAiUsageBreakdown(snapshot),
  }]
}

export function canConsumeFreePlan(_featureKey, amount = 1) {
  const snapshot = readState()
  const used = getAiUsageCount(snapshot)
  return used + amount <= getCurrentAiDailyLimit()
}

export function consumeFreePlan(featureKey, amount = 1) {
  if (!canUseStorage()) return

  const resolvedKey = resolveUsageKey(featureKey)
  if (!canConsumeFreePlan(resolvedKey, amount)) return

  const snapshot = readState()
  const next = normalizeState(snapshot)

  next.dayKey = todayKey()
  next.counts[resolvedKey] = Number(next.counts[resolvedKey] || 0) + amount

  writeState(next)
}

export function resetFreePlanUsage() {
  if (!canUseStorage()) return
  writeState(defaultState())
}

export function subscribeFreePlanUsage(handler) {
  if (typeof window === 'undefined') return () => {}

  window.addEventListener(USAGE_UPDATE_EVENT, handler)
  return () => window.removeEventListener(USAGE_UPDATE_EVENT, handler)
}

export function emitFreePlanUsageUpdated() {
  if (!canUseStorage()) return
  window.dispatchEvent(new CustomEvent(USAGE_UPDATE_EVENT))
}

export function setFreePlanUsageSnapshot(snapshot) {
  if (!canUseStorage()) return
  writeState(normalizeState(snapshot))
}
