/**
 * Serviço de simulados integrado com o banco local e a API oficial enem.dev.
 * Prioriza o banco local de questões reais, depois a API oficial
 * e usa IA só como fallback para completar o que faltar.
 */

import { authFetch } from './authFetch.js'
import { loadAiResponsePreferenceText } from './aiResponsePreferences.js'
import { getDisciplinasByArea } from './enemApiService.js'
import { fetchQuestoesAleatorias as fetchFromEnemApi } from './enemApiService.js'
import { buscarQuestoesAleatorias, popularBancoQuestoes } from './questoesLocalDB.js'

const STORAGE_KEY = 'apice:simulado_progresso:v2'
const MAX_SIMULADO_QUESTIONS = 90
export const MAX_SIMULADO_AI_QUESTIONS = 15

/**
 * Gera simulado combinando banco local, API oficial e IA
 * @param {Object} config - Configuração do simulado
 * @param {string} config.area - Área do conhecimento
 * @param {Array<string>} config.disciplinas - Disciplinas selecionadas
 * @param {number} config.quantidade - Total de questões
 * @param {string} config.fonte - 'api' (somente questões reais), 'ia' (somente IA) ou 'mista' (reais + IA limitada)
 * @returns {Promise<Object>} Simulado gerado
 */
export async function gerarSimulado({ 
  area, 
  disciplinas = [], 
  quantidade = 10,
  fonte = 'mista' // 'api' = só questões reais, 'ia' = só IA, 'mista' = reais + IA
}) {
  const responsePreference = loadAiResponsePreferenceText()
  const disciplinasSelecionadas = normalizeDisciplinas(disciplinas)
  const alertas = []
  
  // Validar entrada
  if (!area) {
    throw new Error('Área do conhecimento é obrigatória.')
  }
  
  if (quantidade < 1 || quantidade > MAX_SIMULADO_QUESTIONS) {
    throw new Error(`Quantidade deve ser entre 1 e ${MAX_SIMULADO_QUESTIONS} questões.`)
  }

  let questoesLocais = []
  let questoesApi = []
  let resultadoIA = { questoes: [] }

  // Tenta primeiro o banco local de questões reais.
  if (fonte !== 'ia') {
    try {
      questoesLocais = await buscarQuestoesEmFonte({
        fetcher: buscarQuestoesAleatorias,
        area,
        disciplinas: disciplinasSelecionadas,
        quantidade,
        origem: 'banco local',
      })

      const quantidadeRestante = Math.max(quantidade - questoesLocais.length, 0)

      if (quantidadeRestante > 0) {
        questoesApi = await buscarQuestoesEmFonte({
        fetcher: fetchFromEnemApi,
        area,
        disciplinas: disciplinasSelecionadas,
        quantidade: quantidadeRestante,
        origem: 'API oficial',
      })
      }

      // Salva no banco local para uso futuro
      if (questoesApi.length > 0) {
        await popularBancoQuestoes(questoesApi)
      }
      
      console.log(`[simuladoService] Banco local: ${questoesLocais.length} | API oficial: ${questoesApi.length}`)
    } catch (error) {
      console.warn('[simuladoService] Falha ao buscar questões reais:', error.message)
    }
  }

  // Se precisa de mais questões, gera com IA.
  const quantidadeFaltante = quantidade - questoesLocais.length - questoesApi.length
  
  if ((fonte === 'ia' || fonte === 'mista') && quantidadeFaltante > 0) {
    try {
      const quantidadeIA = Math.min(quantidadeFaltante, MAX_SIMULADO_AI_QUESTIONS)
      if (quantidadeFaltante > MAX_SIMULADO_AI_QUESTIONS) {
        alertas.push(`A IA foi limitada a ${MAX_SIMULADO_AI_QUESTIONS} questões para manter o simulado seguro.`)
      }

      resultadoIA = await gerarQuestoesIA({
        area,
        disciplinas: disciplinasSelecionadas,
        quantidade: quantidadeIA,
        quantidadeSolicitada: quantidadeFaltante,
        responsePreference,
      })

      if (resultadoIA?.alerta && String(resultadoIA.alerta).trim()) {
        alertas.push(String(resultadoIA.alerta).trim())
      }
      
      console.log(`[simuladoService] ${resultadoIA.questoes.length} questões geradas por IA`)
    } catch (error) {
      console.error('[simuladoService] IA falhou:', error.message)
    }
  }

  const questoesIA = Array.isArray(resultadoIA.questoes) ? resultadoIA.questoes : []

  // Combina e embaralha questões
  const todasQuestoes = dedupeQuestoes([
    ...questoesLocais,
    ...questoesApi,
    ...questoesIA,
  ])
  
  if (todasQuestoes.length === 0) {
    throw new Error('Não foi possível gerar questões. Verifique sua conexão e tente novamente.')
  }

  // Embaralha e seleciona quantidade exata
  const questoesSelecionadas = shuffleArray(todasQuestoes).slice(0, quantidade)
  if (questoesSelecionadas.length < quantidade) {
    alertas.push(
      `O simulado ficou com ${questoesSelecionadas.length} questão(ões) porque a IA foi limitada e o banco real não fechou o total pedido.`,
    )
  }

  return {
    area,
    disciplinas: disciplinasSelecionadas,
    fonte,
    quantidade: questoesSelecionadas.length,
    quantidadeSolicitada: quantidade,
    questoes: questoesSelecionadas,
    geradoEm: new Date().toISOString(),
    alerta: alertas.join(' '),
    limiteIAAplicado: alertas.length > 0,
    quantidadeMaximaIA: MAX_SIMULADO_AI_QUESTIONS,
    estatisticas: {
      bancoLocal: questoesLocais.length,
      reais: questoesLocais.length + questoesApi.length,
      ia: questoesIA.length,
    },
  }
}

