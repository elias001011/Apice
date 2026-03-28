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
  MAX_CLOUD_ESSAY_HISTORY_ENTRIES,
  loadEssayHistory,
  compactEssayHistoryEntry,
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
const MAX_CLOUD_SNAPSHOT_BYTES = 12_000

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

function trimCloudText(value, limit = 0) {
  const text = String(value ?? '').trim()
  if (!text || !limit || text.length <= limit) return text
  return `${text.slice(0, Math.max(0, limit - 1)).trim()}…`
}

function compactCloudEssayHistoryEntry(item, mode = 'full') {
  const compact = compactEssayHistoryEntry(item)
  if (!compact) return null

  const presets = {
    full: {
      preview: 160,
      redacao: 320,
      competencias: 3,
      competenciaNome: 60,
      competenciaDescricao: 80,
      erros: 3,
      erroTexto: 60,
      erroMotivo: 80,
      tema: 120,
    },
    slim: {
      preview: 120,
      redacao: 160,
      competencias: 2,
      competenciaNome: 48,
      competenciaDescricao: 60,
      erros: 0,
      erroTexto: 0,
      erroMotivo: 0,
      tema: 96,
    },
    minimal: {
      preview: 80,
      redacao: 0,
      competencias: 1,
      competenciaNome: 40,
      competenciaDescricao: 48,
      erros: 0,
      erroTexto: 0,
      erroMotivo: 0,
      tema: 80,
    },
  }

  const limits = presets[mode] || presets.full

  const feedback = compact.feedback && typeof compact.feedback === 'object'
    ? {
        notaTotal: Number.isFinite(Number(compact.feedback.notaTotal))
          ? Number(compact.feedback.notaTotal)
          : Number(compact.nota) || 0,
        competencias: Array.isArray(compact.feedback.competencias)
          ? compact.feedback.competencias.slice(0, limits.competencias).map((competencia) => ({
              nome: trimCloudText(competencia?.nome, limits.competenciaNome),
              nota: Number.isFinite(Number(competencia?.nota)) ? Number(competencia.nota) : 0,
              descricao: trimCloudText(competencia?.descricao, limits.competenciaDescricao),
            }))
          : [],
        pontoForte: trimCloudText(compact.feedback.pontoForte, mode === 'minimal' ? 48 : 80),
        atencao: trimCloudText(compact.feedback.atencao, mode === 'minimal' ? 48 : 80),
        principalMelhorar: trimCloudText(compact.feedback.principalMelhorar, mode === 'minimal' ? 48 : 80),
        errosPt: Array.isArray(compact.feedback.errosPt) && limits.erros > 0
          ? compact.feedback.errosPt.slice(0, limits.erros).map((erro) => ({
              errado: trimCloudText(erro?.errado, limits.erroTexto),
              corrigido: trimCloudText(erro?.corrigido, limits.erroTexto),
              motivo: trimCloudText(erro?.motivo, limits.erroMotivo),
            }))
          : [],
      }
    : null

  return {
    ...compact,
    tema: trimCloudText(compact.tema, limits.tema),
    preview: trimCloudText(compact.preview, limits.preview),
    redacao: limits.redacao > 0 ? trimCloudText(compact.redacao, limits.redacao) : undefined,
    feedback,
  }
}

function buildCloudEssayHistory(history = []) {
  const normalized = Array.isArray(history) ? history : []
  const modes = ['full', 'slim', 'minimal']

  for (const mode of modes) {
    const candidate = normalized
      .map((item) => compactCloudEssayHistoryEntry(item, mode))
      .filter(Boolean)

    if (JSON.stringify(candidate).length <= MAX_CLOUD_SNAPSHOT_BYTES || mode === 'minimal') {
      return candidate
    }
  }

  return normalized
    .map((item) => compactCloudEssayHistoryEntry(item, 'minimal'))
    .filter(Boolean)
    .slice(0, Math.max(1, Math.min(normalized.length, 10)))
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

export function buildAccountSnapshot(user, historyLimit = MAX_CLOUD_ESSAY_HISTORY_ENTRIES) {
  return {
    version: 9,
    profile: readProfileSnapshot(user),
    preferences: readThemeSnapshot(),
    history: buildCloudEssayHistory(normalizeHistory(loadEssayHistory(historyLimit))),
    historyCount: loadEssayHistoryCount(),
    usage: normalizeUsage(getFreePlanUsageSnapshot()),
    planTier: getCurrentPlanTier(),
    radarFavorites: loadRadarFavorites(),
    radarSnapshot: loadRadarSnapshot(),
    summary: loadUserSummary(),
    aiResponsePreference: loadAiResponsePreference(),
    avatarSettings: loadAvatarSettings(),
    notifications: loadNotificationPreferences(),
    conquistas: loadConquistas(),
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
    version: Number(rawSnapshot.version ?? 9) || 9,
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
  localStorage.setItem(LAYOUT_MODE_KEY, String(preferences.layoutMode ?? 'comfortable'))
  localStorage.setItem(CONTAINER_SIZE_KEY, String(preferences.containerSize ?? 'sm'))
  if (Object.prototype.hasOwnProperty.call(preferences, 'animationsEnabled')) {
    localStorage.setItem(ANIMATIONS_ENABLED_KEY, String(Boolean(preferences.animationsEnabled)))
  }
  if (Object.prototype.hasOwnProperty.call(preferences, 'cardHoverEffects')) {
    localStorage.setItem(CARD_HOVER_ENABLED_KEY, String(Boolean(preferences.cardHoverEffects)))
  }

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

  if (snapshot.conquistas) {
    setConquistasSnapshot(snapshot.conquistas)
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
