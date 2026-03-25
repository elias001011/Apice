const DRAFT_KEY = 'apice:corretor:draft:v2'

function canUseStorage() {
  // Evita quebrar SSR, testes ou ambientes sem window/localStorage.
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function normalizeDraft(rawDraft) {
  // Se o localStorage tiver lixo antigo, sanitizamos para o formato esperado.
  if (!rawDraft || typeof rawDraft !== 'object') return null

  return {
    hasStarted: Boolean(rawDraft.hasStarted),
    tema: typeof rawDraft.tema === 'string' ? rawDraft.tema : '',
    material: rawDraft.material ?? null,
    redacao: typeof rawDraft.redacao === 'string' ? rawDraft.redacao : '',
    isRigido: Boolean(rawDraft.isRigido),
    updatedAt: typeof rawDraft.updatedAt === 'string' ? rawDraft.updatedAt : null,
  }
}

export function loadCorretorDraft() {
  if (!canUseStorage()) return null

  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    return normalizeDraft(JSON.parse(raw))
  } catch {
    return null
  }
}

export function saveCorretorDraft(draft) {
  if (!canUseStorage()) return

  // Chave versionada: se a estrutura do draft mudar no futuro, basta trocar a versão.
  const payload = {
    hasStarted: Boolean(draft?.hasStarted),
    tema: typeof draft?.tema === 'string' ? draft.tema : '',
    material: draft?.material ?? null,
    redacao: typeof draft?.redacao === 'string' ? draft.redacao : '',
    isRigido: Boolean(draft?.isRigido),
    updatedAt: new Date().toISOString(),
  }

  localStorage.setItem(DRAFT_KEY, JSON.stringify(payload))
}

export function clearCorretorDraft() {
  // Limpa o estado salvo quando o usuário quer recomeçar do zero.
  if (!canUseStorage()) return
  localStorage.removeItem(DRAFT_KEY)
}
