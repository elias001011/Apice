import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { gerarSimulado, salvarProgressoSimulado, carregarProgressoSimulado, limparProgressoSimulado } from '../services/simuladoService.js'
import { getDisciplinasByArea, getAreasDisponiveis } from '../services/enemApiService.js'
import { useAppBusy } from '../ui/AppBusyContext.jsx'
import '../styles/simulado.css'

const AREAS = getAreasDisponiveis()

export function SimuladoPage() {
  const { beginBusy, endBusy } = useAppBusy()
  const [step, setStep] = useState('setup') // setup, loading, exam, result
  const [examData, setExamData] = useState(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [showFeedback, setShowFeedback] = useState(false)
  const [error, setError] = useState(null)
  const [questionStartTime, setQuestionStartTime] = useState(null)
  
  // Configuração do simulado
  const [selectedArea, setSelectedArea] = useState(null)
  const [selectedDisciplinas, setSelectedDisciplinas] = useState([])
  const [quantidade, setQuantidade] = useState(20)

  // Carrega progresso salvo ao entrar
  useEffect(() => {
    const saved = carregarProgressoSimulado()
    if (saved?.examData && saved.step === 'exam') {
      const shouldRestore = window.confirm('Você tem um simulado em andamento. Deseja continuar de onde parou?')
      if (shouldRestore) {
        setExamData(saved.examData)
        setSelectedArea(saved.selectedArea)
        setSelectedDisciplinas(saved.selectedDisciplinas || [])
        setCurrentQuestionIndex(saved.currentQuestionIndex || 0)
        setAnswers(saved.answers || {})
        setQuantidade(saved.quantidade || 20)
        setStep('exam')
      }
    }
  }, [])

  // Salva progresso a cada mudança durante o simulado
  useEffect(() => {
    if (step === 'exam' && examData) {
      salvarProgressoSimulado({
        step: 'exam',
        examData,
        selectedArea,
        selectedDisciplinas,
        currentQuestionIndex,
        answers,
        quantidade,
      })
    }
  }, [step, examData, currentQuestionIndex, answers, selectedArea, selectedDisciplinas, quantidade])

  // Quando muda área, reseta disciplinas selecionadas
  const handleAreaChange = (areaId) => {
    setSelectedArea(areaId)
    setSelectedDisciplinas([])
  }

  // Toggle disciplina
  const toggleDisciplina = (discId) => {
    setSelectedDisciplinas(prev => 
      prev.includes(discId) 
        ? prev.filter(d => d !== discId)
        : [...prev, discId]
    )
  }

  // Seleciona todas as disciplinas da área
  const selectAllDisciplinas = () => {
    if (!selectedArea) return
    const disc = getDisciplinasByArea(selectedArea)
    setSelectedDisciplinas(disc.map(d => d.id))
  }

  // Inicia o simulado
  const handleStartExam = async () => {
    if (!selectedArea) {
      setError('Selecione uma área do conhecimento.')
      return
    }
    if (selectedDisciplinas.length === 0) {
      setError('Selecione pelo menos uma disciplina.')
      return
    }
    if (quantidade < 10 || quantidade > 200) {
      setError('A quantidade de questões deve ser entre 10 e 200.')
      return
    }

    setStep('loading')
    beginBusy()
    setError(null)

    try {
      const data = await gerarSimulado({
        area: selectedArea,
        disciplinas: selectedDisciplinas,
        quantidade,
        fonte: 'mista', // API + IA
      })
      
      if (!data?.questoes || !Array.isArray(data.questoes) || data.questoes.length === 0) {
        throw new Error('Não foi possível gerar questões. Tente novamente.')
      }

      setExamData(data)
      setStep('exam')
      setCurrentQuestionIndex(0)
      setAnswers({})
      setShowFeedback(false)
      setQuestionStartTime(Date.now())
      limparProgressoSimulado()
    } catch (err) {
      console.error('[SimuladoPage] Erro ao gerar simulado:', err)
      setError(err.message || 'Erro ao gerar simulado. Tente novamente.')
      setStep('setup')
    } finally {
      endBusy()
    }
  }

  const handleSelectOption = (letter) => {
    if (showFeedback) return
    setAnswers({ ...answers, [examData.questoes[currentQuestionIndex].id]: letter })
  }

  const handleConfirmAnswer = () => {
    setShowFeedback(true)
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < examData.questoes.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setShowFeedback(false)
      setQuestionStartTime(Date.now())
    } else {
      setStep('result')
      limparProgressoSimulado()
    }
  }

  const handleNewExam = () => {
    setStep('setup')
    setExamData(null)
    setSelectedArea(null)
    setSelectedDisciplinas([])
    setCurrentQuestionIndex(0)
    setAnswers({})
    setShowFeedback(false)
    setQuantidade(20)
    limparProgressoSimulado()
  }

  const calculateScore = () => {
    let score = 0
    examData.questoes.forEach(q => {
      if (answers[q.id] === q.correta) score++
    })
    return score
  }

  const disciplinasDaArea = selectedArea ? getDisciplinasByArea(selectedArea) : []

  // TELA DE SETUP
  if (step === 'setup') {
    return (
      <div className="simulado-container">
        <div className="simulado-header anim anim-d1">
          <h1 className="simulado-title">Simulados Ápice</h1>
          <p className="simulado-subtitle">
            Configure seu simulado personalizado com questões reais do ENEM e geração por IA.
          </p>
        </div>

        <div className="simulado-setup anim anim-d2">
          {/* 1. Seleção de Área */}
          <div className="setup-section">
            <h2 className="setup-section-title">1. Escolha a Área do Conhecimento</h2>
            <div className="area-grid">
              {AREAS.map(area => (
                <button
                  key={area.id}
                  type="button"
                  className={`area-card ${selectedArea === area.id ? 'selected' : ''}`}
                  onClick={() => handleAreaChange(area.id)}
                >
                  <div className="area-icon">{area.id[0]}</div>
                  <h3>{area.label}</h3>
                  <p>{area.disciplinas.length} disciplinas disponíveis</p>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Seleção de Disciplinas */}
          {selectedArea && (
            <div className="setup-section anim anim-d3">
              <div className="setup-section-header">
                <div>
                  <h2 className="setup-section-title">2. Selecione as Disciplinas</h2>
                  <p className="setup-section-copy">
                    Escolha uma ou mais matérias para o seu simulado.
                  </p>
                </div>
                <button type="button" className="btn-select-all" onClick={selectAllDisciplinas}>
                  Selecionar Todas
                </button>
              </div>
              <div className="disciplinas-grid">
                {disciplinasDaArea.map(disc => (
                  <button
                    key={disc.id}
                    type="button"
                    className={`disciplina-card ${selectedDisciplinas.includes(disc.id) ? 'selected' : ''}`}
                    onClick={() => toggleDisciplina(disc.id)}
                  >
                    <div className="disciplina-check">
                      {selectedDisciplinas.includes(disc.id) ? '✓' : '○'}
                    </div>
                    <span>{disc.label}</span>
                  </button>
                ))}
              </div>
              {selectedDisciplinas.length > 0 && (
                <p className="selected-count">
                  {selectedDisciplinas.length} disciplina(s) selecionada(s)
                </p>
              )}
            </div>
          )}

          {/* 3. Quantidade de Questões */}
          {selectedDisciplinas.length > 0 && (
            <div className="setup-section anim anim-d4">
              <h2 className="setup-section-title">3. Quantidade de Questões</h2>
              <div className="quantidade-config">
                <div className="quantidade-slider">
                  <input
                    type="range"
                    min="10"
                    max="200"
                    step="5"
                    value={quantidade}
                    onChange={(e) => setQuantidade(Number(e.target.value))}
                    className="slider"
                  />
                  <div className="quantidade-display">
                    <span className="quantidade-numero">{quantidade}</span>
                    <span className="quantidade-label">questões</span>
                  </div>
                </div>
                <div className="quantidade-presets">
                  {[10, 20, 45, 90, 180].map(q => (
                    <button
                      key={q}
                      type="button"
                      className={`preset-btn ${quantidade === q ? 'active' : ''}`}
                      onClick={() => setQuantidade(q)}
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <p className="quantidade-info">
                  As questões serão divididas igualmente entre as {selectedDisciplinas.length} disciplina(s) selecionada(s).
                </p>
              </div>
            </div>
          )}

          {/* Botão Iniciar */}
          {selectedDisciplinas.length > 0 && quantidade >= 10 && (
            <div className="setup-section anim anim-d5" style={{ textAlign: 'center' }}>
              <button type="button" className="btn-start-simulado" onClick={handleStartExam}>
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

  // TELA DE LOADING
  if (step === 'loading') {
    return (
      <div className="simulado-container">
        <div className="loading-box anim anim-d1">
          <div className="spinner"></div>
          <h2 className="simulado-title">Preparando Simulado...</h2>
          <p className="simulado-subtitle">
            Buscando questões reais da ENEM API e gerando questões complementares com IA...
          </p>
        </div>
      </div>
    )
  }

  // TELA DO SIMULADO
  if (step === 'exam' && examData) {
    const currentQuestion = examData.questoes[currentQuestionIndex]
    const selectedAnswer = answers[currentQuestion.id]
    const progress = ((currentQuestionIndex + 1) / examData.questoes.length) * 100

    return (
      <div className="simulado-container">
        <div className="simulado-nav anim anim-d1">
          <div className="timer">{examData.area}</div>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="question-count">
            {currentQuestionIndex + 1}/{examData.questoes.length}
          </div>
        </div>

        <div className="question-card anim anim-d2">
          <div className="question-meta">
            <span>{currentQuestion.disciplina || examData.area}</span>
            <span>Questão {currentQuestionIndex + 1}</span>
          </div>

          {currentQuestion.textoBase && (
            <div className="question-text-base">
              {currentQuestion.textoBase}
            </div>
          )}

          <h2 className="question-enunciado">
            {currentQuestion.enunciado}
          </h2>

          <div className="options-list">
            {Object.entries(currentQuestion.alternativas).map(([letter, text]) => {
              let className = 'option-item'
              if (selectedAnswer === letter) className += ' selected'
              if (showFeedback) {
                className += ' disabled'
                if (letter === currentQuestion.correta) className += ' correct'
                else if (selectedAnswer === letter) className += ' wrong'
              }

              return (
                <button
                  key={letter}
                  type="button"
                  className={className}
                  onClick={() => handleSelectOption(letter)}
                  disabled={showFeedback}
                >
                  <div className="option-letter">{letter}</div>
                  <div className="option-text">{text}</div>
                </button>
              )
            })}
          </div>

          {showFeedback && (
            <div className="feedback-box anim anim-d1">
              <div className="feedback-title">
                {selectedAnswer === currentQuestion.correta ? '✓ Resposta Correta!' : '✗ Resposta Incorreta'}
              </div>
              <div className="feedback-text">
                <strong>Resposta correta: {currentQuestion.correta}</strong>
                <br /><br />
                {currentQuestion.explicacao}
              </div>
              <button 
                type="button"
                className="btn-primary" 
                onClick={handleNextQuestion} 
                style={{ marginTop: '1.5rem', width: '100%' }}
              >
                {currentQuestionIndex < examData.questoes.length - 1 ? 'Próxima Questão →' : 'Ver Resultado Final'}
              </button>
            </div>
          )}

          {!showFeedback && selectedAnswer && (
            <button 
              type="button"
              className="btn-primary" 
              onClick={handleConfirmAnswer} 
              style={{ marginTop: '2rem', width: '100%' }}
            >
              Confirmar Resposta
            </button>
          )}
        </div>
      </div>
    )
  }

  // TELA DE RESULTADO
  if (step === 'result' && examData) {
    const total = examData.questoes.length
    const correct = calculateScore()
    const percent = Math.round((correct / total) * 100)
    const performance = percent >= 80 ? 'Excelente' : percent >= 60 ? 'Bom' : percent >= 40 ? 'Regular' : 'Precisa melhorar'

    return (
      <div className="simulado-container">
        <div className="card anim anim-d1" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text3)', marginBottom: '1rem' }}>
            Resultado do Simulado
          </div>
          <h1 className="simulado-title" style={{ marginBottom: '2rem' }}>
            {examData.area}
          </h1>
          
          <div className="result-score">
            {correct}<span>/{total}</span>
          </div>
          
          <p className="simulado-subtitle" style={{ marginBottom: '0.5rem' }}>
            Você acertou <strong>{percent}%</strong> das questões
          </p>
          <p style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--accent)', marginBottom: '2rem' }}>
            Desempenho: {performance}
          </p>

          {examData.estatisticas && (
            <div className="result-stats">
              <div className="stat-item">
                <span className="stat-value">{examData.estatisticas.reais}</span>
                <span className="stat-label">Questões Reais (ENEM)</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{examData.estatisticas.ia}</span>
                <span className="stat-label">Questões Geradas por IA</span>
              </div>
            </div>
          )}

          <div className="result-actions">
            <button type="button" className="btn-primary" onClick={handleNewExam}>
              Novo Simulado
            </button>
            <Link to="/home" className="btn-ghost" style={{ textDecoration: 'none' }}>
              Voltar ao Início
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return null
}
