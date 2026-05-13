import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { chamarProfessorIA } from '../services/aiService.js'
import { clearProfessorHandoff, loadProfessorHandoff, normalizeProfessorHandoff } from '../services/professorHandoff.js'
import {
  PROFESSOR_MAX_CHAT_CHARS,
  PROFESSOR_MAX_INPUT_CHARS,
  buildProfessorTitleFromMessage,
  createProfessorChat,
  getProfessorChatCharCount,
  loadProfessorChats,
  normalizeProfessorQuestions,
  saveProfessorChats,
} from '../services/professorChats.js'
import '../styles/professor.css'

const HISTORY_MESSAGES_LIMIT = 14

function createMessage({ sender, text, questions, sources, status, action }) {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sender,
    text: String(text ?? '').trim(),
    createdAt: new Date().toISOString(),
    ...(questions?.length ? { questions: normalizeProfessorQuestions(questions) } : {}),
    ...(sources?.length ? { sources } : {}),
    ...(status ? { status } : {}),
    ...(action ? { action } : {}),
  }
}

function normalizeAiText(value) {
  if (typeof value === 'string') return value.trim()
  if (!value || typeof value !== 'object') return ''
  return String(value.response ?? value.text ?? value.resposta ?? value.message ?? '').trim()
}

function buildHistoryPayload(messages = []) {
  return messages
    .filter((message) => message?.sender === 'user' || message?.sender === 'ai')
    .filter((message) => message?.text && message.status !== 'limit')
    .slice(-HISTORY_MESSAGES_LIMIT)
    .map((message) => ({
      role: message.sender === 'user' ? 'user' : 'assistant',
      content: message.text,
    }))
}

function splitInlineMarkdown(text) {
  const parts = []
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g
  let last = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    const token = match[0]
    if (token.startsWith('`')) {
      parts.push(<code key={match.index}>{token.slice(1, -1)}</code>)
    } else if (token.startsWith('**')) {
      parts.push(<strong key={match.index}>{token.slice(2, -2)}</strong>)
    } else {
      parts.push(<em key={match.index}>{token.slice(1, -1)}</em>)
    }
    last = match.index + token.length
  }

  if (last < text.length) parts.push(text.slice(last))
  return parts.length > 0 ? parts : text
}

function ProfessorMarkdown({ text }) {
  const lines = String(text ?? '').replace(/\r\n/g, '\n').split('\n')
  const nodes = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    const trimmed = line.trim()

    if (!trimmed) {
      index += 1
      continue
    }

    const h1 = trimmed.match(/^#\s+(.+)/)
    const h2 = trimmed.match(/^##\s+(.+)/)
    const h3 = trimmed.match(/^###\s+(.+)/)
    if (h1 || h2 || h3) {
      const Tag = h1 ? 'h2' : h2 ? 'h3' : 'h4'
      const content = (h1 || h2 || h3)[1]
      nodes.push(<Tag key={`h-${index}`}>{splitInlineMarkdown(content)}</Tag>)
      index += 1
      continue
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items = []
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ''))
        index += 1
      }
      nodes.push(
        <ul key={`ul-${index}`}>
          {items.map((item, itemIndex) => <li key={`${item}-${itemIndex}`}>{splitInlineMarkdown(item)}</li>)}
        </ul>,
      )
      continue
    }

    if (/^\d+[.)]\s+/.test(trimmed)) {
      const items = []
      while (index < lines.length && /^\d+[.)]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+[.)]\s+/, ''))
        index += 1
      }
      nodes.push(
        <ol key={`ol-${index}`}>
          {items.map((item, itemIndex) => <li key={`${item}-${itemIndex}`}>{splitInlineMarkdown(item)}</li>)}
        </ol>,
      )
      continue
    }

    const paragraph = [trimmed]
    index += 1
    while (
      index < lines.length
      && lines[index].trim()
      && !/^#{1,3}\s+/.test(lines[index].trim())
      && !/^[-*]\s+/.test(lines[index].trim())
      && !/^\d+[.)]\s+/.test(lines[index].trim())
    ) {
      paragraph.push(lines[index].trim())
      index += 1
    }
    nodes.push(<p key={`p-${index}`}>{splitInlineMarkdown(paragraph.join(' '))}</p>)
  }

  return <div className="prof-markdown">{nodes}</div>
}

