const PROFESSOR_CHATS_KEY = 'apice:professor-chats:v1'
const LEGACY_PROFESSOR_CONVERSATIONS_KEY = 'apice:professor:conversations'
export const PROFESSOR_CHATS_UPDATED_EVENT = 'apice:professor-chats-updated'

export const PROFESSOR_MAX_INPUT_CHARS = 8000
export const PROFESSOR_MAX_CHAT_CHARS = 60000
export const PROFESSOR_MAX_LOCAL_CHATS = 30
export const PROFESSOR_MAX_CLOUD_CHATS = 10

const DEFAULT_CHAT_TITLE = 'Novo chat'
const LEGACY_CHAT_TITLES = {
  duvidas: 'Dúvidas antigas',
  resumos: 'Resumos antigos',
  pratica: 'Prática antiga',
  mapas: 'Mapas antigos',
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function trimText(value, maxLength = 1000) {
  return String(value ?? '').trim().slice(0, maxLength)
}

function normalizeQuestionOptionText(value) {
  const raw = typeof value === 'object' && value
    ? value.texto ?? value.text ?? value.label ?? value.value ?? value.conteudo ?? value.resposta ?? value.alternativa
    : value
  const text = trimText(raw, 500).replace(/\s+/g, ' ')
  const withoutLetter = text.replace(/^[A-Da-d]\s*[).:-]\s*/, '').trim()
  const normalized = withoutLetter || text
  return /^[A-Da-d]$/.test(normalized) ? '' : normalized
}

function extractQuestionOptions(question) {
  const rawCollections = [
    question?.opcoes,
    question?.alternativas,
    question?.options,
    question?.alternatives,
    question?.choices,
  ]

  for (const collection of rawCollections) {
    if (Array.isArray(collection)) {
      const options = collection.map(normalizeQuestionOptionText).filter(Boolean).slice(0, 4)
      if (options.length === 4) return options
    }

    if (collection && typeof collection === 'object') {
      const options = ['a', 'b', 'c', 'd']
        .map((letter) => collection[letter] ?? collection[letter.toUpperCase()])
        .map(normalizeQuestionOptionText)
        .filter(Boolean)
        .slice(0, 4)
      if (options.length === 4) return options
    }
  }

  return ['a', 'b', 'c', 'd']
    .map((letter) => (
      question?.[letter]
      ?? question?.[letter.toUpperCase()]
      ?? question?.[`opcao${letter.toUpperCase()}`]
      ?? question?.[`alternativa${letter.toUpperCase()}`]
      ?? question?.[`option${letter.toUpperCase()}`]
    ))
    .map(normalizeQuestionOptionText)
    .filter(Boolean)
    .slice(0, 4)
}

function moveCorrectOption(question, targetIndex) {
  const options = Array.isArray(question?.opcoes) ? question.opcoes.slice(0, 4) : []
  const currentIndex = Number(question?.correta)
  if (options.length !== 4 || currentIndex === targetIndex) return question

  const correctOption = options[currentIndex]
  const remaining = options.filter((_, index) => index !== currentIndex)
  const reordered = []

  for (let index = 0; index < 4; index += 1) {
    reordered[index] = index === targetIndex ? correctOption : remaining.shift()
  }

  return {
    ...question,
    opcoes: reordered,
    correta: targetIndex,
  }
}

function balanceQuestionAnswers(questions = []) {
  const normalized = Array.isArray(questions) ? questions : []
  if (normalized.length < 2) return normalized

  const counts = normalized.reduce((acc, question) => {
    const index = Number(question?.correta)
    acc[index] = (acc[index] || 0) + 1
    return acc
  }, {})
  const maxAllowed = Math.ceil(normalized.length / 4)
  const needsBalance = Object.values(counts).some((count) => count > maxAllowed)
  if (!needsBalance) return normalized

  const pattern = [0, 1, 2, 3]
  return normalized.map((question, index) => moveCorrectOption(question, pattern[index % pattern.length]))
}

function nowIso() {
  return new Date().toISOString()
}

function createId(prefix = 'prof') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function createProfessorChat(overrides = {}) {
  const createdAt = trimText(overrides.createdAt, 40) || nowIso()
  return {
    id: trimText(overrides.id, 120) || createId('chat'),
    title: trimText(overrides.title, 80) || DEFAULT_CHAT_TITLE,
    messages: normalizeProfessorMessages(overrides.messages || []),
    createdAt,
    updatedAt: trimText(overrides.updatedAt, 40) || createdAt,
  }
}

