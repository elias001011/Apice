/**
 * Serviço de integração com a API oficial do ENEM (enem.dev)
 * Usa o endpoint v1 com provas reais e cache local para reduzir chamadas.
 */

const ENEM_API_BASE = 'https://api.enem.dev/v1'

const CACHE_KEY = 'apice:enem-api:cache:v2'
const CACHE_TTL = 1000 * 60 * 60 // 1 hora
const DEFAULT_EXAM_YEARS = [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015]

const AREA_MAP = {
  Linguagens: {
    apiDiscipline: 'linguagens',
    label: 'Linguagens e Códigos',
    disciplines: ['portugues', 'literatura', 'artes', 'educacao-fisica', 'ingles', 'espanhol'],
  },
  Humanas: {
    apiDiscipline: 'ciencias-humanas',
    label: 'Ciências Humanas',
    disciplines: ['historia', 'geografia', 'filosofia', 'sociologia'],
  },
  Natureza: {
    apiDiscipline: 'ciencias-natureza',
    label: 'Ciências da Natureza',
    disciplines: ['biologia', 'quimica', 'fisica'],
  },
  Matematica: {
    apiDiscipline: 'matematica',
    label: 'Matemática',
    disciplines: ['matematica'],
  },
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function getCache() {
  if (!canUseStorage()) return {}

  try {
    const data = localStorage.getItem(CACHE_KEY)
    if (!data) return {}

    const parsed = JSON.parse(data)
    const now = Date.now()
    const cleaned = {}

    Object.entries(parsed || {}).forEach(([key, entry]) => {
      if (!entry || typeof entry !== 'object') return
      if (now - Number(entry.timestamp || 0) < CACHE_TTL) {
        cleaned[key] = entry
      }
    })

    localStorage.setItem(CACHE_KEY, JSON.stringify(cleaned))
    return cleaned
  } catch {
    return {}
  }
}

function setCache(key, data) {
  if (!canUseStorage()) return

  try {
    const cache = getCache()
    cache[key] = {
      data,
      timestamp: Date.now(),
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch (error) {
    console.warn('[enemApiService] Falha ao salvar cache:', error)
  }
}

function getFromCache(key) {
  const cache = getCache()
  const entry = cache[key]
  if (!entry) return null

  if (Date.now() - Number(entry.timestamp || 0) > CACHE_TTL) {
    delete cache[key]
    if (canUseStorage()) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
    }
    return null
  }

  return entry.data
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function shuffleArray(array) {
  const arr = [...(Array.isArray(array) ? array : [])]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function uniqueQuestions(questoes = []) {
  const seen = new Set()
  const out = []

  for (const questao of Array.isArray(questoes) ? questoes : []) {
    if (!questao || typeof questao !== 'object') continue

    const id = String(
      questao.id
      ?? questao.externalId
      ?? questao.questionId
      ?? questao.index
      ?? '',
    ).trim()

    const key = id || `${String(questao.area ?? '')}:${String(questao.disciplina ?? '')}:${String(questao.enunciado ?? '')}`
    if (!key || seen.has(key)) continue

    seen.add(key)
    out.push(questao)
  }

  return out
}

function formatDisciplinaLabel(disciplina) {
  const labels = {
    linguagens: 'Linguagens',
    'ciencias-humanas': 'Ciências Humanas',
    'ciencias-natureza': 'Ciências da Natureza',
    matematica: 'Matemática',
    portugues: 'Português',
    literatura: 'Literatura',
    artes: 'Artes',
    'educacao-fisica': 'Educação Física',
    ingles: 'Inglês',
    espanhol: 'Espanhol',
    historia: 'História',
    geografia: 'Geografia',
    filosofia: 'Filosofia',
    sociologia: 'Sociologia',
    biologia: 'Biologia',
    quimica: 'Química',
    fisica: 'Física',
  }

  return labels[String(disciplina ?? '').trim()] || String(disciplina ?? '').trim()
}

function resolveAreaConfig(area) {
  return AREA_MAP[area] || null
}

function inferAreaFromApiDiscipline(discipline) {
  const normalized = normalizeText(discipline)

  if (normalized === 'linguagens') return 'Linguagens'
  if (normalized === 'ciencias-humanas') return 'Humanas'
  if (normalized === 'ciencias-natureza') return 'Natureza'
  if (normalized === 'matematica') return 'Matematica'

  return ''
}

function resolveApiFilters(area, disciplina) {
  const areaConfig = resolveAreaConfig(area)
  const requestedDisciplina = String(disciplina ?? '').trim()

  if (!areaConfig) {
    return {
      areaConfig: null,
      apiDiscipline: '',
      requestedDisciplina,
      language: '',
    }
  }

  if (area === 'Linguagens' && ['ingles', 'espanhol'].includes(normalizeText(requestedDisciplina))) {
    return {
      areaConfig,
      apiDiscipline: areaConfig.apiDiscipline,
      requestedDisciplina,
      language: requestedDisciplina,
    }
  }

  return {
    areaConfig,
    apiDiscipline: areaConfig.apiDiscipline,
    requestedDisciplina,
    language: '',
  }
}

function buildRealQuestionExplanation(question, correctAlternative, correctText) {
  const pieces = []
  const alternativeText = String(correctText ?? '').trim()

  if (correctAlternative) {
    pieces.push(`A alternativa correta é ${correctAlternative}${alternativeText ? ` (${alternativeText})` : ''}.`)
  }

  if (question?.alternativesIntroduction) {
    pieces.push('O comando da questão orienta a leitura do texto-base e das alternativas.')
  }

  if (question?.context) {
    pieces.push('A resposta se apoia no contexto apresentado na prova original.')
  }

  if (pieces.length === 0) {
    pieces.push('Questão original do ENEM com alternativa correta definida pela prova.')
  }

  return pieces.join(' ')
}

function buildAlternativesMap(alternatives = []) {
  const map = {}

  for (const alternative of Array.isArray(alternatives) ? alternatives : []) {
    const letter = String(alternative?.letter ?? '').trim().toUpperCase()
    const text = String(alternative?.text ?? '').trim()
    if (!letter || !text) continue
    map[letter] = text
  }

  return map
}

function isNormalizedQuestion(question) {
  return isPlainObject(question)
    && isPlainObject(question.alternativas)
    && Boolean(String(question.correta ?? '').trim())
    && Boolean(String(question.enunciado ?? '').trim())
}

function normalizeApiQuestion(question, { area = '', disciplina = '', year = null } = {}) {
  if (!question || typeof question !== 'object') return null
  if (!isNormalizedQuestion(question)) {
    const looksLikeQuestion = Array.isArray(question.alternatives)
      || Boolean(question.correctAlternative || question.correta)

    if (!looksLikeQuestion) {
      return null
    }
  }

  if (isNormalizedQuestion(question)) {
    return {
      ...question,
      area: String(question.area ?? area ?? inferAreaFromApiDiscipline(question.discipline) ?? '').trim(),
      disciplina: String(question.disciplina ?? disciplina ?? question.language ?? question.discipline ?? '').trim(),
      ano: Number.isFinite(Number(question.ano)) ? Number(question.ano) : (Number.isFinite(Number(year)) ? Number(year) : undefined),
      fonte: String(question.fonte ?? 'ENEM API oficial').trim() || 'ENEM API oficial',
      origem: String(question.origem ?? 'enem-api').trim() || 'enem-api',
    }
  }

  const correctAlternative = String(question.correctAlternative ?? question.correta ?? '').trim().toUpperCase()
  const alternativesArray = Array.isArray(question.alternatives) ? question.alternatives : []
  if (!isNormalizedQuestion(question) && (!correctAlternative || alternativesArray.length === 0)) {
    return null
  }
  const alternativas = buildAlternativesMap(alternativesArray)

  const correctAlternativeText = alternativesArray.find(
    (alternative) => String(alternative?.letter ?? '').trim().toUpperCase() === correctAlternative,
  )?.text || ''

  const resolvedArea = String(area || inferAreaFromApiDiscipline(question.discipline) || '').trim() || 'ENEM'
  const resolvedDiscipline = String(disciplina || question.language || question.discipline || resolvedArea).trim()

  return {
    id: String(question.id || `enem-${year || question.year || 'unknown'}-${question.index || Date.now()}`).trim(),
    externalId: String(question.id || `${question.year || year || 'unknown'}-${question.index || 'question'}-${question.language || question.discipline || ''}`).trim(),
    area: resolvedArea,
    disciplina: resolvedDiscipline || formatDisciplinaLabel(question.discipline || question.language || resolvedArea),
    ano: Number.isFinite(Number(question.year ?? year)) ? Number(question.year ?? year) : undefined,
    textoBase: String(question.context ?? '').trim(),
    enunciado: String(question.alternativesIntroduction ?? question.title ?? '').trim(),
    alternativas,
    correta: correctAlternative,
    explicacao: buildRealQuestionExplanation(question, correctAlternative, correctAlternativeText),
    fonte: 'ENEM API oficial',
    origem: 'enem-api',
    language: String(question.language ?? '').trim(),
    title: String(question.title ?? '').trim(),
  }
}

function normalizeQuestionLike(question, meta = {}) {
  if (!question || typeof question !== 'object') return null
  if (isNormalizedQuestion(question)) {
    return normalizeApiQuestion(question, meta)
  }
  return normalizeApiQuestion(question, meta)
}

function collectCachedQuestions() {
  const cache = getCache()
  const collected = []

  Object.values(cache).forEach((entry) => {
    const data = entry?.data
    const rawQuestions = Array.isArray(data)
      ? data
      : Array.isArray(data?.questions)
        ? data.questions
        : Array.isArray(data?.data)
          ? data.data
          : []

    rawQuestions.forEach((question) => {
      const normalized = normalizeQuestionLike(question, {
        area: inferAreaFromApiDiscipline(question?.discipline),
        disciplina: String(question?.language ?? question?.discipline ?? '').trim(),
        year: question?.year,
      })

      if (normalized) {
        collected.push(normalized)
      }
    })
  })

  return uniqueQuestions(collected)
}

function matchesAreaQuestion(question, { areaConfig, language }) {
  if (!question || typeof question !== 'object') return false
  if (!areaConfig) return true

  const questionDiscipline = normalizeText(question.discipline)
  if (questionDiscipline && questionDiscipline !== normalizeText(areaConfig.apiDiscipline)) {
    return false
  }

  if (language) {
    const questionLanguage = normalizeText(question.language)
    if (questionLanguage && questionLanguage !== normalizeText(language)) {
      return false
    }
  }

  return true
}

async function requestJson(url, options = {}, cacheKey = '') {
  if (cacheKey) {
    const cached = getFromCache(cacheKey)
    if (cached) {
      return cached
    }
  }

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  })

  if (!response.ok) {
    let errorDetail = ''
    try {
      const errorBody = await response.json()
      errorDetail = errorBody?.error?.message || errorBody?.message || JSON.stringify(errorBody)
    } catch {
      errorDetail = ''
    }

    throw new Error(`ENEM API error: ${response.status} ${response.statusText}${errorDetail ? ` - ${errorDetail}` : ''}`)
  }

  const data = await response.json()
  if (cacheKey) {
    setCache(cacheKey, data)
  }
  return data
}

async function fetchExams() {
  const cacheKey = 'enem:v2:exams:list'
  const cached = getFromCache(cacheKey)
  if (cached) return cached

  const data = await requestJson(`${ENEM_API_BASE}/exams`, {}, cacheKey)
  const exams = Array.isArray(data) ? data : data?.exams || []
  setCache(cacheKey, exams)
  return exams
}

async function fetchQuestionsPage(year, { limit = 180, offset = 0, language = '' } = {}) {
  const yearValue = Number(year)
  if (!Number.isFinite(yearValue)) {
    throw new Error('Ano inválido para buscar questões.')
  }

  const params = new URLSearchParams()
  params.set('limit', String(limit))
  if (Number.isFinite(offset) && offset > 0) {
    params.set('offset', String(offset))
  }
  if (language) {
    params.set('language', String(language))
  }

  const cacheKey = `enem:v2:year:${yearValue}:limit:${limit}:offset:${offset}:language:${language || 'all'}`
  const cached = getFromCache(cacheKey)
  if (cached) {
    const questions = Array.isArray(cached) ? cached : cached?.questions || []
    return {
      questions,
      metadata: cached?.metadata || {
        limit,
        offset,
        total: questions.length,
        hasMore: false,
      },
    }
  }

  const data = await requestJson(
    `${ENEM_API_BASE}/exams/${yearValue}/questions?${params.toString()}`,
    {},
    '',
  )

  const questions = Array.isArray(data)
    ? data
    : Array.isArray(data?.questions)
      ? data.questions
      : []

  const payload = {
    questions,
    metadata: data?.metadata || null,
  }

  setCache(cacheKey, payload)
  return payload
}

function buildFallbackYears() {
  return [...DEFAULT_EXAM_YEARS]
}

export async function fetchAnosDisponiveis() {
  const cacheKey = 'enem:v2:exams:years'
  const cached = getFromCache(cacheKey)
  if (cached) return cached

  try {
    const exams = await fetchExams()
    const years = exams
      .map((exam) => Number(exam?.year))
      .filter((year) => Number.isFinite(year) && year > 0)
      .sort((a, b) => b - a)

    const uniqueYears = [...new Set(years)]
    if (uniqueYears.length > 0) {
      setCache(cacheKey, uniqueYears)
      return uniqueYears
    }
  } catch (error) {
    console.warn('[enemApiService] Falha ao listar anos da API:', error.message)
  }

  const fallbackYears = buildFallbackYears()
  setCache(cacheKey, fallbackYears)
  return fallbackYears
}

function resolveYearList(years) {
  const normalized = Array.isArray(years)
    ? years.map((year) => Number(year)).filter((year) => Number.isFinite(year) && year > 0)
    : []

  if (normalized.length > 0) {
    return [...new Set(normalized)].sort((a, b) => b - a)
  }

  return buildFallbackYears()
}

export async function fetchQuestoes({ area, ano, limit = 50, offset = 0, disciplina } = {}) {
  const yearValue = Number(ano)
  if (!Number.isFinite(yearValue)) {
    throw new Error('Ano é obrigatório para buscar questões reais.')
  }

  const { areaConfig, requestedDisciplina, language } = resolveApiFilters(area, disciplina)
  const cacheKey = `enem:v2:questoes:${area || 'all'}:${yearValue}:${limit}:${offset}:${requestedDisciplina || 'all'}:${language || 'all'}`
  const cached = getFromCache(cacheKey)
  if (cached) {
    return Array.isArray(cached) ? cached : []
  }

  const page = await fetchQuestionsPage(yearValue, {
    limit: Math.max(1, Number(limit) || 50),
    offset: Math.max(0, Number(offset) || 0),
    language,
  })

  const filtered = (page.questions || []).filter((question) => matchesAreaQuestion(question, { areaConfig, language }))
  const normalized = filtered
    .map((question) => normalizeApiQuestion(question, {
      area: area || inferAreaFromApiDiscipline(question.discipline) || inferAreaFromApiDiscipline(areaConfig?.apiDiscipline) || '',
      disciplina: requestedDisciplina || question.language || question.discipline || area || '',
      year: yearValue,
    }))
    .filter(Boolean)

  setCache(cacheKey, normalized)
  return normalized
}

export async function fetchQuestaoById(id) {
  const normalizedId = String(id ?? '').trim()
  if (!normalizedId) {
    throw new Error('ID de questão inválido.')
  }

  const cacheKey = `enem:v2:question:${normalizedId}`
  const cached = getFromCache(cacheKey)
  if (cached) return cached

  const cacheQuestions = collectCachedQuestions()
  const fromCache = cacheQuestions.find((question) => String(question.id) === normalizedId || String(question.externalId) === normalizedId)
  if (fromCache) {
    setCache(cacheKey, fromCache)
    return fromCache
  }

  const match = normalizedId.match(/^(\d{4})[-:/](\d+)$/)
  if (!match) {
    throw new Error('Não foi possível identificar ano e índice da questão.')
  }

  const year = Number(match[1])
  const index = Number(match[2])
  const data = await requestJson(`${ENEM_API_BASE}/exams/${year}/questions/${index}`, {}, '')
  const normalized = normalizeApiQuestion(data, {
    area: inferAreaFromApiDiscipline(data?.discipline),
    disciplina: data?.language || data?.discipline || '',
    year,
  })

  if (!normalized) {
    throw new Error('Questão inválida retornada pela API.')
  }

  setCache(cacheKey, normalized)
  return normalized
}

export async function fetchQuestoesAleatorias({ area, quantidade = 5, disciplina } = {}) {
  const areaConfig = resolveAreaConfig(area)
  const requestedQuantidade = Math.max(1, Math.round(Number(quantidade) || 5))
  const years = resolveYearList(await fetchAnosDisponiveis())
  const orderedYears = [...years].sort((a, b) => b - a)

  const collected = []

  for (const year of orderedYears) {
    try {
      const batch = await fetchQuestoes({
        area,
        ano: year,
        limit: 180,
        disciplina,
      })

      collected.push(...batch)

      if (uniqueQuestions(collected).length >= requestedQuantidade * 2) {
        break
      }
    } catch (error) {
      console.warn(`[enemApiService] Falha ao buscar ${area || 'questões'} em ${year}:`, error.message)
    }
  }

  const deduped = uniqueQuestions(collected).filter((question) => {
    if (!areaConfig) return true

    const questionArea = normalizeText(question.area || inferAreaFromApiDiscipline(question.discipline))
    const requestedArea = normalizeText(area)
    if (requestedArea && questionArea && questionArea !== requestedArea) {
      return questionArea === normalizeText(areaConfig.label)
        || questionArea === requestedArea
    }

    return true
  })

  if (deduped.length > 0) {
    return shuffleArray(deduped).slice(0, requestedQuantidade)
  }

  const cacheFallback = collectCachedQuestions().filter((question) => {
    if (!areaConfig) return true

    const questionArea = normalizeText(question.area || inferAreaFromApiDiscipline(question.discipline))
    const requestedArea = normalizeText(area)
    if (requestedArea && questionArea && questionArea !== requestedArea) {
      return questionArea === normalizeText(areaConfig.label)
        || questionArea === requestedArea
    }

    return true
  })

  if (cacheFallback.length > 0) {
    return shuffleArray(cacheFallback).slice(0, requestedQuantidade)
  }

  throw new Error('Nenhuma questão encontrada.')
}

export function getDisciplinasByArea(area) {
  const config = AREA_MAP[area]
  if (!config) return []

  return config.disciplines.map((disciplina) => ({
    id: disciplina,
    label: formatDisciplinaLabel(disciplina),
    area: config.apiDiscipline,
  }))
}

export function getAreasDisponiveis() {
  return Object.entries(AREA_MAP).map(([key, config]) => ({
    id: key,
    label: config.label,
    area: config.apiDiscipline,
    disciplinas: config.disciplines,
  }))
}
