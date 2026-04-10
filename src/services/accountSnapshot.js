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
  mergeEssayHistorySnapshots,
  saveEssayHistorySnapshot,
  loadEssayHistoryCount,
} from './essayInsights.js'
import {
  loadManualEnemDate,
  saveManualEnemDate,
} from './enemCalendar.js'
import {
  FREE_PLAN_LIMITS,
  getAiUsageDayKey,
  getFreePlanUsageSnapshot,
  setFreePlanUsageSnapshot,
  resetFreePlanUsage,
  getCurrentPlanTier,
  setPlanTier,
} from './freePlanUsage.js'
import {
  getBillingState,
  getCurrentBillingStatus,
  normalizeBillingState,
  saveBillingState,
} from './billingState.js'
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

// Versão atual do schema do snapshot. Incrementar quando houver breaking changes.
export const CURRENT_SCHEMA_VERSION = 17
// Versões mínimas compatíveis (abaixo disso, os dados são considerados corrompidos/incompatíveis)
export const MIN_COMPATIBLE_VERSION = 14

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

function _normalizeBooleanPreference(value, fallback) {
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

function _readThemeSnapshot() {
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
  const countKeys = Object.keys(FREE_PLAN_LIMITS)

  return {
    dayKey: String(usage.dayKey ?? getAiUsageDayKey()),
    counts: Object.fromEntries(
      countKeys.map((key) => [
        key,
        Number.isFinite(Number(counts[key])) ? Number(counts[key]) : 0,
      ]),
    ),
  }
}

function hasBillingFields(rawSnapshot) {
  if (!rawSnapshot || typeof rawSnapshot !== 'object') return false

  return [
    'billing',
    'planStatus',
    'planTier',
    'trialUsedAt',
    'trialStartedAt',
    'trialEndsAt',
    'paidAt',
    'checkoutId',
    'externalId',
    'subscriptionId',
  ].some((key) => Object.prototype.hasOwnProperty.call(rawSnapshot, key))
}

function normalizeBillingSnapshot(rawSnapshot) {
  if (!hasBillingFields(rawSnapshot)) {
    return undefined
  }

  const rawBilling = rawSnapshot.billing && typeof rawSnapshot.billing === 'object'
    ? rawSnapshot.billing
    : {
        status: rawSnapshot.planStatus ?? rawSnapshot.planTier ?? 'free',
        planKey: rawSnapshot.planKey ?? rawSnapshot.selectedPlan ?? '',
        trialUsedAt: rawSnapshot.trialUsedAt ?? '',
        trialStartedAt: rawSnapshot.trialStartedAt ?? '',
        trialEndsAt: rawSnapshot.trialEndsAt ?? '',
        paidAt: rawSnapshot.paidAt ?? '',
        checkoutId: rawSnapshot.checkoutId ?? '',
        externalId: rawSnapshot.externalId ?? '',
        subscriptionId: rawSnapshot.subscriptionId ?? '',
        updatedAt: rawSnapshot.billing?.updatedAt ?? rawSnapshot.updatedAt ?? new Date().toISOString(),
      }

  return normalizeBillingState(rawBilling)
}

function compactRadarFavoriteSnapshot(favorite) {
  if (!favorite || typeof favorite !== 'object') return null

  const titulo = String(favorite.titulo ?? favorite.title ?? '').trim()
  if (!titulo) return null

  return {
    id: String(favorite.id ?? titulo).trim() || titulo,
    titulo,
  }
}

export function buildAccountSnapshot(user) {
  return {
    version: 17,
    profile: readProfileSnapshot(user),
    historyCount: loadEssayHistoryCount(),
    usage: normalizeUsage(getFreePlanUsageSnapshot()),
    billing: getBillingState(),
    planStatus: getCurrentBillingStatus(),
    planTier: getCurrentPlanTier(),
    enemDate: loadManualEnemDate(),
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
  const billing = normalizeBillingSnapshot(rawSnapshot)
  const snapshot = {
    version: Number(rawSnapshot.version ?? 16) || 16,
    profile: readProfileSnapshot({
      user_metadata: rawSnapshot.profile || {},
      email: rawSnapshot.profile?.email || '',
    }),
    preferences: null,
    history,
    historyCount: Number.isFinite(Number(rawSnapshot.historyCount)) ? Number(rawSnapshot.historyCount) : history.length,
    usage: normalizeUsage(rawSnapshot.usage),
    ...(billing ? { billing } : {}),
    planStatus: String(rawSnapshot.planStatus ?? billing?.status ?? rawSnapshot.planTier ?? 'free').trim() || 'free',
    planTier: String(
      rawSnapshot.planTier
      ?? (String(rawSnapshot.planStatus ?? billing?.status ?? rawSnapshot.planTier ?? 'free').trim().toLowerCase() === 'free' ? 'free' : 'paid')
      ?? 'free',
    ).trim() || 'free',
    enemDate: String(rawSnapshot.enemDate ?? rawSnapshot.examDate ?? '').trim(),
    radarFavorites,
    radarSnapshot: null,
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

  // ── Verificação de versão/schema ──
  const snapshotVersion = Number(snapshot.version ?? 0)
  if (snapshotVersion > 0 && snapshotVersion < MIN_COMPATIBLE_VERSION) {
    console.warn(
      `[accountSnapshot] Snapshot da nuvem com versão antiga (${snapshotVersion} < ${MIN_COMPATIBLE_VERSION}). ` +
      `Dados incompatíveis — limpando localStorage para evitar corrupção.`
    )
    // Limpa dados locais que podem estar em formato antigo
    const keysToRemove = [
      'apice:billing-state:v1', 'apice:plan:tier',
      'apice:free-plan-usage:v1',
      'apice:historico', 'apice:historico:total',
      'apice:user-summary',
      'apice:radar-favorites', 'apice:radar-state',
      'apice:enem-manual-date',
      'apice:ai-response-preference',
      'apice:avatar-settings',
      'apice:notificacoes',
      'apice:conquistas',
    ]
    keysToRemove.forEach(key => {
      try { localStorage.removeItem(key) } catch {
        // Falha silenciosa ao limpar chave individual
      }
    })
    console.log('[accountSnapshot] Dados locais incompatíveis removidos. Usando estado limpo da nuvem.')
  }

  if (Object.prototype.hasOwnProperty.call(snapshot, 'history')) {
    const history = Array.isArray(snapshot.history) ? snapshot.history : []
    const localHistory = loadEssayHistory()
    const mergedHistory = mergeEssayHistorySnapshots(localHistory, history)
    const incomingHistoryCount = Number.isFinite(Number(snapshot.historyCount)) ? Number(snapshot.historyCount) : 0
    const historyCount = Math.max(loadEssayHistoryCount(), mergedHistory.length, incomingHistoryCount)
    saveEssayHistorySnapshot(mergedHistory, historyCount)
  }

  if (snapshot.preferences && typeof snapshot.preferences === 'object') {
    // NOTA: Preferências de aparência (tema, fonte, efeitos) são SALVAS LOCALMENTE
    // e NÃO devem ser sobrescritas pela nuvem. O cloud pull NÃO restaura aparência.
    // Este bloco existe apenas para compatibilidade com snapshots antigos.
    // Não fazemos nada aqui — o localStorage local prevalece.
  }

  if (Object.prototype.hasOwnProperty.call(snapshot, 'usage')) {
    const usage = snapshot.usage ? normalizeUsage(snapshot.usage) : null
    if (usage) {
      setFreePlanUsageSnapshot(usage)
    } else {
      resetFreePlanUsage()
    }
  }

  if (Object.prototype.hasOwnProperty.call(snapshot, 'billing')) {
    if (snapshot.billing) {
      saveBillingState(snapshot.billing)
    }
  } else if (Object.prototype.hasOwnProperty.call(snapshot, 'planStatus')) {
    setPlanTier(String(snapshot.planStatus ?? 'free').trim() || 'free')
  } else if (Object.prototype.hasOwnProperty.call(snapshot, 'planTier')) {
    setPlanTier(String(snapshot.planTier ?? 'free').trim() || 'free')
  }

  if (Object.prototype.hasOwnProperty.call(snapshot, 'enemDate')) {
    saveManualEnemDate(snapshot.enemDate || '')
  }

  if (Object.prototype.hasOwnProperty.call(snapshot, 'radarFavorites')) {
    setRadarFavoritesSnapshot(Array.isArray(snapshot.radarFavorites) ? snapshot.radarFavorites : [])
  }

  if (Object.prototype.hasOwnProperty.call(snapshot, 'radarSnapshot')) {
    const incomingRadarSnapshot = snapshot.radarSnapshot ? normalizeRadarSnapshot(snapshot.radarSnapshot) : null
    if (incomingRadarSnapshot) {
      const localRadarSnapshot = loadRadarSnapshot()
      const incomingHasThemes = Array.isArray(incomingRadarSnapshot.temas) && incomingRadarSnapshot.temas.length > 0
      const incomingHasDetails = Boolean(incomingRadarSnapshot.detalhesPorId && Object.keys(incomingRadarSnapshot.detalhesPorId).length > 0)
      const localHasThemes = Array.isArray(localRadarSnapshot?.temas) && localRadarSnapshot.temas.length > 0
      const localHasDetails = Boolean(localRadarSnapshot?.detalhesPorId && Object.keys(localRadarSnapshot.detalhesPorId).length > 0)

      if (incomingHasThemes || incomingHasDetails || (!localHasThemes && !localHasDetails)) {
        saveRadarSnapshot(incomingRadarSnapshot)
      } else {
        saveRadarSnapshot({
          ...localRadarSnapshot,
          resumoPesquisa: incomingRadarSnapshot.resumoPesquisa || localRadarSnapshot?.resumoPesquisa || '',
          atualizadoEm: incomingRadarSnapshot.atualizadoEm || localRadarSnapshot?.atualizadoEm || new Date().toISOString(),
          origem: incomingRadarSnapshot.origem || localRadarSnapshot?.origem || 'ai',
          savedAt: incomingRadarSnapshot.savedAt || localRadarSnapshot?.savedAt || new Date().toISOString(),
          lastSearchAt: incomingRadarSnapshot.lastSearchAt || localRadarSnapshot?.lastSearchAt || '',
          nextSearchAt: incomingRadarSnapshot.nextSearchAt || localRadarSnapshot?.nextSearchAt || '',
        })
      }
    }
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
