/**
 * Account Snapshot — sincronização de estado da conta com a nuvem
 *
 * REGRAS DE SINCRONIZAÇÃO:
 * - A nuvem sincroniza MAS preserva dados locais (local || cloud)
 * - Aparência NUNCA é tocada pela nuvem (tema, fonte, efeitos visuais)
 * - Arrays fazem merge por ID, sem duplicar
 * - Redação completa NUNCA vai pra nuvem (apenas índices de feedback)
 *
 * DADOS NA NUVEM:
 * ✅ Conquistas, Perfil, Preferências IA, Histórico (índices completos SEM redação),
 *    Análise de desempenho, Localização do clima, Radar (temas + detalhes dos favoritos),
 *    Data da prova, Cota diária, Plano/billing, Avatar, Notificações
 * ❌ Aparência (tema, accent, fonte), Redação completa, Detalhes do Radar não-favoritos
 */

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
  compactCloudEssayHistoryEntryFull,
  mergeEssayHistorySnapshots,
  saveEssayHistorySnapshot,
  loadEssayHistoryCount,
} from './essayInsights.js'
import {
  loadSimuladoHistory,
  compactSimuladoHistoryEntry,
  mergeSimuladoHistorySnapshots,
  saveSimuladoHistorySnapshot,
  loadSimuladoHistoryCount,
} from './simuladoHistory.js'
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
import {
  loadWeatherLocation,
  saveWeatherLocation,
  normalizeWeatherLocation,
} from './weatherPreferences.js'

const LAYOUT_MODE_KEY = 'apice:layoutMode'
const CONTAINER_SIZE_KEY = 'apice:containerSize'
const ANIMATIONS_ENABLED_KEY = 'apice:animationsEnabled'
const CARD_HOVER_ENABLED_KEY = 'apice:cardHoverEffects'

// Versão atual do schema do snapshot. Incrementar quando houver breaking changes.
export const CURRENT_SCHEMA_VERSION = 19
// Versões mínimas compatíveis (abaixo disso, os dados são considerados corrompidos/incompatíveis)
export const MIN_COMPATIBLE_VERSION = 15

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

/**
 * Snapshot do perfil do usuário (campos básicos)
 */
function readProfileSnapshot(user) {
  return {
    full_name: String(user?.user_metadata?.full_name ?? '').trim(),
    first_name: String(user?.user_metadata?.first_name ?? '').trim(),
    school: String(user?.user_metadata?.school ?? '').trim(),
    email: String(user?.email ?? '').trim(),
  }
}

/**
 * Normaliza histórico de redação (compacta cada entrada)
 */
function normalizeHistory(history) {
  if (!Array.isArray(history)) return []
  return history
    .filter((item) => item && typeof item === 'object')
    .map((item) => compactEssayHistoryEntry(item))
}

/**
 * Normaliza dados de uso (cota diária)
 */
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

/**
 * Verifica se o snapshot tem campos de billing
 */
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

/**
 * Normaliza snapshot de billing
 */
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

/**
 * Compacta favorito do radar para snapshot de conta
 * (apenas campos essenciais)
 */
function compactRadarFavoriteSnapshot(favorite) {
  if (!favorite || typeof favorite !== 'object') return null

  const titulo = String(favorite.titulo ?? favorite.title ?? '').trim()
  if (!titulo) return null

  return {
    id: String(favorite.id ?? titulo).trim() || titulo,
    titulo,
    probabilidade: Number.isFinite(Number(favorite.probabilidade)) ? Number(favorite.probabilidade) : 0,
    hot: Boolean(favorite.hot),
    savedAt: String(favorite.savedAt ?? new Date().toISOString()),
  }
}

/**
 * Compacta detalhes de um tema favorito para snapshot de conta
 * (inclui detalhes completos apenas dos favoritos)
 */
function compactRadarDetailSnapshot(detail) {
  if (!detail || typeof detail !== 'object') return null

  const titulo = String(detail.titulo ?? detail.tema ?? '').trim()
  if (!titulo) return null

  return {
    id: String(detail.id ?? '').trim(),
    temaId: String(detail.temaId ?? detail.id ?? '').trim(),
    titulo,
    probabilidade: Number.isFinite(Number(detail.probabilidade)) ? Number(detail.probabilidade) : 0,
    resumo: String(detail.resumo ?? '').trim().slice(0, 500),
    recorteSugerido: String(detail.recorteSugerido ?? '').trim().slice(0, 300),
    palavrasChave: Array.isArray(detail.palavrasChave)
      ? detail.palavrasChave.slice(0, 8).map(String)
      : [],
    dicasDeEscrita: Array.isArray(detail.dicasDeEscrita)
      ? detail.dicasDeEscrita.slice(0, 5).map(String)
      : [],
    savedAt: String(detail.savedAt ?? detail.geradoEm ?? new Date().toISOString()),
  }
}