function iconSvg(kind) {
  switch (kind) {
    case 'plus':
      return <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
    case 'trash':
      return <svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15" /><path d="M10 11v6M14 11v6" /></svg>
    case 'send':
      return <svg viewBox="0 0 24 24"><path d="M22 2 11 13" /><path d="m22 2-7 20-4-9-9-4 20-7Z" /></svg>
    case 'mic':
      return <svg viewBox="0 0 24 24"><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" /></svg>
    case 'copy':
      return <svg viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
    case 'check':
      return <svg viewBox="0 0 24 24"><path d="m20 6-11 11-5-5" /></svg>
    case 'volume':
      return <svg viewBox="0 0 24 24"><path d="M11 5 6 9H2v6h4l5 4V5Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></svg>
    case 'refresh':
      return <svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 0 1-15.5 6.2" /><path d="M3 12A9 9 0 0 1 18.5 5.8" /><path d="M3 20v-6h6M21 4v6h-6" /></svg>
    case 'menu':
      return <svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
    case 'close':
      return <svg viewBox="0 0 24 24"><path d="m18 6-12 12M6 6l12 12" /></svg>
    default:
      return <svg viewBox="0 0 24 24" />
  }
}

function QuestionSet({ messageId, questions = [], answers, onAnswer }) {
  if (!questions.length) return null

  const answeredCount = questions.filter((question) => Number.isInteger(answers?.[question.id])).length
  const score = questions.reduce((total, question) => {
    return total + (answers?.[question.id] === question.correta ? 1 : 0)
  }, 0)
  const finished = answeredCount === questions.length

  return (
    <section className="prof-question-card" aria-label="Questões interativas">
      <div className="prof-question-head">
        <div>
          <span>Treino interativo</span>
          <strong>{finished ? `${score}/${questions.length} acertos` : `${answeredCount}/${questions.length} respondidas`}</strong>
        </div>
        <small>4 alternativas por questão</small>
      </div>

      <div className="prof-question-list">
        {questions.map((question, index) => {
          const selected = answers?.[question.id]
          const hasAnswer = Number.isInteger(selected)

          return (
            <article className="prof-question-item" key={question.id}>
              <div className="prof-question-number">Questão {index + 1}</div>
              <p className="prof-question-statement">{question.enunciado}</p>
              <div className="prof-question-options">
                {question.opcoes.map((option, optionIndex) => {
                  const isSelected = selected === optionIndex
                  const isCorrect = question.correta === optionIndex
                  const stateClass = hasAnswer
                    ? isCorrect
                      ? 'is-correct'
                      : isSelected
                        ? 'is-wrong'
                        : ''
                    : ''

                  return (
                    <button
                      key={`${question.id}-${optionIndex}`}
                      type="button"
                      className={`prof-question-option ${isSelected ? 'is-selected' : ''} ${stateClass}`}
                      onClick={() => onAnswer(messageId, question.id, optionIndex)}
                    >
                      <span>{String.fromCharCode(65 + optionIndex)}</span>
                      <em>{option}</em>
                    </button>
                  )
                })}
              </div>
              {hasAnswer && (
                <div className="prof-question-feedback">
                  <strong>{selected === question.correta ? 'Boa.' : 'Quase.'}</strong>
                  <span>{question.explicacao || `A alternativa correta é ${String.fromCharCode(65 + question.correta)}.`}</span>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

export function ProfessorPage() {
  const location = useLocation()
  const [chats, setChats] = useState(() => loadProfessorChats())
  const [activeChatId, setActiveChatId] = useState(() => loadProfessorChats()[0]?.id)
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [copiedId, setCopiedId] = useState('')
  const [speakingId, setSpeakingId] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [questionAnswers, setQuestionAnswers] = useState({})
  const [queuedHandoff] = useState(() => normalizeProfessorHandoff(location.state?.handoff) || loadProfessorHandoff())
  const threadRef = useRef(null)
  const textareaRef = useRef(null)
  const recognitionRef = useRef(null)
  const handoffConsumedRef = useRef(false)

  const activeChat = chats.find((chat) => chat.id === activeChatId) || chats[0] || createProfessorChat()
  const activeMessages = Array.isArray(activeChat.messages) ? activeChat.messages : []
  const charCount = inputText.length

  const commitChats = useCallback((updater) => {
    setChats((previous) => {
      const next = typeof updater === 'function' ? updater(previous) : updater
      return saveProfessorChats(next)
    })
  }, [])

  const createNewChat = useCallback(() => {
    const chat = createProfessorChat()
    commitChats((previous) => [chat, ...previous])
    setActiveChatId(chat.id)
    setInputText('')
    setSidebarOpen(false)
    return chat
  }, [commitChats])

  useEffect(() => {
    if (activeChatId && chats.some((chat) => chat.id === activeChatId)) return
    setActiveChatId(chats[0]?.id || createNewChat().id)
  }, [activeChatId, chats, createNewChat])

  useEffect(() => {
    const thread = threadRef.current
    if (!thread) return
    thread.scrollTo({ top: thread.scrollHeight, behavior: 'smooth' })
  }, [activeChatId, activeMessages.length, isTyping])

  useEffect(() => {
    const input = textareaRef.current
    if (!input) return
    input.style.height = 'auto'
    input.style.height = `${Math.min(input.scrollHeight, 220)}px`
  }, [inputText])

  useEffect(() => {
    const updateKeyboardOffset = () => {
      const viewport = window.visualViewport
      const offset = viewport
        ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
        : 0
      document.documentElement.style.setProperty('--prof-keyboard-offset', `${Math.round(offset)}px`)
    }

    updateKeyboardOffset()
    window.visualViewport?.addEventListener('resize', updateKeyboardOffset)
    window.visualViewport?.addEventListener('scroll', updateKeyboardOffset)
    window.addEventListener('resize', updateKeyboardOffset)

    return () => {
      window.visualViewport?.removeEventListener('resize', updateKeyboardOffset)
      window.visualViewport?.removeEventListener('scroll', updateKeyboardOffset)
      window.removeEventListener('resize', updateKeyboardOffset)
      document.documentElement.style.removeProperty('--prof-keyboard-offset')
    }
  }, [])

  const updateChatTitle = useCallback((chatId, title) => {
    const cleanTitle = String(title ?? '').trim().slice(0, 80) || 'Novo chat'
    commitChats((previous) => previous.map((chat) => (
      chat.id === chatId
        ? { ...chat, title: cleanTitle, updatedAt: new Date().toISOString() }
        : chat
    )))
  }, [commitChats])

  const deleteChat = useCallback((chatId) => {
    const fallbackChat = createProfessorChat()
    commitChats((previous) => {
      const filtered = previous.filter((chat) => chat.id !== chatId)
      return filtered.length > 0 ? filtered : [fallbackChat]
    })
    if (activeChatId === chatId) {
      const nextChat = chats.find((chat) => chat.id !== chatId) || fallbackChat
      setActiveChatId(nextChat.id)
    }
  }, [activeChatId, chats, commitChats])

  const addLimitMessage = useCallback((chatId) => {
    const limitMessage = createMessage({
      sender: 'ai',
      status: 'limit',
      action: 'create_chat',
      text: 'Você atingiu o comprimento máximo para esse chat. Crie outro para continuar com contexto limpo.',
    })

    commitChats((previous) => previous.map((chat) => (
      chat.id === chatId
        ? {
            ...chat,
            messages: [...chat.messages, limitMessage],
            updatedAt: new Date().toISOString(),
          }
        : chat
    )))
  }, [commitChats])

  const sendToProfessor = useCallback(async ({
    text,
    chatId = activeChatId,
    chatOverride = null,
    historyMessagesOverride = null,
    regenerateMessageId = '',
    retryOf = '',
  } = {}) => {
    const cleanText = String(text ?? inputText).trim().slice(0, PROFESSOR_MAX_INPUT_CHARS)
    if (!cleanText || isTyping) return

    const chatAtSend = chatOverride || chats.find((chat) => chat.id === chatId) || activeChat
    const messagesBefore = Array.isArray(chatAtSend.messages) ? chatAtSend.messages : []
    const historyMessages = Array.isArray(historyMessagesOverride) ? historyMessagesOverride : messagesBefore
    const chatIsTooLong = getProfessorChatCharCount(chatAtSend) + cleanText.length > PROFESSOR_MAX_CHAT_CHARS

    if (chatIsTooLong) {
      addLimitMessage(chatAtSend.id)
      return
    }

    const firstUserMessage = !messagesBefore.some((message) => message.sender === 'user')
    const fallbackTitle = buildProfessorTitleFromMessage(cleanText)
    const userMessage = createMessage({ sender: 'user', text: cleanText })

    setInputText('')
    setIsTyping(true)

    commitChats((previous) => {
      const source = previous.some((chat) => chat.id === chatAtSend.id)
        ? previous
        : [chatAtSend, ...previous]

      return source.map((chat) => {
        if (chat.id !== chatAtSend.id) return chat

        const nextMessages = regenerateMessageId
          ? chat.messages.filter((message) => message.id !== regenerateMessageId)
          : [...chat.messages, userMessage]

        return {
          ...chat,
          title: firstUserMessage && chat.title === 'Novo chat' ? fallbackTitle : chat.title,
          messages: nextMessages,
          updatedAt: new Date().toISOString(),
        }
      })
    })

    try {
      const response = await chamarProfessorIA({
        message: cleanText,
        history: buildHistoryPayload(historyMessages),
        chatTitle: chatAtSend.title,
        shouldGenerateTitle: firstUserMessage,
        retryOf,
      })

      const aiMessage = createMessage({
        sender: 'ai',
        text: normalizeAiText(response),
        questions: response?.questions,
        sources: response?.sources,
      })

      commitChats((previous) => previous.map((chat) => (
        chat.id === chatAtSend.id
          ? {
              ...chat,
              title: firstUserMessage && response?.title
                ? String(response.title).trim().slice(0, 80)
                : chat.title,
              messages: [...chat.messages, aiMessage],
              updatedAt: new Date().toISOString(),
            }
          : chat
      )))
    } catch (error) {
      const errorText = error?.code === 'quota_blocked'
        ? error.message
        : 'O serviço de IA está instável agora. Tente novamente em alguns segundos.'

      commitChats((previous) => previous.map((chat) => (
        chat.id === chatAtSend.id
          ? {
              ...chat,
              messages: [
                ...chat.messages,
                createMessage({ sender: 'ai', status: 'error', text: errorText }),
              ],
              updatedAt: new Date().toISOString(),
            }
          : chat
      )))
    } finally {
      setIsTyping(false)
    }
  }, [activeChat, activeChatId, addLimitMessage, chats, commitChats, inputText, isTyping])

  useEffect(() => {
    const handoff = queuedHandoff
    if (!handoff || handoffConsumedRef.current) return
    handoffConsumedRef.current = true
    clearProfessorHandoff()

    const chat = createNewChat()
    void sendToProfessor({ text: handoff.message, chatId: chat.id, chatOverride: chat })
  }, [createNewChat, queuedHandoff, sendToProfessor])

  const handleInputChange = (event) => {
    const next = event.target.value.slice(0, PROFESSOR_MAX_INPUT_CHARS)
    setInputText(next)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void sendToProfessor()
    }
  }

  const handleCopy = async (message) => {
    try {
      await navigator.clipboard?.writeText(message.text)
      setCopiedId(message.id)
      window.setTimeout(() => setCopiedId((current) => current === message.id ? '' : current), 1600)
    } catch {
      setCopiedId('')
    }
  }

  const handleSpeak = (message) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    if (speakingId === message.id) {
      setSpeakingId('')
      return
    }

    const utterance = new SpeechSynthesisUtterance(message.text)
    utterance.lang = 'pt-BR'
    utterance.rate = 1
    utterance.onend = () => setSpeakingId('')
    utterance.onerror = () => setSpeakingId('')
    setSpeakingId(message.id)
    window.speechSynthesis.speak(utterance)
  }

  const handleRegenerate = (messageId) => {
    const messageIndex = activeMessages.findIndex((message) => message.id === messageId)
    if (messageIndex < 0) return
    const previousUserIndex = activeMessages
      .slice(0, messageIndex)
      .map((message, index) => ({ message, index }))
      .reverse()
      .find((entry) => entry.message.sender === 'user')?.index
    const previousUser = Number.isInteger(previousUserIndex) ? activeMessages[previousUserIndex] : null
    if (!previousUser) return
    void sendToProfessor({
      text: previousUser.text,
      chatId: activeChat.id,
      historyMessagesOverride: activeMessages.slice(0, previousUserIndex),
      regenerateMessageId: messageId,
      retryOf: activeMessages[messageIndex]?.text || '',
    })
  }

  const handleMic = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      window.alert('Seu navegador ainda não suporta transcrição por voz nesta página.')
      return
    }

    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'pt-BR'
    recognition.interimResults = false
    recognition.continuous = false
    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || '')
        .join(' ')
        .trim()

      if (transcript) {
        setInputText((current) => {
          const glue = current.trim() ? ' ' : ''
          return `${current}${glue}${transcript}`.slice(0, PROFESSOR_MAX_INPUT_CHARS)
        })
      }
    }
    recognitionRef.current = recognition
    recognition.start()
  }

  const handleAnswer = (messageId, questionId, optionIndex) => {
    setQuestionAnswers((previous) => ({
      ...previous,
      [messageId]: {
        ...(previous[messageId] || {}),
        [questionId]: optionIndex,
      },
    }))
  }

  return (
    <div className="prof-page">
      <aside className={`prof-sidebar ${sidebarOpen ? 'is-open' : ''}`} aria-label="Histórico do Professor IA">
        <div className="prof-sidebar-top">
          <Link to="/home" className="prof-brand">Ápice</Link>
          <button type="button" className="prof-icon-btn mobile-only" onClick={() => setSidebarOpen(false)} aria-label="Fechar histórico">
            {iconSvg('close')}
          </button>
        </div>

        <button type="button" className="prof-new-chat" onClick={createNewChat}>
          {iconSvg('plus')}
          Novo chat
        </button>

        <div className="prof-chat-list">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`prof-chat-list-item ${chat.id === activeChat.id ? 'active' : ''}`}
            >
              <button
                type="button"
                className="prof-chat-open"
                onClick={() => {
                  setActiveChatId(chat.id)
                  setSidebarOpen(false)
                }}
                aria-label={`Abrir ${chat.title}`}
              >
                <span>{chat.title || 'Novo chat'}</span>
                <small>{chat.messages.length} mensagens</small>
              </button>
              {chat.id === activeChat.id && (
                <input
                  className="prof-title-input"
                  value={chat.title}
                  onChange={(event) => updateChatTitle(chat.id, event.target.value)}
                  aria-label="Editar nome do chat"
                />
              )}
              <button
                type="button"
                className="prof-delete-chat"
                onClick={() => deleteChat(chat.id)}
                aria-label={`Excluir ${chat.title}`}
              >
                {iconSvg('trash')}
              </button>
            </div>
          ))}
        </div>
      </aside>

      {sidebarOpen && <button type="button" className="prof-sidebar-backdrop" aria-label="Fechar histórico" onClick={() => setSidebarOpen(false)} />}

      <section className="prof-main-panel">
        <header className="prof-topbar">
          <button type="button" className="prof-icon-btn" onClick={() => setSidebarOpen(true)} aria-label="Abrir histórico">
            {iconSvg('menu')}
          </button>
          <div>
            <span>Professor IA</span>
            <strong>{activeChat.title}</strong>
          </div>
          <button type="button" className="prof-icon-btn" onClick={createNewChat} aria-label="Criar novo chat">
            {iconSvg('plus')}
          </button>
        </header>

        <main className="prof-thread" ref={threadRef} aria-live="polite">
          {activeMessages.length === 0 && (
            <section className="prof-empty-state">
              <span>Professor IA</span>
              <h1>Explique, treine ou revise qualquer ponto do ENEM.</h1>
              <p>Peça uma explicação, um resumo, um plano de estudo ou um treino com questões interativas.</p>
            </section>
          )}

          {activeMessages.map((message) => (
            <article
              key={message.id}
              className={`prof-message ${message.sender === 'user' ? 'is-user' : 'is-ai'} ${message.status ? `is-${message.status}` : ''}`}
            >
              <div className="prof-message-card">
                <div className="prof-message-kicker">{message.sender === 'user' ? 'Você' : 'Professor IA'}</div>
                <ProfessorMarkdown text={message.text} />
                {message.action === 'create_chat' && (
                  <button type="button" className="prof-inline-create" onClick={createNewChat}>
                    Crie outro
                  </button>
                )}
                {message.sources?.length > 0 && (
                  <div className="prof-sources">
                    <span>Fontes consultadas</span>
                    {message.sources.map((source, sourceIndex) => (
                      source.url ? (
                        <a key={`${source.url}-${sourceIndex}`} href={source.url} target="_blank" rel="noreferrer">
                          {source.nome || source.url}
                        </a>
                      ) : (
                        <small key={`${source.nome}-${sourceIndex}`}>{source.nome || source.trecho}</small>
                      )
                    ))}
                  </div>
                )}
                <QuestionSet
                  messageId={message.id}
                  questions={message.questions || []}
                  answers={questionAnswers[message.id] || {}}
                  onAnswer={handleAnswer}
                />
              </div>

              {message.sender === 'ai' && (
                <div className="prof-message-actions" aria-label="Ações da resposta">
                  <button type="button" onClick={() => handleSpeak(message)}>
                    {iconSvg('volume')}
                    {speakingId === message.id ? 'Parar' : 'Ler'}
                  </button>
                  <button type="button" onClick={() => handleRegenerate(message.id)} disabled={isTyping}>
                    {iconSvg('refresh')}
                    Regenerar
                  </button>
                  <button type="button" onClick={() => handleCopy(message)}>
                    {iconSvg(copiedId === message.id ? 'check' : 'copy')}
                    {copiedId === message.id ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              )}
            </article>
          ))}

          {isTyping && (
            <article className="prof-message is-ai">
              <div className="prof-message-card">
                <div className="prof-message-kicker">Professor IA</div>
                <div className="prof-typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </article>
          )}
        </main>

        <form
          className="prof-composer-card"
          onSubmit={(event) => {
            event.preventDefault()
            void sendToProfessor()
          }}
        >
          <button
            type="button"
            className={`prof-mic-btn ${isListening ? 'is-listening' : ''}`}
            onClick={handleMic}
            aria-label={isListening ? 'Parar transcrição' : 'Transcrever fala'}
          >
            {iconSvg('mic')}
          </button>

          <label className="prof-input-shell">
            <span className="sr-only">Mensagem para o Professor IA</span>
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte, peça um resumo ou solicite questões..."
              rows={1}
              maxLength={PROFESSOR_MAX_INPUT_CHARS}
            />
            <small>{charCount.toLocaleString('pt-BR')}/{PROFESSOR_MAX_INPUT_CHARS.toLocaleString('pt-BR')}</small>
          </label>

          <button
            type="submit"
            className="prof-send-btn"
            disabled={!inputText.trim() || isTyping}
            aria-label="Enviar mensagem"
          >
            {iconSvg('send')}
          </button>
        </form>
      </section>
    </div>
  )
}
