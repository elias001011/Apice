import {
  canConsumeFreePlan,
  consumeFreePlan,
} from './freePlanUsage.js'
import { loadAiResponsePreferenceText } from './aiResponsePreferences.js'
import {
  buildRecentEssayContext,
  compactEssayHistoryEntry,
  loadEssayHistoryCount,
  MAX_ESSAY_HISTORY_ENTRIES,
  normalizeEssayFeedbackScore,
  saveEssayHistorySnapshot,
} from './essayInsights.js'
import { refreshUserSummaryFromHistory } from './userSummary.js'
import { checkConquistasRedacao } from './conquistas.js'

function createQuotaError(message) {
  const error = new Error(message)
  error.code = 'quota_blocked'
  return error
}

export async function gerarTemaDinamico({ retryCount = 1 } = {}) {
  // O frontend chama só o endpoint Netlify.
  // Toda decisão de search/fallback/provider fica no backend.
  if (!canConsumeFreePlan('themeDynamic')) {
    throw createQuotaError('Limite do plano free atingido para tema dinâmico. Tente mais tarde ou troque de plano.')
  }

  let lastError = null

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    try {
      const responsePreference = loadAiResponsePreferenceText()
      const res = await fetch('/.netlify/functions/gerar-tema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(responsePreference ? { responsePreference } : {}),
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Falha ao gerar tema dinâmico.')
      }

      const data = await res.json()
      consumeFreePlan('themeDynamic')
      return data
    } catch (error) {
      lastError = error
      if (attempt < retryCount) {
        await new Promise((resolve) => setTimeout(resolve, 500))
        continue
      }
    }
  }

  throw lastError || new Error('Falha ao gerar tema dinâmico.')
}

export async function corrigirRedacao({ redacao, tema, material, isRigido }) {
  // O backend agora monta o prompt de correção e aplica a heurística de cópia.
  // Aqui a tela só envia dados brutos; não existe lógica de IA no cliente.
  if (!canConsumeFreePlan('essayCorrection')) {
    throw createQuotaError('Limite do plano free atingido para correção de redação. Tente mais tarde ou troque de plano.')
  }

  const responsePreference = loadAiResponsePreferenceText()
  const res = await fetch('/.netlify/functions/corrigir-redacao', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      redacao,
      tema,
      material,
      isRigido,
      ...(responsePreference ? { responsePreference } : {}),
    }),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Erro na comunicação com a IA.')
  }

  const data = await res.json()
  const normalized = normalizeEssayFeedbackScore(data)
  consumeFreePlan('essayCorrection')
  return normalized || data
}

export async function chamarIAEspecifica({ provider, systemPrompt, userMessages = [], modelVariant = 'primary', modelOverride = '' }) {
  // Helper pronto para a próxima etapa: chamar um provider/modelo específico sem search.
  // Hoje ele não é usado pela tela principal, mas já fica disponível para um painel avançado.
  if (!canConsumeFreePlan('directModelCall')) {
    throw createQuotaError('Limite do plano free atingido para chamada direta de IA.')
  }

  const responsePreference = loadAiResponsePreferenceText()
  const res = await fetch('/.netlify/functions/chamar-ia', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider,
      systemPrompt,
      userMessages,
      modelVariant,
      modelOverride,
      ...(responsePreference ? { responsePreference } : {}),
    }),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Erro ao chamar IA específica.')
  }

  const data = await res.json()
  consumeFreePlan('directModelCall')
  return data
}

export function salvarNoHistorico(resultadoJSON, temaStr, redacao = '') {
  // Histórico local para recuperar correções antigas sem depender de backend.
  try {
    const historico = JSON.parse(localStorage.getItem('apice:historico') || '[]')
    const normalizedResult = normalizeEssayFeedbackScore(resultadoJSON) || resultadoJSON

    const novoItem = compactEssayHistoryEntry({
      id: Date.now(),
      data: new Date().toISOString(),
      tema: temaStr || 'Tema livre',
      preview: (temaStr || 'Tema livre').substring(0, 60) + '...',
      nota: normalizedResult?.notaTotal ?? resultadoJSON.notaTotal,
      feedback: normalizedResult,
      redacao: typeof redacao === 'string' ? redacao : '',
    })

    historico.unshift(novoItem)
    if (historico.length > MAX_ESSAY_HISTORY_ENTRIES) historico.length = MAX_ESSAY_HISTORY_ENTRIES
    const totalEssays = loadEssayHistoryCount() + 1
    saveEssayHistorySnapshot(historico, totalEssays)
    void refreshUserSummaryFromHistory()

    // Verificar conquistas após salvar
    checkConquistasRedacao({ totalEssays, nota: normalizedResult?.notaTotal || 0 })

    return novoItem
  } catch (err) {
    console.error('Erro ao salvar histórico', err)
    return null
  }
}

export function buildContextoParaIADireta({ prompt, historicoLimit = 3 } = {}) {
  // Esse helper monta exatamente o pacote que você descreveu:
  // contexto do prompt + histórico recente das últimas redações.
  return [
    {
      role: 'user',
      content: [
        String(prompt ?? '').trim() || 'Sem contexto adicional.',
        '',
        'Histórico recente do usuário:',
        buildRecentEssayContext(historicoLimit),
      ].join('\n'),
    },
  ]
}
