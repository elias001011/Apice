import {
  clearAiResponsePreference,
  loadAiResponsePreference,
  normalizeAiResponsePreference,
  saveAiResponsePreference,
} from './aiResponsePreferences.js'
import {
  loadAvatarSettings,
  normalizeAvatarSettings,
  saveAvatarSettings,
} from './avatarSettings.js'
import {
  loadEssayHistory,
  compactEssayHistoryEntry,
  saveEssayHistorySnapshot,
  loadEssayHistoryCount,
  MAX_ESSAY_HISTORY_ENTRIES,
} from './essayInsights.js'
import {
  getFreePlanUsageSnapshot,
  setFreePlanUsageSnapshot,
  resetFreePlanUsage,
  getCurrentPlanTier,
  setPlanTier,
} from './freePlanUsage.js'
import {
  loadRadarFavorites,
  setRadarFavoritesSnapshot,
  normalizeRadarFavorites,
} from './radarFavorites.js'
import {
  loadRadarSnapshot,
  saveRadarSnapshot,
  normalizeRadarSnapshot,
} from './radarState.js'
import {
  DEFAULT_NOTIFICATIONS,
  loadNotificationPreferences,
  saveNotificationPreferences,
  resetNotificationPreferences,
} from './notificationPreferences.js'
import {
  clearUserSummary,
  loadUserSummary,
  normalizeUserSummary,
  saveUserSummary,
} from './userSummary.js'

const THEME_KEY = 'apice:theme'
const ACCENT_KEY = 'apice:accent'
const FONT_SIZE_KEY = 'apice:font'
const FONT_FAMILY_KEY = 'apice:fontFamily'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readStoredValue(key, fallback) {
  if (!canUseStorage()) return fallback
  try {
    const value = localStorage.getItem(key)
    return value || fallback
  } catch {
    return fallback
  }
}

function readThemeSnapshot() {
  return {
    theme: readStoredValue(THEME_KEY, 'light'),
    accent: readStoredValue(ACCENT_KEY, 'lime'),
    fontSize: readStoredValue(FONT_SIZE_KEY, 'md'),
    fontFamily: readStoredValue(FONT_FAMILY_KEY, 'dm-sans'),
  }
}

function readProfileSnapshot(user) {
  return {
    full_name: String(user?.user_metadata?.full_name ?? '').trim(),
    first_name: String(user?.user_metadata?.first_name ?? '').trim(),
    school: String(user?.user_metadata?.school ?? '').trim(),
    email: String(user?.email ?? '').trim(),
  }
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return []
  return history
    .filter((item) => item && typeof item === 'object')
    .map((item) => compactEssayHistoryEntry(item))
}

function normalizeUsage(usage) {
  if (!usage || typeof usage !== 'object') return getFreePlanUsageSnapshot()

  const counts = usage.counts && typeof usage.counts === 'object' ? usage.counts : {}

  return {
    dayKey: String(usage.dayKey ?? new Date().toISOString().slice(0, 10)),
    counts: {
      themeDynamic: Number.isFinite(Number(counts.themeDynamic)) ? Number(counts.themeDynamic) : 0,
      essayCorrection: Number.isFinite(Number(counts.essayCorrection)) ? Number(counts.essayCorrection) : 0,
      directModelCall: Number.isFinite(Number(counts.directModelCall)) ? Number(counts.directModelCall) : 0,
      radarSearch: Number.isFinite(Number(counts.radarSearch)) ? Number(counts.radarSearch) : 0,
      userSummary: Number.isFinite(Number(counts.userSummary)) ? Number(counts.userSummary) : 0,
    },
  }
}

export function buildAccountSnapshot(user, historyLimit = MAX_ESSAY_HISTORY_ENTRIES) {
  return {
    version: 5,
    profile: readProfileSnapshot(user),
    preferences: readThemeSnapshot(),
    history: normalizeHistory(loadEssayHistory(historyLimit)),
    historyCount: loadEssayHistoryCount(),
    usage: normalizeUsage(getFreePlanUsageSnapshot()),
    planTier: getCurrentPlanTier(),
    radarFavorites: loadRadarFavorites(),
    radarSnapshot: loadRadarSnapshot(),
    summary: loadUserSummary(),
    aiResponsePreference: loadAiResponsePreference(),
    avatarSettings: loadAvatarSettings(),
    notifications: loadNotificationPreferences(),
    savedAt: new Date().toISOString(),
  }
}

export function extractAccountSnapshot(user) {
  const raw = user?.user_metadata?.apice_state
  if (!raw) return null

  if (typeof raw === 'string') {
    try {
      return normalizeAccountSnapshot(JSON.parse(raw))
    } catch {
      return null
    }
  }

  return normalizeAccountSnapshot(raw)
}

