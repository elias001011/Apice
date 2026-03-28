const RADAR_STATE_KEY = 'apice:radar-state:v2'
const RADAR_STATE_LEGACY_KEY = 'apice:radar-state:v1'
const RADAR_STATE_UPDATED_EVENT = 'apice:radar-state-updated'

export const RADAR_SEARCH_COOLDOWN_DAYS = 7

const MAX_RADAR_THEMES = 5
const MAX_RADAR_DETAIL_ITEMS = 5
const MAX_RADAR_DETAIL_CARDS = 4
const MAX_RADAR_DETAIL_SOURCES = 6
const MAX_RADAR_DETAIL_REASONS = 4
const MAX_RADAR_KEYWORDS = 8

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function trimText(value, limit = 0) {
  const text = String(value ?? '').trim()
  if (!text || !limit || text.length <= limit) return text
  return `${text.slice(0, Math.max(0, limit - 1)).trim()}…`
}

function toIsoString(value) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  return Number.isFinite(date.getTime()) ? date.toISOString() : ''
}

function parseDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isFinite(date.getTime()) ? date : null
}

function addDaysToIso(value, days) {
  const date = parseDate(value)
  if (!date) return ''
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

function sanitizeList(value, limit = 0, textLimit = 0) {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => {
      if (item && typeof item === 'object') {
        return trimText(
          item.texto ?? item.text ?? item.label ?? item.titulo ?? item.nome ?? '',
          textLimit || 0,
        )
      }

      return trimText(item, textLimit || 0)
    })
    .map((item) => String(item ?? '').trim())
    .filter(Boolean)
    .slice(0, limit || value.length)
}

