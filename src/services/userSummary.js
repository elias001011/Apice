import {
  MAX_CLOUD_ESSAY_HISTORY_ENTRIES,
  buildRecentEssaySummaryIndex,
  loadEssayHistoryCount,
} from './essayInsights.js'
import { loadAiResponsePreferenceText } from './aiResponsePreferences.js'

const SUMMARY_KEY = 'apice:user-summary:v1'
const SUMMARY_UPDATED_EVENT = 'apice:user-summary-updated'
const SUMMARY_ENDPOINT = '/.netlify/functions/resumir-usuario'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function sanitizeList(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => String(item ?? '').trim())
    .filter(Boolean)
}

function normalizeSummary(rawSummary) {
  if (!rawSummary) return null

  if (typeof rawSummary === 'string') {
    const resumo = rawSummary.trim()
    return resumo ? {
      resumo,
      forcas: [],
      errosRecorrentes: [],
      foco: '',
      geradoEm: new Date().toISOString(),
      totalRedacoes: 0,
      origem: 'manual',
    } : null
  }

  if (typeof rawSummary !== 'object') return null

  const resumo = String(rawSummary.resumo ?? rawSummary.summary ?? '').trim()
  const forcas = sanitizeList(rawSummary.forcas ?? rawSummary.pontosFortes ?? rawSummary.strengths)
  const errosRecorrentes = sanitizeList(rawSummary.errosRecorrentes ?? rawSummary.erros ?? rawSummary.weaknesses)
  const foco = String(rawSummary.foco ?? rawSummary.focoTreino ?? rawSummary.focus ?? '').trim()
  const geradoEm = String(rawSummary.geradoEm ?? rawSummary.generatedAt ?? rawSummary.updatedAt ?? '').trim() || new Date().toISOString()
  const totalRedacoes = Number.isFinite(Number(rawSummary.totalRedacoes ?? rawSummary.essaysAnalyzed))
    ? Number(rawSummary.totalRedacoes ?? rawSummary.essaysAnalyzed)
    : 0

  if (!resumo && forcas.length === 0 && errosRecorrentes.length === 0 && !foco) {
    return null
  }

  return {
    resumo,
    forcas,
    errosRecorrentes,
    foco,
    geradoEm,
    totalRedacoes,
    origem: String(rawSummary.origem ?? rawSummary.source ?? 'ai').trim() || 'ai',
  }
}

function shouldGenerateSummary(totalRedacoes, currentSummary) {
  if (!Number.isFinite(totalRedacoes) || totalRedacoes <= 0) return false
  if (!(totalRedacoes === 1 || totalRedacoes % 5 === 0)) return false

  const currentCount = Number(currentSummary?.totalRedacoes ?? 0) || 0
  return currentCount !== totalRedacoes
}

function uniqueStrings(items = []) {
  const seen = new Set()
  const out = []

  for (const item of items) {
    const value = String(item ?? '').trim()
    if (!value || seen.has(value.toLowerCase())) continue
    seen.add(value.toLowerCase())
    out.push(value)
  }

  return out
}

function buildFallbackUserSummary(historyIndex, totalRedacoes) {
  const entries = Array.isArray(historyIndex) ? historyIndex : []
  const notes = entries
    .map((item) => Number(item?.nota))
    .filter((nota) => Number.isFinite(nota))

  const average = notes.length > 0
    ? Math.round(notes.reduce((sum, value) => sum + value, 0) / notes.length)
    : 0

  const best = notes.length > 0 ? Math.max(...notes) : 0

  const strengths = uniqueStrings([
    ...entries.map((item) => item?.pontoForte),
    ...entries
      .flatMap((item) => Array.isArray(item?.competencias) ? item.competencias : [])
      .filter((competencia) => Number.isFinite(Number(competencia?.nota)) && Number(competencia.nota) >= 800)
      .map((competencia) => competencia?.nome),
  ]).slice(0, 3)

  const recurringIssues = uniqueStrings([
    ...entries.map((item) => item?.principalMelhorar),
    ...entries.map((item) => item?.atencao),
    ...entries
      .flatMap((item) => Array.isArray(item?.competencias) ? item.competencias : [])
      .filter((competencia) => Number.isFinite(Number(competencia?.nota)) && Number(competencia.nota) <= 650)
      .map((competencia) => competencia?.nome),
  ]).slice(0, 3)

  const mainFocus = recurringIssues[0] || 'coesão, repertório e gramática'

  const summaryParts = []
  if (totalRedacoes <= 1) {
    summaryParts.push(`Resumo local inicial: nota ${best || 0}/1000.`)
  } else {
    summaryParts.push(`Resumo local das últimas ${totalRedacoes} redações: média ${average || 0}/1000 e melhor nota ${best || 0}/1000.`)
  }

  if (strengths.length > 0) {
    summaryParts.push(`Pontos fortes mais visíveis: ${strengths.join(', ')}.`)
  }

  summaryParts.push(`Foco principal agora: ${mainFocus}.`)

  return {
    resumo: summaryParts.join(' ').trim(),
    forcas: strengths,
    errosRecorrentes: recurringIssues,
    foco: `Reforçar ${mainFocus}.`,
    geradoEm: new Date().toISOString(),
    totalRedacoes,
    origem: 'fallback',
  }
}

