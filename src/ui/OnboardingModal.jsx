import { useState } from 'react'
import { savePolicyConsent } from '../services/policyConsent.js'

const ONBOARDING_KEY = 'apice:onboarding-shown'

function readShouldShowOnboarding() {
  if (typeof window === 'undefined') return false
  return !localStorage.getItem(ONBOARDING_KEY)
}

export function OnboardingModal({ onComplete }) {
  const [step, setStep] = useState(1)
  const [isVisible, setIsVisible] = useState(readShouldShowOnboarding)

  if (!isVisible) return null

  const handleNext = () => {
    if (step < 3) setStep(step + 1)
  }

  const handleFinish = () => {
    // Marca onboarding como visto
    savePolicyConsent(true)
    localStorage.setItem(ONBOARDING_KEY, 'true')
    setIsVisible(false)
    if (onComplete) onComplete()
  }

  return (
    <div className="onboarding-overlay">
      <style>{onboardingCss}</style>
      <div className="onboarding-card anim-scale-up">
        {/* Progress dots */}
        <div className="onboarding-progress">
          <div className={`progress-dot ${step >= 1 ? 'active' : ''}`} />
          <div className={`progress-dot ${step >= 2 ? 'active' : ''}`} />
          <div className={`progress-dot ${step >= 3 ? 'active' : ''}`} />
        </div>

        <div className="onboarding-content">
          {step === 1 && (
            <div className="onboarding-step-view anim-fade-in">
              <div className="step-icon">👋</div>
              <h2>Bem-vindo ao Ápice!</h2>
              <p className="mission-text">
                Nossa missão é democratizar o acesso a ferramentas de elite, dando a cada estudante 
                a chance de alcançar a <strong>nota 1000 no ENEM</strong> através da inteligência artificial.
              </p>
              <div className="step-footer">
                <button className="btn-primary" onClick={handleNext}>Conhecer o projeto</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="onboarding-step-view anim-fade-in">
              <div className="step-icon">💡</div>
              <h2>Como o Ápice funciona?</h2>
              <ul className="features-list">
                <li>
                  <strong>Corretor Inteligente:</strong> Corrija suas redações com critérios oficiais do INEP em segundos.
                </li>
                <li>
                  <strong>Radar 1000:</strong> Fique por dentro dos temas com maior probabilidade de cair no próximo ENEM.
                </li>
                <li>
                  <strong>Análise de Desempenho:</strong> Entenda seus pontos fortes e onde focar para evoluir.
                </li>
              </ul>
              <div className="step-footer">
                <button className="btn-primary" onClick={handleNext}>Continuar</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="onboarding-step-view anim-fade-in">
              <div className="step-icon">🎯</div>
              <h2>Nossa Missão</h2>
              <p>
                O Ápice nasceu com o objetivo de democratizar o acesso à preparação de alta performance. 
                Queremos que cada estudante, independentemente de onde venha, tenha uma IA de nível mundial 
                como seu tutor particular para alcançar o 1000 no ENEM.
              </p>
              
              <div className="mission-highlight">
                Nosso propósito é transformar seu esforço em resultado real e sua redação em uma porta de entrada para a universidade.
              </div>

              <div className="step-footer">
                <button 
                  className="btn-primary" 
                  onClick={handleFinish}
                >
                  Vamos começar!
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const onboardingCss = `
  .onboarding-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: none;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  html[data-fx="blur"] .onboarding-overlay {
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
  }

  .onboarding-card {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 28px;
    width: 100%;
    max-width: 480px;
    padding: 2.5rem 2rem;
    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5);
    position: relative;
  }

  .onboarding-progress {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-bottom: 2rem;
  }

  .progress-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--border);
    transition: all 0.3s ease;
  }

  .progress-dot.active {
    background: var(--accent);
    transform: scale(1.2);
  }

  .onboarding-step-view {
    text-align: center;
  }

  .step-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  h2 {
    font-family: 'DM Serif Display', serif;
    font-size: 1.75rem;
    color: var(--text);
    margin-bottom: 1rem;
  }

  p {
    font-size: 0.95rem;
    color: var(--text2);
    line-height: 1.6;
    margin-bottom: 1.5rem;
  }

  .mission-text {
    font-size: 1.1rem;
    color: var(--text);
  }

  .features-list {
    text-align: left;
    list-style: none;
    padding: 0;
    margin: 1.5rem 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .features-list li {
    font-size: 0.95rem;
    color: var(--text2);
    line-height: 1.6;
    position: relative;
    padding-left: 28px;
  }

  html[data-theme="dark"] .features-list li {
    color: var(--text) !important;
  }

  .features-list li strong {
    color: var(--accent);
    display: block;
    font-size: 1rem;
    margin-bottom: 2px;
  }

  .features-list li::before {
    content: '✓';
    position: absolute;
    left: 0;
    color: var(--accent);
    font-weight: bold;
  }

  .mission-highlight {
    background: var(--accent-dim);
    border: 1.5px solid var(--accent-dim2);
    padding: 1.25rem;
    border-radius: 16px;
    margin-bottom: 2rem;
    text-align: center;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--accent);
    line-height: 1.4;
  }

  .checkbox-container {
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    font-size: 0.85rem;
    color: var(--text2);
  }

  .checkbox-container input {
    display: none;
  }

  .checkmark {
    width: 20px;
    height: 20px;
    border: 2px solid var(--border2);
    border-radius: 6px;
    position: relative;
    flex-shrink: 0;
    transition: all 0.2s;
    background: var(--bg2);
  }

  .checkbox-container input:checked + .checkmark {
    background: var(--accent);
    border-color: var(--accent);
  }

  .checkmark::after {
    content: '';
    position: absolute;
    left: 6px;
    top: 2px;
    width: 5px;
    height: 10px;
    border: solid #0f0f0f;
    border-width: 0 2.5px 2.5px 0;
    transform: rotate(45deg);
    display: none;
  }

  .checkbox-container input:checked + .checkmark::after {
    display: block;
  }

  .checkbox-label a {
    color: var(--accent);
    text-decoration: none;
    font-weight: 600;
  }

  .checkbox-label a:hover {
    text-decoration: underline;
  }

  .step-footer {
    margin-top: 1rem;
  }

  .btn-primary {
    width: 100%;
    padding: 12px;
    background: var(--accent);
    color: #0f0f0f;
    border: none;
    border-radius: 12px;
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--accent2);
    transform: translateY(-2px);
  }

  .btn-primary:active {
    transform: translateY(0);
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .anim-fade-in {
    animation: fadeIn 0.4s ease-out forwards;
  }

  .anim-scale-up {
    animation: scaleUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes scaleUp {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
`
