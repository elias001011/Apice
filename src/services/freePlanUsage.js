const PLAN_TIER_KEY = 'apice:plan:tier'
const USAGE_KEY = 'apice:free-plan-usage:v1'
const USAGE_UPDATE_EVENT = 'apice:free-plan-usage-updated'

// Esses limites são locais e fáceis de editar.
// A ideia é bloquear abuso no plano free sem precisar de backend logo de cara.
export const FREE_PLAN_LIMITS = {
  themeDynamic: {
    label: 'Tema dinâmico',
    limit: 5,
  },
  essayCorrection: {
    label: 'Correção de redação',
    limit: 12,
  },
  directModelCall: {
    label: 'IA direta',
    limit: 5,
  },
  userSummary: {
    label: 'Resumo de usuário',
    limit: 3,
  },
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function defaultState() {
  return {
    dayKey: todayKey(),
    counts: {
      themeDynamic: 0,
      essayCorrection: 0,
      directModelCall: 0,
      userSummary: 0,
    },
  }
}

function normalizeState(rawState) {
  const base = defaultState()
  if (!rawState || typeof rawState !== 'object') return base

  const dayKey = typeof rawState.dayKey === 'string' ? rawState.dayKey : base.dayKey
  const rawCounts = rawState.counts && typeof rawState.counts === 'object' ? rawState.counts : {}

  return {
    dayKey,
    counts: {
      themeDynamic: Number.isFinite(Number(rawCounts.themeDynamic)) ? Number(rawCounts.themeDynamic) : 0,
      essayCorrection: Number.isFinite(Number(rawCounts.essayCorrection)) ? Number(rawCounts.essayCorrection) : 0,
      directModelCall: Number.isFinite(Number(rawCounts.directModelCall)) ? Number(rawCounts.directModelCall) : 0,
      userSummary: Number.isFinite(Number(rawCounts.userSummary)) ? Number(rawCounts.userSummary) : 0,
    },
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
  return Object.entries(FREE_PLAN_LIMITS).map(([key, config]) => {
    const used = Number(snapshot.counts[key] || 0)
    const limit = Number(config.limit || 0)
    const percent = limit > 0 ? Math.min((used / limit) * 100, 100) : 0

    return {
      key,
      label: config.label,
      used,
      limit,
      remaining: Math.max(limit - used, 0),
      percent,
      blocked: used >= limit,
    }
  })
}

export function canConsumeFreePlan(featureKey, amount = 1) {
  const tier = getPlanTier()
  if (tier !== 'free') return true

  const entry = FREE_PLAN_LIMITS[featureKey]
  if (!entry) return true

  const snapshot = readState()
  const used = Number(snapshot.counts[featureKey] || 0)
  return used + amount <= entry.limit
}

export function consumeFreePlan(featureKey, amount = 1) {
  if (!canUseStorage()) return

  const tier = getPlanTier()
  if (tier !== 'free') return

  const entry = FREE_PLAN_LIMITS[featureKey]
  if (!entry) return

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
