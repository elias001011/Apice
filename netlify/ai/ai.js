import process from 'node:process'
import { buildAiResponsePreferencePrompt } from '../../src/services/aiResponsePreferences.js'
import { clampNumber, normalizeEssayFeedbackScore, roundScore } from '../../src/services/essayInsights.js'
import { getEnemYearLabel } from '../../src/services/examYear.js'
import { normalizeRadarTheme } from '../../src/services/radarState.js'

// Este arquivo é o "cérebro" da IA.
// A regra prática aqui é:
// - o frontend nunca escolhe provedor direto;
// - os endpoints chamam só as funções de alto nível deste arquivo;
// - a ordem e o ligado/desligado de cada API ficam em env vars.
// Isso evita espalhar regra de fallback em várias partes do app.
const PROVIDER_SETTINGS = {
  groq: {
    enabled: envBool('AI_GROQ_ENABLED', true),
    order: envInt('AI_GROQ_ORDER', 10),
  },
  gemini: {
    enabled: envBool('AI_GEMINI_ENABLED', true),
    order: envInt('AI_GEMINI_ORDER', 20),
  },
  openrouter: {
    enabled: envBool('AI_OPENROUTER_ENABLED', true),
    order: envInt('AI_OPENROUTER_ORDER', 30),
  },
  grok: {
    enabled: envBool('AI_GROK_ENABLED', true),
    order: envInt('AI_GROK_ORDER', 40),
  },
  huggingface: {
    enabled: envBool('AI_HUGGINGFACE_ENABLED', true),
    order: envInt('AI_HUGGINGFACE_ORDER', 50),
  },
}

// Modelos default por provider.
// Você pode sobrescrever tudo por env var sem tocar no código.
// A ideia é ter um "primary" e, se quiser, um "secondary" para testes ou mudança futura.
const PROVIDER_MODELS = {
  groq: {
    primary: process.env.AI_GROQ_MODEL_PRIMARY || 'llama-3.3-70b-versatile',
    secondary: process.env.AI_GROQ_MODEL_SECONDARY || 'llama-3.1-8b-instant',
  },
  gemini: {
    primary: process.env.AI_GEMINI_MODEL_PRIMARY || 'gemini-3.1-flash-lite-preview',
    secondary: process.env.AI_GEMINI_MODEL_SECONDARY || '',
  },
  openrouter: {
    primary: process.env.AI_OPENROUTER_MODEL_PRIMARY || 'openrouter/free',
    secondary: process.env.AI_OPENROUTER_MODEL_SECONDARY || '',
  },
  grok: {
    primary: process.env.AI_GROK_MODEL_PRIMARY || 'grok-4-1-fast-non-reasoning',
    secondary: process.env.AI_GROK_MODEL_SECONDARY || 'grok-4-1-fast',
  },
  huggingface: {
    primary: process.env.AI_HF_MODEL_PRIMARY || 'meta-llama/Llama-3.3-70B-Instruct',
    secondary: process.env.AI_HF_MODEL_SECONDARY || 'meta-llama/Meta-Llama-3.1-70B-Instruct',
  },
}

const SEARCH_TIMEOUT_MS = envInt('AI_SEARCH_TIMEOUT_MS', 30000)
const TEXT_TIMEOUT_MS = envInt('AI_TEXT_TIMEOUT_MS', 20000)
const OPENROUTER_SEARCH_MODEL = process.env.AI_OPENROUTER_SEARCH_MODEL || 'openrouter/free'

const SEARCH_QUERY = [
  'Busca factual para um tema de redação estilo ENEM.',
  'Priorize dados recentes, instituições confiáveis e contexto brasileiro.',
  'Prefira fontes oficiais, relatórios institucionais e veículos com boa reputação.',
  'Retorne um pacote com resumo curto, cards objetivos e fontes clicáveis.',
].join(' ')

const SEARCH_SCHEMA = {
  type: 'object',
  properties: {
    resumo: { type: 'string' },
    cards: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          titulo: { type: 'string' },
          texto: { type: 'string' },
          fonte: { type: 'string' },
          url: { type: 'string' },
          trecho: { type: 'string' },
        },
        required: ['titulo', 'texto', 'fonte', 'url'],
      },
    },
    fontes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nome: { type: 'string' },
          url: { type: 'string' },
          trecho: { type: 'string' },
        },
        required: ['nome', 'url'],
      },
    },
  },
  required: ['resumo', 'cards', 'fontes'],
}

const DEFAULT_THEME_SEARCH_QUERY = [
  'Quero um tema atual e socialmente relevante para redação estilo ENEM.',
  'Puxe dados recentes do Brasil sobre educação, tecnologia, saúde mental, trabalho, desigualdade, meio ambiente, cidadania e desinformação.',
  'Busque fatos que ajudem a criar um material de apoio rico, com fontes confiáveis e linguagem adequada para prova.',
].join(' ')

const GROQ_SEARCH_SETTINGS = {
  country: 'brazil',
  exclude_domains: ['wikipedia.org', 'youtube.com', 'tiktok.com', 'facebook.com', 'instagram.com'],
}

function envBool(name, fallback = false) {
  const value = process.env[name]
  if (value == null || value === '') return fallback
  return !['0', 'false', 'no', 'off'].includes(String(value).toLowerCase())
}

function envInt(name, fallback = 0) {
  const value = Number.parseInt(process.env[name] ?? '', 10)
  return Number.isFinite(value) ? value : fallback
}

function nowIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function pickValue(...values) {
  for (const value of values) {
    if (value == null) continue
    if (typeof value === 'string' && !value.trim()) continue
    return value
  }
  return ''
}

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function safeJsonParse(text) {
  if (!text || typeof text !== 'string') return null

  const trimmed = text.trim()
  if (!trimmed) return null

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  const candidate = fencedMatch ? fencedMatch[1].trim() : trimmed

  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  const jsonString = start !== -1 && end !== -1 && end >= start
    ? candidate.slice(start, end + 1)
    : candidate

  try {
    return JSON.parse(jsonString)
  } catch {
    return null
  }
}

function ensureArray(value) {
  return Array.isArray(value) ? value : []
}

function dedupeByUrl(items) {
  const seen = new Set()
  const out = []

  for (const item of ensureArray(items)) {
    const url = String(item?.url ?? '').trim()
    const key = url || `${String(item?.nome ?? item?.title ?? item?.fonte ?? '').trim()}-${String(item?.texto ?? item?.content ?? '').trim()}`
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }

  return out
}

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function normalizeSourceEntry(source) {
  const url = String(source?.url ?? '').trim()
  return {
    nome: String(pickValue(source?.nome, source?.title, source?.fonte, extractDomain(url))).trim(),
    url,
    trecho: String(pickValue(source?.trecho, source?.content, source?.texto, '')).trim(),
    dominio: extractDomain(url),
  }
}

function normalizeCardEntry(card) {
  const url = String(card?.url ?? '').trim()
  return {
    titulo: String(pickValue(card?.titulo, card?.title, 'Fonte')).trim(),
    texto: String(pickValue(card?.texto, card?.fato, card?.content, card?.trecho, '')).trim(),
    fonte: String(pickValue(card?.fonte, card?.source, card?.nome, extractDomain(url))).trim(),
    url,
    trecho: String(pickValue(card?.trecho, card?.content, card?.texto, '')).trim(),
    score: Number.isFinite(Number(card?.score)) ? Number(card.score) : undefined,
  }
}

