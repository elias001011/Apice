/**
 * Serviço de simulados integrado com ENEM API e banco local
 * Combina questões reais da ENEM API com geração por IA
 */

import { authFetch } from './authFetch.js'
import { loadAiResponsePreferenceText } from './aiResponsePreferences.js'
import { fetchQuestoesAleatorias as fetchFromEnemApi, getDisciplinasByArea } from './enemApiService.js'
import { buscarQuestoesAleatorias, popularBancoQuestoes } from './questoesLocalDB.js'

const STORAGE_KEY = 'apice:simulado_progresso:v2'

/**
 * Gera simulado combinando questões reais e IA
 * @param {Object} config - Configuração do simulado
 * @param {string} config.area - Área do conhecimento
 * @param {Array<string>} config.disciplinas - Disciplinas selecionadas
 * @param {number} config.quantidade - Total de questões
 * @param {string} config.fonte - 'api', 'ia' ou 'mista'
 * @returns {Promise<Object>} Simulado gerado
 */
export async function gerarSimulado({ 
  area, 
  disciplinas = [], 
  quantidade = 10,
  fonte = 'mista' // 'api' (ENEM API), 'ia' (IA generativa), 'mista' (ambas)
}) {
  const responsePreference = loadAiResponsePreferenceText()
  
  // Validar entrada
  if (!area) {
    throw new Error('Área do conhecimento é obrigatória.')
  }
  
  if (quantidade < 1 || quantidade > 45) {
    throw new Error('Quantidade deve ser entre 1 e 45 questões.')
  }

  let questoesApi = []
  let questoesIA = []

  // Tenta buscar questões reais da ENEM API
  if (fonte === 'api' || fonte === 'mista') {
    try {
      const quantidadeApi = fonte === 'mista' ? Math.ceil(quantidade * 0.7) : quantidade
      
      if (disciplinas.length > 0) {
        // Busca de cada disciplina selecionada
        const questoesPorDisciplina = Math.ceil(quantidadeApi / disciplinas.length)
        
        const promises = disciplinas.map(async (disc) => {
          try {
            return await fetchFromEnemApi({
              area,
              quantidade: questoesPorDisciplina,
              disciplina: disc,
            })
          } catch (error) {
            console.warn(`[simuladoService] Falha ao buscar ${disc}:`, error.message)
            return []
          }
        })
        
        const resultados = await Promise.all(promises)
        questoesApi = resultados.flat()
      } else {
        questoesApi = await fetchFromEnemApi({
          area,
          quantidade: quantidadeApi,
        })
      }

      // Salva no banco local para uso futuro
      if (questoesApi.length > 0) {
        await popularBancoQuestoes(questoesApi)
      }
      
      console.log(`[simuladoService] ${questoesApi.length} questões reais obtidas da ENEM API`)
    } catch (error) {
      console.warn('[simuladoService] ENEM API falhou:', error.message)
    }
  }

  // Se precisa de mais questões ou fonte é IA, gera com IA
  const quantidadeFaltante = quantidade - questoesApi.length
  
  if ((fonte === 'ia' || fonte === 'mista') && quantidadeFaltante > 0) {
    try {
      questoesIA = await gerarQuestoesIA({
        area,
        disciplinas,
        quantidade: quantidadeFaltante,
        responsePreference,
      })
      
      console.log(`[simuladoService] ${questoesIA.length} questões geradas por IA`)
    } catch (error) {
      console.error('[simuladoService] IA falhou:', error.message)
    }
  }

  // Combina e embaralha questões
  const todasQuestoes = [...questoesApi, ...questoesIA]
  
  if (todasQuestoes.length === 0) {
    throw new Error('Não foi possível gerar questões. Verifique sua conexão e tente novamente.')
  }

  // Embaralha e seleciona quantidade exata
  const questoesSelecionadas = shuffleArray(todasQuestoes).slice(0, quantidade)

  return {
    area,
    disciplinas,
    fonte,
    quantidade: questoesSelecionadas.length,
    questoes: questoesSelecionadas,
    geradoEm: new Date().toISOString(),
    estatisticas: {
      reais: questoesApi.length,
      ia: questoesIA.length,
    },
  }
}

/**
 * Gera questões usando IA (fallback ou fonte principal)
 * @param {Object} config - Configuração
 * @returns {Promise<Array>} Questões geradas
 */
async function gerarQuestoesIA({ area, disciplinas, quantidade, responsePreference }) {
  const res = await authFetch('/.netlify/functions/gerar-simulado', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      area,
      disciplinas,
      quantidade,
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

  return data.questoes
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