export function normalizeProfessorMessage(rawMessage, index = 0) {
  if (!rawMessage || typeof rawMessage !== 'object') return null

  const sender = rawMessage.sender === 'user' ? 'user' : 'ai'
  const text = trimText(rawMessage.text ?? rawMessage.content ?? rawMessage.message, 12000)
  if (!text && !Array.isArray(rawMessage.questions)) return null

  const createdAt = trimText(rawMessage.createdAt, 40) || nowIso()
  const normalized = {
    id: trimText(rawMessage.id, 120) || createId(`msg-${index}`),
    sender,
    text,
    createdAt,
  }

  if (rawMessage.status === 'error' || rawMessage.status === 'limit') {
    normalized.status = rawMessage.status
  }

  if (rawMessage.action === 'create_chat') {
    normalized.action = 'create_chat'
  }

  if (rawMessage.action === 'retry' && rawMessage.status === 'error') {
    normalized.action = 'retry'
  }

  if (normalized.status === 'error') {
    const retryText = trimText(rawMessage.retryText, PROFESSOR_MAX_INPUT_CHARS)
    const retryOf = trimText(rawMessage.retryOf, 12000)
    if (retryText) normalized.retryText = retryText
    if (retryOf) normalized.retryOf = retryOf
  }

  if (Array.isArray(rawMessage.sources)) {
    normalized.sources = rawMessage.sources
      .map((source) => ({
        nome: trimText(source?.nome ?? source?.fonte ?? source?.title, 120),
        url: trimText(source?.url, 500),
        trecho: trimText(source?.trecho ?? source?.texto ?? source?.content, 300),
      }))
      .filter((source) => source.nome || source.url || source.trecho)
      .slice(0, 8)
  }

  if (Array.isArray(rawMessage.questions)) {
    normalized.questions = normalizeProfessorQuestions(rawMessage.questions)
  }

  return normalized
}

export function normalizeProfessorQuestions(rawQuestions) {
  const questionList = Array.isArray(rawQuestions)
    ? rawQuestions
    : rawQuestions && typeof rawQuestions === 'object'
      ? Object.values(rawQuestions)
      : []

  const normalizedQuestions = questionList
    .map((question, index) => {
      const statement = trimText(question?.enunciado ?? question?.statement ?? question?.pergunta, 1200)
      const options = extractQuestionOptions(question)

      if (!statement || options.length !== 4) return null

      const correctRaw = question?.correta ?? question?.correctIndex ?? question?.correct ?? question?.respostaCorreta
      let correctIndex = Number.isFinite(Number(correctRaw)) ? Number(correctRaw) : -1
      if (typeof correctRaw === 'string') {
        const letterIndex = ['a', 'b', 'c', 'd'].indexOf(correctRaw.trim().toLowerCase())
        if (letterIndex >= 0) correctIndex = letterIndex
      }

      if (correctIndex < 0 || correctIndex > 3) correctIndex = 0

      return {
        id: trimText(question?.id, 100) || createId(`q-${index}`),
        enunciado: statement,
        opcoes: options,
        correta: correctIndex,
        explicacao: trimText(question?.explicacao ?? question?.explanation ?? question?.feedback, 1200),
      }
    })
    .filter(Boolean)
    .slice(0, 5)

  return balanceQuestionAnswers(normalizedQuestions)
}

export function normalizeProfessorMessages(rawMessages) {
  if (!Array.isArray(rawMessages)) return []
  return rawMessages
    .map((message, index) => normalizeProfessorMessage(message, index))
    .filter(Boolean)
}

export function normalizeProfessorChat(rawChat, index = 0) {
  if (!rawChat || typeof rawChat !== 'object') return null

  const messages = normalizeProfessorMessages(rawChat.messages)
  const createdAt = trimText(rawChat.createdAt, 40) || nowIso()
  const updatedAt = trimText(rawChat.updatedAt, 40) || createdAt

  return {
    id: trimText(rawChat.id, 120) || createId(`chat-${index}`),
    title: trimText(rawChat.title ?? rawChat.nome ?? rawChat.name, 80) || DEFAULT_CHAT_TITLE,
    messages,
    createdAt,
    updatedAt,
  }
}

