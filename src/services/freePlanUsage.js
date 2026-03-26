const PLAN_TIER_KEY = 'apice:plan:tier'
const USAGE_KEY = 'apice:free-plan-usage:v1'
const USAGE_UPDATE_EVENT = 'apice:free-plan-usage-updated'

export const MANUAL_AI_DAILY_LIMIT = 5

export const FREE_PLAN_LIMITS = {
  themeDynamic: {
    label: 'Tema dinâmico',
    group: 'manual',
  },
  essayCorrection: {
    label: 'Correção de redação',
    group: 'manual',
  },
  directModelCall: {
    label: 'IA direta',
    group: 'manual',
  },
  radarSearch: {
    label: 'Radar de temas',
    group: 'manual',
  },
  userSummary: {
    label: 'Resumo automático',
    group: 'automatic',
    automatic: true,
  },
}

const MANUAL_USAGE_KEYS = Object.entries(FREE_PLAN_LIMITS)
  .filter(([, config]) => config.group === 'manual')
  .map(([key]) => key)

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function defaultState() {
  return {
    dayKey: todayKey(),
    counts: Object.fromEntries(
      Object.keys(FREE_PLAN_LIMITS).map((key) => [key, 0]),
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

function getPlanTier() {
  if (!canUseStorage()) return 'free'
  return localStorage.getItem(PLAN_TIER_KEY) || 'free'
}

function getManualUsageCount(snapshot = readState()) {
  return MANUAL_USAGE_KEYS.reduce((total, key) => total + (Number(snapshot.counts[key] || 0) || 0), 0)
}

function buildManualUsageBreakdown(snapshot = readState()) {
  return MANUAL_USAGE_KEYS.map((key) => {
    const config = FREE_PLAN_LIMITS[key]
    const used = Number(snapshot.counts[key] || 0)

    return {
      key,
      label: config.label,
      used,
    }
  })
}

export function setPlanTier(tier) {
  if (!canUseStorage()) return
  const normalizedTier = String(tier ?? 'free').trim().toLowerCase() || 'free'
  localStorage.setItem(PLAN_TIER_KEY, normalizedTier)
  window.dispatchEvent(new CustomEvent(USAGE_UPDATE_EVENT))
}

export function getCurrentPlanTier() {
  return getPlanTier()
}

export function getFreePlanUsageSnapshot() {
  return readState()
}

export function getFreePlanUsageRows() {
  const snapshot = readState()
  const used = getManualUsageCount(snapshot)
  const limit = MANUAL_AI_DAILY_LIMIT
  const percent = limit > 0 ? Math.min((used / limit) * 100, 100) : 0

  return [{
    key: 'manualAI',
    label: 'IA manual hoje',
    used,
    limit,
    remaining: Math.max(limit - used, 0),
    percent,
    blocked: used >= limit,
    breakdown: buildManualUsageBreakdown(snapshot),
  }]
}

export function canConsumeFreePlan(featureKey, amount = 1) {
  const entry = FREE_PLAN_LIMITS[featureKey]
  if (!entry || entry.automatic) return true

  const tier = getPlanTier()
  if (tier !== 'free') return true

  const snapshot = readState()
  const used = getManualUsageCount(snapshot)
  return used + amount <= MANUAL_AI_DAILY_LIMIT
}

export function consumeFreePlan(featureKey, amount = 1) {
  if (!canUseStorage()) return

  const entry = FREE_PLAN_LIMITS[featureKey]
  if (!entry || entry.automatic) return

  const tier = getPlanTier()
  if (tier !== 'free') return

  if (!canConsumeFreePlan(featureKey, amount)) return

  const snapshot = readState()
  const next = normalizeState(snapshot)

  next.dayKey = todayKey()
  next.counts[featureKey] = Number(next.counts[featureKey] || 0) + amount

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
