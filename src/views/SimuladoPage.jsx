import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { saveSimuladoHistoryEntry } from '../services/simuladoHistory.js'
import { getDisciplinasByArea, getAreasDisponiveis } from '../services/enemApiService.js'
import { gerarSimulado, MAX_SIMULADO_AI_QUESTIONS } from '../services/simuladoService.js'
import { consumeFreePlan } from '../services/freePlanUsage.js'
import { useAppBusy } from '../ui/AppBusyContext.jsx'
import '../styles/simulado.css'

const AREAS = getAreasDisponiveis()
const MIN_Q = 3
const MAX_Q = 90
const PRESETS = [3, 5, 10, 15, 30, 45, 60, 90]
const MAX_AI_Q = MAX_SIMULADO_AI_QUESTIONS

// ── inline markdown para textos das questões ──────────────────────────────────
function inlineMd(text) {
  if (!text || typeof text !== 'string') return text
  const parts = []
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|_[^_]+_)/g
  let last = 0
  let match
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    const token = match[0]
    if (token.startsWith('**') || token.startsWith('__')) {
      parts.push(<strong key={match.index}>{token.slice(2, -2)}</strong>)
    } else {
      parts.push(<em key={match.index}>{token.slice(1, -1)}</em>)
    }
    last = match.index + token.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.length > 0 ? parts : text
}

function SimuladoText({ text, className = '' }) {
  if (!text) return null
  const lines = String(text).split('\n').filter(l => l.trim())
  return (
    <div className={`simulado-rich-text ${className}`}>
      {lines.map((line, i) => <p key={i}>{inlineMd(line)}</p>)}
    </div>
  )
}

function getAlternativePayload(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return {
      text: String(value.text ?? value.label ?? value.content ?? '').trim(),
      image: String(value.image ?? value.imageUrl ?? value.file ?? value.url ?? '').trim(),
      alt: String(value.alt ?? value.text ?? value.label ?? 'Alternativa').trim(),
    }
  }

  return {
    text: String(value ?? '').trim(),
    image: '',
    alt: 'Alternativa',
  }
}

function getAlternativeEntries(alternativas = {}) {
  return Object.entries(alternativas || {})
    .map(([letter, value]) => [String(letter).trim().toUpperCase(), getAlternativePayload(value)])
    .filter(([letter, payload]) => letter && (payload.text || payload.image))
    .sort(([a], [b]) => a.localeCompare(b))
}

function AlternativeContent({ value, letter }) {
  const payload = getAlternativePayload(value)

  return (
    <div className="option-content">
      {payload.text && <SimuladoText text={payload.text} className="option-text" />}
      {payload.image && (
        <img
          className="option-image"
          src={payload.image}
          alt={payload.alt || `Alternativa ${letter}`}
          loading="lazy"
        />
      )}
    </div>
  )
}

// ── ícones das matérias ───────────────────────────────────────────────────────
const AREA_ICONS = {
  Linguagens: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  ),
  Humanas: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  ),
  Natureza: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 22c1.5-6 5-10 10-12C17 8 22 11 22 22" /><path d="M12 22V10" />
    </svg>
  ),
  Matematica: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M4 12h16M4 18h7" /><path d="M15 15l6 6m-6 0l6-6" />
    </svg>
  ),
}

const AREA_TONES = {
  Linguagens: 'Leitura, repertório e interpretação',
  Humanas: 'Tempo, espaço, sociedade e política',
  Natureza: 'Fenômenos, vida, matéria e energia',
  Matematica: 'Modelagem, lógica e resolução',
}

function clamp(n) {
  return Math.min(MAX_Q, Math.max(MIN_Q, Math.round(Number(n) || MIN_Q)))
}

function getAreaConfig(areaId) {
  return AREAS.find((area) => area.id === areaId) || null
}

function getDisciplineLabels(areaId, selected = []) {
  const labels = new Map(getDisciplinasByArea(areaId).map((disciplina) => [disciplina.id, disciplina.label]))
  return selected.map((disciplinaId) => labels.get(disciplinaId) || disciplinaId)
}

