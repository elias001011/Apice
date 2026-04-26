import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { authFetch } from '../services/authFetch.js'
import { loadAiResponsePreferenceText } from '../services/aiResponsePreferences.js'
import { saveSimuladoHistoryEntry } from '../services/simuladoHistory.js'
import { fetchQuestoesAleatorias, getDisciplinasByArea, getAreasDisponiveis } from '../services/enemApiService.js'
import { consumeFreePlan } from '../services/freePlanUsage.js'
import { useAppBusy } from '../ui/AppBusyContext.jsx'
import '../styles/simulado.css'

const AREAS = getAreasDisponiveis()
const MIN_Q = 3
const MAX_Q = 30
const PRESETS = [3, 5, 10, 15, 20, 30]
const MAX_AI_Q = 15

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

function clamp(n) {
  return Math.min(MAX_Q, Math.max(MIN_Q, Math.round(Number(n) || MIN_Q)))
}

async function gerarSimuladoEnem({ area, disciplinas, quantidade }) {
  const responsePreference = loadAiResponsePreferenceText()
  const alertas = []
  let questoesApi = []

  // 1. Tenta a API ENEM
  try {
    const disc = disciplinas.length > 0 ? disciplinas[0] : ''
    const batch = await fetchQuestoesAleatorias({ area, quantidade, disciplina: disc })
    questoesApi = Array.isArray(batch) ? batch : []
  } catch (err) {
    console.warn('[simulado] API ENEM falhou:', err.message)
  }

  // 2. Se API não fechou o total, completa com IA (máx 15)
  const faltando = quantidade - questoesApi.length
  let questoesIA = []

  if (faltando > 0) {
    const quantIA = Math.min(faltando, MAX_AI_Q)
    if (faltando > MAX_AI_Q) {
      alertas.push(`A IA foi limitada a ${MAX_AI_Q} questões. Total final: ${questoesApi.length + quantIA}.`)
    }
    try {
      const res = await authFetch('/.netlify/functions/gerar-simulado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          area, disciplinas, quantidade: quantIA,
          ...(responsePreference ? { responsePreference } : {}),
          useSearch: true,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data?.questoes)) {
          questoesIA = data.questoes
          if (data.alerta) alertas.push(data.alerta)
        }
      }
    } catch (err) {
      console.warn('[simulado] IA falhou:', err.message)
    }
  }

  const todas = dedup([...questoesApi, ...questoesIA])
  if (todas.length === 0) {
    throw new Error('Não foi possível gerar questões. Verifique sua conexão e tente novamente.')
  }

  const selecionadas = shuffle(todas).slice(0, quantidade)
  return {
    area, disciplinas,
    questoes: selecionadas,
    geradoEm: new Date().toISOString(),
    alerta: alertas.join(' ').trim(),
    estatisticas: { reais: questoesApi.length, ia: questoesIA.length, bancoLocal: 0 },
  }
}

function dedup(arr) {
  const seen = new Set()
  return arr.filter(q => {
    if (!q) return false
    const key = String(q.id || q.enunciado || '').trim()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const STORAGE_KEY = 'apice:simulado_progresso:v2'
function salvarProgresso(data) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, savedAt: new Date().toISOString() })) } catch {} }
function carregarProgresso() {
  try {
    const p = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (!p) return null
    if (Date.now() - new Date(p.savedAt).getTime() > 2 * 60 * 60 * 1000) { localStorage.removeItem(STORAGE_KEY); return null }
    return p
  } catch { return null }
}
function limparProgresso() { try { localStorage.removeItem(STORAGE_KEY) } catch {} }