export function loadUserSummary() {
  if (!canUseStorage()) return null

  try {
    const raw = localStorage.getItem(SUMMARY_KEY)
    if (!raw) return null
    return normalizeSummary(JSON.parse(raw))
  } catch {
    return null
  }
}

export function saveUserSummary(summary) {
  if (!canUseStorage()) return null

  const normalized = normalizeSummary(summary)
  if (!normalized) {
    localStorage.removeItem(SUMMARY_KEY)
    window.dispatchEvent(new CustomEvent(SUMMARY_UPDATED_EVENT))
    return null
  }

  localStorage.setItem(SUMMARY_KEY, JSON.stringify(normalized))
  window.dispatchEvent(new CustomEvent(SUMMARY_UPDATED_EVENT))
  return normalized
}

export function clearUserSummary() {
  if (!canUseStorage()) return
  localStorage.removeItem(SUMMARY_KEY)
  window.dispatchEvent(new CustomEvent(SUMMARY_UPDATED_EVENT))
}

export async function refreshUserSummaryFromHistory({ force = false } = {}) {
  if (!canUseStorage()) return null

  const totalRedacoes = loadEssayHistoryCount()
  const currentSummary = loadUserSummary()
  const historyIndex = buildRecentEssaySummaryIndex(MAX_CLOUD_ESSAY_HISTORY_ENTRIES)

  if (totalRedacoes <= 0) {
    return currentSummary
  }

  if (!force && !shouldGenerateSummary(totalRedacoes, currentSummary)) {
    return currentSummary
  }

  if (historyIndex.length === 0) {
    return currentSummary
  }

  try {
    const responsePreference = loadAiResponsePreferenceText()
    const response = await fetch(SUMMARY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        historyIndex,
        historyCount: totalRedacoes,
        ...(responsePreference ? { responsePreference } : {}),
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || 'Falha ao gerar o resumo do usuário.')
    }

    const summary = await response.json()
    const saved = saveUserSummary({
      resumo: summary?.resumo || 'Análise automática baseada nas últimas redações.',
      forcas: summary?.forcas || [],
      errosRecorrentes: summary?.errosRecorrentes || [],
      foco: summary?.foco || 'Continuar reforçando clareza, repertório e correção gramatical.',
      geradoEm: summary?.geradoEm || new Date().toISOString(),
      totalRedacoes,
      origem: summary?.origem || 'ai',
    })

    return saved
  } catch (error) {
    console.error('[userSummary] Falha ao atualizar resumo:', error)
    return saveUserSummary(buildFallbackUserSummary(historyIndex, totalRedacoes))
  }
}

export function subscribeUserSummary(handler) {
  if (typeof window === 'undefined') return () => {}

  window.addEventListener(SUMMARY_UPDATED_EVENT, handler)
  return () => window.removeEventListener(SUMMARY_UPDATED_EVENT, handler)
}

export function emitUserSummaryUpdated() {
  if (!canUseStorage()) return
  window.dispatchEvent(new CustomEvent(SUMMARY_UPDATED_EVENT))
}

export { normalizeSummary as normalizeUserSummary }