function normalizeSearchBundle({ query, provider, resumo, cards, fontes }) {
  // O search pode vir de APIs diferentes, então normalizamos tudo para um único formato.
  // Assim a UI sempre renderiza a mesma estrutura, sem precisar saber qual provider respondeu.
  const normalizedCards = dedupeByUrl(ensureArray(cards).map(normalizeCardEntry)).filter(card => card.texto || card.titulo)
  const normalizedSources = dedupeByUrl(ensureArray(fontes).map(normalizeSourceEntry))

  const fallbackSummary = normalizedCards
    .map(card => card.texto)
    .filter(Boolean)
    .slice(0, 3)
    .join(' ')

  return {
    provider,
    query,
    resumo: String(resumo ?? fallbackSummary).trim(),
    cards: normalizedCards,
    fontes: normalizedSources,
    generatedAt: new Date().toISOString(),
  }
}

function flattenSearchContext(searchBundle) {
  if (!searchBundle) return ''

  const lines = []

  if (searchBundle.resumo) {
    lines.push(`Resumo factual: ${searchBundle.resumo}`)
  }

  if (Array.isArray(searchBundle.cards) && searchBundle.cards.length > 0) {
    lines.push('Cards de apoio:')
    searchBundle.cards.forEach((card, index) => {
      lines.push(`${index + 1}. ${card.titulo} - ${card.texto} (Fonte: ${card.fonte}${card.url ? ` | ${card.url}` : ''})`)
    })
  }

  if (Array.isArray(searchBundle.fontes) && searchBundle.fontes.length > 0) {
    lines.push('Fontes:')
    searchBundle.fontes.forEach((source, index) => {
      lines.push(`${index + 1}. ${source.nome} - ${source.url}`)
    })
  }

  return lines.join('\n')
}

function flattenMaterialForPrompt(material) {
  // Converte o material rico da UI em texto simples para o prompt.
  // Isso é importante porque a IA recebe texto, mas a tela recebe cards e links estruturados.
  if (!material) return 'Sem material de apoio adicional.'

  if (typeof material === 'string') {
    return material.trim() || 'Sem material de apoio adicional.'
  }

  if (!isPlainObject(material)) {
    return 'Sem material de apoio adicional.'
  }

  const lines = []

  if (material.titulo) lines.push(`Título: ${material.titulo}`)
  if (material.resumo) lines.push(`Resumo: ${material.resumo}`)

  if (Array.isArray(material.cards) && material.cards.length > 0) {
    lines.push('Cards:')
    material.cards.forEach((card, index) => {
      const source = [card.fonte, card.url].filter(Boolean).join(' | ')
      lines.push(`${index + 1}. ${card.titulo || 'Card'} - ${card.texto || ''}${source ? ` (${source})` : ''}`)
    })
  }

  if (Array.isArray(material.fontes) && material.fontes.length > 0) {
    lines.push('Fontes:')
    material.fontes.forEach((source, index) => {
      lines.push(`${index + 1}. ${source.nome || extractDomain(source.url)} - ${source.url}`)
    })
  }

  return lines.join('\n').trim() || 'Sem material de apoio adicional.'
}

const STOPWORDS_PT = new Set([
  'a', 'o', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'no', 'na', 'nos',
  'nas', 'por', 'para', 'com', 'sem', 'sobre', 'que', 'quem', 'onde', 'quando', 'como', 'porque', 'por que',
  'ao', 'aos', 'à', 'às', 'se', 'sua', 'seu', 'suas', 'seus', 'este', 'esta', 'estes', 'estas', 'isso', 'essa',
  'esse', 'aquilo', 'aquele', 'aquela', 'isto', 'ela', 'ele', 'elas', 'eles', 'mais', 'menos', 'muito', 'muita',
  'muitos', 'muitas', 'ser', 'estar', 'ter', 'haver', 'foi', 'era', 'sao', 'são', 'como', 'tambem', 'também',
  'entre', 'contra', 'até', 'ate', 'já', 'ja', 'nao', 'não', 'sim', 'na', 'no', 'nosso', 'nossa',
])

function tokenize(text) {
  return normalizeText(text)
    .split(/[^a-z0-9]+/g)
    .map(token => token.trim())
    .filter(token => token.length >= 3 && !STOPWORDS_PT.has(token))
}

function buildCopyRiskHint(redacao, material) {
  // Heurística local barata para detectar "cola" do material de apoio.
  // Não substitui a IA, mas ajuda a endurecer a correção antes do modelo avaliar.
  const materialText = flattenMaterialForPrompt(material).replace(/https?:\/\/\S+/g, '')
  if (!materialText.trim()) {
    return {
      riskLevel: 'baixo',
      overlapScore: 0,
      copiedPhrases: [],
      summary: 'Sem material de apoio para comparar.',
    }
  }

  const essayText = normalizeText(redacao)
  const supportTokens = tokenize(materialText)
  const essayTokens = tokenize(redacao)
  const supportTokenSet = new Set(supportTokens)
  const essayTokenSet = new Set(essayTokens)

  let shared = 0
  for (const token of supportTokenSet) {
    if (essayTokenSet.has(token)) shared += 1
  }

  const overlapScore = supportTokenSet.size > 0 ? shared / supportTokenSet.size : 0

  const supportPhrases = []
  const supportWords = normalizeText(materialText)
    .split(/[^a-z0-9]+/g)
    .map(token => token.trim())
    .filter(Boolean)

  for (let i = 0; i < supportWords.length - 3 && supportPhrases.length < 5; i += 1) {
    const phrase = supportWords.slice(i, i + 4).join(' ')
    if (phrase.length < 16) continue
    if (essayText.includes(phrase)) supportPhrases.push(phrase)
  }

  const riskLevel = supportPhrases.length >= 2 || overlapScore >= 0.35
    ? 'alto'
    : overlapScore >= 0.2
      ? 'medio'
      : 'baixo'

  return {
    riskLevel,
    overlapScore: Number(overlapScore.toFixed(2)),
    copiedPhrases: supportPhrases,
    summary: `Risco de cópia estimado como ${riskLevel}.`,
  }
}

function buildSearchSystemPrompt(query) {
  // Prompt de busca: pede fatos verificáveis e já exige uma saída estruturada.
  // Aqui o objetivo não é escrever bonito; é coletar apoio factual para o tema.
  return [
    'Você é um pesquisador factual para material de apoio em redação ENEM.',
    'Use a web para encontrar dados reais, recentes e verificáveis.',
    'Não invente fatos, percentuais ou instituições.',
    'Priorize fontes oficiais, relatórios institucionais e veículos com boa reputação.',
    'Responda somente com JSON válido e siga exatamente este formato:',
    '{',
    '  "resumo": "síntese curta com o ponto central",',
    '  "cards": [',
    '    {',
    '      "titulo": "título curto",',
    '      "texto": "dado objetivo ou leitura do dado",',
    '      "fonte": "nome da fonte",',
    '      "url": "link da fonte",',
    '      "trecho": "trecho curto opcional"',
    '    }',
    '  ],',
    '  "fontes": [',
    '    {',
    '      "nome": "nome da fonte",',
    '      "url": "link",',
    '      "trecho": "trecho curto opcional"',
    '    }',
    '  ]',
    '}',
    '',
    `Tema de busca: ${query}`,
    `Data de execução: ${nowIsoDate()}`,
  ].join('\n')
}

function appendResponsePreference(lines, responsePreference) {
  const preferencePrompt = buildAiResponsePreferencePrompt(responsePreference)
  if (preferencePrompt) {
    lines.push(preferencePrompt)
  }
}

