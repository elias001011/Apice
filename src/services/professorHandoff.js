const STORAGE_KEY = 'apice:professor:handoff:v1'
const MAX_HANDOFF_AGE_MS = 10 * 60 * 1000

function normalizeTextLikeValue(value, seen = new Set()) {
  if (value == null) return ''

  if (typeof value === 'string') {
    return value.trim()
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim()
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeTextLikeValue(item, seen))
      .filter(Boolean)
      .join('\n')
      .trim()
  }

  if (typeof value !== 'object') return ''
  if (seen.has(value)) return ''
  seen.add(value)

  const keys = [
    'message',
    'text',
    'content',
    'response',
    'answer',
    'reply',
    'texto',
    'resposta',
    'mensagem',
    'question',
    'pergunta',
  ]

  for (const key of keys) {
    const nested = normalizeTextLikeValue(value[key], seen)
    if (nested) return nested
  }

  try {
    return JSON.stringify(value)
  } catch {
    return ''
  }
}

export function normalizeProfessorHandoff(value) {
  if (!value || typeof value !== 'object') return null

  const message = normalizeTextLikeValue(value.message ?? value.text ?? value.content ?? value.response)
  if (!message) return null

  const categoryId = String(value.categoryId ?? value.category ?? 'duvidas').trim() || 'duvidas'
  const createdAtValue = Number(value.createdAt ?? Date.now())
  const createdAt = Number.isFinite(createdAtValue) ? createdAtValue : Date.now()

  return {
    message,
    categoryId,
    source: String(value.source ?? 'home-widget').trim() || 'home-widget',
    createdAt,
  }
}

export function saveProfessorHandoff(value) {
  const handoff = normalizeProfessorHandoff(value)
  if (!handoff) return null

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(handoff))
  } catch {
    // Ignore storage errors. The navigation state still carries the payload.
  }

  return handoff
}

export function loadProfessorHandoff() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    const handoff = normalizeProfessorHandoff(parsed)

    if (!handoff) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    if (Date.now() - handoff.createdAt > MAX_HANDOFF_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    return handoff
  } catch {
    return null
  }
}

export function clearProfessorHandoff() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore cleanup errors.
  }
}
