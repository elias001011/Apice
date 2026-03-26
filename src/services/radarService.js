import {
  canConsumeFreePlan,
  consumeFreePlan,
} from './freePlanUsage.js'
import { loadAiResponsePreferenceText } from './aiResponsePreferences.js'

function normalizeRadarTheme(tema) {
  const tags = Array.isArray(tema?.tags)
    ? tema.tags
        .map((tag) => {
          const label = String(tag?.label ?? '').trim()
          const tipo = String(tag?.tipo ?? 'area-social').trim() || 'area-social'
          return label ? { label, tipo } : null
        })
        .filter(Boolean)
    : []

  return {
    titulo: String(tema?.titulo ?? '').trim(),
    probabilidade: Number.isFinite(Number(tema?.probabilidade)) ? Number(tema.probabilidade) : 0,
    hot: Boolean(tema?.hot),
    tags,
    justificativa: String(tema?.justificativa ?? '').trim(),
  }
}

export async function buscarRadarTemas() {
  if (!canConsumeFreePlan('radarSearch')) {
    throw new Error('Limite do plano free atingido para radar de temas. Tente mais tarde ou troque de plano.')
  }

  const responsePreference = loadAiResponsePreferenceText()
  const response = await fetch('/.netlify/functions/gerar-radar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...(responsePreference ? { responsePreference } : {}),
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || 'Falha ao gerar radar de temas.')
  }

  const data = await response.json()
  const temas = Array.isArray(data?.temas) ? data.temas.map(normalizeRadarTheme).filter((tema) => tema.titulo) : []

  consumeFreePlan('radarSearch')

  return {
    temas,
    atualizadoEm: String(data?.atualizadoEm ?? new Date().toISOString()),
    origem: String(data?.origem ?? 'ai'),
    resumoPesquisa: String(data?.resumoPesquisa ?? data?.search?.resumo ?? '').trim(),
  }
}