function buildThemeSystemPrompt(searchBundle, responsePreference) {
  // Prompt principal do tema dinâmico.
  // Ele recebe o resultado da busca e transforma isso em tema + material estilo ENEM.
  const lines = [
    'Você é um gerador de temas de redação estilo ENEM.',
    'Crie um tema atual, socialmente relevante e com boa chance de virar proposta de redação.',
    'O material de apoio deve parecer ENEM: curto, factual, organizado em cards e com fontes visíveis.',
    'Não escreva um textão corrido no material.',
    'Use o contexto factual abaixo, mas não copie os trechos.',
    'Responda somente com JSON válido e siga exatamente este formato:',
    '{',
    '  "tema": "tema único e direto",',
    '  "material": {',
    '    "titulo": "título do material",',
    '    "resumo": "síntese curta do contexto",',
    '    "cards": [',
    '      {',
    '        "titulo": "card",',
    '        "texto": "dado objetivo",',
    '        "fonte": "nome da fonte",',
    '        "url": "link da fonte",',
    '        "trecho": "trecho curto opcional"',
    '      }',
    '    ],',
    '    "fontes": [',
    '      {',
    '        "nome": "nome da fonte",',
    '        "url": "link",',
    '        "trecho": "trecho curto opcional"',
    '      }',
    '    ]',
    '  }',
    '}',
    '',
    'Contexto factual pesquisado:',
    flattenSearchContext(searchBundle),
  ]

  appendResponsePreference(lines, responsePreference)
  return lines.join('\n')
}

function buildFallbackThemeSystemPrompt(responsePreference) {
  // Fallback quando o search falha.
  // Esse caminho evita quebrar o corretor mesmo se todas as buscas estiverem indisponíveis.
  const lines = [
    'Você é um gerador de temas de redação estilo ENEM.',
    'Crie um tema atual, socialmente relevante e com material de apoio organizado.',
    'O material deve ser curto, factual e em formato de cards.',
    'Responda somente com JSON válido e siga exatamente este formato:',
    '{',
    '  "tema": "tema único e direto",',
    '  "material": {',
    '    "titulo": "título do material",',
    '    "resumo": "síntese curta do contexto",',
    '    "cards": [',
    '      {',
    '        "titulo": "card",',
    '        "texto": "dado objetivo",',
    '        "fonte": "nome da fonte",',
    '        "url": "link da fonte",',
    '        "trecho": "trecho curto opcional"',
    '      }',
    '    ],',
    '    "fontes": [',
    '      {',
    '        "nome": "nome da fonte",',
    '        "url": "link",',
    '        "trecho": "trecho curto opcional"',
    '      }',
    '    ]',
    '  }',
    '}',
    '',
    `Data de execução: ${nowIsoDate()}`,
  ]

  appendResponsePreference(lines, responsePreference)
  return lines.join('\n')
}

function buildCorrectionSystemPrompt({ tema, material, isRigido, copyHint, responsePreference }) {
  // Prompt da correção.
  // O material de apoio aqui é contexto da prova, não repertório autoral do aluno.
  const modo = isRigido ? 'Rígido (muito criterioso)' : 'Padrão (conservador)'
  const materialTexto = flattenMaterialForPrompt(material)

  const lines = [
    `Modo de correção: ${modo}.`,
    `Tema da redação: ${tema || 'Não informado.'}`,
    '',
    'Regras de correção:',
    '- Corrija conforme a matriz do ENEM.',
    '- Na propriedade "descricao" de cada competência, exiba o MÉRITO DIRETAMENTE e seja MEGA CONCISO (ex: "Apresenta boa coesão, mas falha no uso de crase."). Nunca escreva introduções como "A redação demonstra...". O espaço lá é apertado, use 1 ou 2 frases curtas.',
    '- Compense essa ausência de detalhes escrevendo análises SUPER DENSAS, extensas e ricas nas chaves "pontoForte", "atencao" e "principalMelhorar". Abuse do espaço ali para aprofundar a correção.',
    '- O material de apoio abaixo é apenas contexto de prova. Ele não conta como repertório autoral se o aluno apenas copiar, parafrasear ou repetir seus dados.',
    '- Se houver cópia literal ou quase literal do material, puna fortemente C2, C3 e, se necessário, C5.',
    '- Se a redação fugir totalmente do tema, a nota de todas as competências deve ser 0.',
    '- Se a redação usar o material de apoio sem elaboração própria, não premie como se fosse repertório externo.',
    '- Use a escala ENEM real: cada competência vai de 0 a 200 e a notaTotal vai de 0 a 1000. Nunca responda em escala 0 a 10.',
    '- Seja conservador: 200 em qualquer competência deve ser raro, 180+ só quando o critério estiver praticamente impecável.',
    '- Se houver dúvida entre duas faixas, escolha a mais baixa.',
    '- Não infle nota por texto longo, bonito ou genérico; qualidade real vale mais do que volume.',
    '- Em redações boas, mas comuns, a faixa média é mais realista do que notas muito altas.',
    '- C5 só merece nota alta quando a proposta tiver agente, ação, meio, finalidade e detalhamento claros.',
    '- C2 e C3 devem ser duras com repertório fraco, tese vaga ou argumento genérico.',
    '- Responda somente com JSON válido no formato abaixo.',
    '',
    'Formato de resposta:',
    '{',
    '  "notaTotal": 0,',
    '  "competencias": [',
    '    { "nome": "C1 — Norma culta", "nota": 0, "descricao": "..." },',
    '    { "nome": "C2 — Tema e repertório", "nota": 0, "descricao": "..." },',
    '    { "nome": "C3 — Organização da tese", "nota": 0, "descricao": "..." },',
    '    { "nome": "C4 — Coesão textual", "nota": 0, "descricao": "..." },',
    '    { "nome": "C5 — Proposta de intervenção", "nota": 0, "descricao": "..." }',
    '  ],',
    '  "pontoForte": "...",',
    '  "atencao": "...",',
    '  "principalMelhorar": "...",',
    '  "errosPt": [',
    '    { "errado": "...", "corrigido": "...", "motivo": "..." }',
    '  ]',
    '}',
    '',
    'Material de apoio estruturado:',
    materialTexto,
    '',
    'Heurística local de cópia:',
    `- ${copyHint.summary}`,
    `- Overlap lexical estimado: ${copyHint.overlapScore}`,
    copyHint.copiedPhrases.length > 0
      ? `- Trechos repetidos detectados: ${copyHint.copiedPhrases.join(' | ')}`
      : '- Trechos repetidos detectados: nenhum trecho longo detectado.',
  ]

  appendResponsePreference(lines, responsePreference)
  return lines.join('\n')
}

function dampenEssayCompetenceScore(score) {
  const value = Number(score) || 0

  if (value >= 190) return value - 14
  if (value >= 175) return value - 12
  if (value >= 160) return value - 10
  if (value >= 145) return value - 8
  if (value >= 120) return value - 5
  if (value >= 90) return value - 3
  return value
}

function dampenEssayTotalScore(score) {
  const value = Number(score) || 0

  if (value >= 900) return value - 55
  if (value >= 800) return value - 45
  if (value >= 700) return value - 35
  if (value >= 600) return value - 25
  if (value >= 450) return value - 15
  if (value >= 300) return value - 8
  return value
}

function calibrateEssayFeedbackScore(result) {
  const normalized = normalizeEssayFeedbackScore(result)
  if (!normalized || typeof normalized !== 'object') {
    return result
  }

  const adjustedCompetencias = ensureArray(normalized.competencias).map((competencia) => {
    const adjusted = clampNumber(
      roundScore(dampenEssayCompetenceScore(competencia?.nota)),
      0,
      200,
    )

    return {
      ...competencia,
      nota: adjusted,
    }
  })

  const notaTotal = adjustedCompetencias.length > 0
    ? adjustedCompetencias.reduce((sum, competencia) => sum + (Number(competencia?.nota) || 0), 0)
    : clampNumber(roundScore(dampenEssayTotalScore(normalized.notaTotal)), 0, 1000)

  return {
    ...normalized,
    competencias: adjustedCompetencias,
    notaTotal,
  }
}

