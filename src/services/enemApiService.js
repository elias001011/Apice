/**
 * Serviço de integração com ENEM API (enem.dev)
 * API RESTful pública com questões reais do ENEM
 * Repositório: yunger7/enem-api
 */

const ENEM_API_BASE = 'https://api.enem.dev'

// Mapeamento de áreas do conhecimento para filtros da API
const AREA_MAP = {
  'Linguagens': {
    area: 'linguagens',
    disciplinas: ['portugues', 'literatura', 'artes', 'educacao-fisica', 'ingles', 'espanhol'],
    label: 'Linguagens e Códigos',
  },
  'Humanas': {
    area: 'humanas',
    disciplinas: ['historia', 'geografia', 'filosofia', 'sociologia'],
    label: 'Ciências Humanas',
  },
  'Natureza': {
    area: 'natureza',
    disciplinas: ['biologia', 'quimica', 'fisica'],
    label: 'Ciências da Natureza',
  },
  'Matematica': {
    area: 'matematica',
    disciplinas: ['matematica'],
    label: 'Matemática',
  },
}

// Cache local para questões (evita chamadas repetidas)
const CACHE_KEY = 'apice:enem-api:cache:v1'
const CACHE_TTL = 1000 * 60 * 60 // 1 hora

function getCache() {
  try {
    const data = localStorage.getItem(CACHE_KEY)
    if (!data) return {}
    const parsed = JSON.parse(data)
    
    // Remove entradas expiradas
    const now = Date.now()
    const cleaned = {}
    Object.keys(parsed).forEach(key => {
      if (now - parsed[key].timestamp < CACHE_TTL) {
        cleaned[key] = parsed[key]
      }
    })
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(cleaned))
    return cleaned
  } catch {
    return {}
  }
}

function setCache(key, data) {
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
  if (!cache[key]) return null
  
  const now = Date.now()
  if (now - cache[key].timestamp > CACHE_TTL) {
    delete cache[key]
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
    return null
  }
  
  return cache[key].data
}

/**
 * Busca questões da ENEM API com filtros opcionais
 * @param {Object} options
 * @param {string} options.area - Área do conhecimento
 * @param {number} options.ano - Ano da prova
 * @param {number} options.limit - Quantidade máxima de questões
 * @param {string} options.disciplina - Disciplina específica
 * @returns {Promise<Array>} Array de questões
 */
