import { useState, useRef, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { CATEGORIES } from '../data/mockProfessorData.js'
import { chamarIAEspecifica, buscarContexto } from '../services/aiService.js'
import { clearProfessorHandoff, loadProfessorHandoff, normalizeProfessorHandoff } from '../services/professorHandoff.js'
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

function isMeaninglessProfessorText(value) {
  const normalized = String(value ?? '').trim().toLowerCase()
  return (
    !normalized
    || normalized === '[object object]'
    || normalized === 'object object'
    || normalized === '{}'
    || normalized === '[]'
  )
}

function normalizeProfessorText(value, seen = new Set()) {
  if (value == null) return ''

  if (typeof value === 'string') {
    const trimmed = value.trim()
    return isMeaninglessProfessorText(trimmed) ? '' : trimmed
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim()
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeProfessorText(item, seen))
      .filter(Boolean)
      .join('\n')
      .trim()
  }

  if (typeof value !== 'object') return ''
  if (seen.has(value)) return ''
  seen.add(value)

  const keys = [
    'response',
    'text',
    'texto',
    'content',
    'message',
    'answer',
    'reply',
    'resposta',
    'mensagem',
    'question',
    'pergunta',
  ]

  for (const key of keys) {
    const nested = normalizeProfessorText(value[key], seen)
    if (nested) return nested
  }

  try {
    const serialized = JSON.stringify(value)
    return isMeaninglessProfessorText(serialized) ? '' : serialized
  } catch {
    return ''
  }
}

function normalizeProfessorConversation(messages, fallbackText, seed = Date.now()) {
  const normalized = Array.isArray(messages)
    ? messages
      .map((message, index) => {
        const sender = message?.sender === 'user' ? 'user' : 'ai'
        const text = normalizeProfessorText(message?.text ?? message?.content ?? message?.message ?? message)
        const rawId = Number(message?.id)

        return {
          id: Number.isFinite(rawId) ? rawId : seed + index + 1,
          sender,
          text: text || (sender === 'ai' ? normalizeProfessorText(fallbackText) : ''),
        }
      })
      .filter((message) => message.text)
    : []

  const welcomeText = normalizeProfessorText(fallbackText) || 'Olá! Como posso ajudar?'

  if (normalized.length === 0) {
    return [{ id: seed, sender: 'ai', text: welcomeText }]
  }

  if (!normalized.some((message) => message.sender === 'ai')) {
    normalized.unshift({ id: seed, sender: 'ai', text: welcomeText })
  }

  return normalized
}

function createDefaultProfessorConversations() {
  const initial = {}
  CATEGORIES.forEach((cat, index) => {
    initial[cat.id] = normalizeProfessorConversation([], cat.welcomeMessage, Date.now() + index)
  })
  return initial
}

function loadProfessorConversations() {
  if (typeof window === 'undefined') {
    return createDefaultProfessorConversations()
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const normalized = {}
        CATEGORIES.forEach((cat, index) => {
          normalized[cat.id] = normalizeProfessorConversation(
            parsed[cat.id],
            cat.welcomeMessage,
            Date.now() + index,
          )
        })
        return normalized
      }
    }
  } catch (error) {
    console.error('Failed to load professor conversation', error)
  }

  return createDefaultProfessorConversations()
}