function getEnabledProviders(kind) {
  // Lista de providers por tipo de tarefa.
  // `search` e `text` têm listas separadas porque nem todo provider é bom/útil nas duas etapas.
  // A ordenação vem das env vars para você poder mudar prioridade sem mexer no código.
  const providers = kind === 'search'
    ? [
        {
          id: 'groq',
          name: 'GROQ',
          order: PROVIDER_SETTINGS.groq.order,
          enabled: PROVIDER_SETTINGS.groq.enabled,
          run: runGroqSearch,
        },
        {
          id: 'gemini',
          name: 'GEMINI',
          order: PROVIDER_SETTINGS.gemini.order,
          enabled: PROVIDER_SETTINGS.gemini.enabled,
          run: runGeminiSearch,
        },
        {
          id: 'openrouter',
          name: 'OpenRouter',
          order: PROVIDER_SETTINGS.openrouter.order,
          enabled: PROVIDER_SETTINGS.openrouter.enabled,
          run: runOpenRouterSearch,
        },
      ]
    : [
        {
          id: 'groq',
          name: 'GROQ',
          order: PROVIDER_SETTINGS.groq.order,
          enabled: PROVIDER_SETTINGS.groq.enabled,
          run: runGroqText,
        },
        {
          id: 'gemini',
          name: 'GEMINI',
          order: PROVIDER_SETTINGS.gemini.order,
          enabled: PROVIDER_SETTINGS.gemini.enabled,
          run: runGeminiText,
        },
        {
          id: 'openrouter',
          name: 'OpenRouter',
          order: PROVIDER_SETTINGS.openrouter.order,
          enabled: PROVIDER_SETTINGS.openrouter.enabled,
          run: runOpenRouterText,
        },
        {
          id: 'grok',
          name: 'GROK',
          order: PROVIDER_SETTINGS.grok.order,
          enabled: PROVIDER_SETTINGS.grok.enabled,
          run: runGrokText,
        },
        {
          id: 'huggingface',
          name: 'Hugging Face',
          order: PROVIDER_SETTINGS.huggingface.order,
          enabled: PROVIDER_SETTINGS.huggingface.enabled,
          run: runHuggingFaceText,
        },
      ]

  return providers
    .filter(provider => provider.enabled)
    .sort((a, b) => a.order - b.order)
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

async function postJson(url, payload, headers = {}, timeoutMs = 20000) {
  const response = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(payload),
    },
    timeoutMs,
  )

  const text = await response.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }

  if (!response.ok) {
    const details = typeof data === 'string' ? data : JSON.stringify(data)
    throw new Error(`HTTP ${response.status} - ${details}`)
  }

  return data
}

async function runPipeline(kind, input, metadata = {}) {
  // Ordena pelos toggles/ordem configurados e tenta um provedor por vez.
  // Se um cair por cota, erro ou chave faltando, o próximo assume sem travar o app.
  const providers = getEnabledProviders(kind)
  let lastError = null

  for (const provider of providers) {
    try {
      const result = await provider.run(input, metadata)
      return {
        ...result,
        provider: provider.name,
      }
    } catch (error) {
      lastError = error
      console.error(`[AI][${kind}] Falha em ${provider.name}:`, error?.message || error)
    }
  }

  const message = lastError?.message || 'Nenhum provedor respondeu.'
  throw new Error(message)
}

function buildOpenAICompatibleMessages(systemPrompt, userMessages) {
  return [
    { role: 'system', content: systemPrompt },
    ...ensureArray(userMessages).map(message => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: String(message.content ?? ''),
    })),
  ]
}

function resolveProviderModel(providerKey, modelVariant = 'primary', overrideModel = '') {
  const providerModels = PROVIDER_MODELS[providerKey] || {}
  const normalizedOverride = String(overrideModel ?? '').trim()
  if (normalizedOverride) {
    return normalizedOverride
  }

  const normalizedVariant = String(modelVariant ?? 'primary').trim().toLowerCase()
  if (normalizedVariant && providerModels[normalizedVariant]) {
    return providerModels[normalizedVariant]
  }

  return providerModels.primary || providerModels.secondary || ''
}

function parseStructuredCompletion(content, fallbackShape = {}) {
  const parsed = safeJsonParse(content)
  if (parsed && isPlainObject(parsed)) {
    return parsed
  }
  return fallbackShape
}

async function runGroqSearch({ query }) {
  const apiKey = process.env.GROQ_API_KEY || process.env.GROQ
  if (!apiKey || apiKey === 'undefined') {
    throw new Error('GROQ key missing')
  }

  const payload = {
    model: 'groq/compound',
    messages: [
      {
        role: 'user',
        content: [
          SEARCH_QUERY,
          '',
          `Consulta principal: ${query || DEFAULT_THEME_SEARCH_QUERY}`,
        ].join('\n'),
      },
    ],
    search_settings: GROQ_SEARCH_SETTINGS,
    response_format: { type: 'json_object' },
    temperature: 0.2,
  }

  const data = await postJson(
    'https://api.groq.com/openai/v1/chat/completions',
    payload,
    {
      Authorization: `Bearer ${apiKey}`,
    },
    SEARCH_TIMEOUT_MS,
  )

  const message = data?.choices?.[0]?.message ?? {}
  const parsed = parseStructuredCompletion(message.content, {})
  const rawSearchResults = message.executed_tools?.[0]?.search_results?.results || []

  const cards = ensureArray(parsed.cards).length > 0
    ? parsed.cards
    : rawSearchResults.slice(0, 5).map(result => ({
        titulo: result.title,
        texto: result.content,
        fonte: extractDomain(result.url),
        url: result.url,
        trecho: result.content,
        score: result.score,
      }))

  const fontes = ensureArray(parsed.fontes).length > 0
    ? parsed.fontes
    : rawSearchResults.map(result => ({
        nome: result.title,
        url: result.url,
        trecho: result.content,
      }))

  return normalizeSearchBundle({
    query,
    provider: 'GROQ',
    resumo: parsed.resumo || message.content || '',
    cards,
    fontes,
  })
}

async function runGeminiSearch({ query }) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI
  if (!apiKey || apiKey === 'undefined') {
    throw new Error('Gemini key missing')
  }

  const payload = {
    model: resolveProviderModel('gemini', 'secondary'),
    input: [
      buildSearchSystemPrompt(query || DEFAULT_THEME_SEARCH_QUERY),
    ].join('\n\n'),
    tools: [{ type: 'google_search' }],
    response_format: SEARCH_SCHEMA,
  }

  const data = await postJson(
    'https://generativelanguage.googleapis.com/v1beta/interactions',
    payload,
    {
      'x-goog-api-key': apiKey,
    },
    SEARCH_TIMEOUT_MS,
  )

  const textOutput = ensureArray(data?.outputs).find(output => output?.type === 'text')?.text || data?.outputs?.[0]?.text || ''
  const parsed = parseStructuredCompletion(textOutput, {})

  return normalizeSearchBundle({
    query,
    provider: 'GEMINI',
    resumo: parsed.resumo || textOutput,
    cards: parsed.cards,
    fontes: parsed.fontes,
  })
}

async function runOpenRouterSearch({ query }) {
  const apiKey = process.env.OR_API_KEY || process.env.OR
  if (!apiKey || apiKey === 'undefined') {
    throw new Error('OpenRouter key missing')
  }

  const payload = {
    model: OPENROUTER_SEARCH_MODEL,
    messages: buildOpenAICompatibleMessages(
      buildSearchSystemPrompt(query || DEFAULT_THEME_SEARCH_QUERY),
      [{ role: 'user', content: `Consulta principal: ${query || DEFAULT_THEME_SEARCH_QUERY}` }],
    ),
    temperature: 0.2,
    response_format: { type: 'json_object' },
    plugins: [{ id: 'web' }],
  }

  const data = await postJson(
    'https://openrouter.ai/api/v1/chat/completions',
    payload,
    {
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.SITE_URL || 'https://apice.netlify.app',
      'X-Title': 'Apice ENEM',
    },
    SEARCH_TIMEOUT_MS,
  )

  const message = data?.choices?.[0]?.message ?? {}
  const parsed = parseStructuredCompletion(message.content, {})
  const annotationSources = ensureArray(message.annotations)
    .filter(annotation => annotation?.type === 'url_citation')
    .map(annotation => ({
      nome: annotation?.url_citation?.title || extractDomain(annotation?.url_citation?.url),
      url: annotation?.url_citation?.url,
      trecho: annotation?.url_citation?.content || '',
    }))

  return normalizeSearchBundle({
    query,
    provider: 'OpenRouter',
    resumo: parsed.resumo || message.content || '',
    cards: parsed.cards,
    fontes: parsed.fontes?.length ? parsed.fontes : annotationSources,
  })
}