export async function fetchQuestoes({ area, ano, limit = 50, disciplina } = {}) {
  const cacheKey = `questoes:${area}:${ano}:${limit}:${disciplina || 'all'}`
  const cached = getFromCache(cacheKey)
  
  if (cached) {
    console.log('[enemApiService] Usando cache para:', cacheKey)
    return cached
  }

  try {
    const params = new URLSearchParams()
    
    if (area) params.set('area', area)
    if (ano) params.set('ano', String(ano))
    if (limit) params.set('limit', String(limit))
    if (disciplina) params.set('disciplina', disciplina)

    const url = `${ENEM_API_BASE}/questoes?${params.toString()}`
    console.log('[enemApiService] Fetching:', url)

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`ENEM API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    // A API pode retornar { questoes: [...] } ou array direto
    const questoes = Array.isArray(data) ? data : data.questoes || data.data || []
    
    setCache(cacheKey, questoes)
    return questoes
  } catch (error) {
    console.error('[enemApiService] Erro ao buscar questões:', error)
    throw error
  }
}

/**
 * Busca questão por ID específico
 * @param {string} id - ID da questão
 * @returns {Promise<Object>} Questão
 */
export async function fetchQuestaoById(id) {
  const cacheKey = `questao:${id}`
  const cached = getFromCache(cacheKey)
  
  if (cached) return cached

  try {
    const response = await fetch(`${ENEM_API_BASE}/questoes/${id}`)
    
    if (!response.ok) {
      throw new Error(`ENEM API error: ${response.status}`)
    }

    const data = await response.json()
    setCache(cacheKey, data)
    return data
  } catch (error) {
    console.error('[enemApiService] Erro ao buscar questão:', error)
    throw error
  }
}

/**
 * Busca questões aleatórias com base em filtros
 * @param {Object} options
 * @param {string} options.area - Área do conhecimento
 * @param {number} options.quantidade - Quantidade de questões
 * @param {string} options.disciplina - Disciplina específica
 * @returns {Promise<Array>} Array de questões aleatórias
 */
export async function fetchQuestoesAleatorias({ area, quantidade = 5, disciplina } = {}) {
  const areaConfig = AREA_MAP[area]
  const disciplinas = disciplina 
    ? [disciplina]
    : areaConfig?.disciplinas || []

  // Tenta buscar da API primeiro
  try {
    let todasQuestoes = []
    
    if (disciplinas.length > 0) {
      // Busca de cada disciplina
      const promises = disciplinas.map(async (disc) => {
        try {
          return await fetchQuestoes({
            area: areaConfig?.area,
            limit: Math.ceil(quantidade / disciplinas.length) + 2,
            disciplina: disc,
          })
        } catch {
          return []
        }
      })
      
      const resultados = await Promise.all(promises)
      todasQuestoes = resultados.flat()
    } else {
      todasQuestoes = await fetchQuestoes({
        area: areaConfig?.area,
        limit: quantidade + 5,
      })
    }

    if (todasQuestoes.length === 0) {
      throw new Error('Nenhuma questão encontrada')
    }

    // Embaralha e seleciona quantidade necessária
    const embaralhadas = shuffleArray(todasQuestoes)
    return embaralhadas.slice(0, quantidade)
  } catch (error) {
    console.warn('[enemApiService] Falha na API, tentando cache:', error.message)
    
    // Fallback: tenta buscar do cache
    const todasQuestoes = Object.values(getCache())
      .filter(entry => entry.data)
      .flatMap(entry => Array.isArray(entry.data) ? entry.data : [entry.data])
      .filter(q => !areaConfig || q.area === areaConfig.area)

    if (todasQuestoes.length >= quantidade) {
      return shuffleArray(todasQuestoes).slice(0, quantidade)
    }

    throw new Error('Não foi possível buscar questões. Tente novamente.')
  }
}

/**
 * Lista todos os anos disponíveis
 * @returns {Promise<number[]>} Array de anos
 */
export async function fetchAnosDisponiveis() {
  const cacheKey = 'anos-disponiveis'
  const cached = getFromCache(cacheKey)
  
  if (cached) return cached

  try {
    const response = await fetch(`${ENEM_API_BASE}/anos`)
    
    if (!response.ok) {
      // Fallback para anos conhecidos
      return [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015]
    }

    const data = await response.json()
    const anos = Array.isArray(data) ? data : data.anos || []
    
    setCache(cacheKey, anos)
    return anos
  } catch {
    return [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015]
  }
}

/**
 * Lista todas as disciplinas de uma área
 * @param {string} area - Área do conhecimento
 * @returns {Array} Array de disciplinas
 */
export function getDisciplinasByArea(area) {
  const config = AREA_MAP[area]
  if (!config) return []
  
  return config.disciplinas.map(disc => ({
    id: disc,
    label: formatDisciplinaLabel(disc),
    area: config.area,
  }))
}

/**
 * Lista todas as áreas disponíveis
 * @returns {Array} Array de áreas
 */
export function getAreasDisponiveis() {
  return Object.entries(AREA_MAP).map(([key, config]) => ({
    id: key,
    label: config.label,
    area: config.area,
    disciplinas: config.disciplinas,
  }))
}

// Helpers

function shuffleArray(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function formatDisciplinaLabel(disciplina) {
  const labels = {
    'portugues': 'Português',
    'literatura': 'Literatura',
    'artes': 'Artes',
    'educacao-fisica': 'Educação Física',
    'ingles': 'Inglês',
    'espanhol': 'Espanhol',
    'historia': 'História',
    'geografia': 'Geografia',
    'filosofia': 'Filosofia',
    'sociologia': 'Sociologia',
    'biologia': 'Biologia',
    'quimica': 'Química',
    'fisica': 'Física',
    'matematica': 'Matemática',
  }
  return labels[disciplina] || disciplina
}
