const GUEST_SESSION_KEY = 'apice:session-mode:v1'
const GUEST_PROFILE_KEY = 'apice:guest-profile:v1'
const GUEST_SESSION_ID_KEY = 'apice:guest-session-id:v1'

const DEFAULT_GUEST_PROFILE = {
  full_name: 'Convidado',
  first_name: 'Convidado',
  school: '',
}

let inMemoryGuestSessionId = ''

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function generateGuestSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `guest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function readGuestSessionIdFromStorage() {
  if (!canUseStorage()) return ''

  try {
    return String(localStorage.getItem(GUEST_SESSION_ID_KEY) || '').trim()
  } catch {
    return ''
  }
}

export function getGuestSessionId() {
  const stored = readGuestSessionIdFromStorage()
  if (stored) return stored
  return inMemoryGuestSessionId
}

export function getOrCreateGuestSessionId() {
  const stored = getGuestSessionId()
  if (stored) return stored

  const nextId = generateGuestSessionId()
  inMemoryGuestSessionId = nextId

  if (canUseStorage()) {
    try {
      localStorage.setItem(GUEST_SESSION_ID_KEY, nextId)
    } catch {
      // ignore storage failures
    }
  }

  return nextId
}

function normalizeGuestProfile(profile) {
  const rawFullName = String(profile?.full_name ?? DEFAULT_GUEST_PROFILE.full_name).trim()
  const rawFirstName = String(profile?.first_name ?? '').trim()
  const rawSchool = String(profile?.school ?? '').trim()

  const fullName = rawFullName || DEFAULT_GUEST_PROFILE.full_name
  const firstName = rawFirstName || fullName.split(/\s+/)[0] || DEFAULT_GUEST_PROFILE.first_name

  return {
    full_name: fullName,
    first_name: firstName,
    school: rawSchool,
  }
}

export function isGuestSessionActive() {
  if (!canUseStorage()) return false

  try {
    return localStorage.getItem(GUEST_SESSION_KEY) === 'guest'
  } catch {
    return false
  }
}

export function loadGuestProfile() {
  if (!canUseStorage()) return { ...DEFAULT_GUEST_PROFILE }

  try {
    const raw = localStorage.getItem(GUEST_PROFILE_KEY)
    if (!raw) return { ...DEFAULT_GUEST_PROFILE }

    const parsed = JSON.parse(raw)
    return normalizeGuestProfile(parsed)
  } catch {
    return { ...DEFAULT_GUEST_PROFILE }
  }
}

export function saveGuestProfile(profile) {
  if (!canUseStorage()) return normalizeGuestProfile(profile)

  const normalized = normalizeGuestProfile(profile)
  try {
    localStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(normalized))
  } catch {
    // ignore storage failures
  }
  return normalized
}

export function createGuestUser(profile = loadGuestProfile()) {
  const normalized = normalizeGuestProfile(profile)

  return {
    id: 'guest',
    email: '',
    created_at: '',
    user_metadata: normalized,
    app_metadata: {
      roles: [],
    },
    guest: true,
  }
}

export function markGuestSession(profile = loadGuestProfile()) {
  const normalized = saveGuestProfile(profile)

  if (!canUseStorage()) return normalized

  try {
    localStorage.setItem(GUEST_SESSION_KEY, 'guest')
    localStorage.setItem(GUEST_SESSION_ID_KEY, getOrCreateGuestSessionId())
  } catch {
    // ignore storage failures
  }

  return normalized
}

export function clearGuestSession() {
  inMemoryGuestSessionId = ''

  if (!canUseStorage()) return

  try {
    localStorage.removeItem(GUEST_SESSION_KEY)
    localStorage.removeItem(GUEST_PROFILE_KEY)
    localStorage.removeItem(GUEST_SESSION_ID_KEY)
  } catch {
    // ignore storage failures
  }
}

export { normalizeGuestProfile }
