import {
  MAX_CLOUD_ESSAY_HISTORY_ENTRIES,
  buildRecentEssaySummaryIndex,
  loadEssayHistoryCount,
} from './essayInsights.js'
import {
  loadSimuladoHistory,
  loadSimuladoHistoryCount,
} from './simuladoHistory.js'
import { loadAiResponsePreferenceText } from './aiResponsePreferences.js'
import {
  canConsumeFreePlan,
  consumeFreePlan,
} from './freePlanUsage.js'
import { authFetch } from './authFetch.js'
import { buildProfessorPerformanceIndex } from './professorActivity.js'
import { isPerformanceAiAnalysisEnabled } from './performanceAnalysisSettings.js'

const SUMMARY_KEY = 'apice:user-summary:v1'
const SUMMARY_UPDATED_EVENT = 'apice:user-summary-updated'
const SUMMARY_ENDPOINT = '/.netlify/functions/resumir-usuario'
const RECENT_ACTIVITY_LIMIT = 5

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function toNumber(value, fallback = 0) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function round(value, fallback = 0) {
  return Math.round(toNumber(value, fallback))
}

function trimText(value, limit = 180) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

function todayKey(referenceDate = new Date()) {
  const date = referenceDate instanceof Date ? referenceDate : new Date(referenceDate)
  if (!Number.isFinite(date.getTime())) return todayKey(new Date())
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function sanitizeList(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => String(item ?? '').trim())
    .filter(Boolean)
}

function uniqueStrings(items = []) {
  const seen = new Set()
  const out = []

  for (const item of items) {
    const value = String(item ?? '').trim()
    if (!value) continue
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(value)
  }

  return out
}

function average(numbers = []) {
  const safeNumbers = numbers.filter((value) => Number.isFinite(Number(value)))
  if (safeNumbers.length === 0) return 0
  return Math.round(safeNumbers.reduce((sum, value) => sum + Number(value), 0) / safeNumbers.length)
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
      totalSimulados: 0,
      totalProfessorInteractions: 0,
      totalAtividades: 0,
      generatedDay: todayKey(),
      dataSignature: '',
      origem: 'manual',
    } : null
  }

  if (typeof rawSummary !== 'object') return null

  const resumo = String(rawSummary.resumo ?? rawSummary.summary ?? '').trim()
  const forcas = sanitizeList(rawSummary.forcas ?? rawSummary.pontosFortes ?? rawSummary.strengths)
  const errosRecorrentes = sanitizeList(rawSummary.errosRecorrentes ?? rawSummary.erros ?? rawSummary.weaknesses)
  const foco = String(rawSummary.foco ?? rawSummary.focoTreino ?? rawSummary.focus ?? '').trim()
  const geradoEm = String(rawSummary.geradoEm ?? rawSummary.generatedAt ?? rawSummary.updatedAt ?? '').trim() || new Date().toISOString()
  const totalRedacoes = round(rawSummary.totalRedacoes ?? rawSummary.essaysAnalyzed, 0)
  const totalSimulados = round(rawSummary.totalSimulados ?? rawSummary.examsAnalyzed, 0)
  const totalProfessorInteractions = round(rawSummary.totalProfessorInteractions ?? rawSummary.professorInteractions, 0)
  const totalAtividades = round(
    rawSummary.totalAtividades ?? rawSummary.activitiesAnalyzed,
    totalRedacoes + totalSimulados + totalProfessorInteractions,
  )
  const generatedDay = String(rawSummary.generatedDay ?? rawSummary.diaGeracao ?? '').trim() || todayKey(geradoEm)
  const dataSignature = String(rawSummary.dataSignature ?? rawSummary.signature ?? '').trim()

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
    totalSimulados,
    totalProfessorInteractions,
    totalAtividades,
    generatedDay,
    dataSignature,
    origem: String(rawSummary.origem ?? rawSummary.source ?? 'ai').trim() || 'ai',
  }
}

function buildRecentSimuladoSummaryIndex(limit = RECENT_ACTIVITY_LIMIT) {
  return loadSimuladoHistory(limit).map((item, index) => ({
    indice: index + 1,
    data: item.data || '',
    titulo: item.titulo || '',
    area: item.area || '',
    disciplinas: Array.isArray(item.disciplinas) ? item.disciplinas.slice(0, 6) : [],
    total: round(item.total ?? item.quantidade, 0),
    acertos: round(item.acertos, 0),
    percentual: round(item.percentual, 0),
    performance: item.performance || '',
    fonte: item.fonte || 'mista',
    estatisticas: {
      api: round(item.estatisticas?.api, 0),
      ia: round(item.estatisticas?.ia, 0),
      bancoLocal: round(item.estatisticas?.bancoLocal, 0),
      reais: round(item.estatisticas?.reais, 0),
    },
  }))
}