/**
 * Constrói snapshot da conta para enviar à nuvem
 * Inclui todos os campos necessários, EXCETO aparência
 */
export function buildAccountSnapshot(user) {
  // Histórico: usa versão EXPANDIDA com todos os índices de feedback
  // MAS SEM a redação completa e SEM preview
  const localHistory = loadEssayHistory()
  const cloudHistory = localHistory
    .map((item) => compactCloudEssayHistoryEntryFull(item))
    .filter(Boolean)

  const localSimuladoHistory = loadSimuladoHistory()
  const cloudSimuladoHistory = localSimuladoHistory
    .map((item) => compactSimuladoHistoryEntry(item))
    .filter(Boolean)

  // Radar: lista de temas + detalhes apenas dos favoritos
  const localRadar = loadRadarSnapshot()
  const radarThemes = Array.isArray(localRadar?.temas) ? localRadar.temas : []
  const radarFavorites = loadRadarFavorites()

  // Detalhes do radar: apenas dos temas que são favoritos
  const detalhesFavoritos = {}
  if (localRadar?.detalhesPorId) {
    const favoriteIds = new Set(radarFavorites.map((f) => f.id))
    for (const [id, detail] of Object.entries(localRadar.detalhesPorId)) {
      if (favoriteIds.has(id)) {
        const compacted = compactRadarDetailSnapshot(detail)
        if (compacted) {
          detalhesFavoritos[id] = compacted
        }
      }
    }
  }

  return {
    version: CURRENT_SCHEMA_VERSION,
    profile: readProfileSnapshot(user),
    historyCount: loadEssayHistoryCount(),
    history: cloudHistory,
    simuladoHistoryCount: loadSimuladoHistoryCount(),
    simuladoHistory: cloudSimuladoHistory,
    usage: getFreePlanUsageSnapshot(),
    billing: getBillingState(),
    planStatus: getCurrentBillingStatus(),
    planTier: getCurrentPlanTier(),
    enemDate: loadManualEnemDate(),
    weatherLocation: loadWeatherLocation(),
    radar: {
      temas: radarThemes.map((t) => ({
        id: String(t.id ?? '').trim(),
        titulo: String(t.titulo ?? '').trim(),
        probabilidade: Number.isFinite(Number(t.probabilidade)) ? Number(t.probabilidade) : 0,
        hot: Boolean(t.hot),
      })),
      detalhesPorId: detalhesFavoritos,
      resumoPesquisa: String(localRadar?.resumoPesquisa ?? '').trim().slice(0, 360),
      atualizadoEm: String(localRadar?.atualizadoEm ?? new Date().toISOString()),
      origem: String(localRadar?.origem ?? 'ai'),
    },
    radarFavorites: radarFavorites
      .map((favorite) => compactRadarFavoriteSnapshot(favorite))
      .filter(Boolean),
    summary: loadUserSummary(),
    aiResponsePreference: loadAiResponsePreference(),
    avatarSettings: loadAvatarSettings(),
    notifications: loadNotificationPreferences(),
    conquistas: loadConquistas(),
    savedAt: new Date().toISOString(),
  }
}

/**
 * Extrai snapshot da conta do user_metadata (para compatibilidade legacy)
 */
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

/**
 * Normaliza snapshot recebido da nuvem
 */