async function runGroqText({ systemPrompt, userMessages, modelVariant = 'primary', modelOverride = '' }) {
  const apiKey = process.env.GROQ_API_KEY || process.env.GROQ
  if (!apiKey || apiKey === 'undefined') {
    throw new Error('GROQ key missing')
  }

  const payload = {
    model: resolveProviderModel('groq', modelVariant, modelOverride),
    messages: buildOpenAICompatibleMessages(systemPrompt, userMessages),
    temperature: 0.2,
    max_tokens: 4096,
    response_format: { type: 'json_object' },
    stream: false,
  }

  const data = await postJson(
    'https://api.groq.com/openai/v1/chat/completions',
    payload,
    {
      Authorization: `Bearer ${apiKey}`,
    },
    TEXT_TIMEOUT_MS,
  )

  const content = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.message?.reasoning || ''
  const parsed = safeJsonParse(content)
  if (!parsed) {
    throw new Error('GROQ returned non-JSON content')
  }
  return parsed
}

async function runGeminiText({ systemPrompt, userMessages, modelVariant = 'primary', modelOverride = '' }) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI
  if (!apiKey || apiKey === 'undefined') {
    throw new Error('Gemini key missing')
  }

  const contents = buildOpenAICompatibleMessages(systemPrompt, userMessages).map(message => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: String(message.content ?? '') }],
  }))

  const payload = {
    contents,
    generationConfig: {
      temperature: 0.25,
      responseMimeType: 'application/json',
    },
  }

  const data = await postJson(
    `https://generativelanguage.googleapis.com/v1beta/models/${resolveProviderModel('gemini', modelVariant, modelOverride)}:generateContent?key=` + encodeURIComponent(apiKey),
    payload,
    {},
    TEXT_TIMEOUT_MS,
  )

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
  const parsed = safeJsonParse(text)
  if (!parsed) {
    throw new Error('Gemini returned non-JSON content')
  }
  return parsed
}

async function runOpenRouterText({ systemPrompt, userMessages, modelVariant = 'primary', modelOverride = '' }) {
  const apiKey = process.env.OR_API_KEY || process.env.OR
  if (!apiKey || apiKey === 'undefined') {
    throw new Error('OpenRouter key missing')
  }

  const payload = {
    model: resolveProviderModel('openrouter', modelVariant, modelOverride),
    messages: buildOpenAICompatibleMessages(systemPrompt, userMessages),
    temperature: 0.25,
    max_tokens: 4096,
    response_format: { type: 'json_object' },
  }

  const data = await postJson(
    'https://openrouter.ai/api/v1/chat/completions',
    payload,
    {
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.SITE_URL || 'https://apice.netlify.app',
      'X-Title': 'Apice ENEM',
    },
    TEXT_TIMEOUT_MS,
  )

  const content = data?.choices?.[0]?.message?.content || ''
  const parsed = safeJsonParse(content)
  if (!parsed) {
    throw new Error('OpenRouter returned non-JSON content')
  }
  return parsed
}

async function runGrokText({ systemPrompt, userMessages, modelVariant = 'primary', modelOverride = '' }) {
  const apiKey = process.env.XAI_API_KEY || process.env.XAI
  if (!apiKey || apiKey === 'undefined') {
    throw new Error('xAI key missing')
  }

  const payload = {
    model: resolveProviderModel('grok', modelVariant, modelOverride),
    messages: buildOpenAICompatibleMessages(systemPrompt, userMessages),
    temperature: 0.2,
    response_format: { type: 'json_object' },
  }

  const data = await postJson(
    'https://api.x.ai/v1/chat/completions',
    payload,
    {
      Authorization: `Bearer ${apiKey}`,
    },
    TEXT_TIMEOUT_MS,
  )

  const content = data?.choices?.[0]?.message?.content || ''
  const parsed = safeJsonParse(content)
  if (!parsed) {
    throw new Error('Grok returned non-JSON content')
  }
  return parsed
}

async function runHuggingFaceText({ systemPrompt, userMessages, modelVariant = 'primary', modelOverride = '' }) {
  const apiKey = process.env.HF_API_KEY || process.env.HF
  if (!apiKey || apiKey === 'undefined') {
    throw new Error('Hugging Face key missing')
  }

  const prompt = [
    systemPrompt,
    '',
    ...ensureArray(userMessages).map(message => `${message.role === 'assistant' ? 'Assistant' : 'User'}: ${message.content}`),
    '',
    'Return only JSON.',
  ].join('\n')

  const payload = {
    inputs: prompt,
    parameters: {
      max_new_tokens: 4096,
      temperature: 0.2,
      return_full_text: false,
    },
    options: {
      wait_for_model: true,
    },
  }

  const data = await postJson(
    `https://api-inference.huggingface.co/models/${resolveProviderModel('huggingface', modelVariant, modelOverride)}`,
    payload,
    {
      Authorization: `Bearer ${apiKey}`,
    },
    TEXT_TIMEOUT_MS + 10000,
  )

  let text = ''
  if (Array.isArray(data)) {
    text = data[0]?.generated_text || data[0]?.summary_text || ''
  } else if (isPlainObject(data)) {
    text = data.generated_text || data.summary_text || data.text || ''
  } else if (typeof data === 'string') {
    text = data
  }

  const parsed = safeJsonParse(text)
  if (!parsed) {
    throw new Error('Hugging Face returned non-JSON content')
  }
  return parsed
}

async function runDirectTextProvider({ provider, systemPrompt, userMessages, modelVariant = 'primary', modelOverride = '' }) {
  // Caminho explícito para chamar um provider/modelo específico sem search e sem fallback em cascata.
  // Isso é útil quando você quer testar um modelo novo ou forçar um provider no front.
  const normalizedProvider = String(provider ?? '').trim().toLowerCase()

  switch (normalizedProvider) {
    case 'groq':
      return await runGroqText({ systemPrompt, userMessages, modelVariant, modelOverride })
    case 'gemini':
      return await runGeminiText({ systemPrompt, userMessages, modelVariant, modelOverride })
    case 'openrouter':
      return await runOpenRouterText({ systemPrompt, userMessages, modelVariant, modelOverride })
    case 'grok':
      return await runGrokText({ systemPrompt, userMessages, modelVariant, modelOverride })
    case 'huggingface':
      return await runHuggingFaceText({ systemPrompt, userMessages, modelVariant, modelOverride })
    default:
      throw new Error(`Provider não suportado para chamada direta: ${provider}`)
  }
}

export async function searchContext(query = DEFAULT_THEME_SEARCH_QUERY) {
  // Esta função faz só a etapa de busca.
  // Ela é usada pelo gerador de tema e também fica disponível como endpoint próprio.
  const normalizedQuery = String(query ?? '').trim() || DEFAULT_THEME_SEARCH_QUERY
  return await runPipeline('search', { query: normalizedQuery }, { query: normalizedQuery })
}