function compactEssayIndex(limit = RECENT_ACTIVITY_LIMIT) {
  return buildRecentEssaySummaryIndex(Math.min(limit, MAX_CLOUD_ESSAY_HISTORY_ENTRIES))
    .map((item) => ({
      ...item,
      tema: trimText(item.tema, 120),
      preview: trimText(item.preview, 120),
      redacaoTrecho: trimText(item.redacaoTrecho, 120),
      competencias: Array.isArray(item.competencias)
        ? item.competencias.slice(0, 5).map((competencia) => ({
            nome: trimText(competencia?.nome, 80),
            nota: round(competencia?.nota, 0),
          }))
        : [],
      pontoForte: trimText(item.pontoForte, 120),
      atencao: trimText(item.atencao, 120),
      principalMelhorar: trimText(item.principalMelhorar, 120),
    }))
}

function buildPerformanceSignature(index) {
  return JSON.stringify({
    r: {
      total: index.redacoes.total,
      recentes: index.redacoes.recentes.map((item) => [item.data, item.tema, item.nota]),
    },
    s: {
      total: index.simulados.total,
      recentes: index.simulados.recentes.map((item) => [item.data, item.area, item.total, item.acertos, item.percentual]),
    },
    p: {
      interacoes: index.professor.interacoes,
      quizzesConcluidos: index.professor.quizzesConcluidos,
      questoesRespondidas: index.professor.questoesRespondidas,
      acertos: index.professor.acertos,
    },
  })
}

export function buildPerformanceSummaryIndex() {
  const essayIndex = compactEssayIndex(RECENT_ACTIVITY_LIMIT)
  const simuladoIndex = buildRecentSimuladoSummaryIndex(RECENT_ACTIVITY_LIMIT)
  const professor = buildProfessorPerformanceIndex()

  const redacaoNotas = essayIndex.map((item) => item.nota).filter((nota) => Number.isFinite(Number(nota)))
  const simuladoPercentuais = simuladoIndex.map((item) => item.percentual).filter((pct) => Number.isFinite(Number(pct)))
  const totalRedacoes = loadEssayHistoryCount()
  const totalSimulados = loadSimuladoHistoryCount()
  const totalProfessorInteractions = round(professor.interacoes, 0)
  const totalAtividades = totalRedacoes + totalSimulados + totalProfessorInteractions

  const index = {
    version: 2,
    generatedAt: new Date().toISOString(),
    redacoes: {
      total: totalRedacoes,
      recentes: essayIndex,
      mediaRecente: average(redacaoNotas),
      melhorRecente: redacaoNotas.length > 0 ? Math.max(...redacaoNotas) : 0,
    },
    simulados: {
      total: totalSimulados,
      recentes: simuladoIndex,
      mediaRecente: average(simuladoPercentuais),
      melhorRecente: simuladoPercentuais.length > 0 ? Math.max(...simuladoPercentuais) : 0,
    },
    professor,
    totalAtividades,
  }

  return {
    ...index,
    dataSignature: buildPerformanceSignature(index),
  }
}

function hasPerformanceActivity(performanceIndex) {
  return round(performanceIndex?.totalAtividades, 0) > 0
}