/**
 * Gera questões usando IA (fallback ou fonte principal)
 * @param {Object} config - Configuração
 * @returns {Promise<Array>} Questões geradas
 */
async function gerarQuestoesIA({ area, disciplinas, quantidade, responsePreference, quantidadeSolicitada }) {
  const res = await authFetch('/.netlify/functions/gerar-simulado', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      area,
      disciplinas,
      quantidade,
      ...(Number.isFinite(Number(quantidadeSolicitada)) ? { quantidadeSolicitada } : {}),
      ...(responsePreference ? { responsePreference } : {}),
    }),
  })

  if (!res.ok) {
    let errorDetail = ''
    try {
      const errorData = await res.json()
      errorDetail = errorData.error || errorData.detail || JSON.stringify(errorData)
    } catch {
      errorDetail = res.statusText || `HTTP ${res.status}`
    }
    throw new Error(errorDetail || 'Falha ao gerar questões por IA.')
  }

  const data = await res.json()
  
  if (!data?.questoes || !Array.isArray(data.questoes)) {
    throw new Error('Resposta inválida do servidor.')
  }

  return data
}

function normalizeDisciplinas(disciplinas = []) {
  return Array.from(
    new Set(
      Array.isArray(disciplinas)
        ? disciplinas.map((disciplina) => String(disciplina ?? '').trim()).filter(Boolean)
        : [],
    ),
  )
}

function dedupeQuestoes(questoes = []) {
  const seen = new Set()
  const out = []

  for (const questao of Array.isArray(questoes) ? questoes : []) {
    if (!questao || typeof questao !== 'object') continue

    const id = String(
      questao.id
      ?? questao._id
      ?? questao.questionId
      ?? questao.externalId
      ?? '',
    ).trim() || `${String(questao.area ?? '')}:${String(questao.disciplina ?? '')}:${String(questao.enunciado ?? '')}:${String(questao.textoBase ?? '')}`

    if (seen.has(id)) continue
    seen.add(id)
    out.push(questao)
  }

  return out
}