export function SimuladoPage() {
  const { beginBusy, endBusy } = useAppBusy()
  const [step, setStep] = useState('setup')
  const [examData, setExamData] = useState(null)
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState({})
  const [showFeedback, setShowFeedback] = useState(false)
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
        setAnswers(saved.answers || {}); setQuantidade(clamp(saved.quantidade || 10)); setStep('exam')
      }
    }
  }, [])

  useEffect(() => {
    if (step === 'exam' && examData) {
      salvarProgresso({ step: 'exam', examData, selectedArea, selectedDiscs, currentQ, answers, quantidade })
    }
  }, [step, examData, currentQ, answers, selectedArea, selectedDiscs, quantidade])

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
      setExamData(data); setStep('exam'); setCurrentQ(0); setAnswers({}); setShowFeedback(false)
      limparProgresso()
    } catch (err) {
      setError(err.message || 'Erro ao gerar simulado.'); setStep('setup')
    } finally { endBusy() }
  }

  const handleSelect = (letter) => { if (showFeedback) return; setAnswers({ ...answers, [examData.questoes[currentQ].id]: letter }) }
  const handleConfirm = () => setShowFeedback(true)

  const handleNext = () => {
    if (currentQ < examData.questoes.length - 1) { setCurrentQ(currentQ + 1); setShowFeedback(false) }
    else {
      const total = examData.questoes.length
      const acertos = examData.questoes.filter(q => answers[q.id] === q.correta).length
      const pct = total > 0 ? Math.round((acertos / total) * 100) : 0
      const perf = pct >= 80 ? 'Excelente' : pct >= 60 ? 'Bom' : pct >= 40 ? 'Regular' : 'Precisa melhorar'
      saveSimuladoHistoryEntry({
        id: `${Date.now()}`, data: new Date().toISOString(),
        titulo: `Simulado de ${selectedArea}`, area: selectedArea, disciplinas: selectedDiscs,
        fonte: 'enem-api', quantidade: total, acertos, total, percentual: pct, performance: perf,
        estatisticas: examData.estatisticas, limiteIAAplicado: examData.estatisticas.ia > 0,
        alerta: examData.alerta, geradoEm: examData.geradoEm,
      })
      setStep('result'); limparProgresso()
    }
  }

  const handleNew = () => {
    setStep('setup'); setExamData(null); setSelectedArea(null); setSelectedDiscs([])
    setCurrentQ(0); setAnswers({}); setShowFeedback(false); setQuantidade(10); limparProgresso()
  }

  const discs = selectedArea ? getDisciplinasByArea(selectedArea) : []

  // ── SETUP ─────────────────────────────────────────────────────────────────
  if (step === 'setup') {
    return (
      <div className="simulado-container">
        <div className="simulado-header anim anim-d1">
          <h1 className="simulado-title">Simulados ENEM</h1>
          <p className="simulado-subtitle">
            Questões reais do ENEM via API oficial. Se faltar, a IA completa (máx. {MAX_AI_Q} questões).
          </p>
        </div>

        <div className="simulado-setup anim anim-d2">
          {/* Área */}
          <div className="setup-section">
            <h2 className="setup-section-title">1. Área do Conhecimento</h2>
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
                  <p>{area.disciplinas.length} disciplinas</p>
                </button>
              ))}
            </div>
          </div>

          {/* Disciplinas */}
          {selectedArea && (
            <div className="setup-section anim anim-d3">
              <div className="setup-section-header">
                <h2 className="setup-section-title">2. Disciplinas</h2>
                <button type="button" className="btn-select-all" onClick={selectAll}>Todas</button>
              </div>
              <div className="disciplinas-grid">
                {discs.map(disc => (
                  <button
                    key={disc.id}
                    type="button"
                    className={`disciplina-card ${selectedDiscs.includes(disc.id) ? 'selected' : ''}`}
                    onClick={() => toggleDisc(disc.id)}
                  >
                    <div className="disciplina-check">{selectedDiscs.includes(disc.id) ? '✓' : '○'}</div>
                    <span>{disc.label}</span>
                  </button>
                ))}
              </div>
              {selectedDiscs.length > 0 && <p className="selected-count">{selectedDiscs.length} selecionada(s)</p>}
            </div>
          )}

          {/* Quantidade */}
          {selectedDiscs.length > 0 && (
            <div className="setup-section anim anim-d4">
              <h2 className="setup-section-title">3. Quantidade de Questões</h2>
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
            </div>
          )}

          {selectedDiscs.length > 0 && (
            <div className="setup-section anim anim-d5" style={{ textAlign: 'center' }}>
              <button type="button" className="btn-start-simulado" onClick={handleStart}>
                🚀 Iniciar Simulado
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="card anim anim-d1" style={{ marginTop: '2rem', borderColor: 'var(--red)' }}>
            <p style={{ color: 'var(--red)', margin: 0, textAlign: 'center' }}>{error}</p>
          </div>
        )}
      </div>
    )
  }

  // ── LOADING ────────────────────────────────────────────────────────────────
  if (step === 'loading') {
    return (
      <div className="simulado-container">
        <div className="loading-box anim anim-d1">
          <div className="spinner" />
          <h2 className="simulado-title">Buscando questões reais...</h2>
          <p className="simulado-subtitle">API ENEM oficial · fallback IA até {MAX_AI_Q} questões</p>
        </div>
      </div>
    )
  }

  // ── EXAM ───────────────────────────────────────────────────────────────────
  if (step === 'exam' && examData) {
    const q = examData.questoes[currentQ]
    const sel = answers[q.id]
    const prog = ((currentQ + 1) / examData.questoes.length) * 100

    return (
      <div className="simulado-container">
        <div className="simulado-nav anim anim-d1">
          <div className="timer">{examData.area}</div>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width: `${prog}%` }} />
          </div>
          <div className="question-count">{currentQ + 1}/{examData.questoes.length}</div>
        </div>

        <div className="question-card anim anim-d2">
          <div className="question-meta">
            <span>{q.disciplina || examData.area}</span>
            <span>Questão {currentQ + 1}</span>
            {q.ano && <span>{q.ano}</span>}
          </div>

          {q.textoBase && (
            <div className="question-text-base">
              <SimuladoText text={q.textoBase} />
            </div>
          )}

          <div className="question-enunciado">
            <SimuladoText text={q.enunciado} />
          </div>

          <div className="options-list">
            {Object.entries(q.alternativas || {}).map(([letter, text]) => {
              let cls = 'option-item'
              if (sel === letter) cls += ' selected'
              if (showFeedback) {
                cls += ' disabled'
                if (letter === q.correta) cls += ' correct'
                else if (sel === letter) cls += ' wrong'
              }
              return (
                <button key={letter} type="button" className={cls}
                  onClick={() => handleSelect(letter)} disabled={showFeedback}>
                  <div className="option-letter">{letter}</div>
                  <div className="option-text"><SimuladoText text={text} /></div>
                </button>
              )
            })}
          </div>

          {showFeedback && (
            <div className="feedback-box anim anim-d1">
              <div className="feedback-title">
                {sel === q.correta ? '✓ Resposta Correta!' : '✗ Resposta Incorreta'}
              </div>
              <div className="feedback-text">
                <strong>Gabarito: {q.correta}</strong>
                {q.explicacao && <><br /><br /><SimuladoText text={q.explicacao} /></>}
              </div>
              <button type="button" className="btn-primary" onClick={handleNext}
                style={{ marginTop: '1.5rem', width: '100%' }}>
                {currentQ < examData.questoes.length - 1 ? 'Próxima →' : 'Ver Resultado Final'}
              </button>
            </div>
          )}

          {!showFeedback && sel && (
            <button type="button" className="btn-primary" onClick={handleConfirm}
              style={{ marginTop: '2rem', width: '100%' }}>
              Confirmar Resposta
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── RESULT ─────────────────────────────────────────────────────────────────
  if (step === 'result' && examData) {
    const total = examData.questoes.length
    const acertos = examData.questoes.filter(q => answers[q.id] === q.correta).length
    const pct = Math.round((acertos / total) * 100)
    const perf = pct >= 80 ? 'Excelente 🏆' : pct >= 60 ? 'Bom 👍' : pct >= 40 ? 'Regular 📚' : 'Precisa melhorar 💪'

    return (
      <div className="simulado-container">
        <div className="card anim anim-d1" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text3)', marginBottom: '1rem' }}>
            Resultado do Simulado
          </div>
          <h1 className="simulado-title" style={{ marginBottom: '2rem' }}>{examData.area}</h1>

          {examData.alerta && (
            <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem', borderColor: 'rgba(255,193,7,0.35)', background: 'rgba(255,193,7,0.06)', textAlign: 'left' }}>
              <strong style={{ display: 'block', marginBottom: '0.35rem' }}>Composição do simulado</strong>
              <div style={{ color: 'var(--text2)', fontSize: '0.92rem' }}>{examData.alerta}</div>
            </div>
          )}

          <div className="result-score">{acertos}<span>/{total}</span></div>
          <p className="simulado-subtitle" style={{ marginBottom: '0.5rem' }}>
            Você acertou <strong>{pct}%</strong>
          </p>
          <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent)', marginBottom: '2rem' }}>
            {perf}
          </p>

          {examData.estatisticas && (
            <div className="result-stats">
              <div className="stat-item">
                <span className="stat-value">{examData.estatisticas.reais}</span>
                <span className="stat-label">Questões reais (API ENEM)</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{examData.estatisticas.ia}</span>
                <span className="stat-label">Geradas por IA</span>
              </div>
            </div>
          )}

          <div className="result-actions">
            <button type="button" className="btn-primary" onClick={handleNew}>Novo Simulado</button>
            <Link to="/historico-simulados" className="btn-ghost" style={{ textDecoration: 'none' }}>Ver histórico</Link>
            <Link to="/home" className="btn-ghost" style={{ textDecoration: 'none' }}>Início</Link>
          </div>
        </div>
      </div>
    )
  }

  return null
}
