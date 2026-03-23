import { useState } from 'react'
import { Link } from 'react-router-dom'

const TEMAS = [
  {
    titulo: 'Impacto da inteligência artificial no mercado de trabalho brasileiro',
    probabilidade: 87,
    hot: true,
    tags: [
      { label: 'Tecnologia', tipo: 'area-ciencia' },
      { label: 'Trabalho', tipo: 'area-social' },
      { label: 'Desigualdade', tipo: 'area-social' }
    ],
    justificativa: 'Tema dominante no debate público desde 2023. O ENEM historicamente acompanha pautas nacionais com 1–2 anos de defasagem. Alta chance de abordagem com enfoque em impacto social.'
  },
  {
    titulo: 'Saúde mental dos jovens na era das redes sociais',
    probabilidade: 79,
    hot: true,
    tags: [
      { label: 'Saúde', tipo: 'area-social' },
      { label: 'Cultura digital', tipo: 'area-cultura' },
      { label: 'Juventude', tipo: 'area-social' }
    ],
    justificativa: 'Pauta crescente no Congresso e na mídia. O ENEM abordou saúde mental em 2023. Probabilidade alta de retorno com foco no jovem.'
  },
  {
    titulo: 'Desafios para a preservação das línguas indígenas no Brasil',
    probabilidade: 64,
    hot: false,
    tags: [
      { label: 'Cultura', tipo: 'area-cultura' },
      { label: 'Diversidade', tipo: 'area-social' },
      { label: 'Direitos', tipo: 'area-social' }
    ],
    justificativa: 'O ENEM mantém padrão de abordar diversidade cultural a cada 2–3 edições. Marco Temporal e debate indígena marcaram 2023–2024.'
  },
  {
    titulo: 'O papel do Estado no combate à desinformação e fake news',
    probabilidade: 58,
    hot: false,
    tags: [
      { label: 'Tecnologia', tipo: 'area-ciencia' },
      { label: 'Democracia', tipo: 'area-social' },
      { label: 'Comunicação', tipo: 'area-cultura' }
    ],
    justificativa: 'PL das Fake News e eleições de 2022 e 2024 mantiveram o tema em evidência. Abordagem pode exigir repertório sobre liberdade de expressão vs. regulação estatal.'
  },
  {
    titulo: 'Crise hídrica e acesso à água potável no semiárido brasileiro',
    probabilidade: 51,
    hot: false,
    tags: [
      { label: 'Meio ambiente', tipo: 'area-ciencia' },
      { label: 'Desigualdade', tipo: 'area-social' },
      { label: 'Semiárido', tipo: 'area-social' }
    ],
    justificativa: 'Meio ambiente é recorrente no ENEM. A crise climática de 2024 no Rio Grande do Sul pode direcionar o foco para recursos hídricos e vulnerabilidade regional.'
  }
]