function buildPerformance(percentual) {
  if (percentual >= 80) return { label: 'Excelente', hint: 'Você está dominando bem este recorte.' }
  if (percentual >= 60) return { label: 'Bom', hint: 'Boa base. Revise os erros para consolidar.' }
  if (percentual >= 40) return { label: 'Regular', hint: 'Há bons sinais, mas ainda existe espaço grande para revisão.' }
  return { label: 'Precisa melhorar', hint: 'Use os erros como mapa de estudo para o próximo treino.' }
}

async function gerarSimuladoEnem({ area, disciplinas, quantidade }) {
  const data = await gerarSimulado({
    area,
    disciplinas,
    quantidade,
    fonte: 'mista',
  })

  const selecionadas = Array.isArray(data?.questoes) ? data.questoes : []
  if (selecionadas.length === 0) {
    throw new Error('Não foi possível gerar questões. Verifique sua conexão e tente novamente.')
  }

  return {
    area: data.area || area,
    disciplinas: Array.isArray(data.disciplinas) ? data.disciplinas : disciplinas,
    questoes: selecionadas,
    geradoEm: data.geradoEm || new Date().toISOString(),
    alerta: String(data.alerta || '').trim(),
    estatisticas: data.estatisticas || { api: 0, reais: 0, ia: 0, bancoLocal: 0 },
  }
}

const STORAGE_KEY = 'apice:simulado_progresso:v2'
function salvarProgresso(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, savedAt: new Date().toISOString() }))
  } catch {
    // Storage pode estar indisponível em navegação privada.
  }
}
function carregarProgresso() {
  try {
    const p = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (!p) return null
    if (Date.now() - new Date(p.savedAt).getTime() > 2 * 60 * 60 * 1000) { localStorage.removeItem(STORAGE_KEY); return null }
    return p
  } catch { return null }
}
function limparProgresso() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage pode estar indisponível em navegação privada.
  }
}

