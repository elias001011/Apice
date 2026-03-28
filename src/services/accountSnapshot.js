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
  compactEssayHistoryEntry,
  buildCloudEssayHistorySnapshot,
  saveEssayHistorySnapshot,
  loadEssayHistoryCount,
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
import {
  loadConquistas,
  normalizeConquistasSnapshot,
  setConquistasSnapshot,
} from './conquistas.js'

const THEME_KEY = 'apice:theme'
const ACCENT_KEY = 'apice:accent'
const FONT_SIZE_KEY = 'apice:font'
const FONT_FAMILY_KEY = 'apice:fontFamily'
const LAYOUT_MODE_KEY = 'apice:layoutMode'
const CONTAINER_SIZE_KEY = 'apice:containerSize'
const ANIMATIONS_ENABLED_KEY = 'apice:animationsEnabled'
const CARD_HOVER_ENABLED_KEY = 'apice:cardHoverEffects'

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

function readStoredBoolean(key, fallback) {
  if (!canUseStorage()) return fallback

  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return raw === 'true'
  } catch {
    return fallback
  }
}

function normalizeBooleanPreference(value, fallback) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true
    if (['false', '0', 'no', 'off'].includes(normalized)) return false
  }
  return fallback
}

function getSystemAnimationsEnabled() {
  if (typeof window === 'undefined') return true
  return !(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false)
}

function getIsMobileLayout() {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(max-width: 767px)')?.matches ?? false
}

function readThemeSnapshot() {
  return {
    theme: readStoredValue(THEME_KEY, 'light'),
    accent: readStoredValue(ACCENT_KEY, 'lime'),
    fontSize: readStoredValue(FONT_SIZE_KEY, 'md'),
    fontFamily: readStoredValue(FONT_FAMILY_KEY, 'dm-sans'),
    layoutMode: readStoredValue(LAYOUT_MODE_KEY, 'comfortable'),
    containerSize: readStoredValue(CONTAINER_SIZE_KEY, 'sm'),
    animationsEnabled: readStoredBoolean(ANIMATIONS_ENABLED_KEY, getSystemAnimationsEnabled()),
    cardHoverEffects: readStoredBoolean(CARD_HOVER_ENABLED_KEY, !getIsMobileLayout()),
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
      radarDetail: Number.isFinite(Number(counts.radarDetail)) ? Number(counts.radarDetail) : 0,
      userSummary: Number.isFinite(Number(counts.userSummary)) ? Number(counts.userSummary) : 0,
    },
  }
}

function compactRadarFavoriteSnapshot(favorite) {
  if (!favorite || typeof favorite !== 'object') return null

  const titulo = String(favorite.titulo ?? favorite.title ?? '').trim()
  if (!titulo) return null

  return {
    id: String(favorite.id ?? titulo).trim() || titulo,
    titulo,
    probabilidade: Number.isFinite(Number(favorite.probabilidade)) ? Number(favorite.probabilidade) : 0,
    hot: Boolean(favorite.hot),
    savedAt: String(favorite.savedAt ?? favorite.createdAt ?? new Date().toISOString()).trim() || new Date().toISOString(),
    origem: String(favorite.origem ?? 'ai').trim() || 'ai',
  }
}