export function RadarPage() {
  const [status, setStatus] = useState('intro') // 'intro', 'loading', 'results'

  const handleBuscar = () => {
    setStatus('loading')
    setTimeout(() => {
      setStatus('intro')
      alert('🚧 Em breve! O algoritmo inteligente de tendências está sendo calibrado com os microdados do INEP de 2024. Volte nas próximas atualizações.')
    }, 1200)
  }

  return (
    <>
      <style>{radarCss}</style>
      <div className="page-header anim anim-d1">
        <div className="page-title">Radar <span>1000</span></div>
        <div className="page-sub">Análise dos temas mais prováveis para a redação do ENEM 2025, baseada em padrões históricos e contexto sociopolítico atual.</div>
      </div>

      {status === 'intro' && (
        <div className="radar-intro anim anim-d2" id="radar-intro">
          <div className="radar-intro-icon">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="2" />
              <path d="M16.24 7.76a6 6 0 010 8.49m-8.48-.01a6 6 0 010-8.49m11.31-2.82a10 10 0 010 14.14m-14.14 0a10 10 0 010-14.14" />
            </svg>
          </div>
          <div className="radar-intro-text">
            O Radar 1000 analisa padrões históricos das provas do ENEM, o contexto sociopolítico atual e tendências do debate público brasileiro para estimar os temas com maior probabilidade de aparecer na redação deste ano.
          </div>
          <button className="btn-primary" onClick={handleBuscar} type="button">
            <svg viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            Buscar Temas
          </button>
        </div>
      )}

      {status === 'loading' && (
        <div className="radar-loading show" id="radar-loading">
          <div className="radar-spinner"></div>
          <div className="radar-loading-text">Analisando padrões e tendências…</div>
        </div>
      )}

      {status === 'results' && (
        <div id="radar-results" className="show">
          <div className="radar-hero">
            <div className="radar-icon-wrap">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="2" />
                <path d="M16.24 7.76a6 6 0 010 8.49m-8.48-.01a6 6 0 010-8.49m11.31-2.82a10 10 0 010 14.14m-14.14 0a10 10 0 010-14.14" />
              </svg>
            </div>
            <div className="radar-hero-text">
              <div className="radar-hero-title">Atualizado para o ENEM 2025</div>
              <div className="radar-hero-sub">Nossa IA analisa 10 anos de provas e o contexto atual para estimar os temas mais prováveis desta edição.</div>
            </div>
          </div>

          <div className="section-label">Temas em alta — maior probabilidade</div>

          {TEMAS.map((tema, idx) => (
            <Link to="/tema-detalhe" className={`tema-card ${tema.hot ? 'hot' : ''}`} key={idx} style={{ animationDelay: `${0.15 + (idx * 0.07)}s` }}>
              <div className="tema-top">
                <div className="tema-titulo">{tema.titulo}</div>
                <div className="probabilidade">
                  <div className="prob-num">{tema.probabilidade}%</div>
                  <div className="prob-label">provável</div>
                </div>
              </div>
              <div className="tema-tags">
                {tema.tags.map((tag, i) => (
                  <span key={i} className={`tema-tag ${tag.tipo}`}>{tag.label}</span>
                ))}
              </div>
              <div className="tema-justificativa">{tema.justificativa}</div>
            </Link>
          ))}

          <div className="atualizado" style={{ animationDelay: '0.5s' }}>
            Radar atualizado em março de 2025 · Próxima atualização em abril
          </div>
        </div>
      )}
    </>
  )
}