function extractAiText(response) {
  if (typeof response === 'string') {
    const trimmed = response.trim()
    if (isMeaninglessProfessorText(trimmed)) return ''

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
    response.responseText,
    response.answerText,
    response.replyText,
    response.textoResposta,
    response.resposta,
    response.mensagem,
    response.conteudo,
    response.output,
    response.answer,
    response.reply,
  ]

  for (const candidate of candidates) {
    if (candidate == null) continue

    if (typeof candidate === 'string') {
      const trimmed = candidate.trim()
      if (isMeaninglessProfessorText(trimmed)) continue

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

function stripMindmapPrefix(value) {
  return normalizeProfessorText(value)
    .replace(/^[├└│*•-]+\s*/g, '')
    .replace(/^\d+[.)]\s*/g, '')
    .replace(/^(?:tema central|tema|centro)\s*[:-]\s*/i, '')
    .replace(/[:-]\s*$/, '')
    .trim()
}

function parseProfessorBlocks(text) {
  const normalized = normalizeProfessorText(text)
  if (!normalized) return []

  const blocks = []
  const lines = normalized.replace(/\r\n/g, '\n').split('\n')
  let paragraph = []
  let list = null

  const flushParagraph = () => {
    const content = paragraph.join(' ').replace(/\s+/g, ' ').trim()
    if (content) {
      blocks.push({ type: 'paragraph', text: content })
    }
    paragraph = []
  }

  const flushList = () => {
    if (list && list.items.length > 0) {
      blocks.push(list)
    }
    list = null
  }

  for (const rawLine of lines) {
    const line = String(rawLine ?? '').replace(/\s+$/, '')
    const trimmed = line.trim()

    if (!trimmed) {
      flushParagraph()
      flushList()
      continue
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/)
      || (trimmed.endsWith(':') && trimmed.length <= 80 && !/[.!?]$/.test(trimmed))

    if (headingMatch) {
      flushParagraph()
      flushList()
      blocks.push({
        type: 'heading',
        level: Array.isArray(headingMatch) && headingMatch[1] ? headingMatch[1].length : 3,
        text: Array.isArray(headingMatch) ? stripMindmapPrefix(headingMatch[2] || trimmed) : stripMindmapPrefix(trimmed),
      })
      continue
    }

    const listMatch = trimmed.match(/^(\d+)[.)]\s+(.+)$/) || trimmed.match(/^([-*•])\s+(.+)$/)

    if (listMatch) {
      flushParagraph()
      const ordered = Boolean(listMatch[1] && /^\d+$/.test(listMatch[1]))
      const itemText = stripMindmapPrefix(listMatch[2] || trimmed)

      if (!list || list.ordered !== ordered) {
        flushList()
        list = { type: 'list', ordered, items: [] }
      }

      list.items.push(itemText)
      continue
    }

    if (trimmed.endsWith(':') && trimmed.length <= 60) {
      flushParagraph()
      flushList()
      blocks.push({
        type: 'label',
        text: stripMindmapPrefix(trimmed),
      })
      continue
    }

    if (list) {
      flushList()
    }

    paragraph.push(trimmed)
  }

  flushParagraph()
  flushList()
  return blocks
}

function parseMindmapStructure(text) {
  const normalized = normalizeProfessorText(text)
  if (!normalized) {
    return { rootTitle: '', branches: [] }
  }

  const lines = normalized.replace(/\r\n/g, '\n').split('\n')
  const branches = []
  let rootTitle = ''
  let currentBranch = null

  const pushBranch = (title) => {
    const cleanTitle = stripMindmapPrefix(title)
    if (!cleanTitle) return null

    const branch = {
      title: cleanTitle,
      children: [],
    }
    branches.push(branch)
    currentBranch = branch
    return branch
  }

  for (const rawLine of lines) {
    const line = String(rawLine ?? '').replace(/\s+$/, '')
    const trimmed = line.trim()
    if (!trimmed) continue

    const rootMatch = trimmed.match(/^(?:tema central|tema|centro)\s*[:-]\s*(.+)$/i)
    if (!rootTitle && rootMatch) {
      rootTitle = stripMindmapPrefix(rootMatch[1])
      continue
    }

    if (!rootTitle && !/^[\d*•-]/.test(trimmed) && !trimmed.startsWith('├') && !trimmed.startsWith('└')) {
      rootTitle = stripMindmapPrefix(trimmed)
      continue
    }

    const numberedMatch = trimmed.match(/^(\d+)[.)]\s+(.+)$/)
    if (numberedMatch) {
      pushBranch(numberedMatch[2])
      continue
    }

    const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/)
    if (bulletMatch) {
      const cleanBullet = stripMindmapPrefix(bulletMatch[1])
      if (currentBranch && cleanBullet) {
        currentBranch.children.push(cleanBullet)
      } else if (cleanBullet) {
        pushBranch(cleanBullet)
      }
      continue
    }

    if (/^[├└│]/.test(trimmed)) {
      const cleanTreeLine = stripMindmapPrefix(trimmed)
      if (currentBranch && cleanTreeLine) {
        currentBranch.children.push(cleanTreeLine)
      } else if (cleanTreeLine) {
        pushBranch(cleanTreeLine)
      }
      continue
    }

    if (!rootTitle) {
      rootTitle = stripMindmapPrefix(trimmed)
      continue
    }

    if (currentBranch && line.startsWith(' ')) {
      currentBranch.children.push(stripMindmapPrefix(trimmed))
      continue
    }

    pushBranch(trimmed)
  }

  if (!rootTitle && branches.length > 0) {
    rootTitle = branches.shift().title
  }

  return {
    rootTitle: rootTitle || 'Mapa mental',
    branches: branches
      .map((branch) => ({
        ...branch,
        children: branch.children
          .map((child) => stripMindmapPrefix(child))
          .filter(Boolean)
          .slice(0, 4),
      }))
      .filter((branch) => branch.title)
      .slice(0, 8),
  }
}

