const STORAGE_KEY = 'apice:login-throttle:v1'
const THROTTLE_WINDOW_MS = 10 * 60 * 1000
const DELAY_SCHEDULE_MS = [0, 0, 5_000, 15_000, 30_000, 60_000, 120_000, 300_000]

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function normalizeLoginIdentifier(email) {
  return String(email ?? '').trim().toLowerCase()
}

function readStore() {
  if (!canUseStorage()) return {}

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}

    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed
  } catch {
    return {}
  }
}

function writeStore(store) {
  if (!canUseStorage()) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

function clearStaleEntry(store, key) {
  if (!store[key]) return false
  delete store[key]
  writeStore(store)
  return true
}

function buildEmptyState(email = '') {
  return {
    email,
    failures: 0,
    firstFailedAt: 0,
    lastFailedAt: 0,
    lockedUntil: 0,
    remainingMs: 0,
    resetInMs: 0,
    delayMs: 0,
    isLocked: false,
  }
}

export function computeLoginDelayMs(failures) {
  const normalized = Number.isFinite(Number(failures)) ? Math.max(0, Math.trunc(Number(failures))) : 0
  const scheduleIndex = Math.max(0, normalized - 1)
  return DELAY_SCHEDULE_MS[Math.min(scheduleIndex, DELAY_SCHEDULE_MS.length - 1)]
}

export function getLoginThrottleState(email, now = Date.now()) {
  const key = normalizeLoginIdentifier(email)
  if (!key) return buildEmptyState('')

  const store = readStore()
  const entry = store[key]
  if (!entry || typeof entry !== 'object') {
    return buildEmptyState(key)
  }

  const failures = Number.isFinite(Number(entry.failures)) ? Math.max(0, Math.trunc(Number(entry.failures))) : 0
  const lastFailedAt = Number.isFinite(Number(entry.lastFailedAt)) ? Number(entry.lastFailedAt) : 0
  const firstFailedAt = Number.isFinite(Number(entry.firstFailedAt)) ? Number(entry.firstFailedAt) : lastFailedAt

  if (!failures || !lastFailedAt || now - lastFailedAt > THROTTLE_WINDOW_MS) {
    clearStaleEntry(store, key)
    return buildEmptyState(key)
  }

  const delayMs = computeLoginDelayMs(failures)
  const lockedUntil = Number.isFinite(Number(entry.lockedUntil)) ? Number(entry.lockedUntil) : 0
  const remainingMs = Math.max(0, lockedUntil - now)
  const resetInMs = Math.max(0, THROTTLE_WINDOW_MS - (now - lastFailedAt))

  return {
    email: key,
    failures,
    firstFailedAt,
    lastFailedAt,
    lockedUntil,
    remainingMs,
    resetInMs,
    delayMs,
    isLocked: remainingMs > 0,
  }
}

export function recordLoginFailure(email, now = Date.now()) {
  const key = normalizeLoginIdentifier(email)
  if (!key) return buildEmptyState('')

  const store = readStore()
  const previous = getLoginThrottleState(key, now)
  const isWithinWindow = previous.failures > 0 && previous.remainingMs >= 0 && previous.resetInMs > 0
  const nextFailures = isWithinWindow ? previous.failures + 1 : 1
  const delayMs = computeLoginDelayMs(nextFailures)
  const lockedUntil = delayMs > 0 ? now + delayMs : 0

  store[key] = {
    failures: nextFailures,
    firstFailedAt: isWithinWindow ? previous.firstFailedAt || now : now,
    lastFailedAt: now,
    lockedUntil,
  }

  writeStore(store)
  return getLoginThrottleState(key, now)
}

export function clearLoginThrottle(email) {
  const key = normalizeLoginIdentifier(email)
  if (!key || !canUseStorage()) return

  const store = readStore()
  if (store[key]) {
    delete store[key]
    writeStore(store)
  }
}

function formatDuration(ms) {
  const totalSeconds = Math.max(1, Math.ceil(Number(ms) / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`
  }

  return `${seconds}s`
}

export function getLoginThrottleMessage(state) {
  if (!state?.isLocked) return ''
  return `Muitas tentativas. Aguarde ${formatDuration(state.remainingMs)} antes de tentar novamente.`
}
