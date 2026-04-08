import { useState, useRef, useEffect, useCallback } from 'react'
import { CATEGORIES } from '../data/mockProfessorData.js'
import { chamarIAEspecifica, buscarContexto } from '../services/aiService.js'
import '../styles/professor.css'

const STORAGE_KEY = 'apice:professor:conversations'
const MAX_CHAT_HISTORY = 12 // Limita o historico enviado para IA
const EMPTY_MESSAGES = []
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

function extractAiText(response) {
  if (typeof response === 'string') {
    const trimmed = response.trim()
    if (!trimmed) return ''

    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      const parsed = safeJsonParse(trimmed)
      if (parsed) {
        const nested = extractAiText(parsed)
        if (nested) return nested
      }
    }

    return trimmed
  }

  if (!response || typeof response !== 'object') return ''

  const candidates = [
    response.texto,
    response.text,
    response.content,
    response.message,
    response.response,
    response.output,
    response.answer,
    response.reply,
  ]

  for (const candidate of candidates) {
    if (candidate == null) continue

    if (typeof candidate === 'string') {
      const trimmed = candidate.trim()
      if (!trimmed) continue

      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        const parsed = safeJsonParse(trimmed)
        if (parsed) {
          const nested = extractAiText(parsed)
          if (nested) return nested
        }
      }

      return trimmed
    }

    if (typeof candidate === 'object') {
      const nested = extractAiText(candidate)
      if (nested) return nested
    }
  }

  return ''
}