export function SimuladoPage() {
  const { beginBusy, endBusy } = useAppBusy()
  const [step, setStep] = useState('setup')
  const [examData, setExamData] = useState(null)
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState({})
  const [reviewQuestions, setReviewQuestions] = useState({})
  const [examNotice, setExamNotice] = useState(null)
  const [reviewWarningSeen, setReviewWarningSeen] = useState(false)
  const [confirmedAnswers, setConfirmedAnswers] = useState({})
  const [pendingModal, setPendingModal] = useState(null)
  const [error, setError] = useState(null)
  const [selectedArea, setSelectedArea] = useState(null)
  const [selectedDiscs, setSelectedDiscs] = useState([])
  const [quantidade, setQuantidade] = useState(10)

  useEffect(() => {
    const saved = carregarProgresso()
    if (saved?.examData && saved.step === 'exam') {
      if (window.confirm('Você tem um simulado em andamento. Deseja continuar de onde parou?')) {
        setExamData(saved.examData); setSelectedArea(saved.selectedArea)
        setSelectedDiscs(saved.selectedDiscs || []); setCurrentQ(saved.currentQ || 0)
        setAnswers(saved.answers || {}); setReviewQuestions(saved.reviewQuestions || {})
        setConfirmedAnswers(saved.confirmedAnswers || {})
        setQuantidade(clamp(saved.quantidade || 10)); setStep('exam')
      }
    }
  }, [])

  useEffect(() => {
    if (step === 'exam' && examData) {
      salvarProgresso({ step: 'exam', examData, selectedArea, selectedDiscs, currentQ, answers, reviewQuestions, confirmedAnswers, quantidade })
    }
  }, [step, examData, currentQ, answers, reviewQuestions, confirmedAnswers, selectedArea, selectedDiscs, quantidade])

  const handleAreaChange = (aId) => { setSelectedArea(aId); setSelectedDiscs([]) }
  const toggleDisc = (id) => setSelectedDiscs(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id])
  const selectAll = () => { if (selectedArea) setSelectedDiscs(getDisciplinasByArea(selectedArea).map(d => d.id)) }

  const handleStart = async () => {
    if (!selectedArea) { setError('Selecione uma área.'); return }
    if (selectedDiscs.length === 0) { setError('Selecione pelo menos uma disciplina.'); return }
    setStep('loading'); beginBusy(); setError(null)
    try {
      const data = await gerarSimuladoEnem({ area: selectedArea, disciplinas: selectedDiscs, quantidade })
      if (!data?.questoes?.length) throw new Error('Não foi possível gerar questões.')
      // Conta como 1 uso de IA independente da fonte
      consumeFreePlan('otherAiRequest')
      setExamData(data); setStep('exam'); setCurrentQ(0); setAnswers({}); setReviewQuestions({}); setConfirmedAnswers({})
      setExamNotice(null); setReviewWarningSeen(false); setPendingModal(null)
      limparProgresso()
    } catch (err) {
      setError(err.message || 'Erro ao gerar simulado.'); setStep('setup')
    } finally { endBusy() }
  }

  const handleSelect = (letter) => {
    if (confirmedAnswers[examData.questoes[currentQ].id]) return
    setExamNotice(null)
    setAnswers({ ...answers, [examData.questoes[currentQ].id]: letter })
  }

  const handleConfirm = () => {
    const qId = examData.questoes[currentQ].id
    setConfirmedAnswers(prev => ({ ...prev, [qId]: true }))
    setReviewQuestions(prev => {
      if (prev[qId]) {
        const next = { ...prev }
        delete next[qId]
        return next
      }
      return prev
    })
    setExamNotice(null)
  }

  const toggleReviewQuestion = (questionId) => {
    if (confirmedAnswers[questionId]) return // não deixa marcar pra revisão se já confirmou
    setReviewWarningSeen(false)
    setExamNotice(null)
    setReviewQuestions((current) => {
      const next = { ...current }
      if (next[questionId]) {
        delete next[questionId]
      } else {
        next[questionId] = true
      }
      return next
    })
  }

  /** Finaliza o simulado e salva no histórico */
  const finalizeExam = () => {
    const total = examData.questoes.length
    // Só conta como acerto se estiver respondida e for igual à correta (mesmo se não tiver confirmado, conta a marcação)
    const acertos = examData.questoes.filter(q => answers[q.id] === q.correta).length
    const pct = total > 0 ? Math.round((acertos / total) * 100) : 0
    const perf = pct >= 80 ? 'Excelente' : pct >= 60 ? 'Bom' : pct >= 40 ? 'Regular' : 'Precisa melhorar'
    saveSimuladoHistoryEntry({
      id: `${Date.now()}`, data: new Date().toISOString(),
      titulo: `Simulado de ${selectedArea}`, area: selectedArea, disciplinas: selectedDiscs,
      fonte: 'mista', quantidade: total, acertos, total, percentual: pct, performance: perf,
      estatisticas: examData.estatisticas, limiteIAAplicado: examData.estatisticas.ia > 0,
      alerta: examData.alerta, geradoEm: examData.geradoEm,
    })
    setPendingModal(null)
    setStep('result'); limparProgresso()
  }

  const showFinishBlockers = () => {
    // Última questão - o resultado só fica disponível após confirmar todas.
    const unconfirmedIndexes = examData.questoes
      .map((q, i) => !confirmedAnswers[q.id] ? i : -1)
      .filter(i => i >= 0)

    if (unconfirmedIndexes.length > 0) {
      setPendingModal({
        type: 'unconfirmed',
        count: unconfirmedIndexes.length,
        firstIndex: unconfirmedIndexes[0],
      })
      return true
    }

    const reviewIndexes = examData.questoes
      .map((q, i) => reviewQuestions[q.id] ? i : -1)
      .filter(i => i >= 0)

    if (reviewIndexes.length > 0 && !reviewWarningSeen) {
      setPendingModal({
        type: 'review',
        count: reviewIndexes.length,
        firstIndex: reviewIndexes[0],
      })
      return true
    }

    return false
  }

  const handleNext = () => {
    if (currentQ < examData.questoes.length - 1) {
      setCurrentQ(currentQ + 1)
      return
    }

    if (showFinishBlockers()) return
    finalizeExam()
  }

  const handlePendingAction = (action) => {
    if (!pendingModal) return
    if (action === 'go') {
      setCurrentQ(pendingModal.firstIndex)
      setPendingModal(null)
    } else if (action === 'proceed') {
      if (pendingModal.type === 'unconfirmed') {
        setCurrentQ(pendingModal.firstIndex)
        setPendingModal(null)
        return
      }
      if (pendingModal.type === 'review') {
        setReviewWarningSeen(true)
      }
      setPendingModal(null)
      finalizeExam()
    }
  }

  const handleNew = () => {
    setStep('setup'); setExamData(null); setSelectedArea(null); setSelectedDiscs([])
    setCurrentQ(0); setAnswers({}); setReviewQuestions({}); setConfirmedAnswers({}); setExamNotice(null); setReviewWarningSeen(false)
    setQuantidade(10); setPendingModal(null); limparProgresso()
  }

  const discs = selectedArea ? getDisciplinasByArea(selectedArea) : []
  const selectedAreaConfig = getAreaConfig(selectedArea)
  const selectedDiscLabels = getDisciplineLabels(selectedArea, selectedDiscs)
  const estimatedMinutes = Math.max(5, Math.round(quantidade * 3))
  const renderPendingModal = () => {
    if (!pendingModal) return null

    const modalCopy = {
      unconfirmed: {
        icon: '!',
        title: `${pendingModal.count} questão(ões) sem confirmação`,
        text: 'Não é possível ver o resultado final antes de confirmar todas as questões. Volte para a primeira pendência e confirme sua resposta.',
        primary: 'Ir para confirmar',
        secondary: 'Continuar no simulado',
      },
      unanswered: {
        icon: '!',
        title: `${pendingModal.count} questão(ões) sem resposta`,
        text: 'Você ainda não respondeu todas as questões. Deseja ir para as pendentes ou finalizar com as respostas atuais?',
        primary: 'Ir para pendentes',
        secondary: 'Finalizar mesmo assim',
      },
      review: {
        icon: '?',
        title: `${pendingModal.count} questão(ões) marcada(s) para revisar`,
        text: 'Você marcou questões para revisão. Deseja revisá-las antes de ver o resultado?',
        primary: 'Revisar questões',
        secondary: 'Prosseguir sem revisar',
      },
    }[pendingModal.type] || null

    if (!modalCopy) return null

    return (
      <div className="simulado-pending-overlay" onClick={() => setPendingModal(null)}>
        <div className="simulado-pending-modal anim anim-d1" onClick={e => e.stopPropagation()}>
          <div className="simulado-pending-icon">{modalCopy.icon}</div>
          <h3>{modalCopy.title}</h3>
          <p>{modalCopy.text}</p>
          <div className="simulado-pending-actions">
            <button type="button" className="btn-primary" onClick={() => handlePendingAction('go')}>
              {modalCopy.primary}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => (
                pendingModal.type === 'unconfirmed'
                  ? setPendingModal(null)
                  : handlePendingAction('proceed')
              )}
            >
              {modalCopy.secondary}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── SETUP ─────────────────────────────────────────────────────────────────
  if (step === 'setup') {
    return (
      <div className="simulado-page">
        <section className="simulado-hero anim anim-d1">
          <div className="simulado-hero-copy">
            <span className="simulado-kicker">Treino adaptativo</span>
            <h1 className="simulado-title">Monte um simulado ENEM com cara de prova real.</h1>
            <p className="simulado-subtitle">
              A plataforma prioriza questões reais da API ENEM e completa com IA quando o banco não fecha a quantidade escolhida.
            </p>
          </div>
          <div className="simulado-hero-metrics" aria-label="Resumo do sistema de simulados">
            <div>
              <strong>{MAX_Q}</strong>
              <span>questões máx.</span>
            </div>
            <div>
              <strong>{MAX_AI_Q}</strong>
              <span>fallback IA</span>
            </div>
            <Link to="/historico-simulados">Histórico</Link>
          </div>
        </section>

        <div className="simulado-builder anim anim-d2">
          <aside className="simulado-summary-card" aria-label="Resumo do simulado">
            <span className="simulado-kicker">Seu simulado</span>
            <h2>{selectedAreaConfig?.label || 'Escolha uma área'}</h2>
            <p>{selectedArea ? AREA_TONES[selectedArea] : 'Selecione área, disciplinas e quantidade para começar.'}</p>

            <div className="simulado-summary-list">
              <div>
                <span>Disciplinas</span>
                <strong>{selectedDiscs.length || 'Nenhuma'}</strong>
              </div>
              <div>
                <span>Questões</span>
                <strong>{quantidade}</strong>
              </div>
              <div>
                <span>Tempo sugerido</span>
                <strong>{estimatedMinutes} min</strong>
              </div>
            </div>

            {selectedDiscLabels.length > 0 && (
              <div className="simulado-selected-chips">
                {selectedDiscLabels.map((label) => <span key={label}>{label}</span>)}
              </div>
            )}

            {error && <p className="simulado-error">{error}</p>}

            <button
              type="button"
              className="btn-start-simulado"
              onClick={handleStart}
              disabled={!selectedArea || selectedDiscs.length === 0}
            >
              Iniciar simulado
            </button>
          </aside>

          <div className="simulado-setup-panel">
            <section className="setup-section">
              <div className="setup-section-header">
                <span className="setup-step">01</span>
                <div>
                  <h2 className="setup-section-title">Área do conhecimento</h2>
                  <p>Comece escolhendo o eixo da prova.</p>
                </div>
              </div>
              <div className="area-grid area-grid--big">
                {AREAS.map(area => (
                  <button
                    key={area.id}
                    type="button"
                    className={`area-card area-card--big ${selectedArea === area.id ? 'selected' : ''}`}
                    onClick={() => handleAreaChange(area.id)}
                  >
                    <div className="area-icon-big">{AREA_ICONS[area.id]}</div>
                    <h3>{area.label}</h3>
                    <p>{AREA_TONES[area.id] || `${area.disciplinas.length} disciplinas`}</p>
                  </button>
                ))}
              </div>
            </section>

            {selectedArea && (
            <section className="setup-section anim anim-d3">
              <div className="setup-section-header">
                <span className="setup-step">02</span>
                <div>
                  <h2 className="setup-section-title">Disciplinas</h2>
                  <p>Escolha um foco específico ou treine tudo da área.</p>
                </div>
                <button type="button" className="btn-select-all" onClick={selectAll}>Selecionar todas</button>
              </div>
              <div className="disciplinas-grid">
                {discs.map(disc => (
                  <button
                    key={disc.id}
                    type="button"
                    className={`disciplina-card ${selectedDiscs.includes(disc.id) ? 'selected' : ''}`}
                    onClick={() => toggleDisc(disc.id)}
                  >
                    <div className="disciplina-check">{selectedDiscs.includes(disc.id) ? '✓' : ''}</div>
                    <span>{disc.label}</span>
                  </button>
                ))}
              </div>
            </section>
            )}

            {selectedDiscs.length > 0 && (
            <section className="setup-section anim anim-d4">
              <div className="setup-section-header">
                <span className="setup-step">03</span>
                <div>
                  <h2 className="setup-section-title">Quantidade</h2>
                  <p>Ajuste o tamanho do treino conforme seu tempo.</p>
                </div>
              </div>
              <div className="quantidade-config">
                <div className="quantidade-slider">
                  <input type="range" min={MIN_Q} max={MAX_Q} step="1" value={quantidade}
                    onChange={e => setQuantidade(clamp(e.target.value))} className="slider" />
                  <div className="quantidade-display">
                    <span className="quantidade-numero">{quantidade}</span>
                    <span className="quantidade-label">questões</span>
                  </div>
                </div>
                <div className="quantidade-presets">
                  {PRESETS.map(q => (
                    <button key={q} type="button"
                      className={`preset-btn ${quantidade === q ? 'active' : ''}`}
                      onClick={() => setQuantidade(q)}>{q}</button>
                  ))}
                </div>
              </div>
            </section>
            )}
          </div>
        </div>

        {renderPendingModal()}
      </div>
    )
  }

  // ── LOADING ────────────────────────────────────────────────────────────────
  if (step === 'loading') {
    return (
      <div className="simulado-page simulado-page--center">
        <div className="loading-box anim anim-d1">
          <div className="spinner" />
          <span className="simulado-kicker">Preparando prova</span>
          <h2 className="simulado-title">Buscando as melhores questões para seu treino.</h2>
          <p className="simulado-subtitle">Primeiro a API ENEM. Se faltar questão, a IA completa com limite de {MAX_AI_Q} itens.</p>
        </div>
      </div>
    )
  }

  // ── EXAM ───────────────────────────────────────────────────────────────────
  if (step === 'exam' && examData) {
    const q = examData.questoes[currentQ]
    const sel = answers[q.id]
    const isConfirmed = Boolean(confirmedAnswers[q.id])
    const prog = ((currentQ + 1) / examData.questoes.length) * 100
    const answeredCount = examData.questoes.filter(question => answers[question.id]).length
    const reviewCount = examData.questoes.filter(question => reviewQuestions[question.id]).length
    const markedForReview = Boolean(reviewQuestions[q.id])
    const isLastQuestion = currentQ >= examData.questoes.length - 1
    const optionEntries = getAlternativeEntries(q.alternativas)

    return (
      <div className="simulado-page simulado-page--exam">
        <div className="simulado-exam-shell">
          <aside className="simulado-exam-rail anim anim-d1" aria-label="Navegação do simulado">
            <span className="simulado-kicker">Simulado em andamento</span>
            <h2>{examData.area}</h2>
            <p>{answeredCount}/{examData.questoes.length} respondidas</p>
            <button
              type="button"
              className={`simulado-review-toggle ${markedForReview ? 'active' : ''}`}
              onClick={() => toggleReviewQuestion(q.id)}
            >
              <span aria-hidden="true" />
              {markedForReview ? 'Marcada para revisar' : 'Marcar como revisar mais tarde'}
            </button>

            <div className="simulado-progress-card">
              <div>
                <strong>{Math.round(prog)}%</strong>
                <span>progresso</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${prog}%` }} />
              </div>
            </div>

            <div className="question-map" aria-label="Mapa de questões">
              {examData.questoes.map((question, index) => {
                const confirmed = Boolean(confirmedAnswers[question.id])
                const answered = Boolean(answers[question.id])
                const review = Boolean(reviewQuestions[question.id])
                const active = index === currentQ
                let dotClass = 'question-map-dot'
                if (active) dotClass += ' active'
                if (confirmed) dotClass += ' answered'
                else if (answered) dotClass += ' unanswered'
                if (review) dotClass += ' review'
                return (
                  <button
                    key={question.id}
                    type="button"
                    className={dotClass}
                    onClick={() => {
                      setCurrentQ(index)
                    }}
                    aria-label={`Ir para questão ${index + 1}`}
                  >
                    {index + 1}
                  </button>
                )
              })}
            </div>

            {reviewCount > 0 && (
              <div className="simulado-review-count">
                {reviewCount} para revisar
              </div>
            )}

            {examData.alerta && (
              <div className="simulado-alert">
                <strong>Composição</strong>
                <span>{examData.alerta}</span>
              </div>
            )}
          </aside>

          <section className="question-card anim anim-d2">
            <div className="question-topline">
              <div className="question-meta">
                <span>{q.disciplina || examData.area}</span>
                <span>Questão {currentQ + 1}</span>
                {q.ano && <span>ENEM {q.ano}</span>}
              </div>
              <span className="question-count">{currentQ + 1}/{examData.questoes.length}</span>
            </div>

            {examNotice && (
              <div className={`simulado-exam-notice ${examNotice.type || 'warning'}`}>
                {examNotice.text}
              </div>
            )}

            {q.textoBase && (
              <div className="question-text-base">
                <span>Texto-base</span>
                <SimuladoText text={q.textoBase} />
              </div>
            )}

            <div className="question-enunciado">
              <SimuladoText text={q.enunciado} />
            </div>

            {optionEntries.length > 0 ? (
              <div className="options-list">
                {optionEntries.map(([letter, payload]) => {
                  let cls = 'option-item'
                  if (sel === letter) cls += ' selected'
                  if (isConfirmed) {
                    cls += ' disabled'
                    if (letter === q.correta) cls += ' correct'
                    else if (sel === letter) cls += ' wrong'
                  }
                  return (
                    <button key={letter} type="button" className={cls}
                      onClick={() => handleSelect(letter)} disabled={isConfirmed}>
                      <div className="option-letter">{letter}</div>
                      <AlternativeContent value={payload} letter={letter} />
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="simulado-exam-notice warning">
                Esta questão veio sem alternativas renderizáveis. Gere um novo simulado para substituir este lote.
              </div>
            )}

            {isConfirmed && (
              <div className={`feedback-box anim anim-d1 ${sel === q.correta ? 'is-correct' : 'is-wrong'}`}>
                <div className="feedback-title">
                  {sel === q.correta ? 'Resposta correta' : 'Resposta incorreta'}
                </div>
                <div className="feedback-text">
                  <strong>Gabarito: {q.correta}</strong>
                  {q.explicacao && <SimuladoText text={q.explicacao} />}
                </div>
                <button type="button" className="btn-primary question-action" onClick={handleNext}>
                  {isLastQuestion ? 'Ver resultado final' : 'Próxima questão'}
                </button>
              </div>
            )}

            {!isConfirmed && (
              <div className="question-footer">
                <span className="question-footer-hint">
                  {sel ? 'Alternativa selecionada. Você pode avançar agora ou confirmar para ver a explicação.' : 'Escolha uma alternativa para continuar.'}
                </span>
                <div className="question-footer-actions">
                  <button type="button" className="btn-ghost question-action" onClick={handleNext}>
                    {isLastQuestion ? 'Ver resultado final' : 'Avançar sem confirmar'}
                  </button>
                  <button type="button" className="btn-primary question-action" onClick={handleConfirm} disabled={!sel}>
                    Confirmar resposta
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
        {renderPendingModal()}
      </div>
    )
  }

  // ── RESULT ─────────────────────────────────────────────────────────────────
  if (step === 'result' && examData) {
    const total = examData.questoes.length
    const acertos = examData.questoes.filter(q => answers[q.id] === q.correta).length
    const pct = Math.round((acertos / total) * 100)
    const performance = buildPerformance(pct)
    const wrongQuestions = examData.questoes.filter(q => answers[q.id] !== q.correta)

    return (
      <div className="simulado-page">
        <section className="result-card anim anim-d1">
          <div className="result-hero">
            <div>
              <span className="simulado-kicker">Resultado do simulado</span>
              <h1 className="simulado-title">{examData.area}</h1>
              <p className="simulado-subtitle">{performance.hint}</p>
            </div>
            <div className="result-score">
              {acertos}<span>/{total}</span>
            </div>
          </div>

          {examData.alerta && (
            <div className="simulado-alert result-alert">
              <strong>Composição do simulado</strong>
              <span>{examData.alerta}</span>
            </div>
          )}

          <div className="result-band">
            <div>
              <span>Percentual</span>
              <strong>{pct}%</strong>
            </div>
            <div>
              <span>Desempenho</span>
              <strong>{performance.label}</strong>
            </div>
            <div>
              <span>Erros para revisar</span>
              <strong>{wrongQuestions.length}</strong>
            </div>
          </div>

          {examData.estatisticas && (
            <div className="result-stats">
              <div className="stat-item">
                <span className="stat-value">{examData.estatisticas.api ?? Math.max(0, (examData.estatisticas.reais || 0) - (examData.estatisticas.bancoLocal || 0))}</span>
                <span className="stat-label">API ENEM</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{examData.estatisticas.bancoLocal || 0}</span>
                <span className="stat-label">Banco local</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{examData.estatisticas.ia}</span>
                <span className="stat-label">Geradas por IA</span>
              </div>
            </div>
          )}

          {wrongQuestions.length > 0 && (
            <div className="result-review">
              <div className="result-review-head">
                <span className="simulado-kicker">Revisão rápida</span>
                <strong>Questões para retomar</strong>
              </div>
              {wrongQuestions.slice(0, 4).map((question, index) => (
                <div className="result-review-item" key={question.id || `${question.enunciado}-${index}`}>
                  <span>{question.disciplina || examData.area}</span>
                  <p>{question.enunciado}</p>
                  <strong>Gabarito: {question.correta}</strong>
                </div>
              ))}
            </div>
          )}

          <div className="result-actions">
            <button type="button" className="btn-primary" onClick={handleNew}>Novo Simulado</button>
            <Link to="/historico-simulados" className="btn-ghost result-link">Ver histórico</Link>
            <Link to="/home" className="btn-ghost result-link">Início</Link>
          </div>
        </section>
      </div>
    )
  }

  return null
}