function normalizeThemeId(value) {
  const title = trimText(value, 180)
  if (!title) return ''

  return normalizeText(title)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getThemeTitle(theme) {
  if (!theme || typeof theme !== 'object') return ''
  return trimText(theme.titulo ?? theme.title ?? theme.tema ?? theme.name ?? '', 180)
}

export function getRadarThemeId(themeOrId) {
  if (!themeOrId) return ''
  if (typeof themeOrId === 'string') {
    const value = trimText(themeOrId, 180)
    return normalizeThemeId(value) || value
  }
  if (typeof themeOrId === 'object') {
    const existingId = trimText(themeOrId.id ?? themeOrId.themeId ?? themeOrId.temaId ?? '', 180)
    if (existingId) return existingId
    return normalizeThemeId(getThemeTitle(themeOrId))
  }
  return ''
}

function normalizeThemeProbability(value) {
  const probability = Number(value)
  if (!Number.isFinite(probability)) return 0
  return Math.max(0, Math.min(100, Math.round(probability)))
}

export function normalizeRadarTheme(theme) {
  if (!theme || typeof theme !== 'object') return null

  const titulo = getThemeTitle(theme)
  if (!titulo) return null

  const id = getRadarThemeId(theme) || normalizeThemeId(titulo)
  return {
    id,
    titulo,
    probabilidade: normalizeThemeProbability(theme.probabilidade),
    hot: Boolean(theme.hot),
  }
}

function normalizeRadarCard(card) {
  if (!card || typeof card !== 'object') return null

  const titulo = trimText(card.titulo ?? card.title ?? card.nome ?? 'Card', 100)
  const texto = trimText(card.texto ?? card.content ?? card.trecho ?? card.fato ?? '', 320)
  const fonte = trimText(card.fonte ?? card.source ?? card.nome ?? '', 120)
  const url = trimText(card.url ?? '', 500)
  const trecho = trimText(card.trecho ?? card.excerpt ?? card.content ?? '', 220)

  if (!titulo && !texto && !fonte && !url) return null

  return {
    titulo: titulo || 'Card',
    texto,
    fonte,
    url,
    trecho,
  }
}

function normalizeRadarSource(source) {
  if (!source || typeof source !== 'object') return null

  const nome = trimText(source.nome ?? source.title ?? source.fonte ?? '', 120)
  const url = trimText(source.url ?? '', 500)
  const trecho = trimText(source.trecho ?? source.content ?? source.texto ?? '', 240)

  if (!nome && !url) return null

  return {
    nome: nome || 'Fonte',
    url,
    trecho,
  }
}

function normalizeRadarMaterial(material, fallbackResumo = '') {
  if (!material) {
    return {
      titulo: 'Material de apoio',
      resumo: trimText(fallbackResumo, 360),
      cards: [],
      fontes: [],
    }
  }

  if (typeof material === 'string') {
    return {
      titulo: 'Material de apoio',
      resumo: trimText(material, 360) || trimText(fallbackResumo, 360),
      cards: [],
      fontes: [],
    }
  }

  if (!isPlainObject(material)) {
    return {
      titulo: 'Material de apoio',
      resumo: trimText(fallbackResumo, 360),
      cards: [],
      fontes: [],
    }
  }

  const cardsSource = Array.isArray(material.cards)
    ? material.cards
    : Array.isArray(material.cardsResumo)
      ? material.cardsResumo
      : []

  const fontesSource = Array.isArray(material.fontes)
    ? material.fontes
    : Array.isArray(material.sources)
      ? material.sources
      : []

  const cards = cardsSource
    .map((card) => normalizeRadarCard(card))
    .filter(Boolean)
    .slice(0, MAX_RADAR_DETAIL_CARDS)

  const fontes = fontesSource
    .map((source) => normalizeRadarSource(source))
    .filter(Boolean)
    .slice(0, MAX_RADAR_DETAIL_SOURCES)

  return {
    titulo: trimText(material.titulo ?? material.title ?? 'Material de apoio', 120) || 'Material de apoio',
    resumo: trimText(material.resumo ?? material.summary ?? fallbackResumo, 360),
    cards,
    fontes,
  }
}

export function normalizeRadarDetail(rawDetail) {
  if (!rawDetail || typeof rawDetail !== 'object') return null

  const temaLike = isPlainObject(rawDetail.tema) ? rawDetail.tema : null
  const baseTitle = getThemeTitle(rawDetail) || getThemeTitle(temaLike)
  if (!baseTitle) return null

  const id = getRadarThemeId(rawDetail) || getRadarThemeId(temaLike) || normalizeThemeId(baseTitle)
  const probabilidade = normalizeThemeProbability(
    rawDetail.probabilidade ?? rawDetail.chance ?? temaLike?.probabilidade,
  )
  const resumo = trimText(
    rawDetail.resumo ?? rawDetail.summary ?? rawDetail.justificativa ?? rawDetail.explicacao ?? '',
    420,
  )
  const searchResumo = trimText(
    rawDetail.searchResumo ?? rawDetail.resumoPesquisa ?? rawDetail.contextoPesquisa ?? '',
    320,
  )
  const reasonsSource = rawDetail.porQueProvavel
    ?? rawDetail.justificativas
    ?? rawDetail.motivos
    ?? rawDetail.reasons
    ?? []
  const keywordsSource = rawDetail.palavrasChave
    ?? rawDetail.keywords
    ?? rawDetail.chaves
    ?? []
  const tipsSource = rawDetail.dicasDeEscrita
    ?? rawDetail.dicas
    ?? rawDetail.tips
    ?? []

  const material = normalizeRadarMaterial(
    rawDetail.material ?? rawDetail.materialApoio ?? rawDetail.apoio ?? rawDetail.contexto ?? null,
    resumo || searchResumo || baseTitle,
  )

  const fallbackReason = searchResumo
    ? `A busca factual encontrou contexto recente sobre ${baseTitle}.`
    : `O tema conversa com debates atuais ligados a ${baseTitle}.`

  const porQueProvavel = sanitizeList(
    Array.isArray(reasonsSource) ? reasonsSource : [reasonsSource],
    MAX_RADAR_DETAIL_REASONS,
    260,
  )

  const palavrasChave = sanitizeList(
    Array.isArray(keywordsSource) ? keywordsSource : [keywordsSource],
    MAX_RADAR_KEYWORDS,
    40,
  )

  const dicasDeEscrita = sanitizeList(
    Array.isArray(tipsSource) ? tipsSource : [tipsSource],
    MAX_RADAR_DETAIL_REASONS,
    260,
  )

  const detail = {
    id,
    temaId: id,
    titulo: trimText(rawDetail.titulo ?? rawDetail.title ?? baseTitle, 180) || baseTitle,
    probabilidade,
    resumo: resumo || searchResumo || material.resumo || '',
    porQueProvavel: porQueProvavel.length > 0 ? porQueProvavel : [fallbackReason],
    recorteSugerido: trimText(
      rawDetail.recorteSugerido ?? rawDetail.recorteIdeal ?? rawDetail.recorte ?? '',
      240,
    ),
    palavrasChave,
    dicasDeEscrita,
    material,
    searchResumo,
    geradoEm: toIsoString(rawDetail.geradoEm ?? rawDetail.generatedAt ?? rawDetail.atualizadoEm) || new Date().toISOString(),
    origem: trimText(rawDetail.origem ?? rawDetail.source ?? 'ai', 40) || 'ai',
    savedAt: toIsoString(rawDetail.savedAt ?? rawDetail.geradoEm ?? rawDetail.generatedAt) || new Date().toISOString(),
  }

  if (!detail.material.resumo) {
    detail.material.resumo = detail.resumo || fallbackReason
  }

  return detail
}

function detailsToMap(detailsSource) {
  const detailMap = {}
  const details = Array.isArray(detailsSource)
    ? detailsSource
    : isPlainObject(detailsSource)
      ? Object.values(detailsSource)
      : []

  for (const detail of details.slice(0, MAX_RADAR_DETAIL_ITEMS)) {
    const normalized = normalizeRadarDetail(detail)
    if (!normalized) continue
    detailMap[normalized.id] = normalized
  }

  return detailMap
}

function themesFromDetails(detailsMap) {
  return Object.values(detailsMap)
    .map((detail) => normalizeRadarTheme({
      id: detail.id,
      titulo: detail.titulo,
      probabilidade: detail.probabilidade,
      hot: detail.probabilidade >= 80,
    }))
    .filter(Boolean)
    .slice(0, MAX_RADAR_THEMES)
}

export function normalizeRadarSnapshot(rawSnapshot) {
  if (!rawSnapshot || typeof rawSnapshot !== 'object') return null

  const rawThemes = Array.isArray(rawSnapshot.temas)
    ? rawSnapshot.temas
    : Array.isArray(rawSnapshot.themes)
      ? rawSnapshot.themes
      : []

  const detailMap = detailsToMap(
    rawSnapshot.detalhesPorId
      ?? rawSnapshot.detailsById
      ?? rawSnapshot.details
      ?? rawSnapshot.detalhes
      ?? [],
  )

  const themes = rawThemes
    .map((theme) => normalizeRadarTheme(theme))
    .filter(Boolean)
    .slice(0, MAX_RADAR_THEMES)

  const normalizedThemes = themes.length > 0 ? themes : themesFromDetails(detailMap)
  const savedAt = toIsoString(rawSnapshot.savedAt ?? rawSnapshot.atualizadoEm) || new Date().toISOString()
  const resumoPesquisa = trimText(rawSnapshot.resumoPesquisa ?? rawSnapshot.searchResumo ?? '', 360)
  const lastSearchAt = toIsoString(rawSnapshot.lastSearchAt ?? rawSnapshot.searchedAt)
  const nextSearchAt = toIsoString(rawSnapshot.nextSearchAt)

  if (
    normalizedThemes.length === 0
    && Object.keys(detailMap).length === 0
    && !resumoPesquisa
    && !lastSearchAt
    && !nextSearchAt
  ) {
    return null
  }

  return {
    version: Number(rawSnapshot.version ?? 2) || 2,
    temas: normalizedThemes,
    resumoPesquisa,
    atualizadoEm: toIsoString(rawSnapshot.atualizadoEm ?? savedAt) || savedAt,
    origem: trimText(rawSnapshot.origem ?? rawSnapshot.source ?? 'ai', 40) || 'ai',
    savedAt,
    lastSearchAt,
    nextSearchAt,
    detalhesPorId: detailMap,
  }
}

function readRadarStateFromStorage() {
  if (!canUseStorage()) return null

  try {
    const raw = localStorage.getItem(RADAR_STATE_KEY) || localStorage.getItem(RADAR_STATE_LEGACY_KEY)
    if (!raw) return null
    return normalizeRadarSnapshot(JSON.parse(raw))
  } catch {
    return null
  }
}

function writeRadarState(snapshot) {
  if (!canUseStorage()) return null

  const normalized = normalizeRadarSnapshot(snapshot)
  if (!normalized) {
    localStorage.removeItem(RADAR_STATE_KEY)
    localStorage.removeItem(RADAR_STATE_LEGACY_KEY)
    window.dispatchEvent(new CustomEvent(RADAR_STATE_UPDATED_EVENT))
    return null
  }

  localStorage.setItem(RADAR_STATE_KEY, JSON.stringify(normalized))
  localStorage.removeItem(RADAR_STATE_LEGACY_KEY)
  window.dispatchEvent(new CustomEvent(RADAR_STATE_UPDATED_EVENT))
  return normalized
}

export function loadRadarSnapshot() {
  return readRadarStateFromStorage()
}

export function saveRadarSnapshot(snapshot) {
  return writeRadarState(snapshot)
}

export function clearRadarSnapshot() {
  if (!canUseStorage()) return
  localStorage.removeItem(RADAR_STATE_KEY)
  localStorage.removeItem(RADAR_STATE_LEGACY_KEY)
  window.dispatchEvent(new CustomEvent(RADAR_STATE_UPDATED_EVENT))
}

export function subscribeRadarSnapshot(handler) {
  if (typeof window === 'undefined') return () => {}

  window.addEventListener(RADAR_STATE_UPDATED_EVENT, handler)
  return () => window.removeEventListener(RADAR_STATE_UPDATED_EVENT, handler)
}

export function emitRadarSnapshotUpdated() {
  if (!canUseStorage()) return
  window.dispatchEvent(new CustomEvent(RADAR_STATE_UPDATED_EVENT))
}

export function loadRadarThemeDetail(themeOrId, snapshot = loadRadarSnapshot()) {
  const id = getRadarThemeId(themeOrId)
  if (!id || !snapshot || !snapshot.detalhesPorId) return null
  return snapshot.detalhesPorId[id] || null
}

export function saveRadarThemeDetail(detail) {
  if (!canUseStorage()) return null

  const normalized = normalizeRadarDetail(detail)
  if (!normalized) return null

  const currentSnapshot = loadRadarSnapshot()
  const currentThemes = Array.isArray(currentSnapshot?.temas) ? currentSnapshot.temas : []

  const nextThemes = currentThemes.length > 0
    ? currentThemes
    : [
        normalizeRadarTheme({
          id: normalized.id,
          titulo: normalized.titulo,
          probabilidade: normalized.probabilidade,
          hot: normalized.probabilidade >= 80,
        }),
      ].filter(Boolean).slice(0, MAX_RADAR_THEMES)

  const nextSnapshot = {
    ...(currentSnapshot || {}),
    version: 2,
    temas: nextThemes,
    resumoPesquisa: currentSnapshot?.resumoPesquisa || normalized.searchResumo || '',
    atualizadoEm: currentSnapshot?.atualizadoEm || normalized.geradoEm || new Date().toISOString(),
    origem: currentSnapshot?.origem || normalized.origem || 'ai',
    savedAt: new Date().toISOString(),
    lastSearchAt: currentSnapshot?.lastSearchAt || '',
    nextSearchAt: currentSnapshot?.nextSearchAt || '',
    detalhesPorId: {
      ...(currentSnapshot?.detalhesPorId || {}),
      [normalized.id]: normalized,
    },
  }

  return writeRadarState(nextSnapshot)
}

export function clearRadarThemeDetails() {
  const snapshot = loadRadarSnapshot()
  if (!snapshot) return null
  return saveRadarSnapshot({
    ...snapshot,
    detalhesPorId: {},
    savedAt: new Date().toISOString(),
  })
}

export function getRadarSearchCooldown(snapshot = loadRadarSnapshot(), referenceDate = new Date()) {
  const nextSearchAt = parseDate(snapshot?.nextSearchAt)
  const lastSearchAt = parseDate(snapshot?.lastSearchAt)
  const now = referenceDate instanceof Date ? referenceDate : new Date(referenceDate)
  const canSearch = !nextSearchAt || !Number.isFinite(nextSearchAt.getTime()) || nextSearchAt.getTime() <= now.getTime()
  const remainingMs = canSearch || !nextSearchAt ? 0 : Math.max(nextSearchAt.getTime() - now.getTime(), 0)

  return {
    canSearch,
    lastSearchAt: lastSearchAt ? lastSearchAt.toISOString() : '',
    nextSearchAt: nextSearchAt ? nextSearchAt.toISOString() : '',
    remainingMs,
    remainingDays: canSearch || !remainingMs ? 0 : Math.max(1, Math.ceil(remainingMs / (24 * 60 * 60 * 1000))),
  }
}

export function canSearchRadarThemes(snapshot = loadRadarSnapshot(), referenceDate = new Date()) {
  return getRadarSearchCooldown(snapshot, referenceDate).canSearch
}

export function buildRadarSearchWindow(referenceDate = new Date()) {
  const lastSearchAt = toIsoString(referenceDate) || new Date().toISOString()
  return {
    lastSearchAt,
    nextSearchAt: addDaysToIso(lastSearchAt, RADAR_SEARCH_COOLDOWN_DAYS),
  }
}
