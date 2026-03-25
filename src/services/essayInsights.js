const HISTORY_KEY = 'apice:historico'
const HISTORY_UPDATED_EVENT = 'apice:historico-updated'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function today() {
  return new Date()
}

function toDate(value) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
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

export function loadEssayHistory(limit = 0) {
  const raw = readHistoryRaw()
  const mapped = raw
    .filter(item => item && typeof item === 'object')
    .map(item => ({
      id: item.id ?? null,
      data: typeof item.data === 'string' ? item.data : null,
      tema: typeof item.tema === 'string' ? item.tema : '',
      preview: typeof item.preview === 'string' ? item.preview : '',
      nota: Number.isFinite(Number(item.nota)) ? Number(item.nota) : 0,
      redacao: typeof item.redacao === 'string' ? item.redacao : '',
      feedback: item.feedback ?? null,
    }))

  if (limit > 0) {
    return mapped.slice(0, limit)
  }

  return mapped
}

export function buildEssayInsights(history = loadEssayHistory()) {
  const now = today()
  const month = now.getMonth()
  const year = now.getFullYear()
  const weekMs = 7 * 24 * 60 * 60 * 1000

  const entries = Array.isArray(history) ? history : []
  const validDates = entries
    .map(item => toDate(item.data))
    .filter(Boolean)

  const totalEssays = entries.length
  const essaysThisMonth = entries.filter(item => {
    const date = toDate(item.data)
    return Boolean(date) && date.getMonth() === month && date.getFullYear() === year
  }).length

  const essaysThisWeek = entries.filter(item => {
    const date = toDate(item.data)
    return Boolean(date) && (now.getTime() - date.getTime()) <= weekMs
  }).length

  const scores = entries.map(item => Number(item.nota) || 0)
  const bestScore = scores.length > 0 ? Math.max(...scores) : 0
  const averageScore = scores.length > 0
    ? Math.round((scores.reduce((sum, value) => sum + value, 0) / scores.length) * 10) / 10
    : 0

  const firstDate = validDates.length > 0 ? new Date(Math.min(...validDates.map(date => date.getTime()))) : null
  const lastDate = validDates.length > 0 ? new Date(Math.max(...validDates.map(date => date.getTime()))) : null

  return {
    totalEssays,
    essaysThisMonth,
    essaysThisWeek,
    bestScore,
    averageScore,
    firstDate,
    lastDate,
    latestEssay: entries[0] || null,
  }
}

export function buildRecentEssayContext(limit = 3) {
  // Esse bloco é o que você pode mandar para o modelo quando quiser resumir o usuário.
  // Ele junta tema, nota e a redação salva no histórico local, sem search.
  const items = loadEssayHistory(limit)
  if (items.length === 0) {
    return 'Sem histórico recente de redações.'
  }

  return items
    .map((item, index) => {
      const lines = [
        `Redação #${index + 1}`,
        `Tema: ${item.tema || 'Tema livre'}`,
        `Nota: ${item.nota || 0}`,
        `Data: ${item.data || 'Recente'}`,
      ]

      if (item.redacao) {
        lines.push(`Texto: ${item.redacao}`)
      } else if (item.preview) {
        lines.push(`Preview: ${item.preview}`)
      }

      return lines.join('\n')
    })
    .join('\n\n')
}

export function subscribeEssayHistory(handler) {
  if (typeof window === 'undefined') return () => {}

  window.addEventListener(HISTORY_UPDATED_EVENT, handler)
  return () => window.removeEventListener(HISTORY_UPDATED_EVENT, handler)
}

export function emitEssayHistoryUpdated() {
  if (!canUseStorage()) return
  window.dispatchEvent(new CustomEvent(HISTORY_UPDATED_EVENT))
}