async function buscarQuestoesEmFonte({ fetcher, area, disciplinas, quantidade, origem }) {
  if (quantidade <= 0) return []

  const disciplinaLista = Array.isArray(disciplinas) ? disciplinas.filter(Boolean) : []
  const quantidadePorDisciplina = Math.max(1, Math.ceil(quantidade / Math.max(disciplinaLista.length, 1)))
  const isOfficialApiFetcher = fetcher === fetchFromEnemApi
  const isLanguageDiscipline = (value) => {
    const normalized = String(value ?? '').trim().toLowerCase()
    return normalized === 'ingles' || normalized === 'espanhol'
  }

  const buscar = async (disciplina, alvo = quantidadePorDisciplina) => {
    try {
      return await fetcher({
        area,
        disciplina,
        quantidade: Math.max(1, alvo || quantidadePorDisciplina),
      })
    } catch (error) {
      const nome = disciplina || area || origem
      console.warn(`[simuladoService] Falha ao buscar ${nome} em ${origem}:`, error.message)
      return []
    }
  }

  if (isOfficialApiFetcher) {
    const resultados = []
    const disciplinasIdioma = disciplinaLista.filter(isLanguageDiscipline)

    for (const disciplina of disciplinasIdioma) {
      const restantes = Math.max(quantidade - dedupeQuestoes(resultados).length, 0)
      if (restantes <= 0) break

      const quota = Math.max(1, Math.min(quantidadePorDisciplina, restantes))
      const batch = await buscar(disciplina, quota)
      resultados.push(...batch)
    }

    const restantes = Math.max(quantidade - dedupeQuestoes(resultados).length, 0)
    if (restantes > 0) {
      const batch = await buscar('', restantes)
      resultados.push(...batch)
    }

    return dedupeQuestoes(resultados).slice(0, quantidade)
  }

  if (disciplinaLista.length > 0) {
    const resultados = []
    for (const disciplina of disciplinaLista) {
      const restantes = Math.max(quantidade - dedupeQuestoes(resultados).length, 0)
      if (restantes <= 0) break

      const quota = Math.max(1, Math.min(quantidadePorDisciplina, restantes))
      const batch = await buscar(disciplina, quota)
      resultados.push(...batch)
    }
    return dedupeQuestoes(resultados).slice(0, quantidade)
  }

  const resultado = await buscar('', quantidade)
  return dedupeQuestoes(resultado).slice(0, quantidade)
}

/**
 * Salva progresso do simulado
 * @param {Object} progresso - Dados do progresso
 */
export function salvarProgressoSimulado(progresso) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...progresso,
      savedAt: new Date().toISOString()
    }))
  } catch (error) {
    console.warn('[simuladoService] Falha ao salvar progresso:', error)
  }
}

/**
 * Carrega progresso salvo
 * @returns {Object|null} Progresso ou null
 */
export function carregarProgressoSimulado() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return null
    
    const parsed = JSON.parse(data)
    
    // Verifica se não é muito antigo (max 2 horas)
    const savedAt = new Date(parsed.savedAt).getTime()
    const now = Date.now()
    const twoHours = 2 * 60 * 60 * 1000
    
    if (now - savedAt > twoHours) {
      limparProgressoSimulado()
      return null
    }
    
    return parsed
  } catch (error) {
    console.warn('[simuladoService] Falha ao carregar progresso:', error)
    limparProgressoSimulado()
    return null
  }
}

/**
 * Limpa progresso salvo
 */
export function limparProgressoSimulado() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.warn('[simuladoService] Falha ao limpar progresso:', error)
  }
}

/**
 * Retorna disciplinas disponíveis para uma área
 * @param {string} area - Área do conhecimento
 * @returns {Array} Disciplinas
 */
export function getDisciplinas(area) {
  return getDisciplinasByArea(area)
}

/**
 * Embaralha array
 * @param {Array} array - Array para embaralhar
 * @returns {Array} Array embaralhado
 */
function shuffleArray(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
