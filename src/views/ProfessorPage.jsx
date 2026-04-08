import { useState, useRef, useEffect, useCallback } from 'react'
import { CATEGORIES } from '../data/mockProfessorData.js'
import { chamarIAEspecifica, buscarContexto } from '../services/aiService.js'
import { ProfessorMindmapCanvas } from '../ui/ProfessorMindmapCanvas.jsx'
import '../styles/professor.css'

const STORAGE_KEY = 'apice:professor:conversations'
const MINDMAP_STORAGE_KEY = 'apice:professor:mindmaps'
const MAX_CHAT_HISTORY = 12 // Limita histórico enviado para IA (economia de tokens)
const PROFESSOR_PROVIDER_FALLBACKS = [
  { provider: 'groq', modelVariant: 'secondary' },
  { provider: 'groq', modelVariant: 'primary' },
  { provider: 'gemini', modelVariant: 'primary' },
  { provider: 'openrouter', modelVariant: 'primary' },
]

function safeJsonParse(value) {
  if (!value || typeof value !== 'string') return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function collectMindmapChildren(node) {
  const collections = [
    node?.children,
    node?.topicos,
    node?.topics,
    node?.branches,
    node?.ramificacoes,
    node?.subtopics,
  ]
  return collections.find(Array.isArray) || []
}

function walkMindmapNodes(sourceNodes, parentId = null, output = []) {
  if (!Array.isArray(sourceNodes)) return output

  sourceNodes.forEach((node, index) => {
    if (!node || typeof node !== 'object') return

    const id = String(node.id || `${parentId || 'node'}-${index}-${Date.now()}`)
    const label = String(node.label || node.text || node.titulo || node.title || node.topico || node.topic || 'Nó').trim() || 'Nó'
    output.push({ id, label, parentId: parentId ? String(parentId) : null })

    const childNodes = collectMindmapChildren(node)
    if (childNodes.length > 0) {
      walkMindmapNodes(childNodes, id, output)
    }
  })

  return output
}

function _normalizeMindmapTreeLegacy(rawTree) {
  if (!rawTree || typeof rawTree !== 'object') return null

  const rawNodes = Array.isArray(rawTree.nodes) ? rawTree.nodes : null
  if (rawNodes && rawNodes.length > 0) {
    const nodes = rawNodes
      .map((node, index) => ({
        id: String(node.id || `node-${Date.now()}-${index}`),
        label: String(node.label || node.text || node.titulo || 'Nó'),
        parentId: node.parentId ? String(node.parentId) : null,
      }))
    return { nodes }
  }

  const rootLabel = String(rawTree.titulo || rawTree.topico || rawTree.topicoCentral || rawTree.label || '').trim()
  const rawChildren = Array.isArray(rawTree.children) ? rawTree.children : []
  if (!rootLabel || rawChildren.length === 0) return null

  const nodes = []
  const rootId = `root-${Date.now()}`
  nodes.push({ id: rootId, label: rootLabel, parentId: null })

  const walk = (children, parentId) => {
    children.forEach((child, index) => {
      const childId = String(child.id || `${parentId}-${index}-${Date.now()}`)
      nodes.push({
        id: childId,
        label: String(child.label || child.text || child.titulo || 'Nó'),
        parentId,
      })
      if (Array.isArray(child.children) && child.children.length > 0) {
        walk(child.children, childId)
      }
    })
  }

  walk(rawChildren, rootId)
  return { nodes }
}

function normalizeMindmapTree(rawTree) {
  if (!rawTree || typeof rawTree !== 'object') return null

  const rawNodes = Array.isArray(rawTree.nodes) ? walkMindmapNodes(rawTree.nodes) : []
  const collectedNodes = rawNodes.length > 0 ? rawNodes : walkMindmapNodes(collectMindmapChildren(rawTree))
  if (collectedNodes.length === 0) return null

  const title = String(
    rawTree.titulo
    || rawTree.title
    || rawTree.topico
    || rawTree.topicoCentral
    || rawTree.label
    || collectedNodes[0]?.label
    || 'Mapa central',
  ).trim() || 'Mapa central'

  let nodes = collectedNodes.map((node) => ({ ...node }))
  const nodeIds = new Set(nodes.map((node) => node.id))
  const roots = nodes.filter((node) => !node.parentId || !nodeIds.has(node.parentId))
  const rootId = roots[0]?.id || `root-${Date.now()}`

  if (roots.length === 0) {
    nodes = [
      { id: rootId, label: title, parentId: null },
      ...nodes.map((node) => ({ ...node, parentId: rootId })),
    ]
  } else {
    nodes = nodes.map((node) => {
      if (node.id === rootId) {
        return { ...node, label: title, parentId: null }
      }

      if (!node.parentId || !nodeIds.has(node.parentId)) {
        return { ...node, parentId: rootId }
      }

      return node
    })

    nodes = nodes.map((node) => (node.id === rootId ? { ...node, label: title, parentId: null } : node))
  }

  return { titulo: title, nodes }
}

function extractMindmapFromAiResponse(response, textFallback = '') {
  if (response && typeof response === 'object') {
    const directMap = normalizeMindmapTree(
      response.mapa
      || response.mapaMental
      || response.mindmap
      || response.tree
      || response.arvore,
    )
    if (directMap) return directMap
  }

  const parsedFromText = safeJsonParse(textFallback)
  if (parsedFromText) {
    const map = normalizeMindmapTree(parsedFromText)
    if (map) return map
  }

  // Novo fallback: Regex para capturar JSON de mapa que a IA pode ter "cuspido" dentro da string 'texto'
  const text = String(response?.texto || response?.text || textFallback || '')
  const match = text.match(/(\{[\s\S]*"nodes"[\s\S]*\})/i)
  if (match) {
    const extracted = safeJsonParse(match[1])
    if (extracted) return normalizeMindmapTree(extracted)
  }

  return null
}

function getMindmapPromptBoost(categoryLabel) {
  return `

INSTRUCOES EXTRAS PARA MAPA MENTAL:
- Crie um mapa escolar classico, com titulo central no meio e ramos ao redor.
- O titulo central deve refletir o assunto escolhido: ${categoryLabel}.
- Use de 5 a 8 ramos principais e, quando fizer sentido, de 1 a 3 subtopicos curtos por ramo.
- Prefira labels curtos, como palavras-chave ou expressoes breves.
- Nao escreva paragrafos longos no mapa.
- O objeto "mapa" deve incluir "titulo" e "nodes".
- O no raiz precisa ter parentId null.
- Se existir um unico no raiz, o label dele deve ser igual ao titulo central.
- Mantenha a estrutura limpa, visual e pronta para uma pagina PDF.
`
}

function iconSvg(kind) {
  switch (kind) {
    case 'question':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )
    case 'book':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      )
    case 'mindmap':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M3 12h6M15 12h6M12 3v6M12 15v6" />
          <circle cx="3" cy="12" r="2" />
          <circle cx="21" cy="12" r="2" />
          <circle cx="12" cy="3" r="2" />
          <circle cx="12" cy="21" r="2" />
        </svg>
      )
    case 'target':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      )
    case 'send':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      )
    case 'sendArrow':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 4l12 8-12 8" />
        </svg>
      )
    case 'trash':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      )
    case 'search':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      )
    default:
      return <svg viewBox="0 0 24 24" />
  }
}

