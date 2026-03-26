import {
  canConsumeFreePlan,
  consumeFreePlan,
} from './freePlanUsage.js'
import {
  buildRecentEssayContext,
  compactEssayHistoryEntry,
  loadEssayHistoryCount,
  MAX_ESSAY_HISTORY_ENTRIES,
  saveEssayHistorySnapshot,
} from './essayInsights.js'
import { refreshUserSummaryFromHistory } from './userSummary.js'

export async function gerarTemaDinamico({ retryCount = 1 } = {}) {
  // O frontend chama só o endpoint Netlify.
  // Toda decisão de search/fallback/provider fica no backend.
  if (!canConsumeFreePlan('themeDynamic')) {
    throw new Error('Limite do plano free atingido para tema dinâmico. Tente mais tarde ou troque de plano.')
  }

  let lastError = null

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    try {
      const res = await fetch('/.netlify/functions/gerar-tema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    throw new Error('Limite do plano free atingido para correção de redação. Tente mais tarde ou troque de plano.')
  }

  const res = await fetch('/.netlify/functions/corrigir-redacao', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      redacao,
      tema,
      material,
      isRigido,
    }),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Erro na comunicação com a IA.')
  }

  const data = await res.json()
  consumeFreePlan('essayCorrection')
  return data
}

export async function chamarIAEspecifica({ provider, systemPrompt, userMessages = [], modelVariant = 'primary', modelOverride = '' }) {
  // Helper pronto para a próxima etapa: chamar um provider/modelo específico sem search.
  // Hoje ele não é usado pela tela principal, mas já fica disponível para um painel avançado.
  if (!canConsumeFreePlan('directModelCall')) {
    throw new Error('Limite do plano free atingido para chamada direta de IA.')
  }

  const res = await fetch('/.netlify/functions/chamar-ia', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider,
      systemPrompt,
      userMessages,
      modelVariant,
      modelOverride,
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

    const novoItem = compactEssayHistoryEntry({
      id: Date.now(),
      data: new Date().toISOString(),
      tema: temaStr || 'Tema livre',
      preview: (temaStr || 'Tema livre').substring(0, 60) + '...',
      nota: resultadoJSON.notaTotal,
      feedback: resultadoJSON,
      redacao: typeof redacao === 'string' ? redacao : '',
    })

    historico.unshift(novoItem)
    if (historico.length > MAX_ESSAY_HISTORY_ENTRIES) historico.length = MAX_ESSAY_HISTORY_ENTRIES
    saveEssayHistorySnapshot(historico, loadEssayHistoryCount() + 1)
    void refreshUserSummaryFromHistory()
  } catch (err) {
    console.error('Erro ao salvar histórico', err)
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
