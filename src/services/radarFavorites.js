const RADAR_FAVORITES_KEY = 'apice:radar-favorites:v1'
const RADAR_FAVORITES_UPDATED_EVENT = 'apice:radar-favorites-updated'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function sanitizeTags(tags) {
  if (!Array.isArray(tags)) return []

  return tags
    .map((tag) => {
      const label = String(tag?.label ?? '').trim()
      const tipo = String(tag?.tipo ?? 'area-social').trim() || 'area-social'
      return label ? { label, tipo } : null
    })
    .filter(Boolean)
}

function normalizeThemeId(theme) {
  const title = String(theme?.titulo ?? theme?.title ?? '').trim()
  if (!title) return ''

  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function normalizeRadarFavorite(rawFavorite) {
  if (!rawFavorite || typeof rawFavorite !== 'object') return null

  const titulo = String(rawFavorite.titulo ?? rawFavorite.title ?? '').trim()
  if (!titulo) return null

  const savedAt = String(rawFavorite.savedAt ?? rawFavorite.createdAt ?? new Date().toISOString()).trim() || new Date().toISOString()

  return {
    id: String(rawFavorite.id ?? normalizeThemeId(rawFavorite) ?? '').trim() || normalizeThemeId(rawFavorite) || `radar-${Date.now()}`,
    titulo,
    probabilidade: Number.isFinite(Number(rawFavorite.probabilidade)) ? Number(rawFavorite.probabilidade) : 0,
    hot: Boolean(rawFavorite.hot),
    tags: sanitizeTags(rawFavorite.tags),
    justificativa: String(rawFavorite.justificativa ?? '').trim(),
    origem: String(rawFavorite.origem ?? 'ai').trim() || 'ai',
    savedAt,
  }
}

export function normalizeRadarFavorites(rawFavorites) {
  if (!Array.isArray(rawFavorites)) return []

  return rawFavorites
    .map((favorite) => normalizeRadarFavorite(favorite))
    .filter(Boolean)
    .sort((a, b) => {
      const dateA = Number.isFinite(new Date(a.savedAt).getTime()) ? new Date(a.savedAt).getTime() : 0
      const dateB = Number.isFinite(new Date(b.savedAt).getTime()) ? new Date(b.savedAt).getTime() : 0
      return dateB - dateA
    })
}

function readRadarFavorites() {
  if (!canUseStorage()) return []

  try {
    const raw = localStorage.getItem(RADAR_FAVORITES_KEY)
    if (!raw) return []
    return normalizeRadarFavorites(JSON.parse(raw))
  } catch {
    return []
  }
}

function writeRadarFavorites(favorites) {
  if (!canUseStorage()) return []

  const normalized = normalizeRadarFavorites(favorites)
  localStorage.setItem(RADAR_FAVORITES_KEY, JSON.stringify(normalized))
  window.dispatchEvent(new CustomEvent(RADAR_FAVORITES_UPDATED_EVENT))
  return normalized
}

export function loadRadarFavorites() {
  return readRadarFavorites()
}

export function saveRadarFavorite(theme) {
  if (!canUseStorage()) return null

  const normalized = normalizeRadarFavorite(theme)
  if (!normalized) return null

  const current = readRadarFavorites()
  const index = current.findIndex((item) => item.id === normalized.id)

  if (index >= 0) {
    const next = current.slice()
    next[index] = {
      ...next[index],
      ...normalized,
      id: next[index].id,
      savedAt: next[index].savedAt || normalized.savedAt,
    }
    const saved = writeRadarFavorites(next)
    return saved.find((item) => item.id === next[index].id) || next[index]
  }

  const next = [normalized, ...current]
  const saved = writeRadarFavorites(next)
  return saved[0] || normalized
}

export function removeRadarFavorite(themeOrId) {
  if (!canUseStorage()) return []

  const id = String(
    typeof themeOrId === 'string'
      ? normalizeThemeId({ titulo: themeOrId }) || themeOrId
      : themeOrId?.id ?? normalizeThemeId(themeOrId),
  ).trim()

  const next = readRadarFavorites().filter((item) => item.id !== id)
  return writeRadarFavorites(next)
}

export function clearRadarFavorites() {
  if (!canUseStorage()) return
  localStorage.removeItem(RADAR_FAVORITES_KEY)
  window.dispatchEvent(new CustomEvent(RADAR_FAVORITES_UPDATED_EVENT))
}

export function setRadarFavoritesSnapshot(snapshot) {
  if (!canUseStorage()) return []
  return writeRadarFavorites(snapshot)
}

export function subscribeRadarFavorites(handler) {
  if (typeof window === 'undefined') return () => {}

  window.addEventListener(RADAR_FAVORITES_UPDATED_EVENT, handler)
  return () => window.removeEventListener(RADAR_FAVORITES_UPDATED_EVENT, handler)
}

export function emitRadarFavoritesUpdated() {
  if (!canUseStorage()) return
  window.dispatchEvent(new CustomEvent(RADAR_FAVORITES_UPDATED_EVENT))
}

export function getRadarFavoriteId(theme) {
  if (!theme || typeof theme !== 'object') return ''
  return String(theme.id ?? normalizeThemeId(theme)).trim()
}

export function isRadarFavorite(theme) {
  const id = getRadarFavoriteId(theme)
  if (!id) return false
  return readRadarFavorites().some((item) => item.id === id)
}