export function buildAccountSnapshot(user) {
  return {
    version: 12,
    profile: readProfileSnapshot(user),
    preferences: readThemeSnapshot(),
    history: buildCloudEssayHistorySnapshot(),
    historyCount: loadEssayHistoryCount(),
    usage: normalizeUsage(getFreePlanUsageSnapshot()),
    planTier: getCurrentPlanTier(),
    radarFavorites: loadRadarFavorites()
      .map((favorite) => compactRadarFavoriteSnapshot(favorite))
      .filter(Boolean),
    summary: loadUserSummary(),
    aiResponsePreference: loadAiResponsePreference(),
    avatarSettings: loadAvatarSettings(),
    notifications: loadNotificationPreferences(),
    conquistas: loadConquistas(),
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
    version: Number(rawSnapshot.version ?? 10) || 10,
    profile: readProfileSnapshot({
      user_metadata: rawSnapshot.profile || {},
      email: rawSnapshot.profile?.email || '',
    }),
    preferences: {
      theme: String(rawSnapshot.preferences?.theme ?? 'light').trim() || 'light',
      accent: String(rawSnapshot.preferences?.accent ?? 'lime').trim() || 'lime',
      fontSize: String(rawSnapshot.preferences?.fontSize ?? 'md').trim() || 'md',
      fontFamily: String(rawSnapshot.preferences?.fontFamily ?? 'dm-sans').trim() || 'dm-sans',
      layoutMode: String(rawSnapshot.preferences?.layoutMode ?? 'comfortable').trim() || 'comfortable',
      containerSize: String(rawSnapshot.preferences?.containerSize ?? 'sm').trim() || 'sm',
      ...(Object.prototype.hasOwnProperty.call(rawSnapshot.preferences || {}, 'animationsEnabled')
        ? { animationsEnabled: normalizeBooleanPreference(rawSnapshot.preferences?.animationsEnabled, getSystemAnimationsEnabled()) }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(rawSnapshot.preferences || {}, 'cardHoverEffects')
        ? { cardHoverEffects: normalizeBooleanPreference(rawSnapshot.preferences?.cardHoverEffects, !getIsMobileLayout()) }
        : {}),
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
    conquistas: normalizeConquistasSnapshot(rawSnapshot.conquistas || null),
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

  if (Object.prototype.hasOwnProperty.call(snapshot, 'history')) {
    const history = Array.isArray(snapshot.history) ? snapshot.history : []
    const historyCount = Number.isFinite(Number(snapshot.historyCount)) ? Number(snapshot.historyCount) : history.length
    saveEssayHistorySnapshot(history, historyCount)
  }

  if (snapshot.preferences && typeof snapshot.preferences === 'object') {
    const preferences = snapshot.preferences
    if (Object.prototype.hasOwnProperty.call(preferences, 'theme')) {
      localStorage.setItem(THEME_KEY, String(preferences.theme ?? 'light'))
    }
    if (Object.prototype.hasOwnProperty.call(preferences, 'accent')) {
      localStorage.setItem(ACCENT_KEY, String(preferences.accent ?? 'lime'))
    }
    if (Object.prototype.hasOwnProperty.call(preferences, 'fontSize')) {
      localStorage.setItem(FONT_SIZE_KEY, String(preferences.fontSize ?? 'md'))
    }
    if (Object.prototype.hasOwnProperty.call(preferences, 'fontFamily')) {
      localStorage.setItem(FONT_FAMILY_KEY, String(preferences.fontFamily ?? 'dm-sans'))
    }
    if (Object.prototype.hasOwnProperty.call(preferences, 'layoutMode')) {
      localStorage.setItem(LAYOUT_MODE_KEY, String(preferences.layoutMode ?? 'comfortable'))
    }
    if (Object.prototype.hasOwnProperty.call(preferences, 'containerSize')) {
      localStorage.setItem(CONTAINER_SIZE_KEY, String(preferences.containerSize ?? 'sm'))
    }
    if (Object.prototype.hasOwnProperty.call(preferences, 'animationsEnabled')) {
      localStorage.setItem(ANIMATIONS_ENABLED_KEY, String(Boolean(preferences.animationsEnabled)))
    }
    if (Object.prototype.hasOwnProperty.call(preferences, 'cardHoverEffects')) {
      localStorage.setItem(CARD_HOVER_ENABLED_KEY, String(Boolean(preferences.cardHoverEffects)))
    }
  }

  if (Object.prototype.hasOwnProperty.call(snapshot, 'usage')) {
    const usage = snapshot.usage ? normalizeUsage(snapshot.usage) : null
    if (usage) {
      setFreePlanUsageSnapshot(usage)
    } else {
      resetFreePlanUsage()
    }
  }

  if (Object.prototype.hasOwnProperty.call(snapshot, 'planTier')) {
    setPlanTier(String(snapshot.planTier ?? 'free').trim() || 'free')
  }

  if (Object.prototype.hasOwnProperty.call(snapshot, 'radarFavorites')) {
    setRadarFavoritesSnapshot(Array.isArray(snapshot.radarFavorites) ? snapshot.radarFavorites : [])
  }

  if (Object.prototype.hasOwnProperty.call(snapshot, 'radarSnapshot')) {
    saveRadarSnapshot(snapshot.radarSnapshot ? normalizeRadarSnapshot(snapshot.radarSnapshot) : null)
  }

  if (Object.prototype.hasOwnProperty.call(snapshot, 'summary')) {
    if (snapshot.summary) {
      saveUserSummary(snapshot.summary)
    } else {
      clearUserSummary()
    }
  }

  if (Object.prototype.hasOwnProperty.call(snapshot, 'aiResponsePreference')) {
    if (snapshot.aiResponsePreference) {
      saveAiResponsePreference(snapshot.aiResponsePreference)
    } else {
      clearAiResponsePreference()
    }
  }

  if (Object.prototype.hasOwnProperty.call(snapshot, 'avatarSettings')) {
    saveAvatarSettings(snapshot.avatarSettings)
  }

  if (Object.prototype.hasOwnProperty.call(snapshot, 'notifications')) {
    if (snapshot.notifications) {
      saveNotificationPreferences(snapshot.notifications)
    } else {
      resetNotificationPreferences()
    }
  }

  if (Object.prototype.hasOwnProperty.call(snapshot, 'conquistas')) {
    setConquistasSnapshot(snapshot.conquistas || {})
  }

  window.dispatchEvent(new CustomEvent('apice:theme-updated'))
  window.dispatchEvent(new CustomEvent('apice:historico-updated'))
  window.dispatchEvent(new CustomEvent('apice:free-plan-usage-updated'))
  window.dispatchEvent(new CustomEvent('apice:radar-favorites-updated'))
  window.dispatchEvent(new CustomEvent('apice:radar-state-updated'))
  window.dispatchEvent(new CustomEvent('apice:user-summary-updated'))
  window.dispatchEvent(new CustomEvent('apice:notificacoes-updated'))
  window.dispatchEvent(new CustomEvent('apice:conquistas-updated'))
  window.dispatchEvent(new CustomEvent('apice:account-state-updated'))
}