export function ProfessorPage() {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0])
  const messageIdRef = useRef(0)
  
  const [conversations, setConversations] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.error('Failed to load professor conversation', e)
    }
    
    const initial = {}
    CATEGORIES.forEach(cat => {
      initial[cat.id] = [{ id: Date.now(), sender: 'ai', text: cat.welcomeMessage }]
    })
    return initial
  })
  
  const [inputText, setInputText] = useState('')
  const [isSearchEnabled, setIsSearchEnabled] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [aiError, setAiError] = useState(false)
  const [isExpandingMindmap, setIsExpandingMindmap] = useState(false)
  const [mindmapsByCategory, setMindmapsByCategory] = useState(() => {
    try {
      const saved = localStorage.getItem(MINDMAP_STORAGE_KEY)
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })
  const messagesWallRef = useRef(null)

  const activeMessages = conversations[activeCategory.id]
  const activeMindmap = mindmapsByCategory[activeCategory.id] || null

  const nextMessageId = useCallback(() => {
    const now = Date.now()
    messageIdRef.current += 1
    return now + messageIdRef.current
  }, [])

  const isBrowserOffline = useCallback(() => {
    if (typeof navigator === 'undefined') return false
    return navigator.onLine === false
  }, [])

  /** Rola só a lista de mensagens — evita scrollIntoView, que puxa a página inteira. */
  const scrollMessagesToEnd = useCallback((behavior = 'smooth') => {
    const wall = messagesWallRef.current
    if (!wall) return
    const y = wall.scrollHeight
    if (behavior === 'smooth') {
      wall.scrollTo({ top: y, behavior: 'smooth' })
    } else {
      wall.scrollTop = y
    }
  }, [])

  useEffect(() => {
    scrollMessagesToEnd()
  }, [activeMessages, isTyping, scrollMessagesToEnd])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations))
    } catch (e) {
      console.error('Failed to save professor conversation', e)
    }
  }, [conversations])

  useEffect(() => {
    try {
      localStorage.setItem(MINDMAP_STORAGE_KEY, JSON.stringify(mindmapsByCategory))
    } catch (e) {
      console.error('Failed to save professor mindmap', e)
    }
  }, [mindmapsByCategory])

  useEffect(() => {
    if (mindmapsByCategory.mapas) return
    const mapMessages = Array.isArray(conversations.mapas) ? [...conversations.mapas].reverse() : []
    const aiMessageWithTree = mapMessages.find(msg => msg.sender === 'ai')
    if (!aiMessageWithTree?.text) return
    const parsed = extractMindmapFromAiResponse(null, aiMessageWithTree.text)
    if (!parsed) return
    setMindmapsByCategory(prev => ({ ...prev, mapas: parsed }))
  }, [conversations.mapas, mindmapsByCategory.mapas])

  const handleSendMessage = async () => {
    if (!inputText.trim() || isTyping) return
    if (isBrowserOffline()) {
      setAiError(true)
      window.alert('Você está offline. Verifique sua conexão para continuar usando o Professor IA.')
      return
    }

    const userMessage = inputText.trim()
    const categoryAtSend = activeCategory
    const categoryId = categoryAtSend.id
    const categoryMessages = Array.isArray(conversations[categoryId]) ? conversations[categoryId] : []
    setInputText('')
    setAiError(false)

    setConversations(prev => ({
      ...prev,
      [categoryId]: [
        ...(Array.isArray(prev[categoryId]) ? prev[categoryId] : []),
        { id: nextMessageId(), sender: 'user', text: userMessage }
      ]
    }))

    setIsTyping(true)

    // Monta histórico recente para contexto da IA
    const recentMessages = categoryMessages
      .slice(-MAX_CHAT_HISTORY)
      .filter(msg => msg.sender === 'user' || msg.sender === 'ai')
      .map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }))

    const systemPrompt = `Você é um professor especialista no ENEM, atuando na categoria "${categoryAtSend.label}".

DIRETRIZES:
- ${categoryAtSend.id === 'duvidas' ? 'Explique de forma clara, passo a passo, com exemplos quando possível.' : ''}
- ${categoryAtSend.id === 'resumos' ? 'Crie resumos objetivos com os pontos mais importantes para o ENEM. Use tópicos e seja direto.' : ''}
- ${categoryAtSend.id === 'mapas' ? `Para esta categoria (Mapas), você NÃO deve escrever uma explicação. Retorne EXATAMENTE a string "[MAPA_GERADO]" no campo "texto" e preencha o objeto "mapa" com um mapa mental escolar pronto para visualização: título central no meio, 5 a 8 tópicos principais ao redor e, quando fizer sentido, 1 a 3 subtópicos curtos por tópico. O resultado deve ter labels curtos e no máximo 18 nós. O objeto "mapa" precisa incluir "titulo" e "nodes".` : ''}
- ${categoryAtSend.id === 'pratica' ? 'Crie questões inéditas no estilo ENEM com 5 alternativas (A-E). Após o aluno responder, dê feedback detalhado.' : ''}
- Use linguagem acessível mas não infantilize.
- Se não souber, seja honesto.
- Mantenha o foco no contexto do ENEM e no Brasil.
- Responda em português do Brasil.

Responda SEMPRE em JSON válido neste formato:
{
  "texto": "Sua explicação (ou [MAPA_GERADO] se for categoria mapas)...",
  "mapa": { "nodes": [ ... ] }
}

DICA: Na categoria 'mapas', o campo 'mapa' é OBRIGATÓRIO e o 'texto' deve ser "[MAPA_GERADO]".

Histórico recente da conversa (para manter coerência):`

    let searchContextText = ''
    if (isSearchEnabled) {
      try {
        const searchResult = await buscarContexto(userMessage)
        if (searchResult) {
          const cardsText = (searchResult.cards || [])
            .map(c => `- ${c.titulo}: ${c.texto} (${c.fonte})`)
            .join('\n')
          
          searchContextText = `
--- CONTEXTO FACTUAL PESQUISADO (USE ISSO PARA ENRIQUECER A RESPOSTA) ---
Resumo: ${searchResult.resumo || 'Sem resumo.'}
Dados relevantes:
${cardsText || 'Nenhum dado específico encontrado.'}
-------------------------------------------------------------------------
`
        }
      } catch (err) {
        console.error('Falha na busca de contexto:', err)
      }
    }

    const finalSystemPrompt = systemPrompt
      + (categoryAtSend.id === 'mapas' ? getMindmapPromptBoost(categoryAtSend.label) : '')
      + (searchContextText ? `\n\n${searchContextText}` : '')

    const userMessages = [
      ...recentMessages,
      { role: 'user', content: userMessage }
    ]

    const callProfessorIa = async () => {
      const errors = []

      for (const config of PROFESSOR_PROVIDER_FALLBACKS) {
        try {
          return await chamarIAEspecifica({
            provider: config.provider,
            modelVariant: config.modelVariant,
            systemPrompt: finalSystemPrompt,
            userMessages,
          })
        } catch (err) {
          errors.push(err)
          console.warn(
            `Falha no provider ${config.provider} (${config.modelVariant}) para Professor IA.`,
            err,
          )
        }
      }

      const lastError = errors[errors.length - 1]
      throw lastError || new Error('Nenhum provedor respondeu no Professor IA.')
    }

    try {
      const response = await callProfessorIa()

      // A resposta da IA vem como JSON parseado (campo 'texto' conforme systemPrompt)
      let aiText = response?.texto || response?.text || response?.content || response?.message
      if (!aiText && typeof response === 'object') {
        // Tenta campos alternativos
        aiText = response.response || response.output || response.answer || response.reply
      }
      const fallback = typeof response === 'string' ? response : null

      if (!aiText && !fallback) {
        throw new Error('Resposta vazia da IA')
      }

      setConversations(prev => ({
        ...prev,
        [categoryId]: [
          ...(Array.isArray(prev[categoryId]) ? prev[categoryId] : []),
          { id: nextMessageId(), sender: 'ai', text: String(aiText || fallback || '').trim() }
        ]
      }))
      if (categoryId === 'mapas') {
        const parsedMindmap = extractMindmapFromAiResponse(response, String(aiText || fallback || '').trim())
        if (parsedMindmap) {
          setMindmapsByCategory(prev => ({ ...prev, [categoryId]: parsedMindmap }))
        }
      }
      setAiError(false)
    } catch (error) {
      console.error('Erro ao chamar IA do Professor:', error)
      const rawMessage = String(error?.message || '').toLowerCase()
      const isQuotaBlocked = error?.code === 'quota_blocked' || rawMessage.includes('limite do plano free')
      const isOffline = isBrowserOffline()

      setConversations(prev => ({
        ...prev,
        [categoryId]: [
          ...(Array.isArray(prev[categoryId]) ? prev[categoryId] : []),
          {
            id: nextMessageId(),
            sender: 'ai',
            text: isQuotaBlocked
              ? 'Você atingiu o limite diário de IA no plano atual. Tente novamente amanhã ou faça upgrade do plano.'
              : isOffline
              ? 'Estou sem conexão no momento. Verifique sua internet e tente novamente.'
              : 'O serviço de IA está indisponível no momento. Já tentei provedores alternativos. Tente novamente em alguns segundos.'
          }
        ]
      }))
      if (isOffline) {
        window.alert('Conexão offline detectada. O Professor IA não consegue responder sem internet.')
      } else if (isQuotaBlocked) {
        window.alert('Limite diário de IA atingido no plano atual.')
      }
      setAiError(true)
    } finally {
      setIsTyping(false)
    }
  }

  const handleClearHistory = () => {
    setConversations(prev => ({
      ...prev,
      [activeCategory.id]: [{ id: nextMessageId(), sender: 'ai', text: activeCategory.welcomeMessage }]
    }))
    if (activeCategory.id === 'mapas') {
      setMindmapsByCategory(prev => ({ ...prev, mapas: null }))
    }
  }

  const handleExpandMindmapNode = async (nodeId) => {
    const currentTree = mindmapsByCategory.mapas
    if (!currentTree || !Array.isArray(currentTree.nodes)) return
    const parentNode = currentTree.nodes.find(node => String(node.id) === String(nodeId))
    if (!parentNode) return

    setIsExpandingMindmap(true)
    setAiError(false)

    try {
      const contextLines = currentTree.nodes
        .slice(0, 30)
        .map(node => `- ${node.label}${node.parentId ? ` (pai: ${node.parentId})` : ' (raiz)'}`)
        .join('\n')

      const response = await chamarIAEspecifica({
        provider: 'groq',
        modelVariant: 'secondary',
        systemPrompt: [
          'Você expande mapas mentais para estudo ENEM.',
          'Retorne somente JSON válido com exatamente 3 nós filhos curtos e objetivos.',
          'Formato obrigatório:',
          '{',
          '  "nodes": [',
          '    { "label": "filho 1" },',
          '    { "label": "filho 2" },',
          '    { "label": "filho 3" }',
          '  ]',
          '}',
          'Nunca repita o texto do nó pai literalmente.',
          'Use português do Brasil.',
        ].join('\n'),
        userMessages: [
          {
            role: 'user',
            content: [
              `Nó selecionado: ${parentNode.label}`,
              `ID do nó pai: ${parentNode.id}`,
              '',
              'Mapa atual (resumo):',
              contextLines || 'Sem contexto',
            ].join('\n'),
          },
        ],
      })

      const expanded = response?.nodes && Array.isArray(response.nodes)
        ? response
        : safeJsonParse(String(response?.text || response?.texto || response?.content || '')) || {}
      const children = Array.isArray(expanded.nodes) ? expanded.nodes.slice(0, 3) : []
      if (children.length === 0) {
        throw new Error('IA não retornou filhos válidos para expansão do mapa.')
      }

      const newNodes = children.map((child, index) => ({
        id: `map-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
        label: String(child.label || child.text || `Subtópico ${index + 1}`),
        parentId: parentNode.id,
      }))

      const nextTree = {
        nodes: [...currentTree.nodes, ...newNodes],
      }
      setMindmapsByCategory(prev => ({ ...prev, mapas: nextTree }))
      setConversations(prev => ({
        ...prev,
        mapas: [
          ...(Array.isArray(prev.mapas) ? prev.mapas : []),
          {
            id: nextMessageId(),
            sender: 'ai',
            text: `Expansão IA no nó "${parentNode.label}":\n- ${newNodes.map(node => node.label).join('\n- ')}`,
          },
        ],
      }))
    } catch (error) {
      console.error('Erro ao expandir mapa mental:', error)
      setAiError(true)
      window.alert('Não consegui expandir o nó selecionado agora. Tente novamente em alguns segundos.')
    } finally {
      setIsExpandingMindmap(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="professor-sleek-view">
      <div className="professor-container anim-fade-in">
        
        <header className="professor-nav-header">
          <div className="prof-pills-bar anim-slide-down">
            <div className="prof-pills-scroll">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  className={`prof-pill-btn ${activeCategory.id === cat.id ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {iconSvg(cat.icon)}
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="prof-chat-card anim-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="prof-card-head">
            <div className="prof-session-bar">
              <div className="prof-session-icon" aria-hidden="true">
                {iconSvg(activeCategory.icon)}
              </div>
              <div className="prof-session-titles">
                <span className="prof-session-active">
                  Sessão ativa: <strong>{activeCategory.label}</strong>
                </span>
                <span className="prof-session-meta">
                  IA Experimental
                  {aiError && <span className="prof-ai-error-badge" title="Falha de conexão ou indisponibilidade temporária"> ⚠️ Indisponível</span>}
                </span>
              </div>
              <button
                type="button"
                className="prof-session-clear"
                onClick={handleClearHistory}
                title="Limpar conversa"
                aria-label="Limpar conversa desta sessão"
              >
                {iconSvg('trash')}
              </button>
            </div>
            <div className="prof-card-rule" aria-hidden="true" />
          </div>

          <main className={`prof-chat-surface ${activeCategory.id === 'mapas' ? 'prof-chat-surface--map' : ''}`}>
            {activeCategory.id === 'mapas' && activeMindmap && (
              <ProfessorMindmapCanvas
                tree={activeMindmap}
                onExpandNode={handleExpandMindmapNode}
                isExpanding={isExpandingMindmap}
              />
            )}

            {activeCategory.id === 'mapas' && !activeMindmap && !isTyping && (
              <div className="prof-map-empty-state">
                <p>Nenhum mapa mental gerado para esta sessão ainda. Digite um tema abaixo para criar!</p>
              </div>
            )}

            <div
              ref={messagesWallRef}
              className="prof-messages-wall"
              role="log"
              aria-live="polite"
              aria-relevant="additions"
            >
              {activeMessages.map((msg, index) => {
                // Oculta mensagens técnicas de geração de mapa no modo mapas
                if (activeCategory.id === 'mapas' && msg.text === '[MAPA_GERADO]') return null

                return (
                  <div
                    key={msg.id}
                    className={`prof-msg-row ${msg.sender === 'user' ? 'user-row' : 'ai-row'} anim-pop-in`}
                    style={{ animationDelay: `${Math.min(index, 8) * 0.04}s` }}
                  >
                    <div className="prof-msg-bubble">
                      {msg.sender === 'ai' && <div className="prof-side-avatar">👨‍🏫</div>}
                      <div className="prof-text-content">
                        {msg.text.split('\n').map((line, i) => (
                          <p key={i}>{line}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}

              {isTyping && (
                <div className="prof-msg-row ai-row anim-pop-in">
                  <div className="prof-msg-bubble">
                    <div className="prof-side-avatar">👨‍🏫</div>
                    <div className="prof-typing-wave">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="prof-actions-dock">
              <div className="prof-card-rule prof-card-rule--subtle" aria-hidden="true" />
              <div
                className="prof-composer-unified"
                role="group"
                aria-label="Escrever e enviar mensagem"
              >
                <label className="prof-composer-input-area">
                  <span className="sr-only">Mensagem para o professor</span>
                  <textarea
                    className="prof-composer-input"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Escreva algo em '${activeCategory.label}'...`}
                    rows={1}
                    autoComplete="off"
                  />
                </label>
                <button
                  type="button"
                  className={`prof-search-toggle ${isSearchEnabled ? 'active' : ''}`}
                  onClick={() => setIsSearchEnabled(!isSearchEnabled)}
                  title={isSearchEnabled ? 'Desativar pesquisa IA' : 'Ativar pesquisa IA (mais lento, porém mais preciso)'}
                >
                  {iconSvg('search')}
                </button>
                <button
                  type="button"
                  className="prof-send-command"
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || isTyping}
                  aria-label="Enviar mensagem"
                >
                  {iconSvg('sendArrow')}
                </button>
              </div>
              <p className="prof-safety-note">As respostas da IA podem ser imprecisas.</p>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
