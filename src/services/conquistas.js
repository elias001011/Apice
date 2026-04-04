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
    id: 'curioso',
    icon: '🔍',
    title: 'Curioso',
    desc: 'Use o Radar 1000 pela primeira vez',
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
    id: 'explorador',
    icon: '🧭',
    title: 'Explorador',
    desc: 'Consulte 10 temas diferentes no Radar',
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
    id: 'centuriao',
    icon: '🏆',
    title: 'Centurião',
    desc: 'Crie 100 redações',
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
  if (totalEssays >= 10) desbloquearConquista('dedicado')
  if (totalEssays >= 100) desbloquearConquista('centuriao')
  if (nota >= 900) desbloquearConquista('perfeccionista')
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
  } catch {
    // ignore
  }
}

/**
 * Chame após o usuário usar o Radar pela primeira vez.
 */
export function checkConquistasRadar({ totalSearches = 0 } = {}) {
  if (totalSearches >= 1) desbloquearConquista('curioso')
  if (totalSearches >= 10) desbloquearConquista('explorador')
}