function buildLocalPerformanceSummary(performanceIndex) {
  const redacoes = performanceIndex.redacoes || { total: 0, recentes: [] }
  const simulados = performanceIndex.simulados || { total: 0, recentes: [] }
  const professor = performanceIndex.professor || {}

  const strengths = uniqueStrings([
    ...redacoes.recentes.map((item) => item.pontoForte),
    ...redacoes.recentes
      .flatMap((item) => Array.isArray(item.competencias) ? item.competencias : [])
      .filter((competencia) => round(competencia?.nota, 0) >= 800)
      .map((competencia) => competencia.nome),
    ...simulados.recentes
      .filter((item) => round(item.percentual, 0) >= 70)
      .map((item) => `bom desempenho em ${item.area || 'simulados'}`),
    round(professor.aproveitamento, 0) >= 70 ? 'bom aproveitamento nos quizzes do Professor' : '',
  ]).slice(0, 3)

  const recurringIssues = uniqueStrings([
    ...redacoes.recentes.map((item) => item.principalMelhorar),
    ...redacoes.recentes.map((item) => item.atencao),
    ...redacoes.recentes
      .flatMap((item) => Array.isArray(item.competencias) ? item.competencias : [])
      .filter((competencia) => round(competencia?.nota, 0) <= 650)
      .map((competencia) => competencia.nome),
    ...simulados.recentes
      .filter((item) => round(item.percentual, 0) < 60)
      .map((item) => `revisar ${item.area || 'conteúdos de simulado'}`),
    professor.questoesRespondidas > 0 && round(professor.aproveitamento, 0) < 60 ? 'reforçar quizzes do Professor' : '',
  ]).slice(0, 3)

  const parts = []
  if (redacoes.total > 0) {
    parts.push(`Redações: média recente ${redacoes.mediaRecente || 0}/1000 e melhor nota ${redacoes.melhorRecente || 0}/1000.`)
  }
  if (simulados.total > 0) {
    parts.push(`Simulados: média recente ${simulados.mediaRecente || 0}% e melhor resultado ${simulados.melhorRecente || 0}%.`)
  }
  if (round(professor.interacoes, 0) > 0) {
    const quizText = round(professor.quizzesConcluidos, 0) > 0
      ? `, com ${professor.quizzesConcluidos} quizzes concluídos e ${professor.aproveitamento || 0}% de aproveitamento`
      : ''
    parts.push(`Professor IA: ${professor.interacoes} interações registradas${quizText}.`)
  }

  const mainFocus = recurringIssues[0] || 'manter constância entre redação, simulados e revisão guiada'

  return {
    resumo: parts.join(' ') || 'A análise local aparece assim que houver atividades salvas.',
    forcas: strengths,
    errosRecorrentes: recurringIssues,
    foco: `Foco sugerido: ${mainFocus}.`,
    geradoEm: new Date().toISOString(),
    totalRedacoes: redacoes.total || 0,
    totalSimulados: simulados.total || 0,
    totalProfessorInteractions: round(professor.interacoes, 0),
    totalAtividades: performanceIndex.totalAtividades || 0,
    generatedDay: todayKey(),
    dataSignature: performanceIndex.dataSignature || '',
    origem: 'local',
  }
}

function shouldGenerateAiSummary(performanceIndex, currentSummary, { force = false } = {}) {
  if (!isPerformanceAiAnalysisEnabled()) return false
  if (!hasPerformanceActivity(performanceIndex)) return false

  const currentGeneratedDay = String(currentSummary?.generatedDay ?? '').trim()
  if (currentSummary?.origem === 'ai' && currentGeneratedDay === todayKey()) return false

  if (!force && currentSummary?.dataSignature && currentSummary.dataSignature === performanceIndex.dataSignature) {
    return false
  }

  return true
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

  const performanceIndex = buildPerformanceSummaryIndex()
  const currentSummary = loadUserSummary()

  if (!hasPerformanceActivity(performanceIndex)) {
    return currentSummary
  }

  const localSummary = buildLocalPerformanceSummary(performanceIndex)
  const canGenerateAi = shouldGenerateAiSummary(performanceIndex, currentSummary, { force })

  if (!canGenerateAi || !canConsumeFreePlan('userSummary')) {
    if (!currentSummary || currentSummary.dataSignature !== performanceIndex.dataSignature) {
      return saveUserSummary(localSummary)
    }
    return currentSummary
  }

  try {
    const responsePreference = loadAiResponsePreferenceText()
    const response = await authFetch(SUMMARY_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify({
        performanceIndex,
        historyIndex: performanceIndex.redacoes.recentes,
        historyCount: performanceIndex.redacoes.total,
        ...(responsePreference ? { responsePreference } : {}),
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || 'Falha ao gerar o resumo do usuário.')
    }

    const summary = await response.json()
    consumeFreePlan('userSummary')
    const saved = saveUserSummary({
      resumo: summary?.resumo || localSummary.resumo,
      forcas: summary?.forcas || localSummary.forcas,
      errosRecorrentes: summary?.errosRecorrentes || localSummary.errosRecorrentes,
      foco: summary?.foco || localSummary.foco,
      geradoEm: summary?.geradoEm || new Date().toISOString(),
      totalRedacoes: performanceIndex.redacoes.total,
      totalSimulados: performanceIndex.simulados.total,
      totalProfessorInteractions: round(performanceIndex.professor.interacoes, 0),
      totalAtividades: performanceIndex.totalAtividades,
      generatedDay: todayKey(),
      dataSignature: performanceIndex.dataSignature,
      origem: summary?.origem || 'ai',
    })

    return saved
  } catch (error) {
    console.error('[userSummary] Falha ao atualizar resumo:', error)
    return saveUserSummary(localSummary)
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