const radarCss = `
  /* ── PAGE HEADER ── */
  .page-header {
    margin-bottom: 1.5rem;
    padding-bottom: 1.25rem;
    border-bottom: 0.5px solid var(--border);
  }

  .page-header .page-title {
    font-family: 'DM Serif Display', serif;
    font-size: 26px;
    color: var(--text);
    letter-spacing: -0.4px;
    margin-bottom: 6px;
    line-height: 1.2;
  }

  .page-header .page-title span {
    color: var(--accent);
  }

  .page-header .page-sub {
    font-size: 13px;
    color: var(--text2);
    line-height: 1.6;
    max-width: 420px;
  }

  .radar-hero {
    background: var(--bg2);
    border: 1.5px solid var(--border);
    border-radius: 24px;
    padding: 1.25rem;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .radar-icon-wrap {
    width: 48px;
    height: 48px;
    flex-shrink: 0;
    background: var(--accent-dim);
    border: 1.5px solid rgba(var(--accent-rgb), 0.25);
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .radar-icon-wrap svg {
    width: 22px;
    height: 22px;
    stroke: var(--accent);
    fill: none;
    stroke-width: 1.5;
  }

  .radar-hero-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--text);
    margin-bottom: 3px;
  }

  .radar-hero-sub {
    font-size: 12px;
    color: var(--text2);
    line-height: 1.45;
  }

  .tema-card {
    background: var(--bg2);
    border: 1.5px solid var(--border);
    border-radius: var(--radius);
    padding: 1.1rem 1.25rem;
    margin-bottom: 10px;
    text-decoration: none;
    display: block;
    transition: border-color 0.2s, transform 0.25s;
  }

  .tema-card:hover {
    border-color: var(--border2);
    transform: translateY(-2px);
  }

  .tema-card.hot {
    border-color: rgba(var(--accent-rgb), 0.3);
    background: var(--accent-dim);
  }

  .tema-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .tema-titulo {
    font-size: 14px;
    font-weight: 500;
    color: var(--text);
    line-height: 1.4;
    flex: 1;
    padding-right: 10px;
  }

  .probabilidade {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
  }

  .prob-num {
    font-family: 'DM Serif Display', serif;
    font-size: 22px;
    color: var(--accent);
    line-height: 1;
  }

  .prob-label {
    font-size: 9px;
    color: var(--text3);
    text-transform: uppercase;
    letter-spacing: 0.4px;
    margin-top: 1px;
  }

  .tema-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-bottom: 8px;
  }

  .tema-tag {
    background: var(--bg3);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 3px 9px;
    font-size: 10px;
    color: var(--text2);
  }

  .tema-tag.area-social {
    background: rgba(110, 181, 255, 0.08);
    border-color: rgba(110, 181, 255, 0.2);
    color: var(--blue);
  }

  .tema-tag.area-ciencia {
    background: rgba(var(--accent-rgb), 0.1);
    border-color: rgba(var(--accent-rgb), 0.2);
    color: var(--accent);
  }

  .tema-tag.area-cultura {
    background: rgba(255, 184, 77, 0.08);
    border-color: rgba(255, 184, 77, 0.2);
    color: var(--amber);
  }

  .tema-justificativa {
    font-size: 12px;
    color: var(--text2);
    line-height: 1.55;
  }

  .atualizado {
    font-size: 11px;
    color: var(--text3);
    text-align: center;
    margin-top: 1rem;
  }

  .section-label {
    font-size: 11px;
    color: var(--text2);
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin: 1.5rem 0 10px;
  }

  /* ── RADAR INTRO ── */
  .radar-intro {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 2.5rem 1rem 2rem;
  }

  .radar-intro-icon {
    width: 80px;
    height: 80px;
    background: var(--accent-dim);
    border: 1.5px solid rgba(var(--accent-rgb), 0.25);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1.5rem;
    animation: radar-pulse 2.5s ease-in-out infinite;
  }

  .radar-intro-icon svg {
    width: 36px;
    height: 36px;
    stroke: var(--accent);
    fill: none;
    stroke-width: 1.5;
  }

  @keyframes radar-pulse {
    0%,
    100% {
      box-shadow: 0 0 0 0 rgba(var(--accent-rgb), 0.2);
    }
    50% {
      box-shadow: 0 0 0 18px rgba(var(--accent-rgb), 0);
    }
  }

  .radar-intro-text {
    font-size: 13px;
    color: var(--text2);
    line-height: 1.65;
    max-width: 420px;
    margin-bottom: 2rem;
  }

  .radar-intro .btn-primary {
    width: auto;
    padding: 13px 32px;
    gap: 10px;
  }

  .radar-intro .btn-primary svg {
    width: 18px;
    height: 18px;
    stroke: #0f0f0f;
    fill: none;
    stroke-width: 1.8;
  }

  /* ── LOADING ── */
  .radar-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 3rem 1rem;
  }

  .radar-spinner {
    width: 48px;
    height: 48px;
    border: 3px solid var(--bg3);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: 1.25rem;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .radar-loading-text {
    font-size: 13px;
    color: var(--text2);
  }

  /* ── RESULTS ── */
  #radar-results .tema-card,
  #radar-results .radar-hero,
  #radar-results .section-label,
  #radar-results .atualizado {
    opacity: 0;
    transform: translateY(12px);
    animation: fadeSlideUp 0.4s ease forwards;
  }

  #radar-results .radar-hero {
    animation-delay: 0.05s;
  }

  #radar-results .section-label {
    animation-delay: 0.1s;
  }
`
