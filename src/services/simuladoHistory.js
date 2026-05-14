const HISTORY_KEY = 'apice:simulado:historico:v1'
const HISTORY_TOTAL_KEY = 'apice:simulado:historico:total:v1'
const HISTORY_UPDATED_EVENT = 'apice:simulado-historico-updated'
export const MAX_LOCAL_SIMULADO_HISTORY_ENTRIES = 50

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function toNumber(value, fallback = 0) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function normalizeStringArray(value, limit = 10) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => String(item ?? '').trim())
    .filter(Boolean)
    .slice(0, limit)
}

function normalizeStats(stats) {
  if (!stats || typeof stats !== 'object') {
    return {
      bancoLocal: 0,
      reais: 0,
      ia: 0,
    }
  }

  return {
    bancoLocal: Math.max(0, Math.round(toNumber(stats.bancoLocal, 0))),
    reais: Math.max(0, Math.round(toNumber(stats.reais, 0))),
    ia: Math.max(0, Math.round(toNumber(stats.ia, 0))),
  }
}

function getHistoryTimestamp(item) {
  const date = new Date(item?.data)
  return Number.isFinite(date.getTime()) ? date.getTime() : 0
}

export function compactSimuladoHistoryEntry(item) {
  if (!item || typeof item !== 'object') return null

  const area = String(item.area ?? '').trim()
  const disciplinas = normalizeStringArray(item.disciplinas, 10)
  const quantidadeSolicitada = Math.max(0, Math.round(toNumber(item.quantidadeSolicitada, toNumber(item.quantidade, 0))))
  const quantidade = Math.max(0, Math.round(toNumber(item.quantidade, 0)))
  const acertos = Math.max(0, Math.round(toNumber(item.acertos, 0)))
  const total = Math.max(0, Math.round(toNumber(item.total, quantidade)))
  const percentual = Math.max(0, Math.min(100, Math.round(toNumber(item.percentual, total > 0 ? (acertos / total) * 100 : 0))))
  const fonte = String(item.fonte ?? 'mista').trim() || 'mista'
  const alerta = String(item.alerta ?? '').trim()
  const titulo = String(item.titulo ?? '').trim() || `Simulado de ${area || 'ENEM'}`

  return {
    id: String(item.id ?? item.sessionId ?? `${Date.now()}`).trim(),
    data: typeof item.data === 'string' ? item.data : new Date().toISOString(),
    titulo,
    area,
    disciplinas,
    fonte,
    quantidadeSolicitada,
    quantidade,
    acertos,
    total,
    percentual,
    performance: String(item.performance ?? '').trim(),
    estatisticas: normalizeStats(item.estatisticas),
    limiteIAAplicado: Boolean(item.limiteIAAplicado),
    alerta,
    sessionId: String(item.sessionId ?? '').trim(),
    geradoEm: typeof item.geradoEm === 'string' ? item.geradoEm : '',
  }
}

function readHistoryRaw() {
  if (!canUseStorage()) return []

  try {
    const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

function readTotalHistoryCount() {
  if (!canUseStorage()) return 0

  try {
    const raw = Number(localStorage.getItem(HISTORY_TOTAL_KEY) || 0)
    return Number.isFinite(raw) && raw > 0 ? raw : 0
  } catch {
    return 0
  }
}

function emitHistoryUpdated() {
  if (!canUseStorage()) return
  window.dispatchEvent(new CustomEvent(HISTORY_UPDATED_EVENT))
}

export function loadSimuladoHistory(limit = 0) {
  const raw = readHistoryRaw()
  const mapped = raw
    .filter((item) => item && typeof item === 'object')
    .map((item) => compactSimuladoHistoryEntry(item))
    .filter(Boolean)
    .sort((a, b) => getHistoryTimestamp(b) - getHistoryTimestamp(a))

  if (limit > 0) {
    return mapped.slice(0, limit)
  }

  return mapped.slice(0, MAX_LOCAL_SIMULADO_HISTORY_ENTRIES)
}

export function loadSimuladoHistoryCount() {
  const storedCount = readTotalHistoryCount()
  if (storedCount > 0) return storedCount
  return loadSimuladoHistory().length
}

export function mergeSimuladoHistorySnapshots(localHistory = [], incomingHistory = []) {
  const mergedById = new Map()

  const addItem = (item) => {
    const normalized = compactSimuladoHistoryEntry(item)
    if (!normalized) return

    const key = String(normalized.id)
    if (mergedById.has(key)) {
      const current = mergedById.get(key)
      mergedById.set(key, getHistoryTimestamp(normalized) >= getHistoryTimestamp(current) ? normalized : current)
      return
    }

    mergedById.set(key, normalized)
  }

  if (Array.isArray(localHistory)) {
    localHistory.forEach(addItem)
  }

  if (Array.isArray(incomingHistory)) {
    incomingHistory.forEach(addItem)
  }

  return Array.from(mergedById.values())
    .sort((a, b) => {
      const delta = getHistoryTimestamp(b) - getHistoryTimestamp(a)
      if (delta !== 0) return delta

      const aId = Number(a.id)
      const bId = Number(b.id)
      if (Number.isFinite(aId) && Number.isFinite(bId)) {
        return bId - aId
      }

      return 0
    })
    .slice(0, MAX_LOCAL_SIMULADO_HISTORY_ENTRIES)
}

export function saveSimuladoHistorySnapshot(history = [], totalCount = null) {
  if (!canUseStorage()) return

  const normalized = Array.isArray(history)
    ? history.map((item) => compactSimuladoHistoryEntry(item)).filter(Boolean)
    : []
  const cappedHistory = normalized.slice(0, MAX_LOCAL_SIMULADO_HISTORY_ENTRIES)

  localStorage.setItem(HISTORY_KEY, JSON.stringify(cappedHistory))
  const nextCount = Number.isFinite(Number(totalCount)) && Number(totalCount) > 0
    ? Number(totalCount)
    : cappedHistory.length
  localStorage.setItem(HISTORY_TOTAL_KEY, String(nextCount))
  emitHistoryUpdated()
}

export function saveSimuladoHistoryEntry(item) {
  const entry = compactSimuladoHistoryEntry(item)
  if (!entry) return null

  const history = loadSimuladoHistory()
  const merged = mergeSimuladoHistorySnapshots([entry], history)
  const totalCount = loadSimuladoHistoryCount() + 1
  saveSimuladoHistorySnapshot(merged, totalCount)
  return entry
}

export function subscribeSimuladoHistory(handler) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(HISTORY_UPDATED_EVENT, handler)
  return () => window.removeEventListener(HISTORY_UPDATED_EVENT, handler)
}

export function notifySimuladoHistoryUpdated() {
  emitHistoryUpdated()
}
