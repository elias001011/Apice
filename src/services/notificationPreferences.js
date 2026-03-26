const NOTIFICATION_KEY = 'apice:notificacoes:v1'
const NOTIFICATION_UPDATED_EVENT = 'apice:notificacoes-updated'

const DEFAULT_NOTIFICATIONS = {
  radar: true,
  lembrete: true,
  dicas: false,
  app: true,
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function normalizePreferences(rawPreferences) {
  if (!rawPreferences || typeof rawPreferences !== 'object') {
    return { ...DEFAULT_NOTIFICATIONS }
  }

  return {
    radar: Boolean(rawPreferences.radar ?? DEFAULT_NOTIFICATIONS.radar),
    lembrete: Boolean(rawPreferences.lembrete ?? DEFAULT_NOTIFICATIONS.lembrete),
    dicas: Boolean(rawPreferences.dicas ?? DEFAULT_NOTIFICATIONS.dicas),
    app: Boolean(rawPreferences.app ?? DEFAULT_NOTIFICATIONS.app),
  }
}

export function loadNotificationPreferences() {
  if (!canUseStorage()) return { ...DEFAULT_NOTIFICATIONS }

  try {
    const raw = localStorage.getItem(NOTIFICATION_KEY)
    if (!raw) return { ...DEFAULT_NOTIFICATIONS }
    return normalizePreferences(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_NOTIFICATIONS }
  }
}

export function saveNotificationPreferences(preferences) {
  if (!canUseStorage()) return { ...DEFAULT_NOTIFICATIONS }

  const normalized = normalizePreferences(preferences)
  localStorage.setItem(NOTIFICATION_KEY, JSON.stringify(normalized))
  window.dispatchEvent(new CustomEvent(NOTIFICATION_UPDATED_EVENT))
  return normalized
}

export function resetNotificationPreferences() {
  return saveNotificationPreferences(DEFAULT_NOTIFICATIONS)
}

export function subscribeNotificationPreferences(handler) {
  if (typeof window === 'undefined') return () => {}

  window.addEventListener(NOTIFICATION_UPDATED_EVENT, handler)
  return () => window.removeEventListener(NOTIFICATION_UPDATED_EVENT, handler)
}

export function emitNotificationPreferencesUpdated() {
  if (!canUseStorage()) return
  window.dispatchEvent(new CustomEvent(NOTIFICATION_UPDATED_EVENT))
}

export { DEFAULT_NOTIFICATIONS }
