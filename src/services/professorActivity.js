const PROFESSOR_ACTIVITY_KEY = 'apice:professor-activity:v1'
const PROFESSOR_ACTIVITY_UPDATED_EVENT = 'apice:professor-activity-updated'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function nowIso() {
  return new Date().toISOString()
}

function toNumber(value, fallback = 0) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function defaultActivity() {
  return {
    totalInteractions: 0,
    totalQuizzesCreated: 0,
    totalQuizzesCompleted: 0,
    totalQuizQuestions: 0,
    totalQuizCorrect: 0,
    perfectQuizzes: 0,
    lastUsedAt: '',
    lastQuizAt: '',
    updatedAt: '',
  }
}

export function normalizeProfessorActivity(rawActivity) {
  const base = defaultActivity()
  if (!rawActivity || typeof rawActivity !== 'object') return base

  return {
    totalInteractions: Math.max(0, Math.round(toNumber(rawActivity.totalInteractions, 0))),
    totalQuizzesCreated: Math.max(0, Math.round(toNumber(rawActivity.totalQuizzesCreated, 0))),
    totalQuizzesCompleted: Math.max(0, Math.round(toNumber(rawActivity.totalQuizzesCompleted, 0))),
    totalQuizQuestions: Math.max(0, Math.round(toNumber(rawActivity.totalQuizQuestions, 0))),
    totalQuizCorrect: Math.max(0, Math.round(toNumber(rawActivity.totalQuizCorrect, 0))),
    perfectQuizzes: Math.max(0, Math.round(toNumber(rawActivity.perfectQuizzes, 0))),
    lastUsedAt: String(rawActivity.lastUsedAt ?? '').trim(),
    lastQuizAt: String(rawActivity.lastQuizAt ?? '').trim(),
    updatedAt: String(rawActivity.updatedAt ?? '').trim(),
  }
}

export function loadProfessorActivity() {
  if (!canUseStorage()) return defaultActivity()

  try {
    const raw = localStorage.getItem(PROFESSOR_ACTIVITY_KEY)
    return normalizeProfessorActivity(raw ? JSON.parse(raw) : null)
  } catch {
    return defaultActivity()
  }
}

export function saveProfessorActivity(activity) {
  if (!canUseStorage()) return defaultActivity()

  const normalized = normalizeProfessorActivity(activity)
  normalized.updatedAt = normalized.updatedAt || nowIso()
  localStorage.setItem(PROFESSOR_ACTIVITY_KEY, JSON.stringify(normalized))
  window.dispatchEvent(new CustomEvent(PROFESSOR_ACTIVITY_UPDATED_EVENT))
  return normalized
}

export function recordProfessorInteraction({ quizCreated = false } = {}) {
  const current = loadProfessorActivity()
  const timestamp = nowIso()

  return saveProfessorActivity({
    ...current,
    totalInteractions: current.totalInteractions + 1,
    totalQuizzesCreated: current.totalQuizzesCreated + (quizCreated ? 1 : 0),
    lastUsedAt: timestamp,
    lastQuizAt: quizCreated ? timestamp : current.lastQuizAt,
    updatedAt: timestamp,
  })
}

export function recordProfessorQuizCompletion({ total = 0, correct = 0 } = {}) {
  const current = loadProfessorActivity()
  const timestamp = nowIso()
  const safeTotal = Math.max(0, Math.round(toNumber(total, 0)))
  const safeCorrect = Math.max(0, Math.min(safeTotal, Math.round(toNumber(correct, 0))))

  return saveProfessorActivity({
    ...current,
    totalQuizzesCompleted: current.totalQuizzesCompleted + 1,
    totalQuizQuestions: current.totalQuizQuestions + safeTotal,
    totalQuizCorrect: current.totalQuizCorrect + safeCorrect,
    perfectQuizzes: current.perfectQuizzes + (safeTotal > 0 && safeCorrect === safeTotal ? 1 : 0),
    lastQuizAt: timestamp,
    updatedAt: timestamp,
  })
}

export function buildProfessorPerformanceIndex() {
  const activity = loadProfessorActivity()
  const accuracy = activity.totalQuizQuestions > 0
    ? Math.round((activity.totalQuizCorrect / activity.totalQuizQuestions) * 100)
    : 0

  return {
    interacoes: activity.totalInteractions,
    quizzesCriados: activity.totalQuizzesCreated,
    quizzesConcluidos: activity.totalQuizzesCompleted,
    questoesRespondidas: activity.totalQuizQuestions,
    acertos: activity.totalQuizCorrect,
    aproveitamento: accuracy,
    quizzesPerfeitos: activity.perfectQuizzes,
    ultimoUso: activity.lastUsedAt,
    ultimoQuiz: activity.lastQuizAt,
  }
}

export function subscribeProfessorActivity(handler) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(PROFESSOR_ACTIVITY_UPDATED_EVENT, handler)
  return () => window.removeEventListener(PROFESSOR_ACTIVITY_UPDATED_EVENT, handler)
}

export function emitProfessorActivityUpdated() {
  if (!canUseStorage()) return
  window.dispatchEvent(new CustomEvent(PROFESSOR_ACTIVITY_UPDATED_EVENT))
}

export { PROFESSOR_ACTIVITY_KEY, PROFESSOR_ACTIVITY_UPDATED_EVENT }