export async function generateTextDirect({
  provider,
  systemPrompt,
  userMessages,
  modelVariant = 'primary',
  modelOverride = '',
  responsePreference,
}) {
  // Este export existe para rotas futuras que queiram chamar um modelo específico sem search.
  // Ele não substitui o fallback atual; é um atalho quando você quer forçar um provider/modelo.
  if (!provider) {
    throw new Error('provider é obrigatório para chamada direta')
  }

  const decoratedSystemPrompt = [
    buildAiResponsePreferencePrompt(responsePreference),
    String(systemPrompt ?? '').trim(),
  ].filter(Boolean).join('\n\n')

  return await runDirectTextProvider({
    provider,
    systemPrompt: decoratedSystemPrompt,
    userMessages,
    modelVariant,
    modelOverride,
  })
}

export async function generateDynamicTheme({ responsePreference } = {}) {
  // Primeiro tenta buscar contexto factual atual.
  // Se a busca falhar por qualquer motivo, ainda tenta gerar um tema sem search,
  // para não deixar o fluxo de escrita inutilizável.
  const searchQuery = DEFAULT_THEME_SEARCH_QUERY
  let searchBundle = null

  try {
    searchBundle = await searchContext(searchQuery)
  } catch (error) {
    console.error('[AI][theme] Search failed, falling back to no-search theme generation:', error?.message || error)
  }

  const systemPrompt = searchBundle
    ? buildThemeSystemPrompt(searchBundle, responsePreference)
    : buildFallbackThemeSystemPrompt(responsePreference)

  const userMessages = [
    {
      role: 'user',
      content: 'Gere um tema novo seguindo o estilo do ENEM, com material de apoio curto, factual e bem estruturado.',
    },
  ]

  let result = null

  try {
    // Groq secondary (llama-3.1-8b-instant) — mais rápido e barato, tentativa principal
    result = await runDirectTextProvider({
      provider: 'groq',
      systemPrompt,
      userMessages,
      modelVariant: 'secondary',
    })
  } catch (secondaryError) {
    console.error('[AI][theme] Groq secondary failed, trying primary:', secondaryError?.message || secondaryError)
    try {
      result = await runDirectTextProvider({
        provider: 'groq',
        systemPrompt,
        userMessages,
        modelVariant: 'primary',
      })
    } catch (primaryError) {
      console.error('[AI][theme] Groq primary failed, falling back to pipeline:', primaryError?.message || primaryError)
      result = await runPipeline('text', { systemPrompt, userMessages }, { searchBundle })
    }
  }

  const tema = String(result?.tema ?? '').trim()
  const material = isPlainObject(result?.material) ? result.material : {
    titulo: 'Material de apoio',
    resumo: String(result?.material ?? '').trim(),
    cards: [],
    fontes: [],
  }
  const normalizedMaterial = normalizeSearchBundle({
    query: searchQuery,
    provider: result?.provider || 'groq',
    resumo: material.resumo || '',
    cards: material.cards,
    fontes: material.fontes,
  })

  return {
    tema,
    material: {
      titulo: material.titulo || 'Material de apoio',
      ...normalizedMaterial,
    },
  }
}

function buildUserSummarySystemPrompt(historyIndex, responsePreference) {
  const lines = [
    'Você é um analista curto e direto do desempenho de escrita de um estudante do ENEM.',
    'Use apenas o JSON recebido e não invente dados que não estejam evidentes no histórico.',
    'Seu trabalho é gerar uma análise breve, prática e útil para monitorar evolução.',
    'Foque em padrões de escrita, erros recorrentes, pontos fortes e o principal foco de treino.',
    'Responda somente com JSON válido e siga exatamente este formato:',
    '{',
    '  "resumo": "uma análise curta em até duas frases",',
    '  "forcas": ["até 3 pontos fortes"],',
    '  "errosRecorrentes": ["até 3 erros recorrentes"],',
    '  "foco": "um foco objetivo para as próximas redações",',
    '  "geradoEm": "ISO-8601",',
    '  "totalRedacoes": 0,',
    '  "origem": "ai"',
    '}',
    '',
    'Regras:',
    '- Seja direto.',
    '- Não copie redações inteiras.',
    '- Se houver poucos dados, faça uma análise cautelosa e explícita.',
    '- Priorize clareza, repertório, argumentação, coesão e gramática.',
    '',
    'Índice resumido das últimas redações:',
    JSON.stringify(historyIndex, null, 2),
  ]

  appendResponsePreference(lines, responsePreference)
  return lines.join('\n')
}

function normalizeUserSummaryPayload(result, historyCount) {
  const forcas = ensureArray(result?.forcas)
    .map((item) => String(item ?? '').trim())
    .filter(Boolean)
    .slice(0, 3)

  const errosRecorrentes = ensureArray(result?.errosRecorrentes)
    .map((item) => String(item ?? '').trim())
    .filter(Boolean)
    .slice(0, 3)

  return {
    resumo: String(result?.resumo ?? '').trim() || 'Análise automática baseada nas últimas redações.',
    forcas,
    errosRecorrentes,
    foco: String(result?.foco ?? '').trim() || 'Continuar reforçando clareza, repertório e correção gramatical.',
    geradoEm: String(result?.geradoEm ?? new Date().toISOString()).trim() || new Date().toISOString(),
    totalRedacoes: Number.isFinite(Number(result?.totalRedacoes)) ? Number(result.totalRedacoes) : historyCount,
    origem: String(result?.origem ?? 'ai').trim() || 'ai',
  }
}

function uniqueStrings(items = []) {
  const seen = new Set()
  const out = []

  for (const item of items) {
    const value = String(item ?? '').trim()
    if (!value) continue
    const normalized = value.toLowerCase()
    if (seen.has(normalized)) continue
    seen.add(normalized)
    out.push(value)
  }

  return out
}

function buildFallbackUserSummaryPayload(historyIndex = [], totalRedacoes = historyIndex.length) {
  const entries = Array.isArray(historyIndex) ? historyIndex : []
  const notes = entries
    .map((item) => Number(item?.nota))
    .filter((nota) => Number.isFinite(nota))

  const average = notes.length > 0
    ? Math.round(notes.reduce((sum, value) => sum + value, 0) / notes.length)
    : 0

  const best = notes.length > 0 ? Math.max(...notes) : 0

  const strengths = uniqueStrings([
    ...entries.map((item) => item?.pontoForte),
    ...entries
      .flatMap((item) => ensureArray(item?.competencias))
      .filter((competencia) => Number.isFinite(Number(competencia?.nota)) && Number(competencia.nota) >= 800)
      .map((competencia) => competencia?.nome),
  ]).slice(0, 3)

  const recurringIssues = uniqueStrings([
    ...entries.map((item) => item?.principalMelhorar),
    ...entries.map((item) => item?.atencao),
    ...entries
      .flatMap((item) => ensureArray(item?.competencias))
      .filter((competencia) => Number.isFinite(Number(competencia?.nota)) && Number(competencia.nota) <= 650)
      .map((competencia) => competencia?.nome),
  ]).slice(0, 3)

  const mainFocus = recurringIssues[0] || 'coesão, repertório e gramática'

  const resumo = totalRedacoes <= 1
    ? `Resumo local inicial: nota ${best || 0}/1000.`
    : `Resumo local das últimas ${totalRedacoes} redações: média ${average || 0}/1000 e melhor nota ${best || 0}/1000.`

  const resumoFinal = strengths.length > 0
    ? `${resumo} Pontos fortes mais visíveis: ${strengths.join(', ')}. Foco principal agora: ${mainFocus}.`
    : `${resumo} Foco principal agora: ${mainFocus}.`

  return {
    resumo: resumoFinal.trim(),
    forcas: strengths,
    errosRecorrentes: recurringIssues,
    foco: `Reforçar ${mainFocus}.`,
    geradoEm: new Date().toISOString(),
    totalRedacoes,
    origem: 'fallback',
  }
}

