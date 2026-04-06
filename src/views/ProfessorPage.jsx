import { useState, useRef, useEffect, useCallback } from 'react'
import { CATEGORIES, getRandomMockResponse } from '../data/mockProfessorData.js'
import '../styles/professor.css'

const STORAGE_KEY = 'apice:professor:conversations'

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
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)

  const activeMessages = conversations[activeCategory.id]

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [activeMessages, isTyping, scrollToBottom])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations))
    } catch (e) {
      console.error('Failed to save professor conversation', e)
    }
  }, [conversations])

  const handleSendMessage = () => {
    if (!inputText.trim() || isTyping) return

    const userMessage = inputText.trim()
    setInputText('')
    
    setConversations(prev => ({
      ...prev,
      [activeCategory.id]: [
        ...prev[activeCategory.id], 
        { id: Date.now(), sender: 'user', text: userMessage }
      ]
    }))

    setIsTyping(true)

    setTimeout(() => {
      const botResponse = getRandomMockResponse(activeCategory.id)
      setConversations(prev => ({
        ...prev,
        [activeCategory.id]: [
          ...prev[activeCategory.id], 
          { id: Date.now(), sender: 'ai', text: botResponse }
        ]
      }))
      setIsTyping(false)
    }, 800 + Math.random() * 800)
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
                  onClick={() => {
                    setActiveCategory(cat)
                    scrollToBottom('auto')
                  }}
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
                <span className="prof-session-meta">IA Experimental</span>
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
            <div className="prof-messages-wall" role="log" aria-live="polite" aria-relevant="additions">
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
              <div ref={messagesEndRef} />
            </div>

            <div className="prof-actions-dock">
              <div className="prof-card-rule prof-card-rule--subtle" aria-hidden="true" />
              <div className="prof-composer-row">
                <label className="prof-composer-field">
                  <span className="sr-only">Mensagem para o professor</span>
                  <textarea
                    className="prof-composer-input"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Escreva algo em '${activeCategory.label}'...`}
                    rows={2}
                    autoComplete="off"
                  />
                </label>
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
