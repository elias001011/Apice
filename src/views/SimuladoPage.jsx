import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { gerarSimulado, salvarProgressoSimulado, carregarProgressoSimulado, limparProgressoSimulado } from '../services/simuladoService.js'
import { useAppBusy } from '../ui/AppBusyContext.jsx'
import '../styles/simulado.css'

const AREAS = [
  { id: 'Linguagens', title: 'Linguagens e Códigos', icon: 'L', description: 'Gramática, interpretação textual e linguagens artísticas' },
  { id: 'Humanas', title: 'Ciências Humanas', icon: 'H', description: 'História, geografia, filosofia e sociologia' },
  { id: 'Natureza', title: 'Ciências da Natureza', icon: 'N', description: 'Física, química e biologia integradas' },
  { id: 'Matematica', title: 'Matemática', icon: 'M', description: 'Matemática básica e avançada aplicada' }
]

export function SimuladoPage() {
  const { beginBusy, endBusy } = useAppBusy()
  const [step, setStep] = useState('setup')
  const [selectedArea, setSelectedArea] = useState(null)
  const [examData, setExamData] = useState(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [showFeedback, setShowFeedback] = useState(false)
  const [error, setError] = useState(null)
  const [questionStartTime, setQuestionStartTime] = useState(null)

  useEffect(() => {
    const saved = carregarProgressoSimulado()
    if (saved && saved.examData && saved.step === 'exam') {
      const shouldRestore = window.confirm('Você tem um simulado em andamento. Deseja continuar de onde parou?')
      if (shouldRestore) {
        setExamData(saved.examData)
        setSelectedArea(saved.selectedArea)
        setCurrentQuestionIndex(saved.currentQuestionIndex || 0)
        setAnswers(saved.answers || {})
        setStep('exam')
      }
    }
  }, [])

  useEffect(() => {
    if (step === 'exam' && examData) {
      salvarProgressoSimulado({
        step: 'exam',
        examData,
        selectedArea,
        currentQuestionIndex,
        answers,
      })
    }
  }, [step, examData, currentQuestionIndex, answers, selectedArea])

  const handleStartExam = async (area) => {
    setSelectedArea(area)
    setStep('loading')
    beginBusy()
    setError(null)

    try {
      const data = await gerarSimulado({ area: area.id, quantidade: 5 })
      
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
    setCurrentQuestionIndex(0)
    setAnswers({})
    setShowFeedback(false)
    limparProgressoSimulado()
  }

  const calculateScore = () => {
    let score = 0
    examData.questoes.forEach(q => {
      if (answers[q.id] === q.correta) score++
    })
    return score
  }

  if (step === 'setup') {
    return (
      <div className="simulado-container">
        <div className="simulado-header anim anim-d1">
          <h1 className="simulado-title">Simulados Ápice</h1>
          <p className="simulado-subtitle">
            Escolha uma área do conhecimento para começar seu treinamento intensivo com questões geradas por IA.
          </p>
        </div>

        <div className="simulado-setup">
          {AREAS.map((area, index) => (
            <div
              key={area.id}
              className="setup-card anim anim-d1"
              style={{ animationDelay: `${index * 0.1}s` }}
              onClick={() => handleStartExam(area)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleStartExam(area)}
            >
              <div className="setup-icon">{area.icon}</div>
              <h3>{area.title}</h3>
              <p>{area.description}</p>
            </div>
          ))}
        </div>
        {error && (
          <div className="card" style={{ marginTop: '2rem', borderColor: 'var(--red)' }}>
            <p style={{ color: 'var(--red)', margin: 0, textAlign: 'center' }}>{error}</p>
          </div>
        )}
      </div>
    )
  }

  if (step === 'loading') {
    return (
      <div className="simulado-container">
        <div className="loading-box anim anim-d1">
          <div className="spinner"></div>
          <h2 className="simulado-title">Preparando Simulado...</h2>
          <p className="simulado-subtitle">
            Nossa IA está selecionando e gerando as melhores questões de {selectedArea?.title} para você.
          </p>
        </div>
      </div>
    )
  }

  if (step === 'exam' && examData) {
    const currentQuestion = examData.questoes[currentQuestionIndex]
    const selectedAnswer = answers[currentQuestion.id]
    const progress = ((currentQuestionIndex + 1) / examData.questoes.length) * 100
    const timeSpent = questionStartTime ? Math.round((Date.now() - questionStartTime) / 1000) : 0

    return (
      <div className="simulado-container">
        <div className="simulado-nav anim anim-d1">
          <div className="timer">ENEM LAB — {selectedArea.title}</div>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="question-count">
            {currentQuestionIndex + 1}/{examData.questoes.length}
          </div>
        </div>

        <div className="question-card anim anim-d2">
          <div className="question-meta">
            <span>{selectedArea.title}</span>
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
            {selectedArea.title}
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
