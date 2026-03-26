const RADAR_STATE_KEY = 'apice:radar-state:v1'
const RADAR_STATE_UPDATED_EVENT = 'apice:radar-state-updated'

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

function normalizeRadarTheme(theme) {
  if (!theme || typeof theme !== 'object') return null

  const titulo = String(theme.titulo ?? theme.title ?? '').trim()
  if (!titulo) return null

  return {
    titulo,
    probabilidade: Number.isFinite(Number(theme.probabilidade)) ? Number(theme.probabilidade) : 0,
    hot: Boolean(theme.hot),
    tags: sanitizeTags(theme.tags),
    justificativa: String(theme.justificativa ?? '').trim(),
  }
}

export function normalizeRadarSnapshot(rawSnapshot) {
  if (!rawSnapshot || typeof rawSnapshot !== 'object') return null

  const temas = Array.isArray(rawSnapshot.temas)
    ? rawSnapshot.temas.map((tema) => normalizeRadarTheme(tema)).filter(Boolean)
    : []

  if (!temas.length) return null

  const savedAt = String(rawSnapshot.savedAt ?? rawSnapshot.atualizadoEm ?? new Date().toISOString()).trim() || new Date().toISOString()

  return {
    temas,
    resumoPesquisa: String(rawSnapshot.resumoPesquisa ?? '').trim(),
    atualizadoEm: String(rawSnapshot.atualizadoEm ?? savedAt).trim() || savedAt,
    origem: String(rawSnapshot.origem ?? 'ai').trim() || 'ai',
    savedAt,
  }
}

function readRadarSnapshot() {
  if (!canUseStorage()) return null

  try {
    const raw = localStorage.getItem(RADAR_STATE_KEY)
    if (!raw) return null
    return normalizeRadarSnapshot(JSON.parse(raw))
  } catch {
    return null
  }
}

function writeRadarSnapshot(snapshot) {
  if (!canUseStorage()) return null

  const normalized = normalizeRadarSnapshot(snapshot)
  if (!normalized) {
    localStorage.removeItem(RADAR_STATE_KEY)
    window.dispatchEvent(new CustomEvent(RADAR_STATE_UPDATED_EVENT))
    return null
  }

  localStorage.setItem(RADAR_STATE_KEY, JSON.stringify(normalized))
  window.dispatchEvent(new CustomEvent(RADAR_STATE_UPDATED_EVENT))
  return normalized
}

export function loadRadarSnapshot() {
  return readRadarSnapshot()
}

export function saveRadarSnapshot(snapshot) {
  return writeRadarSnapshot(snapshot)
}

export function clearRadarSnapshot() {
  if (!canUseStorage()) return
  localStorage.removeItem(RADAR_STATE_KEY)
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
