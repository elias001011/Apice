const STORAGE_KEY = 'apice:professor:handoff:v1'
const MAX_HANDOFF_AGE_MS = 10 * 60 * 1000

export function normalizeProfessorHandoff(value) {
  if (!value || typeof value !== 'object') return null

  const message = String(value.message ?? value.text ?? '').trim()
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
