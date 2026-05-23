const CONQUISTAS_KEY = 'apice:conquistas:v1'
const CONQUISTAS_UPDATED_EVENT = 'apice:conquistas-updated'
const CONQUISTA_UNLOCKED_EVENT = 'apice:conquista-desbloqueada'

// Definição master de todas as conquistas
export const TODAS_CONQUISTAS = [
  {
    id: 'viajante',
    icon: '🖊️',
    title: 'Viajante',
    desc: 'Crie sua primeira redação',
    secret: false,
  },
  {
    id: 'constante',
    icon: '📌',
    title: 'Constante',
    desc: 'Crie 5 redações',
    secret: false,
  },
  {
    id: 'dedicado',
    icon: '📝',
    title: 'Dedicado',
    desc: 'Crie 10 redações',
    secret: false,
  },
  {
    id: 'lapidador',
    icon: '💎',
    title: 'Lapidador',
    desc: 'Crie 25 redações',
    secret: false,
  },
  {
    id: 'centuriao',
    icon: '🏆',
    title: 'Centurião',
    desc: 'Crie 100 redações',
    secret: false,
  },
  {
    id: 'alto-nivel',
    icon: '📈',
    title: 'Alto nível',
    desc: 'Tire 800 ou mais em uma redação',
    secret: false,
  },
  {
    id: 'perfeccionista',
    icon: '🎯',
    title: 'Perfeccionista',
    desc: 'Tire uma nota acima de 900 em uma redação',
    secret: false,
  },
  {
    id: 'curioso',
    icon: '🔍',
    title: 'Curioso',
    desc: 'Use o Radar 1000 pela primeira vez',
    secret: false,
  },
  {
    id: 'observador',
    icon: '🧠',
    title: 'Observador',
    desc: 'Consulte 3 temas no Radar 1000',
    secret: false,
  },
  {
    id: 'explorador',
    icon: '🧭',
    title: 'Explorador',
    desc: 'Consulte 10 temas diferentes no Radar',
    secret: false,
  },
  {
    id: 'estrategista',
    icon: '♟️',
    title: 'Estrategista',
    desc: 'Consulte 25 temas no Radar 1000',
    secret: false,
  },
  {
    id: 'treineiro',
    icon: '📋',
    title: 'Treineiro',
    desc: 'Conclua seu primeiro simulado',
    secret: false,
  },
  {
    id: 'rotina-de-prova',
    icon: '⏱️',
    title: 'Rotina de prova',
    desc: 'Conclua 5 simulados',
    secret: false,
  },
  {
    id: 'prova-real',
    icon: '🏛️',
    title: 'Prova real',
    desc: 'Conclua um simulado com 45 questões ou mais',
    secret: false,
  },
  {
    id: 'base-solida',
    icon: '📊',
    title: 'Base sólida',
    desc: 'Acerte 70% ou mais em um simulado',
    secret: false,
  },
  {
    id: 'fonte-oficial',
    icon: '📚',
    title: 'Fonte oficial',
    desc: 'Conclua um simulado preenchido pela API ENEM',
    secret: false,
  },
  {
    id: 'primeira-aula',
    icon: '🎓',
    title: 'Primeira aula',
    desc: 'Converse com o Professor IA pela primeira vez',
    secret: false,
  },
  {
    id: 'caderno-aberto',
    icon: '📖',
    title: 'Caderno aberto',
    desc: 'Converse 10 vezes com o Professor IA',
    secret: false,
  },
  {
    id: 'quiz-inicial',
    icon: '✅',
    title: 'Quiz inicial',
    desc: 'Complete seu primeiro quiz do Professor',
    secret: false,
  },
  {
    id: 'banca-de-questoes',
    icon: '🧩',
    title: 'Banca de questões',
    desc: 'Complete 5 quizzes do Professor',
    secret: false,
  },
  // Secretas
  {
    id: 'secreto-1',
    icon: '⭐',
    title: 'Estrela',
    desc: 'Tire nota 1000 em uma redação',
    secret: true,
  },
  {
    id: 'secreto-2',
    icon: '🌙',
    title: 'Noturno',
    desc: 'Corrija uma redação após meia-noite',
    secret: true,
  },
  {
    id: 'secreto-3',
    icon: '⚡',
    title: 'Relâmpago',
    desc: 'Complete 3 redações no mesmo dia',
    secret: true,
  },
  {
    id: 'secreto-4',
    icon: '💫',
    title: 'Quase perfeito',
    desc: 'Tire 980 ou mais em uma redação',
    secret: true,
  },
  {
    id: 'secreto-5',
    icon: '🔥',
    title: 'Ritmo intenso',
    desc: 'Complete 5 redações no mesmo dia',
    secret: true,
  },
  {
    id: 'secreto-6',
    icon: '💯',
    title: 'Gabarito fechado',
    desc: 'Acerte 100% em um simulado com pelo menos 10 questões',
    secret: true,
  },
  {
    id: 'secreto-7',
    icon: '🌟',
    title: 'Quiz perfeito',
    desc: 'Acerte 100% em um quiz do Professor',
    secret: true,
  },
]

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readState() {
  if (!canUseStorage()) return {}
  try {
    const raw = localStorage.getItem(CONQUISTAS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function writeState(state) {
  if (!canUseStorage()) return
  localStorage.setItem(CONQUISTAS_KEY, JSON.stringify(state))
  window.dispatchEvent(new CustomEvent(CONQUISTAS_UPDATED_EVENT))
}

export function loadConquistas() {
  return readState()
}

export function isConquistaDesbloqueada(id) {
  const state = readState()
  return Boolean(state[id]?.unlockedAt)
}

/**
 * Tenta desbloquear uma conquista. Só dispara evento se for novidade.
 * Retorna true se acabou de desbloquear (para mostrar notificação).
 */
export function desbloquearConquista(id) {
  if (!canUseStorage()) return false

  const conquista = TODAS_CONQUISTAS.find((c) => c.id === id)
  if (!conquista) return false

  const state = readState()
  if (state[id]?.unlockedAt) return false // já tinha

  const next = {
    ...state,
    [id]: {
      unlockedAt: new Date().toISOString(),
    },
  }

  writeState(next)

  // Dispara evento específico com dados da conquista para o toast
  window.dispatchEvent(
    new CustomEvent(CONQUISTA_UNLOCKED_EVENT, {
      detail: { conquista },
    }),
  )

  return true
}

/**
 * Rebuilds state from a cloud snapshot (array or object).
 */
export function setConquistasSnapshot(snapshot) {
  if (!canUseStorage()) return

  let normalized = {}

  if (Array.isArray(snapshot)) {
    // formato legado: array de ids
    for (const id of snapshot) {
      if (typeof id === 'string') {
        normalized[id] = { unlockedAt: new Date().toISOString() }
      }
    }
  } else if (snapshot && typeof snapshot === 'object') {
    normalized = snapshot
  }

  writeState(normalized)
}

export function normalizeConquistasSnapshot(raw) {
  if (!raw || typeof raw !== 'object') return {}
  return raw
}

export function subscribeConquistas(handler) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(CONQUISTAS_UPDATED_EVENT, handler)
  return () => window.removeEventListener(CONQUISTAS_UPDATED_EVENT, handler)
}

export function subscribeConquistaDesbloqueada(handler) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(CONQUISTA_UNLOCKED_EVENT, handler)
  return () => window.removeEventListener(CONQUISTA_UNLOCKED_EVENT, handler)
}

// ─── Triggers ──────────────────────────────────────────────────────────────

/**
 * Chame após salvar uma redação no histórico.
 * @param {{ totalEssays: number, nota: number }} params
 */
export function checkConquistasRedacao({ totalEssays = 1, nota = 0 } = {}) {
  if (totalEssays >= 1) desbloquearConquista('viajante')
  if (totalEssays >= 5) desbloquearConquista('constante')
  if (totalEssays >= 10) desbloquearConquista('dedicado')
  if (totalEssays >= 25) desbloquearConquista('lapidador')
  if (totalEssays >= 100) desbloquearConquista('centuriao')
  if (nota >= 800) desbloquearConquista('alto-nivel')
  if (nota >= 900) desbloquearConquista('perfeccionista')
  if (nota >= 980) desbloquearConquista('secreto-4')
  if (nota >= 1000) desbloquearConquista('secreto-1')

  // Noturno: redação após meia-noite
  const hour = new Date().getHours()
  if (hour >= 0 && hour < 5) desbloquearConquista('secreto-2')

  // Relâmpago: 3 redações no mesmo dia
  checkRelampago()
}

function checkRelampago() {
  if (!canUseStorage()) return
  const key = 'apice:conquista:daily-essays'
  const today = new Date().toISOString().slice(0, 10)
  try {
    const raw = JSON.parse(localStorage.getItem(key) || '{}')
    const count = raw.day === today ? (Number(raw.count) || 0) + 1 : 1
    localStorage.setItem(key, JSON.stringify({ day: today, count }))
    if (count >= 3) desbloquearConquista('secreto-3')
    if (count >= 5) desbloquearConquista('secreto-5')
  } catch {
    // ignore
  }
}

/**
 * Chame após o usuário usar o Radar pela primeira vez.
 */
export function checkConquistasRadar({ totalSearches = 0 } = {}) {
  if (totalSearches >= 1) desbloquearConquista('curioso')
  if (totalSearches >= 3) desbloquearConquista('observador')
  if (totalSearches >= 10) desbloquearConquista('explorador')
  if (totalSearches >= 25) desbloquearConquista('estrategista')
}

export function checkConquistasSimulado({
  totalSimulados = 0,
  totalQuestoes = 0,
  acertos = 0,
  percentual = 0,
  estatisticas = {},
} = {}) {
  const safeTotalSimulados = Number(totalSimulados) || 0
  const safeTotalQuestoes = Number(totalQuestoes) || 0
  const safeAcertos = Number(acertos) || 0
  const safePercentual = Number(percentual) || (safeTotalQuestoes > 0 ? (safeAcertos / safeTotalQuestoes) * 100 : 0)
  const apiCount = Number(estatisticas?.api) || 0
  const iaCount = Number(estatisticas?.ia) || 0
  const bancoLocalCount = Number(estatisticas?.bancoLocal) || 0

  if (safeTotalSimulados >= 1) desbloquearConquista('treineiro')
  if (safeTotalSimulados >= 5) desbloquearConquista('rotina-de-prova')
  if (safeTotalQuestoes >= 45) desbloquearConquista('prova-real')
  if (safePercentual >= 70) desbloquearConquista('base-solida')
  if (safeTotalQuestoes >= 10 && apiCount >= safeTotalQuestoes && iaCount === 0 && bancoLocalCount === 0) {
    desbloquearConquista('fonte-oficial')
  }
  if (safeTotalQuestoes >= 10 && safeAcertos >= safeTotalQuestoes) {
    desbloquearConquista('secreto-6')
  }
}

export function checkConquistasProfessor({
  totalInteractions = 0,
  totalQuizzesCompleted = 0,
  lastQuizTotal = 0,
  lastQuizCorrect = 0,
} = {}) {
  if (Number(totalInteractions) >= 1) desbloquearConquista('primeira-aula')
  if (Number(totalInteractions) >= 10) desbloquearConquista('caderno-aberto')
  if (Number(totalQuizzesCompleted) >= 1) desbloquearConquista('quiz-inicial')
  if (Number(totalQuizzesCompleted) >= 5) desbloquearConquista('banca-de-questoes')
  if (Number(lastQuizTotal) > 0 && Number(lastQuizCorrect) >= Number(lastQuizTotal)) {
    desbloquearConquista('secreto-7')
  }
}