export async function generateUserSummary({
  historyIndex = [],
  historyCount = historyIndex.length,
  responsePreference,
} = {}) {
  const safeHistoryIndex = Array.isArray(historyIndex) ? historyIndex.slice(0, 5) : []
  const totalRedacoes = Number.isFinite(Number(historyCount)) ? Number(historyCount) : safeHistoryIndex.length
  const systemPrompt = buildUserSummarySystemPrompt(safeHistoryIndex, responsePreference)
  const userMessages = [
    {
      role: 'user',
      content: JSON.stringify({
        totalRedacoes,
        historico: safeHistoryIndex,
      }, null, 2),
    },
  ]

  try {
    const result = await runDirectTextProvider({
      provider: 'groq',
      systemPrompt,
      userMessages,
      modelVariant: 'secondary',
    })

    return normalizeUserSummaryPayload(result, totalRedacoes)
  } catch (secondaryError) {
    console.error('[AI][summary] Groq secondary failed:', secondaryError?.message || secondaryError)

    try {
      const result = await runDirectTextProvider({
        provider: 'groq',
        systemPrompt,
        userMessages,
        modelVariant: 'primary',
      })

      return normalizeUserSummaryPayload(result, totalRedacoes)
    } catch (primaryError) {
      console.error('[AI][summary] Groq primary failed, falling back to pipeline:', primaryError?.message || primaryError)

      try {
        const result = await runPipeline('text', {
          systemPrompt,
          userMessages,
        }, {
          historyIndex: safeHistoryIndex,
          totalRedacoes,
        })

        return normalizeUserSummaryPayload(result, totalRedacoes)
      } catch (pipelineError) {
        console.error('[AI][summary] Pipeline fallback failed, using local summary:', pipelineError?.message || pipelineError)
        return buildFallbackUserSummaryPayload(safeHistoryIndex, totalRedacoes)
      }
    }
  }
}

function buildRadarSystemPrompt(searchBundle, responsePreference, enemLabel) {
  const lines = [
    `Você é um analista de tendências para temas de redação estilo ${enemLabel}.`,
    'Use o contexto factual pesquisado para sugerir apenas os temas mais prováveis.',
    'Retorne somente a lista principal de temas, sem detalhes explicativos.',
    'Responda somente com JSON válido e siga exatamente este formato:',
    '{',
    '  "temas": [',
    '    {',
    '      "titulo": "tema curto e claro",',
    '      "probabilidade": 0,',
    '      "hot": false',
    '    }',
    '  ],',
    '  "atualizadoEm": "ISO-8601"',
    '}',
    '',
    'Regras:',
    '- Gere exatamente 5 temas.',
    '- Ordene do mais provável para o menos provável.',
    '- Use probabilidades entre 45 e 95.',
    '- Destaque os 2 primeiros como hot.',
    '- Misture áreas sociais, culturais e científicas.',
    '- Evite repetir o mesmo assunto com palavras diferentes.',
    '',
    'Contexto factual pesquisado:',
    flattenSearchContext(searchBundle),
  ]

  appendResponsePreference(lines, responsePreference)
  return lines.join('\n')
}

function buildRadarDetailSystemPrompt(searchBundle, responsePreference, enemLabel, themeTitle) {
  const lines = [
    `Você é um analista de apoio para um tema potencial de redação estilo ${enemLabel}.`,
    'Use o contexto factual pesquisado para detalhar o tema sem inventar dados.',
    'O foco é oferecer apoio pratico, fontes e motivos claros para o aluno escrever.',
    'Responda somente com JSON válido e siga exatamente este formato:',
    '{',
    '  "tema": "tema analisado",',
    '  "probabilidade": 0,',
    '  "resumo": "analise curta em ate duas frases",',
    '  "porQueProvavel": ["motivo curto", "motivo curto"],',
    '  "recorteSugerido": "recorte seguro para a redacao",',
    '  "palavrasChave": ["palavra", "palavra"],',
    '  "dicasDeEscrita": ["dica curta", "dica curta"],',
    '  "material": {',
    '    "titulo": "Material de apoio",',
    '    "resumo": "sintese curta",',
    '    "cards": [',
    '      { "titulo": "card", "texto": "dado objetivo", "fonte": "nome", "url": "link", "trecho": "trecho curto opcional" }',
    '    ],',
    '    "fontes": [',
    '      { "nome": "nome", "url": "link", "trecho": "trecho curto opcional" }',
    '    ]',
    '  },',
    '  "searchResumo": "sintese breve do que a busca encontrou",',
    '  "geradoEm": "ISO-8601",',
    '  "origem": "ai"',
    '}',
    '',
    'Regras:',
    '- Gere no maximo 4 motivos, 4 dicas, 5 cards e 6 fontes.',
    '- Nao repita frases genericas em todos os temas.',
    '- Use apenas informacoes suportadas pelo contexto da busca.',
    '- Se faltar dado, seja cauteloso e explicito.',
    '',
    `Tema a detalhar: ${themeTitle}`,
    `Data de execucao: ${nowIsoDate()}`,
    'Contexto factual pesquisado:',
    flattenSearchContext(searchBundle),
  ]

  appendResponsePreference(lines, responsePreference)
  return lines.join('\n')
}

function normalizeRadarThemesPayload(result) {
  const temas = ensureArray(result?.temas)
    .map((tema) => {
      return normalizeRadarTheme({
        id: tema?.id,
        titulo: tema?.titulo,
        probabilidade: tema?.probabilidade,
        hot: tema?.hot,
      })
    })
    .filter((tema) => tema.titulo)
    .slice(0, 5)

  return {
    temas,
    atualizadoEm: String(result?.atualizadoEm ?? new Date().toISOString()).trim() || new Date().toISOString(),
    origem: String(result?.origem ?? 'ai').trim() || 'ai',
  }
}

function buildFallbackRadarDetailPayload(theme, searchBundle, enemLabel) {
  const normalizedTheme = normalizeRadarTheme(theme) || {
    id: normalizeText(String(theme?.titulo ?? theme?.title ?? 'tema')),
    titulo: String(theme?.titulo ?? theme?.title ?? `Tema para ${enemLabel}`).trim(),
    probabilidade: Number.isFinite(Number(theme?.probabilidade)) ? Number(theme.probabilidade) : 70,
    hot: Boolean(theme?.hot),
  }

  const cards = ensureArray(searchBundle?.cards)
    .slice(0, 4)
    .map((card, index) => ({
      titulo: String(card?.titulo ?? `Card ${index + 1}`).trim(),
      texto: String(card?.texto ?? card?.trecho ?? '').trim(),
      fonte: String(card?.fonte ?? '').trim(),
      url: String(card?.url ?? '').trim(),
      trecho: String(card?.trecho ?? '').trim(),
    }))

  const fontes = ensureArray(searchBundle?.fontes)
    .slice(0, 6)
    .map((source) => ({
      nome: String(source?.nome ?? source?.fonte ?? '').trim(),
      url: String(source?.url ?? '').trim(),
      trecho: String(source?.trecho ?? '').trim(),
    }))

  const keywords = uniqueStrings([
    ...tokenize(normalizedTheme.titulo),
    ...tokenize(String(searchBundle?.resumo ?? '')),
  ]).slice(0, 8)

  return {
    tema: normalizedTheme.titulo,
    probabilidade: normalizedTheme.probabilidade || 70,
    resumo: searchBundle?.resumo
      ? `A busca factual aponta contexto recente ligado a ${normalizedTheme.titulo}.`
      : `Tema atual e recorrente ligado a ${normalizedTheme.titulo}.`,
    porQueProvavel: uniqueStrings([
      searchBundle?.resumo ? `Resumo factual pesquisado: ${searchBundle.resumo}` : '',
      ...cards.slice(0, 3).map((card) => card.texto),
    ]).slice(0, 4),
    recorteSugerido: 'Foque em impacto social, políticas públicas, desigualdade de acesso e direitos coletivos.',
    palavrasChave: keywords,
    dicasDeEscrita: uniqueStrings([
      'Conecte o recorte ao cotidiano e a políticas públicas.',
      'Use repertório objetivo em vez de frases genéricas.',
      'Mostre causa, efeito e proposta de intervenção.',
    ]).slice(0, 4),
    material: {
      titulo: `Material de apoio - ${normalizedTheme.titulo}`,
      resumo: searchBundle?.resumo || `Leitura objetiva do tema ${normalizedTheme.titulo}.`,
      cards,
      fontes,
    },
    searchResumo: searchBundle?.resumo || '',
    geradoEm: new Date().toISOString(),
    origem: 'fallback',
  }
}