function getMindmapSlot(index, total) {
  const layout = total <= 4
    ? [-145, -35, 35, 145]
    : total <= 6
      ? [-155, -105, -35, 35, 105, 155]
      : [-160, -120, -75, -25, 25, 75, 120, 160]

  const angle = layout[index % layout.length] + (Math.floor(index / layout.length) * 12)
  const radiusX = total <= 4 ? 31 : total <= 6 ? 35 : 38
  const radiusY = total <= 4 ? 23 : total <= 6 ? 27 : 30
  const radians = angle * (Math.PI / 180)

  const x = 50 + Math.cos(radians) * radiusX
  const y = 50 + Math.sin(radians) * radiusY

  return {
    left: `${Math.max(16, Math.min(84, x))}%`,
    top: `${Math.max(16, Math.min(84, y))}%`,
  }
}

function ProfessorRichText({ text, isFullscreen = false, sender = 'ai', isMindmap = false }) {
  const blocks = parseProfessorBlocks(text)
  if (blocks.length === 0) return null

  const className = [
    'prof-text-content',
    isFullscreen ? 'prof-text-content--fullscreen' : '',
    isMindmap ? 'prof-text-content--mindmap' : '',
    sender === 'user' ? 'prof-text-content--user' : 'prof-text-content--assistant',
    'prof-formatted-content',
  ].filter(Boolean).join(' ')

  return (
    <div className={className}>
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          return (
            <h4
              key={`heading-${index}-${block.text}`}
              className={`prof-formatted-heading prof-formatted-heading--${Math.min(block.level || 3, 3)}`}
            >
              {block.text}
            </h4>
          )
        }

        if (block.type === 'label') {
          return (
            <div key={`label-${index}-${block.text}`} className="prof-formatted-label">
              {block.text}
            </div>
          )
        }

        if (block.type === 'list') {
          const ListTag = block.ordered ? 'ol' : 'ul'
          return (
            <ListTag
              key={`list-${index}-${block.items.join('-')}`}
              className={`prof-formatted-list ${block.ordered ? 'is-ordered' : ''}`}
            >
              {block.items.map((item, itemIndex) => (
                <li key={`item-${index}-${itemIndex}`} className="prof-formatted-list-item">
                  {item}
                </li>
              ))}
            </ListTag>
          )
        }

        return (
          <p key={`paragraph-${index}-${block.text}`} className="prof-formatted-paragraph">
            {block.text}
          </p>
        )
      })}
    </div>
  )
}

