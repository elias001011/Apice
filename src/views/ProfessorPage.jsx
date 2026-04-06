import { useState, useRef, useEffect, useCallback } from 'react'
import { CATEGORIES } from '../data/mockProfessorData.js'
import { chamarIAEspecifica, buscarContexto } from '../services/aiService.js'
import '../styles/professor.css'

const STORAGE_KEY = 'apice:professor:conversations'
const MAX_CHAT_HISTORY = 12 // Limita histórico enviado para IA (economia de tokens)

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
  const messagesWallRef = useRef(null)

  const activeMessages = conversations[activeCategory.id]

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

  const handleSendMessage = async () => {
    if (!inputText.trim() || isTyping) return

    const userMessage = inputText.trim()
    setInputText('')
    setAiError(false)

    setConversations(prev => ({
      ...prev,
      [activeCategory.id]: [
        ...prev[activeCategory.id],
        { id: Date.now(), sender: 'user', text: userMessage }
      ]
    }))

    setIsTyping(true)

    // Monta histórico recente para contexto da IA
    const recentMessages = activeMessages
      .slice(-MAX_CHAT_HISTORY)
      .filter(msg => msg.sender === 'user' || msg.sender === 'ai')
      .map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }))

    const systemPrompt = `Você é um professor especialista no ENEM, atuando na categoria "${activeCategory.label}".

DIRETRIZES:
- ${activeCategory.id === 'duvidas' ? 'Explique de forma clara, passo a passo, com exemplos quando possível.' : ''}
- ${activeCategory.id === 'resumos' ? 'Crie resumos objetivos com os pontos mais importantes para o ENEM. Use tópicos e seja direto.' : ''}
- ${activeCategory.id === 'mapas' ? 'Estruture respostas como mapas mentais, com hierarquia visual usando caracteres como ─, ├, └, ●.' : ''}
- ${activeCategory.id === 'pratica' ? 'Crie questões inéditas no estilo ENEM com 5 alternativas (A-E). Após o aluno responder, dê feedback detalhado.' : ''}
- Use linguagem acessível mas não infantilize.
- Se não souber, seja honesto.
- Mantenha o foco no contexto do ENEM e no Brasil.
- Responda em português do Brasil.

Responda SOMENTE com JSON válido neste formato:
{
  "texto": "sua resposta completa aqui, com quebras de linha \\n para parágrafos"
}

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

    const finalSystemPrompt = systemPrompt + (searchContextText ? `\n\n${searchContextText}` : '')

    const userMessages = [
      ...recentMessages,
      { role: 'user', content: userMessage }
    ]

    try {
      const response = await chamarIAEspecifica({
        provider: 'groq',
        modelVariant: 'secondary',
        systemPrompt: finalSystemPrompt,
        userMessages,
      })

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
        [activeCategory.id]: [
          ...prev[activeCategory.id],
          { id: Date.now(), sender: 'ai', text: aiText || fallback }
        ]
      }))
      setAiError(false)
    } catch (error) {
      console.error('Erro ao chamar IA do Professor:', error)
      // Fallback: usa resposta offline se IA falhar
      const mockResponse = getFallbackResponse(activeCategory.id)
      setConversations(prev => ({
        ...prev,
        [activeCategory.id]: [
          ...prev[activeCategory.id],
          { id: Date.now(), sender: 'ai', text: mockResponse }
        ]
      }))
      setAiError(true)
    } finally {
      setIsTyping(false)
    }
  }

  // Fallback simples caso IA falhe
  const FALLBACK_RESPONSES = {
    duvidas: [
      "Essa dúvida é comum. Para entender melhor, revise o contexto histórico e as causas principais. Quer que eu explique algum ponto específico?",
      "Boa pergunta! Pense na regra geral e depois nas exceções. Isso ajuda a fixar o conceito.",
    ],
    resumos: [
      "Resumo rápido: foque nos 3 pontos principais — causas, desenvolvimento e consequências. Isso cobre o essencial para o ENEM.",
      "Dica: organize em tópicos curtos. Cause → Efeito → Solução. Funciona pra quase tudo no ENEM.",
    ],
    mapas: [
      "Estrutura básica:\n[TEMA CENTRAL]\n├── Causas\n├── Desenvolvimento\n├── Consequências\n└── Soluções/Exemplos",
      "Mapa mental:\nCentro: Conceito\n→ Esquerda: Teoria\n→ Direita: Prática\n→ Cima: Contexto histórico\n→ Baixo: Atualidade",
    ],
    pratica: [
      "Questão rápida: No contexto da independência do Brasil, qual foi o papel da elite econômica?\nA) Financiaram a guerra\nB) Mantiveram apoio a Portugal\nC) Buscaram autonomia comercial\nD) Não participaram\nE) Criaram milícias\n\nPense e me diz!",
      "Desafio: O que foi o AI-5 e qual seu impacto na sociedade brasileira? Responda com suas palavras que eu te dou feedback.",
    ],
    fallback: [
      "Entendi. Vou te ajudar a destrinchar isso. Pode reformular a pergunta ou ser mais específico?",
      "Ponto interessante! Me conta mais sobre o que já sabe pra eu adaptar a explicação.",
    ],
  }

  function getFallbackResponse(categoryId) {
    const responses = FALLBACK_RESPONSES[categoryId] || FALLBACK_RESPONSES.fallback
    return responses[Math.floor(Math.random() * responses.length)]
  }

  const handleClearHistory = () => {
    setConversations(prev => ({
      ...prev,
      [activeCategory.id]: [{ id: Date.now(), sender: 'ai', text: activeCategory.welcomeMessage }]
    }))
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
                  {aiError && <span className="prof-ai-error-badge" title="Usando resposta offline (IA indisponível)"> ⚠️ Offline</span>}
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

          <main className="prof-chat-surface">
            <div
              ref={messagesWallRef}
              className="prof-messages-wall"
              role="log"
              aria-live="polite"
              aria-relevant="additions"
            >
              {activeMessages.map((msg, index) => (
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
              ))}

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
