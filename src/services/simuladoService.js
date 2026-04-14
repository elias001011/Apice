import { authFetch } from './authFetch.js'
import { loadAiResponsePreferenceText } from './aiResponsePreferences.js'

const STORAGE_KEY = 'apice:simulado_progresso:v1'

export async function gerarSimulado({ area, quantidade = 5 }) {
  const responsePreference = loadAiResponsePreferenceText()
  
  const res = await authFetch('/.netlify/functions/gerar-simulado', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      area,
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
    throw new Error(errorDetail || 'Falha ao gerar simulado.')
  }

  const data = await res.json()
  
  if (!data?.questoes || !Array.isArray(data.questoes)) {
    throw new Error('Resposta inválida do servidor. Tente novamente.')
  }

  return data
}

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

export function carregarProgressoSimulado() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return null
    
    const parsed = JSON.parse(data)
    
    // Verifica se o progresso não é muito antigo (max 1 hora)
    const savedAt = new Date(parsed.savedAt).getTime()
    const now = Date.now()
    const oneHour = 60 * 60 * 1000
    
    if (now - savedAt > oneHour) {
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

export function limparProgressoSimulado() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.warn('[simuladoService] Falha ao limpar progresso:', error)
  }
}