export async function generateRadarSuggestions({ responsePreference } = {}) {
  const enemLabel = getEnemYearLabel()
  const searchQuery = [
    `Radar de temas para redação estilo ${enemLabel}.`,
    `Preciso de sinais recentes do debate público brasileiro e de áreas recorrentes na prova do ${enemLabel}.`,
  ].join(' ')

  let searchBundle = null

  try {
    searchBundle = await searchContext(searchQuery)
  } catch (error) {
    console.error('[AI][radar] Search failed, falling back to no-search radar:', error?.message || error)
  }

  const systemPrompt = buildRadarSystemPrompt(searchBundle, responsePreference, enemLabel)
  const userMessages = [
    {
      role: 'user',
      content: `Gere o radar com 5 temas ordenados por chance de aparecer na redação do ${enemLabel}.`,
    },
  ]

  try {
    const result = await runPipeline('text', {
      systemPrompt,
      userMessages,
    }, {
      searchBundle,
    })

    const normalized = normalizeRadarThemesPayload({
      ...result,
      origem: result?.provider || 'ai',
    })

    return {
      ...normalized,
      resumoPesquisa: String(searchBundle?.resumo ?? '').trim(),
    }
  } catch (error) {
    console.error('[AI][radar] Falling back to static radar data:', error?.message || error)

    return {
      temas: normalizeRadarThemesPayload({
        temas: [
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
        ],
      }).temas,
      atualizadoEm: new Date().toISOString(),
      origem: 'fallback',
      resumoPesquisa: String(searchBundle?.resumo ?? '').trim(),
    }
  }
}

export async function generateRadarThemeDetails({ tema, responsePreference } = {}) {
  const normalizedTheme = normalizeRadarTheme(tema)
  if (!normalizedTheme) {
    throw new Error('Tema inválido para gerar detalhes.')
  }

  const enemLabel = getEnemYearLabel()
  const searchQuery = [
    `Pesquise sobre esse tema potencial para redação do ${enemLabel}: ${normalizedTheme.titulo}.`,
    'Use fontes recentes, confiáveis e úteis para apoiar a escrita.',
    'Retorne dados bem restritos, com foco em justificativa, recorte e fontes.',
  ].join(' ')

  let searchBundle = null
  try {
    searchBundle = await searchContext(searchQuery)
  } catch (error) {
    console.error('[AI][radar-detail] Search failed, falling back to no-search details:', error?.message || error)
  }

  const systemPrompt = buildRadarDetailSystemPrompt(searchBundle, responsePreference, enemLabel, normalizedTheme.titulo)
  const userMessages = [
    {
      role: 'user',
      content: `Detalhe o tema abaixo para ajudar o aluno a escrever no ${enemLabel}.\n\nTema: ${normalizedTheme.titulo}\nProbabilidade: ${normalizedTheme.probabilidade}%`,
    },
  ]

  try {
    const result = await runDirectTextProvider({
      provider: 'groq',
      systemPrompt,
      userMessages,
      modelVariant: 'secondary',
    })

    return {
      ...result,
      tema: result?.tema || normalizedTheme.titulo,
      probabilidade: Number.isFinite(Number(result?.probabilidade))
        ? Number(result.probabilidade)
        : normalizedTheme.probabilidade,
      searchResumo: String(result?.searchResumo ?? searchBundle?.resumo ?? '').trim(),
      origem: String(result?.origem ?? 'groq').trim() || 'groq',
      material: result?.material || {
        titulo: `Material de apoio - ${normalizedTheme.titulo}`,
        resumo: String(searchBundle?.resumo ?? result?.resumo ?? '').trim(),
        cards: ensureArray(searchBundle?.cards),
        fontes: ensureArray(searchBundle?.fontes),
      },
      geradoEm: String(result?.geradoEm ?? new Date().toISOString()).trim() || new Date().toISOString(),
    }
  } catch (secondaryError) {
    console.error('[AI][radar-detail] Groq secondary failed:', secondaryError?.message || secondaryError)

    try {
      const result = await runDirectTextProvider({
        provider: 'groq',
        systemPrompt,
        userMessages,
        modelVariant: 'primary',
      })

      return {
        ...result,
        tema: result?.tema || normalizedTheme.titulo,
        probabilidade: Number.isFinite(Number(result?.probabilidade))
          ? Number(result.probabilidade)
          : normalizedTheme.probabilidade,
        searchResumo: String(result?.searchResumo ?? searchBundle?.resumo ?? '').trim(),
        origem: String(result?.origem ?? 'groq').trim() || 'groq',
        material: result?.material || {
          titulo: `Material de apoio - ${normalizedTheme.titulo}`,
          resumo: String(searchBundle?.resumo ?? result?.resumo ?? '').trim(),
          cards: ensureArray(searchBundle?.cards),
          fontes: ensureArray(searchBundle?.fontes),
        },
        geradoEm: String(result?.geradoEm ?? new Date().toISOString()).trim() || new Date().toISOString(),
      }
    } catch (primaryError) {
      console.error('[AI][radar-detail] Groq primary failed, falling back to pipeline:', primaryError?.message || primaryError)

      try {
        const result = await runPipeline('text', {
          systemPrompt,
          userMessages,
        }, {
          searchBundle,
          theme: normalizedTheme,
        })

        return {
          ...result,
          tema: result?.tema || normalizedTheme.titulo,
          probabilidade: Number.isFinite(Number(result?.probabilidade))
            ? Number(result.probabilidade)
            : normalizedTheme.probabilidade,
          searchResumo: String(result?.searchResumo ?? searchBundle?.resumo ?? '').trim(),
          origem: String(result?.origem ?? result?.provider ?? 'ai').trim() || 'ai',
          material: result?.material || {
            titulo: `Material de apoio - ${normalizedTheme.titulo}`,
            resumo: String(searchBundle?.resumo ?? result?.resumo ?? '').trim(),
            cards: ensureArray(searchBundle?.cards),
            fontes: ensureArray(searchBundle?.fontes),
          },
          geradoEm: String(result?.geradoEm ?? new Date().toISOString()).trim() || new Date().toISOString(),
        }
      } catch (pipelineError) {
        console.error('[AI][radar-detail] Pipeline fallback failed, using local detail:', pipelineError?.message || pipelineError)
        return buildFallbackRadarDetailPayload(normalizedTheme, searchBundle, enemLabel)
      }
    }
  }
}

export async function correctEssay({ redacao, tema, material, isRigido, responsePreference }) {
  // Correção não faz search externo.
  // A ideia aqui é só avaliar a redação com o tema/material já obtidos no fluxo de escrita.
  const copyHint = buildCopyRiskHint(redacao, material)
  const systemPrompt = buildCorrectionSystemPrompt({
    tema,
    material,
    isRigido,
    copyHint,
    responsePreference,
  })

  const userMessages = [
    {
      role: 'user',
      content: String(redacao ?? ''),
    },
  ]

  const result = await runPipeline('text', {
    systemPrompt,
    userMessages,
  }, { copyHint, tema, material })

  return calibrateEssayFeedbackScore(result)
}

export function summarizeMaterial(material) {
  // Helper de compatibilidade para a UI.
  // Se a tela quiser converter material estruturado para texto simples, usa este método.
  return flattenMaterialForPrompt(material)
}