export function normalizeAccountSnapshot(rawSnapshot) {
  if (!rawSnapshot || typeof rawSnapshot !== 'object') return null

  const history = normalizeHistory(Array.isArray(rawSnapshot.history) ? rawSnapshot.history : [])
  const radarFavorites = normalizeRadarFavorites(
    Array.isArray(rawSnapshot.radarFavorites)
      ? rawSnapshot.radarFavorites
      : Array.isArray(rawSnapshot.savedRadarThemes)
        ? rawSnapshot.savedRadarThemes
      : [],
  )
  const hasAiResponsePreference = Object.prototype.hasOwnProperty.call(rawSnapshot, 'aiResponsePreference')
  const snapshot = {
    version: Number(rawSnapshot.version ?? 4) || 4,
    profile: readProfileSnapshot({
      user_metadata: rawSnapshot.profile || {},
      email: rawSnapshot.profile?.email || '',
    }),
    preferences: {
      theme: String(rawSnapshot.preferences?.theme ?? 'light').trim() || 'light',
      accent: String(rawSnapshot.preferences?.accent ?? 'lime').trim() || 'lime',
      fontSize: String(rawSnapshot.preferences?.fontSize ?? 'md').trim() || 'md',
      fontFamily: String(rawSnapshot.preferences?.fontFamily ?? 'dm-sans').trim() || 'dm-sans',
    },
    history,
    historyCount: Number.isFinite(Number(rawSnapshot.historyCount)) ? Number(rawSnapshot.historyCount) : history.length,
    usage: normalizeUsage(rawSnapshot.usage),
    planTier: String(rawSnapshot.planTier ?? 'free').trim() || 'free',
    radarFavorites,
    radarSnapshot: normalizeRadarSnapshot(
      rawSnapshot.radarSnapshot
        || rawSnapshot.radarState
        || rawSnapshot.currentRadar
        || null,
    ),
    summary: rawSnapshot.summary ? normalizeUserSummary(rawSnapshot.summary) : null,
    avatarSettings: normalizeAvatarSettings(rawSnapshot.avatarSettings || rawSnapshot.avatar || null),
    notifications: loadNotificationPreferencesFromObject(rawSnapshot.notifications),
    savedAt: String(rawSnapshot.savedAt ?? new Date().toISOString()),
  }

  if (hasAiResponsePreference) {
    snapshot.aiResponsePreference = normalizeAiResponsePreference(rawSnapshot.aiResponsePreference)
  }

  return snapshot
}

function loadNotificationPreferencesFromObject(rawPreferences) {
  if (!rawPreferences || typeof rawPreferences !== 'object') return { ...DEFAULT_NOTIFICATIONS }
  return {
    radar: Boolean(rawPreferences.radar),
    lembrete: Boolean(rawPreferences.lembrete),
    dicas: Boolean(rawPreferences.dicas),
    app: Boolean(rawPreferences.app),
  }
}

export function applyAccountSnapshot(snapshot) {
  if (!canUseStorage() || !snapshot || typeof snapshot !== 'object') return

  const preferences = snapshot.preferences || {}
  const history = Array.isArray(snapshot.history) ? snapshot.history : []
  const historyCount = Number.isFinite(Number(snapshot.historyCount)) ? Number(snapshot.historyCount) : history.length
  const usage = snapshot.usage ? normalizeUsage(snapshot.usage) : null
  const planTier = String(snapshot.planTier ?? 'free').trim() || 'free'
  const radarFavorites = Array.isArray(snapshot.radarFavorites) ? snapshot.radarFavorites : []
  const radarSnapshot = snapshot.radarSnapshot ? normalizeRadarSnapshot(snapshot.radarSnapshot) : null

  localStorage.setItem(THEME_KEY, String(preferences.theme ?? 'light'))
  localStorage.setItem(ACCENT_KEY, String(preferences.accent ?? 'lime'))
  localStorage.setItem(FONT_SIZE_KEY, String(preferences.fontSize ?? 'md'))
  localStorage.setItem(FONT_FAMILY_KEY, String(preferences.fontFamily ?? 'dm-sans'))

  saveEssayHistorySnapshot(history, historyCount)

  if (usage) {
    setFreePlanUsageSnapshot(usage)
  } else {
    resetFreePlanUsage()
  }

  setPlanTier(planTier)

  setRadarFavoritesSnapshot(radarFavorites)
  saveRadarSnapshot(radarSnapshot)

  if (snapshot.summary) {
    saveUserSummary(snapshot.summary)
  } else {
    clearUserSummary()
  }

  if (Object.prototype.hasOwnProperty.call(snapshot, 'aiResponsePreference')) {
    if (snapshot.aiResponsePreference) {
      saveAiResponsePreference(snapshot.aiResponsePreference)
    } else {
      clearAiResponsePreference()
    }
  }

  saveAvatarSettings(snapshot.avatarSettings)

  if (snapshot.notifications) {
    saveNotificationPreferences(snapshot.notifications)
  } else {
    resetNotificationPreferences()
  }

  window.dispatchEvent(new CustomEvent('apice:theme-updated'))
  window.dispatchEvent(new CustomEvent('apice:historico-updated'))
  window.dispatchEvent(new CustomEvent('apice:free-plan-usage-updated'))
  window.dispatchEvent(new CustomEvent('apice:radar-favorites-updated'))
  window.dispatchEvent(new CustomEvent('apice:radar-state-updated'))
  window.dispatchEvent(new CustomEvent('apice:user-summary-updated'))
  window.dispatchEvent(new CustomEvent('apice:notificacoes-updated'))
  window.dispatchEvent(new CustomEvent('apice:account-state-updated'))
}
