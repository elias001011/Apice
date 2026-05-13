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
  if (!Array.isArray(rawQuestions)) return []

  return rawQuestions
    .map((question, index) => {
      const statement = trimText(question?.enunciado ?? question?.statement ?? question?.pergunta, 1200)
      const rawOptions = Array.isArray(question?.opcoes)
        ? question.opcoes
        : Array.isArray(question?.options)
          ? question.options
          : []

      const options = rawOptions
        .map((option) => trimText(option?.texto ?? option?.text ?? option, 500))
        .filter(Boolean)
        .slice(0, 4)

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