function buildSystemPrompt(category) {
  const lines = [
    `Você é um professor especialista no ENEM, atuando na categoria "${category.label}".`,
    '',
    'DIRETRIZES:',
  ]

  if (category.id === 'duvidas') {
    lines.push('- Explique de forma clara, passo a passo, com exemplos quando possível.')
  }

  if (category.id === 'resumos') {
    lines.push('- Crie resumos objetivos com os pontos mais importantes para o ENEM. Use tópicos e seja direto.')
  }

  if (category.id === 'mapas') {
    lines.push('- Para Mapas Mentais, responda somente com uma estrutura textual organizada, sem JSON, sem canvas, sem PDF e sem comentários técnicos.')
  }

  if (category.id === 'pratica') {
    lines.push('- Crie questões inéditas no estilo ENEM com 5 alternativas (A-E). Após o aluno responder, dê feedback detalhado.')
  }

  lines.push(
    '- Use linguagem acessível, mas não infantilize.',
    '- Se não souber, seja honesto.',
    '- Mantenha o foco no contexto do ENEM e no Brasil.',
    '- Responda em português do Brasil.',
  )

  if (category.id === 'mapas') {
    lines.push(
      '',
      'INSTRUCOES EXTRA PARA O MAPA MENTAL POR ESCRITO:',
      '- Comece com "Tema central:" seguido do assunto principal.',
      '- Em seguida, liste de 5 a 8 ramos principais com nomes concretos.',
      '- Abaixo de cada ramo, use de 1 a 3 subtópicos curtos quando fizer sentido.',
      '- Use recuo ou marcadores para deixar a hierarquia visível.',
      '- Prefira palavras-chave e expressões curtas.',
      '- Não escreva parágrafos longos nem use rótulos genéricos como "tópico", "item" ou "assunto".',
      '- Entregue o texto pronto para leitura, como um mapa mental escrito.',
    )
  }

  lines.push('', 'Histórico recente da conversa (para manter coerência):')
  return lines.join('\n')
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

function renderMessageBody(messageText, isMindmap) {
  const text = String(messageText || '').trim()
  if (!text) return null

  if (isMindmap) {
    return <div className="prof-text-content prof-text-content--mindmap">{text}</div>
  }

  return (
    <div className="prof-text-content">
      {text.split('\n').map((line, index) => (
        <p key={`${index}-${line}`}>{line}</p>
      ))}
    </div>
  )
}

export function ProfessorPage() {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0])
  const messageIdRef = useRef(0)

  const [conversations, setConversations] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch (error) {
      console.error('Failed to load professor conversation', error)
    }

    const initial = {}
    CATEGORIES.forEach((cat, index) => {
      initial[cat.id] = [{ id: Date.now() + index, sender: 'ai', text: cat.welcomeMessage }]
    })
    return initial
  })

  const [inputText, setInputText] = useState('')
  const [isSearchEnabled, setIsSearchEnabled] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [aiError, setAiError] = useState(false)
  const messagesWallRef = useRef(null)

  const activeMessages = Array.isArray(conversations[activeCategory.id]) ? conversations[activeCategory.id] : EMPTY_MESSAGES

  const nextMessageId = useCallback(() => {
    const now = Date.now()
    messageIdRef.current += 1
    return now + messageIdRef.current
  }, [])

  const isBrowserOffline = useCallback(() => {
    if (typeof navigator === 'undefined') return false
    return navigator.onLine === false
  }, [])

  /** Rola so a lista de mensagens - evita scrollIntoView, que puxa a pagina inteira. */
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
    } catch (error) {
      console.error('Failed to save professor conversation', error)
    }
  }, [conversations])

  const handleSendMessage = async () => {
    if (!inputText.trim() || isTyping) return

    if (isBrowserOffline()) {
      setAiError(true)
      window.alert('Voce esta offline. Verifique sua conexao para continuar usando o Professor IA.')
      return
    }

    const userMessage = inputText.trim()
    const categoryAtSend = activeCategory
    const categoryId = categoryAtSend.id
    const categoryMessages = Array.isArray(conversations[categoryId]) ? conversations[categoryId] : []

    setInputText('')
    setAiError(false)

    setConversations((prev) => ({
      ...prev,
      [categoryId]: [
        ...(Array.isArray(prev[categoryId]) ? prev[categoryId] : []),
        { id: nextMessageId(), sender: 'user', text: userMessage },
      ],
    }))

    setIsTyping(true)

    const recentMessages = categoryMessages
      .slice(-MAX_CHAT_HISTORY)
      .filter((msg) => msg.sender === 'user' || msg.sender === 'ai')
      .map((msg) => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text,
      }))

    const systemPrompt = buildSystemPrompt(categoryAtSend)

    let searchContextText = ''
    if (isSearchEnabled) {
      try {
        const searchResult = await buscarContexto(userMessage)
        if (searchResult) {
          const cardsText = (searchResult.cards || [])
            .map((card) => `- ${card.titulo}: ${card.texto} (${card.fonte})`)
            .join('\n')

          searchContextText = [
            '',
            '--- CONTEXTO FACTUAL PESQUISADO (USE ISSO PARA ENRIQUECER A RESPOSTA) ---',
            `Resumo: ${searchResult.resumo || 'Sem resumo.'}`,
            'Dados relevantes:',
            cardsText || 'Nenhum dado especifico encontrado.',
            '-------------------------------------------------------------------------',
            '',
          ].join('\n')
        }
      } catch (error) {
        console.error('Falha na busca de contexto:', error)
      }
    }

    const finalSystemPrompt = systemPrompt + (searchContextText ? `\n\n${searchContextText}` : '')

    const userMessages = [
      ...recentMessages,
      { role: 'user', content: userMessage },
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
        } catch (error) {
          errors.push(error)
          console.warn(
            `Falha no provider ${config.provider} (${config.modelVariant}) para Professor IA.`,
            error,
          )
        }
      }

      const lastError = errors[errors.length - 1]
      throw lastError || new Error('Nenhum provedor respondeu no Professor IA.')
    }

    try {
      const response = await callProfessorIa()
      const aiText = extractAiText(response)

      if (!aiText) {
        throw new Error('Resposta vazia da IA')
      }

      setConversations((prev) => ({
        ...prev,
        [categoryId]: [
          ...(Array.isArray(prev[categoryId]) ? prev[categoryId] : []),
          { id: nextMessageId(), sender: 'ai', text: aiText },
        ],
      }))
      setAiError(false)
    } catch (error) {
      console.error('Erro ao chamar IA do Professor:', error)
      const rawMessage = String(error?.message || '').toLowerCase()
      const isQuotaBlocked = error?.code === 'quota_blocked' || rawMessage.includes('limite do plano free')
      const isOffline = isBrowserOffline()

      setConversations((prev) => ({
        ...prev,
        [categoryId]: [
          ...(Array.isArray(prev[categoryId]) ? prev[categoryId] : []),
          {
            id: nextMessageId(),
            sender: 'ai',
            text: isQuotaBlocked
              ? 'Voce atingiu o limite diario de IA no plano atual. Tente novamente amanha ou faca upgrade do plano.'
              : isOffline
              ? 'Estou sem conexao no momento. Verifique sua internet e tente novamente.'
              : 'O servico de IA esta indisponivel no momento. Ja tentei provedores alternativos. Tente novamente em alguns segundos.',
          },
        ],
      }))

      if (isOffline) {
        window.alert('Conexao offline detectada. O Professor IA nao consegue responder sem internet.')
      } else if (isQuotaBlocked) {
        window.alert('Limite diario de IA atingido no plano atual.')
      }
      setAiError(true)
    } finally {
      setIsTyping(false)
    }
  }

  const handleClearHistory = () => {
    setAiError(false)
    setConversations((prev) => ({
      ...prev,
      [activeCategory.id]: [{ id: nextMessageId(), sender: 'ai', text: activeCategory.welcomeMessage }],
    }))
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="professor-sleek-view">
      <div className="professor-container anim-fade-in">
        <header className="professor-nav-header">
          <div className="prof-pills-bar anim-slide-down">
            <div className="prof-pills-scroll">
              {CATEGORIES.map((cat) => (
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
                  {aiError && <span className="prof-ai-error-badge" title="Falha de conexão ou indisponibilidade temporária"> ! Indisponível</span>}
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
            <div
              ref={messagesWallRef}
              className="prof-messages-wall"
              role="log"
              aria-live="polite"
              aria-relevant="additions"
            >
              {activeMessages.map((msg, index) => {
                if (activeCategory.id === 'mapas' && msg.text === '[MAPA_GERADO]') return null

                const isMindmapReply = activeCategory.id === 'mapas' && msg.sender === 'ai'

                return (
                  <div
                    key={msg.id}
                    className={`prof-msg-row ${msg.sender === 'user' ? 'user-row' : 'ai-row'} anim-pop-in`}
                    style={{ animationDelay: `${Math.min(index, 8) * 0.04}s` }}
                  >
                    <div className="prof-msg-bubble">
                      {msg.sender === 'ai' && <div className="prof-side-avatar" aria-hidden="true">👨‍🏫</div>}
                      {renderMessageBody(msg.text, isMindmapReply)}
                    </div>
                  </div>
                )
              })}

              {isTyping && (
                <div className="prof-msg-row ai-row anim-pop-in">
                  <div className="prof-msg-bubble">
                    <div className="prof-side-avatar" aria-hidden="true">👨‍🏫</div>
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
                    onChange={(event) => setInputText(event.target.value)}
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
