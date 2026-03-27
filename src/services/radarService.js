import {
  buildRadarSearchWindow,
  canSearchRadarThemes,
  getRadarSearchCooldown,
  loadRadarThemeDetail,
  normalizeRadarTheme,
  saveRadarSnapshot,
  saveRadarThemeDetail,
} from './radarState.js'
import {
  canConsumeFreePlan,
  consumeFreePlan,
} from './freePlanUsage.js'
import { loadAiResponsePreferenceText } from './aiResponsePreferences.js'

const RADAR_SEARCH_ENDPOINT = '/.netlify/functions/gerar-radar'
const RADAR_DETAIL_ENDPOINT = '/.netlify/functions/gerar-radar-detalhe'

export const DEFAULT_RADAR_THEMES = [
  {
    titulo: 'Impacto da inteligência artificial no mercado de trabalho brasileiro',
    probabilidade: 87,
    hot: true,
  },
  {
    titulo: 'Saúde mental dos jovens na era das redes sociais',
    probabilidade: 79,
    hot: true,
  },
  {
    titulo: 'Desafios para a preservação das línguas indígenas no Brasil',
    probabilidade: 64,
    hot: false,
  },
  {
    titulo: 'O papel do Estado no combate à desinformação e fake news',
    probabilidade: 58,
    hot: false,
  },
  {
    titulo: 'Crise hídrica e acesso à água potável no semiárido brasileiro',
    probabilidade: 51,
    hot: false,
  },
].map((tema) => normalizeRadarTheme(tema)).filter(Boolean)

function formatDateLabel(value) {
  const date = value ? new Date(value) : null
  if (!date || !Number.isFinite(date.getTime())) return ''
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatRadarCooldownMessage(cooldown) {
  if (!cooldown || cooldown.canSearch) return ''

  const when = cooldown.nextSearchAt ? formatDateLabel(cooldown.nextSearchAt) : ''
  if (when) {
    return `Você já procurou novos temas esta semana. A próxima busca libera em ${when}.`
  }

  return 'Você já procurou novos temas esta semana. Tente novamente em alguns dias.'
}

function normalizeRadarThemesPayload(data) {
  const temas = Array.isArray(data?.temas)
    ? data.temas.map((tema) => normalizeRadarTheme(tema)).filter(Boolean)
    : []

  return {
    temas: temas.length > 0 ? temas : DEFAULT_RADAR_THEMES,
    resumoPesquisa: String(data?.resumoPesquisa ?? data?.search?.resumo ?? '').trim(),
    atualizadoEm: String(data?.atualizadoEm ?? new Date().toISOString()),
    origem: String(data?.origem ?? 'ai').trim() || 'ai',
  }
}

function normalizeRadarDetailPayload(data, theme) {
  const normalizedTheme = normalizeRadarTheme(theme)
  const fallbackTitle = normalizedTheme?.titulo || String(theme?.titulo ?? data?.tema ?? data?.titulo ?? '').trim()

  return {
    ...data,
    id: normalizedTheme?.id || String(data?.id ?? data?.temaId ?? '').trim(),
    temaId: normalizedTheme?.id || String(data?.temaId ?? data?.id ?? '').trim(),
    titulo: String(data?.titulo ?? data?.tema ?? fallbackTitle).trim() || fallbackTitle,
    probabilidade: Number.isFinite(Number(data?.probabilidade))
      ? Number(data.probabilidade)
      : normalizedTheme?.probabilidade || 0,
    searchResumo: String(data?.searchResumo ?? data?.resumoPesquisa ?? '').trim(),
  }
}

export async function buscarRadarTemas() {
  const cooldown = getRadarSearchCooldown()
  if (!cooldown.canSearch) {
    throw new Error(formatRadarCooldownMessage(cooldown))
  }

  if (!canConsumeFreePlan('radarSearch')) {
    throw new Error('Limite do plano free atingido para radar de temas. Tente mais tarde ou troque de plano.')
  }

  const responsePreference = loadAiResponsePreferenceText()
  const response = await fetch(RADAR_SEARCH_ENDPOINT, {
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
  const payload = normalizeRadarThemesPayload(data)
  const searchWindow = buildRadarSearchWindow()

  const savedSnapshot = saveRadarSnapshot({
    temas: payload.temas,
    resumoPesquisa: payload.resumoPesquisa,
    atualizadoEm: payload.atualizadoEm || searchWindow.lastSearchAt,
    origem: payload.origem || 'ai',
    lastSearchAt: searchWindow.lastSearchAt,
    nextSearchAt: searchWindow.nextSearchAt,
    detalhesPorId: {},
  })

  consumeFreePlan('radarSearch')

  return {
    ...(savedSnapshot || payload),
    temas: payload.temas,
    resumoPesquisa: payload.resumoPesquisa,
    atualizadoEm: payload.atualizadoEm || searchWindow.lastSearchAt,
    origem: payload.origem || 'ai',
    lastSearchAt: searchWindow.lastSearchAt,
    nextSearchAt: searchWindow.nextSearchAt,
  }
}

export async function buscarRadarTemaDetalhe(tema) {
  const normalizedTheme = normalizeRadarTheme(tema)
  if (!normalizedTheme) {
    throw new Error('Tema inválido para gerar detalhes.')
  }

  const cachedDetail = loadRadarThemeDetail(normalizedTheme.id)
  if (cachedDetail) {
    return cachedDetail
  }


  const responsePreference = loadAiResponsePreferenceText()
  const response = await fetch(RADAR_DETAIL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tema: normalizedTheme,
      ...(responsePreference ? { responsePreference } : {}),
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || 'Falha ao gerar detalhes do tema.')
  }

  const data = await response.json()
  const savedDetail = saveRadarThemeDetail(normalizeRadarDetailPayload(data, normalizedTheme))

  return savedDetail || normalizeRadarDetailPayload(data, normalizedTheme)
}

export function canSearchRadarThemesNow() {
  return canSearchRadarThemes()
}

export function getRadarSearchCooldownLabel(snapshot) {
  return formatRadarCooldownMessage(getRadarSearchCooldown(snapshot))
}