function ProfessorMindmap({ text, isFullscreen = false }) {
  const structure = parseMindmapStructure(text)
  const childCount = structure.branches.reduce((sum, branch) => sum + branch.children.length, 0)

  if (structure.branches.length === 0) {
    return (
      <ProfessorRichText
        text={text}
        isFullscreen={isFullscreen}
        sender="ai"
        isMindmap
      />
    )
  }

  return (
    <section className={`prof-mindmap-canvas-wrap${isFullscreen ? ' prof-mindmap-canvas-wrap--fullscreen' : ''}`}>
      <div className="prof-mindmap-toolbar">
        <div className="prof-mindmap-toolbar-copy">
          <span className="prof-mindmap-toolbar-title">Mapa mental</span>
          <span className="prof-mindmap-toolbar-subtitle">
            Estrutura visualizada automaticamente para aproveitar melhor a tela.
          </span>
          <div className="prof-mindmap-toolbar-stats">
            <span className="prof-mindmap-stat-pill">{structure.branches.length} ramos</span>
            <span className="prof-mindmap-stat-pill">{childCount} subtópicos</span>
          </div>
        </div>
        <div className="prof-mindmap-toolbar-actions">
          <span className="prof-mindmap-toolbar-status is-ready">Pronto</span>
        </div>
      </div>

      <div className="prof-mindmap-preview-shell">
        <div className="prof-mindmap-preview-paper">
          <div className="prof-mindmap-preview-header">
            <div className="prof-mindmap-preview-copy">
              <span className="prof-mindmap-preview-kicker">Tema central</span>
              <h3 className="prof-mindmap-preview-title">{structure.rootTitle}</h3>
              <p className="prof-mindmap-preview-note">
                Ramos principais com subtópicos curtos para leitura rápida.
              </p>
            </div>
            <div className="prof-mindmap-preview-badge">
              {structure.branches.length} ramos
            </div>
          </div>

          <div className="prof-mindmap-stage">
            <div className="prof-mindmap-rings" aria-hidden="true">
              <span className="prof-mindmap-rings__ring prof-mindmap-rings__ring--outer" />
              <span className="prof-mindmap-rings__ring" />
            </div>
            <svg className="prof-mindmap-links" viewBox="0 0 1000 720" preserveAspectRatio="none" aria-hidden="true">
              {structure.branches.map((branch, index) => {
                const slot = getMindmapSlot(index, structure.branches.length)
                const x = (Number.parseFloat(slot.left) / 100) * 1000
                const y = (Number.parseFloat(slot.top) / 100) * 720

                return (
                  <line
                    key={`line-${index}-${branch.title}`}
                    x1="500"
                    y1="360"
                    x2={x}
                    y2={y}
                    stroke="rgba(var(--accent-rgb), 0.28)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                )
              })}
            </svg>

            <article className="prof-mindmap-node is-root" style={{ left: '50%', top: '50%', width: 'clamp(190px, 24vw, 290px)' }}>
              <span className="prof-mindmap-node-badge">Centro</span>
              <div className="prof-mindmap-node-label">{structure.rootTitle}</div>
              <div className="prof-mindmap-node-subtitle">Resumo visual do assunto</div>
            </article>

            {structure.branches.map((branch, index) => {
              const slot = getMindmapSlot(index, structure.branches.length)

              return (
                <article
                  key={`branch-${index}-${branch.title}`}
                  className={`prof-mindmap-node is-level-1 ${index % 2 === 0 ? 'is-left' : 'is-right'}`}
                  style={{ left: slot.left, top: slot.top, width: 'clamp(210px, 24vw, 300px)' }}
                >
                  <span className="prof-mindmap-node-badge">{String(index + 1).padStart(2, '0')}</span>
                  <div className="prof-mindmap-node-label">{branch.title}</div>
                  {branch.children.length > 0 && (
                    <div className="prof-mindmap-node-children">
                      {branch.children.map((child, childIndex) => (
                        <span key={`child-${index}-${childIndex}-${child}`} className="prof-mindmap-node-child">
                          {child}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              )
            })}

            <div className="prof-mindmap-stage-footer">
              <span>{structure.branches.length} ramos principais</span>
              <span>{childCount} subtópicos</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
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
    lines.push('- Para Mapas Mentais, o conteúdo do campo "response" deve ser uma estrutura textual organizada, sem canvas, sem PDF e sem comentários técnicos.')
  }

  if (category.id === 'pratica') {
    lines.push('- Crie questões inéditas no estilo ENEM com 5 alternativas (A-E). Após o aluno responder, dê feedback detalhado.')
  }

  lines.push(
    '- Use linguagem acessível, mas não infantilize.',
    '- Se não souber, seja honesto.',
    '- Mantenha o foco no contexto do ENEM e no Brasil.',
    '- Responda em português do Brasil.',
    '- Formate a resposta com títulos curtos, parágrafos curtos e listas quando isso melhorar a leitura.',
    '- Nunca deixe a resposta vazia e nunca use "[object Object]" como conteúdo.',
    '- Retorne somente JSON válido, sem markdown e sem bloco de código.',
    '- Use exatamente a chave "response" para a resposta final.',
  )

  if (category.id === 'mapas') {
    lines.push(
      '',
      'INSTRUCOES EXTRA PARA O MAPA MENTAL POR ESCRITO:',
      '- Comece com "Tema central:" seguido do assunto principal.',
      '- Em seguida, liste de 5 a 8 ramos principais numerados como "1.", "2.", "3.".',
      '- Abaixo de cada ramo, use de 1 a 3 subtópicos curtos com marcadores e recuo.',
      '- Mantenha a hierarquia bem visível e evite blocos longos de texto.',
      '- Prefira palavras-chave e expressões curtas.',
      '- Não escreva parágrafos longos nem use rótulos genéricos como "tópico", "item" ou "assunto".',
      '- Entregue o texto pronto para ser transformado em mapa visual na tela.',
      '- Dentro da chave "response", entregue o mapa completo com quebras de linha.',
    )
  }

  lines.push('', 'O histórico recente já segue nas mensagens do payload; use-o para manter coerência.')
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
    case 'fullscreen':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 3H3v5" />
          <path d="M16 3h5v5" />
          <path d="M21 16v5h-5" />
          <path d="M3 16v5h5" />
        </svg>
      )
    case 'fullscreenExit':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 9H4V4" />
          <path d="M15 9h5V4" />
          <path d="M15 15h5v5" />
          <path d="M9 15H4v5" />
        </svg>
      )
    default:
      return <svg viewBox="0 0 24 24" />
  }
}

function renderMessageBody(messageText, isMindmap, isFullscreen = false, sender = 'ai') {
  const text = normalizeProfessorText(messageText)
  if (!text) return null

  if (isMindmap && sender === 'ai') {
    return <ProfessorMindmap text={text} isFullscreen={isFullscreen} />
  }

  return <ProfessorRichText text={text} isFullscreen={isFullscreen} sender={sender} isMindmap={isMindmap} />
}

export function ProfessorPage() {
  const location = useLocation()
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0])
  const messageIdRef = useRef(0)
  const autoHandoffRef = useRef(false)
  const [conversations, setConversations] = useState(() => loadProfessorConversations())

  const [inputText, setInputText] = useState('')
  const [isSearchEnabled, setIsSearchEnabled] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [aiError, setAiError] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const messagesWallRef = useRef(null)
  const [queuedHandoff] = useState(() => normalizeProfessorHandoff(location.state?.handoff) || loadProfessorHandoff())

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
    scrollMessagesToEnd(isFullscreen ? 'auto' : 'smooth')
  }, [activeMessages, isTyping, isFullscreen, scrollMessagesToEnd])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations))
    } catch (error) {
      console.error('Failed to save professor conversation', error)
    }
  }, [conversations])

  useEffect(() => {
    if (!isFullscreen) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsFullscreen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isFullscreen])

  const handleSendMessage = useCallback(async (messageOverride = inputText, categoryOverride = activeCategory) => {
    const userMessage = normalizeProfessorText(messageOverride)
    const categoryAtSend = categoryOverride || activeCategory
    if (!userMessage || isTyping) return

    if (isBrowserOffline()) {
      setAiError(true)
      window.alert('Você está offline. Verifique sua conexão para continuar usando o Professor IA.')
      return
    }

    const categoryId = categoryAtSend.id
    const categoryMessages = Array.isArray(conversations[categoryId]) ? conversations[categoryId] : []

    setInputText('')
    setAiError(false)

    setConversations((prev) => ({
      ...prev,
      [categoryId]: [
        ...(Array.isArray(prev[categoryId]) ? prev[categoryId] : []),
        { id: nextMessageId(), sender: 'user', text: normalizeProfessorText(userMessage) },
      ],
    }))

    setIsTyping(true)

    const recentMessages = categoryMessages
      .slice(-MAX_CHAT_HISTORY)
      .filter((msg) => msg.sender === 'user' || msg.sender === 'ai')
      .map((msg) => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: normalizeProfessorText(msg.text),
      }))
      .filter((msg) => msg.content)

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
          const response = await chamarIAEspecifica({
            provider: config.provider,
            modelVariant: config.modelVariant,
            systemPrompt: finalSystemPrompt,
            userMessages,
          })

          const aiText = extractAiText(response)
          if (!aiText) {
            const emptyError = new Error(`Resposta vazia da IA (${config.provider}/${config.modelVariant}).`)
            emptyError.code = 'empty_ai_response'
            throw emptyError
          }

          return { response, aiText, provider: config.provider, modelVariant: config.modelVariant }
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
      const { aiText } = await callProfessorIa()

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
      const isQuotaBlocked = error?.code === 'quota_blocked'
        || rawMessage.includes('limite do plano free')
        || rawMessage.includes('cota gratuita')
        || rawMessage.includes('modo convidado')
      const isOffline = isBrowserOffline()
      const quotaBlockedText = rawMessage.includes('modo convidado')
        ? 'Você atingiu o limite diário do modo convidado. Crie uma conta nova para continuar usando a IA.'
        : 'Você atingiu o limite diário de IA no plano atual. Tente novamente amanhã ou faça upgrade do plano.'

      setConversations((prev) => ({
        ...prev,
        [categoryId]: [
          ...(Array.isArray(prev[categoryId]) ? prev[categoryId] : []),
          {
            id: nextMessageId(),
            sender: 'ai',
            text: isQuotaBlocked
              ? quotaBlockedText
              : isOffline
              ? 'Estou sem conexão no momento. Verifique sua internet e tente novamente.'
              : 'O serviço de IA está indisponível no momento. Já tentei provedores alternativos. Tente novamente em alguns segundos.',
          },
        ],
      }))

      if (isOffline) {
        window.alert('Conexão offline detectada. O Professor IA não consegue responder sem internet.')
      } else if (isQuotaBlocked) {
        window.alert(rawMessage.includes('modo convidado')
          ? 'Limite diário do modo convidado atingido. Crie uma conta nova para continuar.'
          : 'Limite diário de IA atingido no plano atual.')
      }
      setAiError(true)
    } finally {
      setIsTyping(false)
    }
  }, [activeCategory, conversations, inputText, isBrowserOffline, isSearchEnabled, isTyping, nextMessageId])

  useEffect(() => {
    const handoff = queuedHandoff
    if (!handoff || autoHandoffRef.current) return

    autoHandoffRef.current = true
    clearProfessorHandoff()

    const category = CATEGORIES.find((item) => item.id === handoff.categoryId) || CATEGORIES[0]
    setActiveCategory(category)
    setInputText('')
    void handleSendMessage(handoff.message, category)
  }, [queuedHandoff, handleSendMessage])

  const handleClearHistory = () => {
    setAiError(false)
    setConversations((prev) => ({
      ...prev,
      [activeCategory.id]: [{ id: nextMessageId(), sender: 'ai', text: normalizeProfessorText(activeCategory.welcomeMessage) }],
    }))
  }

  const handleToggleFullscreen = () => {
    setIsFullscreen((current) => !current)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className={`professor-sleek-view${isFullscreen ? ' is-fullscreen' : ''}`}>
      {isFullscreen && (
        <div
          className="professor-fullscreen-backdrop"
          aria-hidden="true"
          onClick={() => setIsFullscreen(false)}
        />
      )}
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

        <div
          className={`prof-chat-card anim-slide-up${isFullscreen ? ' prof-chat-card--fullscreen' : ''}`}
          style={{ animationDelay: '0.1s' }}
          role={isFullscreen ? 'dialog' : undefined}
          aria-modal={isFullscreen ? 'true' : undefined}
          aria-label={isFullscreen ? 'Professor IA em tela cheia' : undefined}
        >
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
              <button
                type="button"
                className="prof-session-expand"
                onClick={handleToggleFullscreen}
                title={isFullscreen ? 'Sair da tela cheia' : 'Abrir IA em tela cheia'}
                aria-label={isFullscreen ? 'Sair da tela cheia' : 'Abrir IA em tela cheia'}
              >
                {iconSvg(isFullscreen ? 'fullscreenExit' : 'fullscreen')}
              </button>
            </div>
            <div className="prof-card-rule" aria-hidden="true" />
          </div>

          <main className={`prof-chat-surface ${activeCategory.id === 'mapas' ? 'prof-chat-surface--map' : ''}${isFullscreen ? ' prof-chat-surface--fullscreen' : ''}`}>
            <div
              ref={messagesWallRef}
              className={`prof-messages-wall${isFullscreen ? ' prof-messages-wall--fullscreen' : ''}`}
              role="log"
              aria-live="polite"
              aria-relevant="additions"
            >
              {activeMessages.map((msg, index) => {
                if (activeCategory.id === 'mapas' && msg.text === '[MAPA_GERADO]') return null

                const isMindmapReply = activeCategory.id === 'mapas' && msg.sender === 'ai'
                const normalizedText = normalizeProfessorText(msg.text)

                return (
                  <div
                    key={msg.id}
                    className={`prof-msg-row ${msg.sender === 'user' ? 'user-row' : 'ai-row'}${isFullscreen ? ' prof-msg-row--fullscreen' : ''} anim-pop-in`}
                    style={{ animationDelay: `${Math.min(index, 8) * 0.04}s` }}
                  >
                    <div className={`prof-msg-bubble${isFullscreen ? ' prof-msg-bubble--fullscreen' : ''}`}>
                      {isFullscreen && (
                        <div className={`prof-message-label ${msg.sender === 'user' ? 'is-user' : 'is-ai'}`}>
                          {msg.sender === 'user' ? 'Você' : 'Professor IA'}
                        </div>
                      )}
                      {msg.sender === 'ai' && !isFullscreen && <div className="prof-side-avatar" aria-hidden="true">👨‍🏫</div>}
                      {renderMessageBody(normalizedText, isMindmapReply, isFullscreen, msg.sender)}
                    </div>
                  </div>
                )
              })}

              {isTyping && (
                <div className={`prof-msg-row ai-row${isFullscreen ? ' prof-msg-row--fullscreen' : ''} anim-pop-in`}>
                  <div className={`prof-msg-bubble${isFullscreen ? ' prof-msg-bubble--fullscreen' : ''}`}>
                    {isFullscreen && <div className="prof-message-label is-ai">Professor IA</div>}
                    {!isFullscreen && <div className="prof-side-avatar" aria-hidden="true">👨‍🏫</div>}
                    <div className="prof-typing-wave">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className={`prof-actions-dock${isFullscreen ? ' prof-actions-dock--fullscreen' : ''}`}>
              <div className="prof-card-rule prof-card-rule--subtle" aria-hidden="true" />
              <div
                className={`prof-composer-unified${isFullscreen ? ' prof-composer-unified--fullscreen' : ''}`}
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
