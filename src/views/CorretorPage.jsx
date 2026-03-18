import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export function CorretorPage() {
  const navigate = useNavigate()
  const [tema, setTema] = useState('')
  const [redacao, setRedacao] = useState('')
  const [isRigido, setIsRigido] = useState(false)
  const [showParticles, setShowParticles] = useState(false)

  // Contador de palavras
  const wordCount = redacao.trim() === '' ? 0 : redacao.trim().split(/\s+/).length
  
  const getCountClass = () => {
    if (wordCount === 0) return 'char-count'
    if (wordCount < 100) return 'char-count'
    if (wordCount < 250) return 'char-count warn'
    return 'char-count ok'
  }

  const handleModeChange = (rigido) => {
    if (rigido && !isRigido) {
      setShowParticles(true)
      setTimeout(() => setShowParticles(false), 2200)
    }
    setIsRigido(rigido)
  }

  return (
    <>
      <style>{corretorCss}</style>
      
      <div className={`corretor-container ${isRigido ? 'modo-rigido' : ''}`}>
        {showParticles && (
          <div className="rigido-particles show">
            {[...Array(15)].map((_, i) => (
              <div
                key={i}
                className="r-particle"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 30 + 5}%`,
                  animationDelay: `${Math.random() * 0.8}s`,
                  width: `${2 + Math.random() * 3}px`,
                  height: `${2 + Math.random() * 3}px`,
                }}
              />
            ))}
          </div>
        )}

        <div className="corretor-hero anim anim-d1">
          <div className="corretor-hero-icon">
            <svg viewBox="0 0 24 24">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </div>
          <div className="corretor-hero-text">
            <div className="corretor-hero-title">
              {isRigido ? 'Correção Rigorosa' : 'Corretor de Redação'}
            </div>
            <div className="corretor-hero-sub">
              {isRigido 
                ? 'Critérios mais rígidos — cada detalhe será avaliado como na banca real do ENEM.'
                : 'Receba feedback detalhado por competência e nota 0–1000 em segundos.'}
            </div>
          </div>
        </div>

        <div className={`rigido-banner ${isRigido ? 'show' : ''}`}>
          <svg viewBox="0 0 24 24">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span><strong>Modo Rígido ativado.</strong> A correção será mais exigente — como a banca real do ENEM.</span>
        </div>

        <div className="card anim anim-d2">
          <div className="card-title">Tema da redação</div>
          <input 
            type="text" 
            className="input-field"
            value={tema}
            onChange={(e) => setTema(e.target.value)}
            placeholder="Ex: O impacto das redes sociais na saúde mental dos jovens..."
          />
          <div className="info-row" style={{ marginTop: 8 }}>
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Informe o tema exato para uma avaliação mais precisa
          </div>
        </div>

        <div className="card anim anim-d2">
          <div className="card-title">Sua redação</div>
          <textarea 
            className="textarea-field" 
            rows="10"
            value={redacao}
            onChange={(e) => setRedacao(e.target.value)}
            placeholder="Cole ou escreva sua redação dissertativo-argumentativa aqui..."
          />
          <div className={getCountClass()}>
            {wordCount} palavras
          </div>
        </div>

        <div className="card anim anim-d3">
          <div className="card-title">Modo de correção</div>
          <div className="mode-grid">
            <div 
              className={`mode-option ${!isRigido ? 'selected' : ''}`} 
              onClick={() => handleModeChange(false)}
            >
              <div className="mode-dot"></div>
              <div className="mode-name">Padrão</div>
              <div className="mode-desc">Correção fiel ao gabarito ENEM</div>
            </div>
            <div 
              className={`mode-option ${isRigido ? 'selected' : ''}`} 
              onClick={() => handleModeChange(true)}
            >
              <div className="mode-dot"></div>
              <div className="mode-name">Rígido</div>
              <div className="mode-desc">Mais exigente, como a banca real</div>
            </div>
          </div>
        </div>

        <div className="card anim anim-d3">
          <div className="card-title">O que será avaliado</div>
          <div className="competencias-preview">
            <div className="comp-chip">
              <div className="comp-chip-dot"></div>C1 — Domínio da norma culta da língua portuguesa
            </div>
            <div className="comp-chip">
              <div className="comp-chip-dot"></div>C2 — Compreensão do tema e repertório sociocultural
            </div>
            <div className="comp-chip">
              <div className="comp-chip-dot"></div>C3 — Organização e defesa de tese
            </div>
            <div className="comp-chip">
              <div className="comp-chip-dot"></div>C4 — Mecanismos de coesão textual
            </div>
            <div className="comp-chip">
              <div className="comp-chip-dot"></div>C5 — Proposta de intervenção detalhada
            </div>
          </div>
        </div>

        <button 
          className="btn-primary anim anim-d4" 
          onClick={() => navigate('/resultado-redacao')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0f0f0f" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
          Corrigir redação
        </button>
      </div>
    </>
  )
}

const corretorCss = `
  .char-count {
    text-align: right;
    font-size: 11px;
    color: var(--text3);
    margin-top: 5px;
  }

  .char-count.warn {
    color: var(--amber);
  }

  .char-count.ok {
    color: var(--accent);
  }

  .mode-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .mode-option {
    border: 1.5px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 12px 14px;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s, transform 0.15s;
    background: var(--bg2);
  }

  .mode-option:hover {
    border-color: var(--border2);
    transform: translateY(-1px);
  }

  .mode-option.selected {
    border-color: var(--accent);
    background: var(--accent-dim);
  }

  .mode-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--text);
    margin-bottom: 2px;
  }

  .mode-desc {
    font-size: 11px;
    color: var(--text2);
    line-height: 1.4;
  }

  .mode-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--border2);
    margin-bottom: 8px;
    transition: background 0.2s;
  }

  .mode-option.selected .mode-dot {
    background: var(--accent);
  }

  .info-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text3);
    margin-top: 8px;
  }

  .info-row svg {
    width: 13px;
    height: 13px;
    stroke: var(--text3);
    fill: none;
    stroke-width: 1.5;
    flex-shrink: 0;
  }

  .competencias-preview {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .comp-chip {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--text2);
    padding: 4px 0;
  }

  .comp-chip-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
    flex-shrink: 0;
    transition: background 0.4s ease;
  }

  .corretor-hero {
    background: var(--card-dark);
    border: 1.5px solid rgba(200, 240, 96, 0.2);
    border-radius: 24px;
    padding: 1.5rem 1.25rem;
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 1rem;
    position: relative;
    overflow: hidden;
    transition: all 0.5s ease;
  }

  .corretor-hero-icon {
    width: 48px;
    height: 48px;
    background: rgba(200, 240, 96, 0.1);
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background 0.5s ease;
  }

  .corretor-hero-icon svg {
    width: 22px;
    height: 22px;
    stroke: var(--accent);
    fill: none;
    stroke-width: 1.5;
    transition: stroke 0.5s ease;
  }

  .corretor-hero-title {
    font-family: 'DM Serif Display', serif;
    font-size: 20px;
    color: var(--text);
    letter-spacing: -0.3px;
    margin-bottom: 3px;
    transition: color 0.5s ease;
  }

  .corretor-hero-sub {
    font-size: 12px;
    color: var(--text2);
    line-height: 1.45;
    transition: color 0.5s ease;
  }

  .corretor-hero::after {
    content: '';
    position: absolute;
    top: 12px;
    right: 16px;
    width: 4px;
    height: 4px;
    background: var(--accent);
    border-radius: 50%;
    opacity: 0.3;
    transition: all 0.5s ease;
  }

  /* MODO RÍGIDO */
  .modo-rigido .corretor-hero {
    border-color: rgba(255, 107, 107, 0.35);
    background: linear-gradient(135deg, var(--card-dark) 0%, rgba(255, 60, 60, 0.05) 100%);
  }

  .modo-rigido .corretor-hero::after {
    background: var(--red);
    opacity: 0.5;
    animation: pulseWarn 1.5s ease-in-out infinite;
  }

  .modo-rigido .corretor-hero-icon {
    background: rgba(255, 107, 107, 0.12);
  }

  .modo-rigido .corretor-hero-icon svg {
    stroke: var(--red);
  }

  .modo-rigido .card {
    border-color: rgba(255, 107, 107, 0.15);
  }

  .modo-rigido .comp-chip-dot {
    background: var(--red);
  }

  .modo-rigido .btn-primary {
    background: var(--red);
  }

  .modo-rigido .btn-primary:hover {
    background: #ff5252;
  }

  .modo-rigido .mode-option.selected {
    border-color: var(--red);
    background: rgba(255, 107, 107, 0.08);
  }

  .modo-rigido .mode-option.selected .mode-dot {
    background: var(--red);
  }

  .rigido-banner {
    display: none;
    background: rgba(255, 107, 107, 0.08);
    border: 1.5px solid rgba(255, 107, 107, 0.25);
    border-radius: var(--radius-sm);
    padding: 10px 14px;
    margin-bottom: 12px;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    color: var(--red);
    line-height: 1.5;
  }

  .rigido-banner.show {
    display: flex;
    animation: shakeIn 0.5s ease;
  }

  .rigido-banner svg {
    width: 18px;
    height: 18px;
    stroke: var(--red);
    fill: none;
    stroke-width: 1.5;
    flex-shrink: 0;
  }

  .rigido-banner strong {
    font-weight: 600;
  }

  .rigido-particles {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 999;
    overflow: hidden;
    display: none;
  }

  .rigido-particles.show {
    display: block;
  }

  .r-particle {
    position: absolute;
    background: var(--red);
    border-radius: 50%;
    opacity: 0;
    animation: particleFall 1.2s ease-out forwards;
  }

  @keyframes pulseWarn {
    0%, 100% { opacity: 0.3; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(1.5); }
  }

  @keyframes shakeIn {
    0% { transform: translateX(-8px); opacity: 0; }
    25% { transform: translateX(6px); }
    50% { transform: translateX(-4px); }
    75% { transform: translateX(2px); }
    100% { transform: translateX(0); opacity: 1; }
  }

  @keyframes particleFall {
    0% { opacity: 0.8; transform: translateY(0) scale(1); }
    100% { opacity: 0; transform: translateY(60px) scale(0.3); }
  }
`
