import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { buscarRadarTemas } from '../services/radarService.js'
import { getEnemYearLabel } from '../services/examYear.js'
import {
  loadRadarSnapshot,
  saveRadarSnapshot,
  subscribeRadarSnapshot,
} from '../services/radarState.js'
import {
  getRadarFavoriteId,
  loadRadarFavorites,
  removeRadarFavorite,
  saveRadarFavorite,
  subscribeRadarFavorites,
} from '../services/radarFavorites.js'
import { useAppBusy } from '../ui/AppBusyContext.jsx'
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx'

const DEFAULT_TEMAS = [
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
  const { beginBusy, endBusy } = useAppBusy()
  const initialRadarSnapshot = loadRadarSnapshot()
  const enemLabel = getEnemYearLabel()
  const [status, setStatus] = useState(() => (initialRadarSnapshot ? 'results' : 'intro')) // 'intro', 'loading', 'results'
  const [temas, setTemas] = useState(() => initialRadarSnapshot?.temas?.length ? initialRadarSnapshot.temas : DEFAULT_TEMAS)
  const [savedTemas, setSavedTemas] = useState(() => loadRadarFavorites())
  const [searchResumo, setSearchResumo] = useState(() => initialRadarSnapshot?.resumoPesquisa || '')
  const [atualizadoEm, setAtualizadoEm] = useState(() => initialRadarSnapshot?.atualizadoEm || '')
  const [errorMsg, setErrorMsg] = useState('')
  const [loadingLabel, setLoadingLabel] = useState('Procurando novos temas…')
  const [searchConfirmOpen, setSearchConfirmOpen] = useState(false)
  const [pendingRemoval, setPendingRemoval] = useState(null)

  useEffect(() => {
    const refreshRadar = () => {
      const snapshot = loadRadarSnapshot()

      if (snapshot) {
        setTemas(snapshot.temas)
        setSearchResumo(snapshot.resumoPesquisa || '')
        setAtualizadoEm(snapshot.atualizadoEm || '')
        setStatus('results')
      } else {
        setStatus((currentStatus) => (currentStatus === 'loading' ? currentStatus : 'intro'))
      }
    }

    const refreshSaved = () => setSavedTemas(loadRadarFavorites())
    refreshSaved()
    refreshRadar()

    const unlistenRadar = subscribeRadarSnapshot(refreshRadar)
    const unlistenSaved = subscribeRadarFavorites(refreshSaved)
    return () => {
      unlistenRadar()
      unlistenSaved()
    }
  }, [])

  const handleBuscar = async () => {
    if (status === 'loading') return

    setStatus('loading')
    setErrorMsg('')
    setLoadingLabel('Procurando novos temas…')
    beginBusy()

    try {
      const result = await buscarRadarTemas()
      const nextSnapshot = {
        temas: result.temas.length > 0 ? result.temas : DEFAULT_TEMAS,
        resumoPesquisa: result.resumoPesquisa || '',
        atualizadoEm: result.atualizadoEm || new Date().toISOString(),
        origem: result.origem || 'ai',
      }

      setTemas(nextSnapshot.temas)
      setSearchResumo(nextSnapshot.resumoPesquisa)
      setAtualizadoEm(nextSnapshot.atualizadoEm)
      saveRadarSnapshot(nextSnapshot)
      setStatus('results')
    } catch (error) {
      console.error('Radar fetch error:', error)
      setErrorMsg(error?.message || 'Não foi possível atualizar o radar agora.')
      if (!loadRadarSnapshot()) {
        const fallbackSnapshot = {
          temas: DEFAULT_TEMAS,
          resumoPesquisa: '',
          atualizadoEm: new Date().toISOString(),
          origem: 'static',
        }
        setTemas(fallbackSnapshot.temas)
        setSearchResumo('')
        setAtualizadoEm(fallbackSnapshot.atualizadoEm)
        saveRadarSnapshot(fallbackSnapshot)
      }
      setStatus('results')
    } finally {
      endBusy()
    }
  }

  const handleSalvarTema = (tema) => {
    saveRadarFavorite(tema)
  }

  const handleRemoverTema = (tema) => {
    removeRadarFavorite(tema)
  }

  const requestBuscar = () => {
    if (status === 'results' && temas.length > 0) {
      setSearchConfirmOpen(true)
      return
    }

    void handleBuscar()
  }

  const isSavedTheme = (tema) => {
    const temaId = getRadarFavoriteId(tema)
    return savedTemas.some((item) => item.id === temaId)
  }

  const updatedLabel = atualizadoEm
    ? new Date(atualizadoEm).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : ''

  const renderTemaCard = (tema, {
    allowRemove = false,
    pinned = false,
    animationDelay = '0s',
  } = {}) => {
    const temaId = getRadarFavoriteId(tema) || tema.titulo
    const alreadySaved = isSavedTheme(tema)

    const handleAction = () => {
      if (allowRemove) {
        setPendingRemoval(tema)
        return
      }

      if (!alreadySaved) {
        handleSalvarTema(tema)
      }
    }

    return (
      <article
        className={`tema-card ${tema.hot ? 'hot' : ''}${(pinned || alreadySaved) ? ' saved' : ''}`}
        key={temaId}
        style={{ animationDelay }}
      >
        <div className="tema-top">
          <div className="tema-titulo">{tema.titulo}</div>
          <div className="tema-meta">
            <button
              type="button"
              className={`tema-save-btn${allowRemove ? ' danger' : ''}${alreadySaved ? ' saved' : ''}`}
              onClick={handleAction}
            >
              {allowRemove ? 'Remover' : alreadySaved ? 'Salvo' : 'Salvar card'}
            </button>
            <div className="probabilidade">
              <div className="prob-num">{tema.probabilidade}%</div>
              <div className="prob-label">provável</div>
            </div>
          </div>
        </div>
        <div className="tema-tags">
          {tema.tags.map((tag, i) => (
            <span key={i} className={`tema-tag ${tag.tipo}`}>{tag.label}</span>
          ))}
        </div>
        <div className="tema-justificativa">{tema.justificativa}</div>
        {pinned && (
          <div className="tema-fixed-note">
            Fixado no topo até remoção manual.
          </div>
        )}
        <div className="tema-card-footer">
          <Link to="/tema-detalhe" state={{ tema }} className="tema-detail-link">
            Ver detalhe
          </Link>
        </div>
      </article>
    )
  }

  return (
    <>
      <style>{radarCss}</style>
      <div className="page-header anim anim-d1">
        <div className="page-title">Radar <span>1000</span></div>
        <div className="page-sub">Análise dos temas mais prováveis para a redação do {enemLabel}, baseada em padrões históricos e contexto sociopolítico atual.</div>
      </div>

      {savedTemas.length > 0 && (
        <>
          <div className="section-label anim anim-d2">Temas salvos</div>
          <div className="saved-radar-stack anim anim-d2">
            {savedTemas.map((tema, idx) => renderTemaCard(tema, {
              allowRemove: true,
              pinned: true,
              animationDelay: `${0.08 + (idx * 0.05)}s`,
            }))}
          </div>
        </>
      )}

      {status === 'intro' && (
        <div className="radar-intro anim anim-d2" id="radar-intro">
          <div className="radar-intro-icon">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="2" />
              <path d="M16.24 7.76a6 6 0 010 8.49m-8.48-.01a6 6 0 010-8.49m11.31-2.82a10 10 0 010 14.14m-14.14 0a10 10 0 010-14.14" />
            </svg>
          </div>
          <div className="radar-intro-text">
            O Radar 1000 analisa padrões históricos das provas do {enemLabel}, o contexto sociopolítico atual e tendências do debate público brasileiro para estimar os temas com maior probabilidade de aparecer na redação desta edição.
          </div>
          <button className="btn-primary" onClick={requestBuscar} type="button">
            <svg viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            Procurar novos temas
          </button>
          {errorMsg && <div className="radar-error">{errorMsg}</div>}
        </div>
      )}

      {status === 'loading' && (
        <div className="radar-loading show" id="radar-loading">
          <div className="radar-spinner"></div>
          <div className="radar-loading-text">{loadingLabel}</div>
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
              <div className="radar-hero-title">Atualizado para o {enemLabel}</div>
              <div className="radar-hero-sub">
                Nossa IA cruza busca factual e padrões recorrentes para estimar os temas mais prováveis desta edição.
              </div>
              <div className="radar-hero-note">
                Este radar fica salvo até você procurar novos temas de novo.
              </div>
            </div>
          </div>
          {searchResumo && (
            <div className="radar-summary anim anim-d1">
              <div className="radar-summary-label">Resumo da busca</div>
              <div className="radar-summary-text">{searchResumo}</div>
            </div>
          )}

          {errorMsg && (
            <div className="radar-error inline anim anim-d1">
              {errorMsg}
            </div>
          )}

          <div className="section-label">Temas em alta — maior probabilidade</div>

          <div className="saved-radar-stack">
            {temas.map((tema, idx) => renderTemaCard(tema, {
              animationDelay: `${0.15 + (idx * 0.07)}s`,
            }))}
          </div>

          <div className="atualizado" style={{ animationDelay: '0.5s' }}>
            {updatedLabel ? `Radar atualizado em ${updatedLabel}` : 'Radar atualizado recentemente'}
          </div>

          <div style={{ marginTop: '0.75rem' }}>
            <button className="btn-primary" type="button" onClick={requestBuscar} disabled={status === 'loading'}>
              {status === 'loading' ? 'Procurando...' : 'Procurar novos temas'}
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={searchConfirmOpen}
        title="Substituir radar atual?"
        message="Isso vai gerar um novo conjunto de temas e trocar o radar que está salvo agora. Os cards fixados continuam salvos."
        confirmLabel="Sim, procurar"
        cancelLabel="Cancelar"
        danger
        onCancel={() => setSearchConfirmOpen(false)}
        onConfirm={() => {
          setSearchConfirmOpen(false)
          void handleBuscar()
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingRemoval)}
        title="Remover card salvo?"
        message={pendingRemoval ? `O tema “${pendingRemoval.titulo}” será removido dos cards salvos. Você poderá salvá-lo de novo depois.` : ''}
        confirmLabel="Sim, remover"
        cancelLabel="Cancelar"
        danger
        onCancel={() => setPendingRemoval(null)}
        onConfirm={() => {
          if (pendingRemoval) {
            handleRemoverTema(pendingRemoval)
          }
          setPendingRemoval(null)
        }}
      />
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
    font-size: 1.7rem;
    color: var(--text);
    letter-spacing: -0.4px;
    margin-bottom: 6px;
    line-height: 1.2;
  }

  .page-header .page-title span {
    color: var(--accent);
  }

  .page-header .page-sub {
    font-size: 0.85rem;
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
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--text);
    margin-bottom: 3px;
  }

  .radar-hero-sub {
    font-size: 0.8rem;
    color: var(--text2);
    line-height: 1.45;
  }

  .radar-hero-note {
    margin-top: 0.5rem;
    font-size: 0.75rem;
    color: var(--text3);
    line-height: 1.45;
  }

  .saved-radar-stack {
    display: grid;
    gap: 12px;
    margin-bottom: 1.25rem;
  }

  .tema-card {
    background: var(--bg2);
    border: 1.5px solid var(--border);
    border-radius: var(--radius);
    padding: 1.1rem 1.25rem;
    margin-bottom: 0;
    text-decoration: none;
    display: block;
    position: relative;
    transition: border-color 0.2s, transform 0.25s, background-color 0.2s;
  }

  .tema-card:hover {
    border-color: var(--border2);
    transform: translateY(-2px);
  }

  .tema-card.hot {
    border-color: rgba(var(--accent-rgb), 0.3);
    background: var(--accent-dim);
  }

  .tema-card.saved {
    border-color: rgba(var(--accent-rgb), 0.32);
    background: linear-gradient(180deg, rgba(var(--accent-rgb), 0.1), rgba(var(--accent-rgb), 0.04));
  }

  .tema-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 8px;
  }

  .tema-titulo {
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--text);
    line-height: 1.4;
    flex: 1;
    padding-right: 0;
  }

  .tema-meta {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    flex-shrink: 0;
  }

  .probabilidade {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
  }

  .prob-num {
    font-family: 'DM Serif Display', serif;
    font-size: 1.45rem;
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
    font-size: 0.65rem;
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
    font-size: 0.8rem;
    color: var(--text2);
    line-height: 1.55;
  }

  .tema-card-footer {
    display: flex;
    justify-content: flex-end;
    margin-top: 0.9rem;
    padding-top: 0.85rem;
    border-top: 0.5px solid var(--border);
  }

  .tema-detail-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.76rem;
    color: var(--accent);
    text-decoration: none;
    font-weight: 600;
  }

  .tema-detail-link:hover {
    text-decoration: underline;
  }

  .tema-save-btn {
    border: 1px solid var(--border2);
    background: var(--bg3);
    color: var(--text2);
    border-radius: 999px;
    padding: 7px 10px;
    font-size: 0.7rem;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: background-color 0.2s, border-color 0.2s, color 0.2s, transform 0.1s;
  }

  .tema-save-btn:hover {
    border-color: var(--accent);
    color: var(--text);
    background: var(--accent-dim);
  }

  .tema-save-btn:active {
    transform: scale(0.97);
  }

  .tema-save-btn.saved {
    border-color: rgba(var(--accent-rgb), 0.3);
    color: var(--accent);
    background: var(--accent-dim);
    cursor: default;
  }

  .tema-save-btn.danger {
    border-color: rgba(255, 107, 107, 0.25);
    color: var(--red);
    background: rgba(255, 107, 107, 0.05);
  }

  .tema-fixed-note {
    margin-top: 10px;
    font-size: 0.72rem;
    color: var(--text3);
    padding-top: 8px;
    border-top: 0.5px solid var(--border);
  }

  .atualizado {
    font-size: 0.75rem;
    color: var(--text3);
    text-align: center;
    margin-top: 1rem;
  }

  .section-label {
    font-size: 0.75rem;
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
    font-size: 0.85rem;
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
    font-size: 0.85rem;
    color: var(--text2);
  }

  .radar-error {
    margin-top: 12px;
    padding: 0.9rem 1rem;
    border-radius: 16px;
    border: 1px solid rgba(234, 67, 53, 0.18);
    background: rgba(234, 67, 53, 0.08);
    color: var(--red);
    font-size: 0.84rem;
    line-height: 1.55;
  }

  .radar-error.inline {
    margin: 0 0 1rem;
  }

  .radar-summary {
    background: var(--bg2);
    border: 1.5px solid var(--border);
    border-radius: 20px;
    padding: 1rem 1.1rem;
    margin-bottom: 12px;
  }

  .radar-summary-label {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.75px;
    text-transform: uppercase;
    color: var(--text3);
    margin-bottom: 0.45rem;
  }

  .radar-summary-text {
    font-size: 0.86rem;
    line-height: 1.6;
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

  @media (max-width: 560px) {
    .tema-top {
      flex-direction: column;
    }

    .tema-meta {
      width: 100%;
      justify-content: space-between;
    }

    .tema-save-btn {
      padding: 6px 9px;
    }

    .radar-intro .btn-primary,
    .btn-ghost {
      width: 100%;
    }
  }
`
