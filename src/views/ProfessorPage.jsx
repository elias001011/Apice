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
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      )
    default:
      return <svg viewBox="0 0 24 24" />
  }
}

export function ProfessorPage() {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0])
  
  // Guardar o histórico de mensagens por categoria { "duvidas": [...], "resumos": [...] }
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
    
    // Adicionar mensagem do usuário
    setConversations(prev => ({
      ...prev,
      [activeCategory.id]: [
        ...prev[activeCategory.id], 
        { id: Date.now(), sender: 'user', text: userMessage }
      ]
    }))

    setIsTyping(true)

    // Simular tempo de resposta (1s - 2s)
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
    <div className="view-page professor-page">
      <div className="professor-layout">
        
        {/* Sidebar de Categorias */}
        <aside className="professor-sidebar">
          <div className="professor-sidebar-header">
            <div className="professor-avatar">
              <span className="professor-emoji">👨‍🏫</span>
            </div>
            <h2>Meu Professor</h2>
            <p>Seu assistente pessoal para acelerar os estudos.</p>
          </div>
          <div className="professor-categories">
            {CATEGORIES.map(cat => (
              <button 
                key={cat.id}
                className={`category-btn ${activeCategory.id === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                <span className="category-icon">{iconSvg(cat.icon)}</span>
                <div className="category-info">
                  <strong>{cat.label}</strong>
                  <span>{cat.description}</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Área de Chat */}
        <main className="professor-chat-area">
          <header className="chat-header">
            <span className="chat-header-icon">{iconSvg(activeCategory.icon)}</span>
            <div className="chat-header-titles">
              <h3>{activeCategory.label}</h3>
              <span>{activeCategory.description}</span>
            </div>
          </header>

          <div className="chat-messages">
            {activeMessages.map(msg => (
              <div key={msg.id} className={`chat-message ${msg.sender === 'user' ? 'user-message' : 'ai-message'}`}>
                {msg.sender === 'ai' && (
                  <div className="message-avatar">👨‍🏫</div>
                )}
                <div className="message-content">
                  {msg.text.split('\n').map((line, i) => (
                    <span key={i}>
                      {line}
                      <br />
                    </span>
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

          <footer className="chat-input-area">
            <div className="chat-input-wrapper">
              <textarea 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Mensagem em '${activeCategory.label}'...`}
                rows={1}
                aria-label="Digite sua mensagem"
              />
              <button 
                className="btn btn-primary send-btn" 
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isTyping}
                aria-label="Enviar mensagem"
              >
                {iconSvg('send')}
              </button>
            </div>
            <p className="chat-disclaimer">A inteligência artificial pode cometer erros. Considere verificar informações vitais.</p>
          </footer>
        </main>
      </div>
    </div>
  )
}