export function normalizeProfessorChats(rawChats, limit = PROFESSOR_MAX_LOCAL_CHATS) {
  const chats = Array.isArray(rawChats)
    ? rawChats
      .map((chat, index) => normalizeProfessorChat(chat, index))
      .filter(Boolean)
    : []

  const deduped = []
  const seen = new Set()

  for (const chat of chats) {
    if (seen.has(chat.id)) continue
    seen.add(chat.id)
    deduped.push(chat)
  }

  return deduped
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit)
}

export function loadProfessorChats() {
  if (!canUseStorage()) return [createProfessorChat()]

  try {
    const raw = localStorage.getItem(PROFESSOR_CHATS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    const chats = normalizeProfessorChats(parsed)
    if (chats.length > 0) return chats

    const legacyRaw = localStorage.getItem(LEGACY_PROFESSOR_CONVERSATIONS_KEY)
    const legacyParsed = legacyRaw ? JSON.parse(legacyRaw) : null
    if (legacyParsed && typeof legacyParsed === 'object' && !Array.isArray(legacyParsed)) {
      const migrated = Object.entries(legacyParsed)
        .map(([categoryId, messages], index) => createProfessorChat({
          id: `legacy-${categoryId}-${Date.now()}-${index}`,
          title: LEGACY_CHAT_TITLES[categoryId] || 'Chat antigo',
          messages: normalizeProfessorMessages(messages),
          createdAt: nowIso(),
          updatedAt: nowIso(),
        }))
        .filter((chat) => chat.messages.length > 0)

      if (migrated.length > 0) {
        const normalizedMigrated = normalizeProfessorChats(migrated)
        localStorage.setItem(PROFESSOR_CHATS_KEY, JSON.stringify(normalizedMigrated))
        return normalizedMigrated
      }
    }
  } catch {
    return [createProfessorChat()]
  }

  return [createProfessorChat()]
}

export function saveProfessorChats(chats) {
  const normalized = normalizeProfessorChats(chats)
  const safeChats = normalized.length > 0 ? normalized : [createProfessorChat()]

  if (canUseStorage()) {
    localStorage.setItem(PROFESSOR_CHATS_KEY, JSON.stringify(safeChats))
    window.dispatchEvent(new CustomEvent(PROFESSOR_CHATS_UPDATED_EVENT))
  }

  return safeChats
}

export function getProfessorChatCharCount(chat) {
  const messages = Array.isArray(chat?.messages) ? chat.messages : []
  return messages.reduce((total, message) => total + String(message?.text ?? '').length, 0)
}

export function compactProfessorChatsForCloud(chats, limit = PROFESSOR_MAX_CLOUD_CHATS) {
  return normalizeProfessorChats(chats, limit)
    .map((chat) => ({
      id: chat.id,
      title: chat.title,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      messages: normalizeProfessorMessages(chat.messages)
        .slice(-24)
        .map((message) => ({
          id: message.id,
          sender: message.sender,
          text: trimText(message.text, 6000),
          createdAt: message.createdAt,
          ...(message.status ? { status: message.status } : {}),
          ...(message.action ? { action: message.action } : {}),
          ...(message.retryText ? { retryText: trimText(message.retryText, PROFESSOR_MAX_INPUT_CHARS) } : {}),
          ...(message.retryOf ? { retryOf: trimText(message.retryOf, 12000) } : {}),
          ...(message.sources?.length ? { sources: message.sources.slice(0, 6) } : {}),
          ...(message.questions?.length ? { questions: message.questions } : {}),
        })),
    }))
}

export function mergeProfessorChats(localChats, cloudChats) {
  const local = normalizeProfessorChats(localChats)
  const cloud = normalizeProfessorChats(cloudChats, PROFESSOR_MAX_CLOUD_CHATS)
  const byId = new Map()

  for (const chat of cloud) {
    byId.set(chat.id, chat)
  }

  for (const chat of local) {
    const existing = byId.get(chat.id)
    if (!existing) {
      byId.set(chat.id, chat)
      continue
    }

    const existingUpdated = new Date(existing.updatedAt).getTime()
    const localUpdated = new Date(chat.updatedAt).getTime()
    byId.set(chat.id, localUpdated >= existingUpdated ? chat : existing)
  }

  return normalizeProfessorChats(Array.from(byId.values()))
}

export function buildProfessorTitleFromMessage(message) {
  const text = trimText(message, 80)
    .replace(/\s+/g, ' ')
    .replace(/[?.!,;:]+$/g, '')
    .trim()

  if (!text) return DEFAULT_CHAT_TITLE
  if (text.length <= 44) return text
  return `${text.slice(0, 43).trim()}...`
}