export function normalizeAccountSnapshot(rawSnapshot) {
  if (!rawSnapshot || typeof rawSnapshot !== 'object') return null

  const history = normalizeHistory(Array.isArray(rawSnapshot.history) ? rawSnapshot.history : [])
  const simuladoHistory = Array.isArray(rawSnapshot.simuladoHistory)
    ? rawSnapshot.simuladoHistory.map((item) => compactSimuladoHistoryEntry(item)).filter(Boolean)
    : []
  const radarFavorites = normalizeRadarFavorites(
    Array.isArray(rawSnapshot.radarFavorites)
      ? rawSnapshot.radarFavorites
      : Array.isArray(rawSnapshot.savedRadarThemes)
        ? rawSnapshot.savedRadarThemes
      : [],
  )
  const hasAiResponsePreference = Object.prototype.hasOwnProperty.call(rawSnapshot, 'aiResponsePreference')
  const billing = normalizeBillingSnapshot(rawSnapshot)

  // Normaliza radar snapshot da nuvem
  let radarSnapshot = null
  if (rawSnapshot.radar && typeof rawSnapshot.radar === 'object') {
    const cloudRadar = rawSnapshot.radar
    radarSnapshot = {
      version: 2,
      temas: Array.isArray(cloudRadar.temas) ? cloudRadar.temas : [],
      detalhesPorId: cloudRadar.detalhesPorId && typeof cloudRadar.detalhesPorId === 'object'
        ? cloudRadar.detalhesPorId
        : {},
      resumoPesquisa: String(cloudRadar.resumoPesquisa ?? '').trim(),
      atualizadoEm: String(cloudRadar.atualizadoEm ?? cloudRadar.savedAt ?? new Date().toISOString()),
      origem: String(cloudRadar.origem ?? 'ai'),
      savedAt: String(cloudRadar.savedAt ?? new Date().toISOString()),
      lastSearchAt: '',
      nextSearchAt: '',
    }
  }

  const snapshot = {
    version: Number(rawSnapshot.version ?? 19) || 19,
    profile: readProfileSnapshot({
      user_metadata: rawSnapshot.profile || {},
      email: rawSnapshot.profile?.email || '',
    }),
    // Preferências de aparência NÃO são restauradas da nuvem
    preferences: null,
    history,
    historyCount: Number.isFinite(Number(rawSnapshot.historyCount)) ? Number(rawSnapshot.historyCount) : history.length,
    simuladoHistory,
    simuladoHistoryCount: Number.isFinite(Number(rawSnapshot.simuladoHistoryCount)) ? Number(rawSnapshot.simuladoHistoryCount) : simuladoHistory.length,
    usage: normalizeUsage(rawSnapshot.usage),
    ...(billing ? { billing } : {}),
    planStatus: String(rawSnapshot.planStatus ?? billing?.status ?? rawSnapshot.planTier ?? 'free').trim() || 'free',
    planTier: String(
      rawSnapshot.planTier
      ?? (String(rawSnapshot.planStatus ?? billing?.status ?? rawSnapshot.planTier ?? 'free').trim().toLowerCase() === 'free' ? 'free' : 'paid')
      ?? 'free',
    ).trim() || 'free',
    enemDate: String(rawSnapshot.enemDate ?? rawSnapshot.examDate ?? '').trim(),
    weatherLocation: normalizeWeatherLocation(rawSnapshot.weatherLocation ?? rawSnapshot.climaLocation ?? ''),
    radarSnapshot,
    radarFavorites,
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

/**
 * MERGE INTELIGENTE: aplica snapshot da nuvem PRESERVANDO dados locais
 *
 * REGRA PRINCIPAL: local || cloud
 * - Se o dado local existe, PRESERVA o local
 * - Se o dado local está vazio/ausente, RESTAURA da nuvem
 * - Para arrays: merge por ID, sem duplicar
 * - Aparência NUNCA é tocada
 */
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
      'apice:simulado:historico:v1', 'apice:simulado:historico:total:v1',
      'apice:user-summary',
      'apice:radar-favorites', 'apice:radar-state',
      'apice:enem-manual-date',
      'apice:ai-response-preference',
      'apice:avatar-settings',
      'apice:notificacoes',
      'apice:conquistas',
      'apice:weather:location:v1',
    ]
    keysToRemove.forEach(key => {
      try { localStorage.removeItem(key) } catch {
        // Falha silenciosa ao limpar chave individual
      }
    })
    console.log('[accountSnapshot] Dados locais incompatíveis removidos. Usando estado limpo da nuvem.')
  }

  // ── Histórico: merge por ID, sem duplicar ──
  if (Object.prototype.hasOwnProperty.call(snapshot, 'history')) {
    const cloudHistory = Array.isArray(snapshot.history) ? snapshot.history : []
    const localHistory = loadEssayHistory()
    const mergedHistory = mergeEssayHistorySnapshots(localHistory, cloudHistory)
    const incomingHistoryCount = Number.isFinite(Number(snapshot.historyCount)) ? Number(snapshot.historyCount) : 0
    const historyCount = Math.max(loadEssayHistoryCount(), mergedHistory.length, incomingHistoryCount)
    saveEssayHistorySnapshot(mergedHistory, historyCount)
  }

  // ── Histórico de simulados: merge por ID, sem duplicar ──
  if (Object.prototype.hasOwnProperty.call(snapshot, 'simuladoHistory')) {
    const cloudSimuladoHistory = Array.isArray(snapshot.simuladoHistory) ? snapshot.simuladoHistory : []
    const localSimuladoHistory = loadSimuladoHistory()
    const mergedSimuladoHistory = mergeSimuladoHistorySnapshots(localSimuladoHistory, cloudSimuladoHistory)
    const incomingSimuladoCount = Number.isFinite(Number(snapshot.simuladoHistoryCount)) ? Number(snapshot.simuladoHistoryCount) : 0
    const simuladoHistoryCount = Math.max(loadSimuladoHistoryCount(), mergedSimuladoHistory.length, incomingSimuladoCount)
    saveSimuladoHistorySnapshot(mergedSimuladoHistory, simuladoHistoryCount)
  }

  // ── Preferências de aparência: NUNCA restauradas da nuvem ──
  // (ThemeProvider gerencia isso localmente via localStorage)

  // ── Cota de uso: nuvem restaura apenas se local estiver zerado ──
  if (Object.prototype.hasOwnProperty.call(snapshot, 'usage')) {
    const localUsage = getFreePlanUsageSnapshot()
    const cloudUsage = snapshot.usage ? normalizeUsage(snapshot.usage) : null

    // Preserva local se tem dados (dayKey válido e counts não vazios)
    const localHasData = localUsage?.dayKey && Object.values(localUsage.counts || {}).some(v => v > 0)

    if (cloudUsage && !localHasData) {
      setFreePlanUsageSnapshot(cloudUsage)
    }
  }

  // ── Billing: nuvem restaura apenas se local estiver em estado default ──
  if (Object.prototype.hasOwnProperty.call(snapshot, 'billing')) {
    const localBilling = getBillingState()
    const localIsDefault = localBilling.status === 'free' && !localBilling.planKey && !localBilling.trialStartedAt

    if (snapshot.billing && localIsDefault) {
      saveBillingState(snapshot.billing)
    }
  } else if (Object.prototype.hasOwnProperty.call(snapshot, 'planStatus')) {
    const localStatus = getCurrentBillingStatus()
    if (localStatus === 'free') {
      setPlanTier(String(snapshot.planStatus ?? 'free').trim() || 'free')
    }
  } else if (Object.prototype.hasOwnProperty.call(snapshot, 'planTier')) {
    const localTier = getCurrentPlanTier()
    if (localTier === 'free') {
      setPlanTier(String(snapshot.planTier ?? 'free').trim() || 'free')
    }
  }

  // ── Perfil: nuvem restaura campos vazios localmente ──
  if (snapshot.profile && typeof snapshot.profile === 'object') {
    // O perfil é gerenciado pelo Netlify Identity, não sobrescrevemos aqui
    // Apenas registramos que veio da nuvem para possível uso futuro
  }

  // ── Data do ENEM: nuvem restaura apenas se local estiver vazio ──
  if (Object.prototype.hasOwnProperty.call(snapshot, 'enemDate')) {
    const localDate = loadManualEnemDate()
    if (!localDate && snapshot.enemDate) {
      saveManualEnemDate(snapshot.enemDate)
    }
  }

  // ── Localização do clima: nuvem restaura apenas se local estiver vazio ──
  if (Object.prototype.hasOwnProperty.call(snapshot, 'weatherLocation')) {
    const localLocation = loadWeatherLocation()
    const cloudLocation = normalizeWeatherLocation(snapshot.weatherLocation)
    if (cloudLocation && localLocation === normalizeWeatherLocation('')) {
      saveWeatherLocation(cloudLocation)
    }
  }

  // ── Radar: merge inteligente ──
  if (Object.prototype.hasOwnProperty.call(snapshot, 'radarSnapshot') && snapshot.radarSnapshot) {
    const incomingRadarSnapshot = normalizeRadarSnapshot(snapshot.radarSnapshot)
    if (incomingRadarSnapshot) {
      const localRadarSnapshot = loadRadarSnapshot()
      const incomingHasThemes = Array.isArray(incomingRadarSnapshot.temas) && incomingRadarSnapshot.temas.length > 0
      const localHasThemes = Array.isArray(localRadarSnapshot?.temas) && localRadarSnapshot.temas.length > 0

      // Merge: nuvem complementa local (não sobrescreve)
      if (incomingHasThemes && !localHasThemes) {
        saveRadarSnapshot(incomingRadarSnapshot)
      } else if (incomingHasThemes && localHasThemes) {
        // Mantém temas locais, adiciona resumo da nuvem se local não tem
        saveRadarSnapshot({
          ...localRadarSnapshot,
          resumoPesquisa: localRadarSnapshot.resumoPesquisa || incomingRadarSnapshot.resumoPesquisa || '',
          atualizadoEm: incomingRadarSnapshot.atualizadoEm || localRadarSnapshot?.atualizadoEm || new Date().toISOString(),
          origem: incomingRadarSnapshot.origem || localRadarSnapshot?.origem || 'ai',
          savedAt: incomingRadarSnapshot.savedAt || localRadarSnapshot?.savedAt || new Date().toISOString(),
          lastSearchAt: incomingRadarSnapshot.lastSearchAt || localRadarSnapshot?.lastSearchAt || '',
          nextSearchAt: incomingRadarSnapshot.nextSearchAt || localRadarSnapshot?.nextSearchAt || '',
        })
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(snapshot, 'radarFavorites')) {
    const cloudFavorites = Array.isArray(snapshot.radarFavorites) ? snapshot.radarFavorites : []
    const localFavorites = loadRadarFavorites()

    // Merge por ID: mantém locais, adiciona novos da nuvem
    const localIds = new Set(localFavorites.map((f) => f.id))
    const mergedFavorites = [
      ...localFavorites,
      ...cloudFavorites.filter((f) => !localIds.has(f.id)),
    ]

    if (mergedFavorites.length > 0) {
      setRadarFavoritesSnapshot(mergedFavorites)
    }
  }

  // ── Summary: nuvem restaura apenas se local estiver vazio ──
  if (Object.prototype.hasOwnProperty.call(snapshot, 'summary')) {
    const localSummary = loadUserSummary()
    const localHasData = localSummary && (localSummary.mediaGeral > 0 || (localSummary.notasPorCompetencia && Object.keys(localSummary.notasPorCompetencia).length > 0))

    if (snapshot.summary && !localHasData) {
      saveUserSummary(snapshot.summary)
    } else if (!snapshot.summary && localHasData) {
      // Não limpa summary local se a nuvem não tem
    }
  }

  // ── Preferência de resposta IA ──
  if (Object.prototype.hasOwnProperty.call(snapshot, 'aiResponsePreference')) {
    const localPref = loadAiResponsePreference()
    if (snapshot.aiResponsePreference && !localPref) {
      saveAiResponsePreference(snapshot.aiResponsePreference)
    }
  }

  // ── Avatar settings ──
  if (Object.prototype.hasOwnProperty.call(snapshot, 'avatarSettings')) {
    const localAvatar = loadAvatarSettings()
    const localHasData = localAvatar && (localAvatar.eyes || localAvatar.mouth || localAvatar.accessory)

    if (snapshot.avatarSettings && !localHasData) {
      saveAvatarSettings(snapshot.avatarSettings)
    }
  }

  // ── Notificações: nuvem restaura apenas se local estiver com defaults ──
  if (Object.prototype.hasOwnProperty.call(snapshot, 'notifications')) {
    const localNotifications = loadNotificationPreferences()
    const localIsDefault = JSON.stringify(localNotifications) === JSON.stringify(DEFAULT_NOTIFICATIONS)

    if (snapshot.notifications && localIsDefault) {
      saveNotificationPreferences(snapshot.notifications)
    }
  }

  // ── Conquistas: merge por ID ──
  if (Object.prototype.hasOwnProperty.call(snapshot, 'conquistas')) {
    const cloudConquistas = snapshot.conquistas || {}
    const localConquistas = loadConquistas() || {}

    // Merge: mantém todas as conquistas locais, adiciona novas da nuvem
    const mergedConquistas = { ...cloudConquistas, ...localConquistas }
    setConquistasSnapshot(mergedConquistas)
  }

  // ── Dispara eventos de atualização ──
  window.dispatchEvent(new CustomEvent('apice:theme-updated'))
  window.dispatchEvent(new CustomEvent('apice:historico-updated'))
  window.dispatchEvent(new CustomEvent('apice:simulado-historico-updated'))
  window.dispatchEvent(new CustomEvent('apice:free-plan-usage-updated'))
  window.dispatchEvent(new CustomEvent('apice:radar-favorites-updated'))
  window.dispatchEvent(new CustomEvent('apice:radar-state-updated'))
  window.dispatchEvent(new CustomEvent('apice:user-summary-updated'))
  window.dispatchEvent(new CustomEvent('apice:notificacoes-updated'))
  window.dispatchEvent(new CustomEvent('apice:conquistas-updated'))
  window.dispatchEvent(new CustomEvent('apice:account-state-updated'))
  window.dispatchEvent(new CustomEvent('apice:weather-preferences-updated'))
}
