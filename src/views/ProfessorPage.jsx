import { useState, useRef, useEffect } from 'react'
import { CATEGORIES, getRandomMockResponse } from '../data/mockProfessorData.js'
import '../styles/professor.css'

function iconSvg(kind) {
  switch (kind) {
    case 'question':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )
    case 'book':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      )
    case 'mindmap':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      )
    case 'send':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      )
    default:
      return <svg viewBox="0 0 24 24" />
  }
}

export function ProfessorPage() {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0])
  
  const [conversations, setConversations] = useState(() => {
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [activeMessages, isTyping])

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
    }, 1000 + Math.random() * 1000)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <>
      <div className="view-container--wide">
        <div className="professor-intro anim anim-d1" style={{ margin: '3rem auto 2rem', padding: '0 1rem' }}>
          
          <div className="corretor-header" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: '8px', marginBottom: '2rem' }}>
            <h2 className="corretor-title" style={{ fontSize: '2.2rem' }}>Meu Professor</h2>
            <p className="corretor-subtitle" style={{ fontSize: '1rem' }}>Tire dúvidas em tempo real com a inteligência artificial do Ápice.</p>
          </div>

          <div className="corretor-grid">
            {/* COLUNA PRINCIPAL: CHAT */}
            <div className="corretor-column-main">
              <div className="card anim anim-d2 chat-card-container">
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '0' }}>
                  <span style={{ width: '18px', height: '18px', color: 'var(--accent)' }}>{iconSvg(activeCategory.icon)}</span>
                  Sessão Ativa: {activeCategory.label}
                  <span style={{ marginLeft: 'auto', textTransform: 'none', fontWeight: 'normal', color: 'var(--text3)' }}>
                    IA Experimental
                  </span>
                </div>

                <div className="chat-messages-scroll" style={{ padding: '1rem 0' }}>
                  {activeMessages.map(msg => (
                    <div key={msg.id} className={`chat-message ${msg.sender === 'user' ? 'user-message' : 'ai-message'}`}>
                      {msg.sender === 'ai' && (
                        <div className="message-avatar">👨‍🏫</div>
                      )}
                      <div className="message-content">
                        {msg.text.split('\n').map((line, i) => (
                          <span key={i}>{line}<br /></span>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  {isTyping && (
                    <div className="chat-message ai-message">
                      <div className="message-avatar">👨‍🏫</div>
                      <div className="message-content typing-indicator">
                        <span></span><span></span><span></span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="chat-input-native">
                  <textarea 
                    className="textarea-field" 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Escreva algo em '${activeCategory.label}'...`}
                    rows={1}
                    style={{ minHeight: '50px', maxHeight: '150px', flex: 1, padding: '14px', borderRadius: '16px' }}
                  />
                  <button 
                    className="btn-primary" 
                    onClick={handleSendMessage}
                    disabled={!inputText.trim() || isTyping}
                    style={{ padding: '0 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px', boxShadow: 'none' }}
                    aria-label="Enviar"
                  >
                    {iconSvg('send')}
                  </button>
                </div>
              </div>
            </div>

            {/* COLUNA LATERAL: CATEGORIAS */}
            <div className="corretor-column-side">
              <div className="card anim anim-d3 sticky-side">
                <div className="card-title">Modos de Estudo</div>
                <div className="status-mode" style={{ marginBottom: '1.2rem' }}>O que você precisa?</div>
                
                <div className="prof-categories-list">
                  {CATEGORIES.map(cat => (
                    <button 
                      key={cat.id}
                      className={`prof-cat-item ${activeCategory.id === cat.id ? 'active' : ''}`}
                      onClick={() => setActiveCategory(cat)}
                    >
                      <div className="prof-cat-icon">{iconSvg(cat.icon)}</div>
                      <div className="prof-cat-text">
                        <strong>{cat.label}</strong>
                        <span>{cat.description}</span>
                      </div>
                    </button>
                  ))}
                </div>
                
                <div className="side-separator"></div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text3)', textAlign: 'center', margin: 0 }}>
                  Respostas geradas por IA podem ser imprecisas e devem ser verificadas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
