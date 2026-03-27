import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { buscarRadarTemaDetalhe } from '../services/radarService.js'
import { getEnemYearLabel } from '../services/examYear.js'
import {
  getRadarThemeId,
  loadRadarSnapshot,
  loadRadarThemeDetail,
  normalizeRadarDetail,
  normalizeRadarTheme,
} from '../services/radarState.js'
import { saveCorretorDraft } from '../services/corretorDraft.js'
import { useAppBusy } from '../ui/AppBusyContext.jsx'

function formatDateLabel(value) {
  if (!value) return ''
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function buildThemeFallback(themeTitle, probability = 70) {
  return normalizeRadarTheme({
    titulo: themeTitle || 'Tema do radar',
    probabilidade: probability,
    hot: probability >= 80,
  }) || {
    id: themeTitle || 'tema-do-radar',
    titulo: themeTitle || 'Tema do radar',
    probabilidade: probability,
    hot: probability >= 80,
  }
}

function humanizeThemeLabel(value) {
  return String(value ?? '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildDetailFallback(theme, enemLabel) {
  const title = theme?.titulo || humanizeThemeLabel(theme?.id) || `Tema do ${enemLabel}`
  return {
    id: getRadarThemeId(theme) || title,
    temaId: getRadarThemeId(theme) || title,
    titulo: title,
    probabilidade: Number.isFinite(Number(theme?.probabilidade)) ? Number(theme.probabilidade) : 70,
    resumo: `Detalhes do tema ${title} para apoiar a escrita no ${enemLabel}.`,
    porQueProvavel: [
      'O tema conversa com debate público atual e com recortes sociais comuns ao ENEM.',
      'O radar trata este assunto como uma pista forte para a redação desta edição.',
    ],
    recorteSugerido: 'Foque em impacto social, desigualdade de acesso, políticas públicas e efeito coletivo.',
    palavrasChave: [title, 'repertório', 'políticas públicas', 'cidadania'],
    dicasDeEscrita: [
      'Abra com uma tese clara sobre a dimensão social do problema.',
      'Use um dado ou fonte logo no primeiro desenvolvimento.',
      'Feche com intervenção objetiva e viável.',
    ],
    material: {
      titulo: `Material de apoio - ${title}`,
      resumo: `Resumo de apoio para o tema ${title}.`,
      cards: [],
      fontes: [],
    },
    searchResumo: '',
    geradoEm: new Date().toISOString(),
    origem: 'fallback',
    savedAt: new Date().toISOString(),
  }
}

export function TemaDetalhePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const enemLabel = getEnemYearLabel()
  const { beginBusy, endBusy } = useAppBusy()

  const routeTheme = location.state?.tema || null
  const routeDetail = location.state?.detail || null
  const queryThemeId = searchParams.get('tema') || ''
  const snapshot = useMemo(() => loadRadarSnapshot(), [])

  const snapshotTheme = useMemo(() => {
    const currentSnapshot = snapshot || loadRadarSnapshot()
    if (!currentSnapshot?.temas?.length) return null
    if (queryThemeId) {
      return currentSnapshot.temas.find((tema) => getRadarThemeId(tema) === queryThemeId) || null
    }
    return currentSnapshot.temas[0] || null
  }, [snapshot, queryThemeId])

  const baseTheme = useMemo(() => {
    const candidate = routeTheme || routeDetail || snapshotTheme || { titulo: queryThemeId ? humanizeThemeLabel(decodeURIComponent(queryThemeId)) : `Radar ${enemLabel}` }
    return buildThemeFallback(
      candidate?.titulo || `Radar ${enemLabel}`,
      Number.isFinite(Number(candidate?.probabilidade)) ? Number(candidate.probabilidade) : 70,
    )
  }, [routeTheme, routeDetail, snapshotTheme, queryThemeId, enemLabel])

  const initialDetail = useMemo(() => {
    if (routeDetail) {
      return normalizeRadarDetail(routeDetail) || buildDetailFallback(baseTheme, enemLabel)
    }

    const themeId = queryThemeId || getRadarThemeId(baseTheme)
    if (!themeId) return null

    const cached = loadRadarThemeDetail(themeId)
    return cached || null
  }, [routeDetail, queryThemeId, baseTheme, enemLabel])

  const [tema, setTema] = useState(baseTheme)
  const [detail, setDetail] = useState(initialDetail)
  const [loading, setLoading] = useState(!initialDetail)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    setTema(baseTheme)
  }, [baseTheme])

  useEffect(() => {
    let active = true
    const currentThemeId = queryThemeId || getRadarThemeId(baseTheme)

    const syncDetail = async () => {
      if (!currentThemeId) {
        setLoading(false)
        return
      }

      const cached = loadRadarThemeDetail(currentThemeId)
      if (cached) {
        if (active) {
          setDetail(cached)
          setTema(buildThemeFallback(cached.titulo, cached.probabilidade))
          setErrorMsg('')
          setLoading(false)
        }
        return
      }

      // Sem cache — vai chamar a IA; ativa overlay global
      if (active) {
        setLoading(true)
        setErrorMsg('')
        beginBusy()
      }

      try {
        const fetched = await buscarRadarTemaDetalhe({
          id: currentThemeId,
          titulo: baseTheme.titulo,
          probabilidade: baseTheme.probabilidade,
          hot: baseTheme.hot,
        })

        if (!active) return

        const normalizedDetail = normalizeRadarDetail(fetched) || buildDetailFallback(baseTheme, enemLabel)
        setDetail(normalizedDetail)
        setTema(buildThemeFallback(normalizedDetail.titulo, normalizedDetail.probabilidade))
      } catch (error) {
        if (!active) return
        setErrorMsg(error?.message || 'Não foi possível carregar os detalhes deste tema agora.')
        setDetail((currentDetail) => currentDetail || buildDetailFallback(baseTheme, enemLabel))
      } finally {
        if (active) {
          setLoading(false)
          endBusy()
        }
      }
    }

    void syncDetail()
    return () => {
      active = false
      // Se desmontarmos enquanto carregando, libera o overlay
      endBusy()
    }
  }, [queryThemeId, baseTheme, enemLabel, beginBusy, endBusy])

  const currentDetail = detail || buildDetailFallback(tema, enemLabel)
  const title = currentDetail.titulo || tema.titulo
  const probability = Number.isFinite(Number(currentDetail.probabilidade))
    ? Number(currentDetail.probabilidade)
    : Number.isFinite(Number(tema.probabilidade))
      ? Number(tema.probabilidade)
      : 70
  const keywords = Array.isArray(currentDetail.palavrasChave) ? currentDetail.palavrasChave : []
  const reasons = Array.isArray(currentDetail.porQueProvavel) ? currentDetail.porQueProvavel : []
  const tips = Array.isArray(currentDetail.dicasDeEscrita) ? currentDetail.dicasDeEscrita : []
  const material = currentDetail.material && typeof currentDetail.material === 'object'
    ? currentDetail.material
    : { titulo: `Material de apoio - ${title}`, resumo: '', cards: [], fontes: [] }
  const cards = Array.isArray(material.cards) ? material.cards : []
  const fontes = Array.isArray(material.fontes) ? material.fontes : []

  const handleWriteTheme = () => {
    saveCorretorDraft({
      hasStarted: true,
      tema: title,
      material,
      redacao: '',
      isRigido: false,
      themeMode: 'manual',
    })
    navigate('/corretor')
  }

  return (
    <>
      <style>{temaDetalheCss}</style>
      <Link to="/radar" className="back-link">
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
        Voltar ao Radar 1000
      </Link>

      <div className="prob-hero anim anim-d1">
        <div className="prob-hero-left">
          <div className="prob-hero-label">Tema em análise</div>
          <div className="prob-hero-tema">{title}</div>
          <div className="prob-hero-note">
            {loading ? 'Carregando detalhes do radar...' : `Atualizado para o ${enemLabel}.`}
            {currentDetail.savedAt ? ` Salvo em ${formatDateLabel(currentDetail.savedAt)}.` : ''}
          </div>
        </div>
        <div className="prob-circle">
          <div className="prob-circle-num">{probability}</div>
          <div className="prob-circle-pct">%</div>
        </div>
      </div>

      {errorMsg && (
        <div className="card anim anim-d1 detail-error">
          {errorMsg}
        </div>
      )}

      {keywords.length > 0 && (
        <div className="tags-row anim anim-d1">
          {keywords.slice(0, 6).map((tag, index) => (
            <span key={`${tag}-${index}`} className="tag">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="card anim anim-d2">
        <div className="card-title">Por que este tema entra no radar</div>
        {reasons.length > 0 ? reasons.map((reason, index) => (
          <div className="motivo-item" key={`${reason}-${index}`}>
            <div className="motivo-dot"></div>
            <div className="motivo-text">{reason}</div>
          </div>
        )) : (
          <div className="motivo-item">
            <div className="motivo-dot"></div>
            <div className="motivo-text">
              O radar manteve este tema por relevancia publica, recorrencia historica e aderencia ao tipo de abordagem que o ENEM costuma priorizar.
            </div>
          </div>
        )}
        {currentDetail.searchResumo && (
          <div className="detail-search-resumo">
            <strong>Leitura da busca:</strong> {currentDetail.searchResumo}
          </div>
        )}
      </div>

      <div className="card anim anim-d3">
        <div className="card-title">Material de apoio</div>
        {material.resumo && <div className="detail-material-summary">{material.resumo}</div>}
        {cards.length > 0 && (
          <div className="material-cards-grid">
            {cards.map((card, index) => (
              <article className="material-card" key={`${card.titulo || 'card'}-${index}`}>
                <div className="material-card-title">{card.titulo || `Card ${index + 1}`}</div>
                <div className="material-card-text">{card.texto || card.trecho || 'Sem texto adicional.'}</div>
                <div className="material-card-meta">
                  <span>{card.fonte || 'Fonte não informada'}</span>
                  {card.url && (
                    <a href={card.url} target="_blank" rel="noreferrer">
                      Abrir fonte
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {fontes.length > 0 && (
          <div className="material-source-list">
            <div className="material-source-label">Fontes usadas</div>
            {fontes.map((source, index) => (
              source.url ? (
                <a className="material-source-item" href={source.url} target="_blank" rel="noreferrer" key={`${source.nome || 'source'}-${index}`}>
                  <span>{source.nome || `Fonte ${index + 1}`}</span>
                  <small>{source.url}</small>
                </a>
              ) : (
                <div className="material-source-item" key={`${source.nome || 'source'}-${index}`}>
                  <span>{source.nome || `Fonte ${index + 1}`}</span>
                  <small>{source.trecho || 'Fonte sem URL registrada'}</small>
                </div>
              )
            ))}
          </div>
        )}
      </div>

      <div className="card anim anim-d4">
        <div className="card-title">Como levar isso para a redação</div>
        {currentDetail.recorteSugerido && (
          <div className="detail-recorte">
            <strong>Recorte sugerido:</strong> {currentDetail.recorteSugerido}
          </div>
        )}
        {tips.length > 0 ? tips.map((tip, index) => (
          <div className="repertorio-item" key={`${tip}-${index}`}>
            <div className="rep-nome">Dica {index + 1}</div>
            <div className="rep-uso">{tip}</div>
          </div>
        )) : (
          <div className="repertorio-item">
            <div className="rep-uso">Use o tema com foco social, tese clara e intervenção viável. O material acima já foi preparado para servir de apoio direto.</div>
          </div>
        )}
      </div>

      <div className="cta-row anim anim-d4">
        <button type="button" className="btn-primary" onClick={handleWriteTheme}>
          Escrever sobre este tema
        </button>
        <Link to="/radar" className="btn-ghost">Ver outros temas</Link>
      </div>
    </>
  )
}

const temaDetalheCss = `
  .prob-hero {
    background: var(--card-dark);
    border: 1.5px solid rgba(200, 240, 96, 0.2);
    border-radius: 24px;
    padding: 1.75rem 1.25rem;
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
    overflow: hidden;
    gap: 1rem;
  }
  .prob-hero::after {
    content: '';
    position: absolute;
    top: 14px;
    right: 60px;
    width: 4px;
    height: 4px;
    background: var(--accent);
    border-radius: 50%;
    opacity: 0.2;
  }
  .prob-hero-label {
    font-size: 0.75rem;
    color: var(--text2);
    text-transform: uppercase;
    letter-spacing: 0.7px;
    margin-bottom: 6px;
  }
  .prob-hero-tema {
    font-family: 'DM Serif Display', serif;
    font-size: 1.35rem;
    color: var(--text);
    letter-spacing: -0.3px;
    line-height: 1.3;
    max-width: 420px;
  }
  .prob-hero-note {
    margin-top: 0.45rem;
    font-size: 0.78rem;
    color: var(--text2);
    line-height: 1.5;
  }
  .prob-circle {
    width: 68px;
    height: 68px;
    flex-shrink: 0;
    background: var(--accent-dim2);
    border: 1.5px solid rgba(200, 240, 96, 0.3);
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .prob-circle-num {
    font-family: 'DM Serif Display', serif;
    font-size: 1.6rem;
    color: var(--accent);
    line-height: 1;
  }
  .prob-circle-pct {
    font-size: 0.65rem;
    color: var(--accent);
    opacity: 0.7;
  }
  .tags-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 1.1rem;
  }
  .tag {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 4px 12px;
    font-size: 0.75rem;
    color: var(--text2);
  }
  .motivo-item {
    display: flex;
    gap: 10px;
    padding: 10px 0;
  }
  .motivo-item+.motivo-item {
    border-top: 0.5px solid var(--border);
  }
  .motivo-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
    flex-shrink: 0;
    margin-top: 5px;
  }
  .motivo-text {
    font-size: 0.85rem;
    color: var(--text);
    line-height: 1.55;
  }
  .detail-search-resumo,
  .detail-recorte,
  .detail-material-summary {
    margin-top: 0.85rem;
    padding: 0.9rem 1rem;
    border-radius: 16px;
    border: 1px solid var(--border);
    background: var(--bg3);
    font-size: 0.82rem;
    color: var(--text2);
    line-height: 1.6;
  }
  .detail-search-resumo strong,
  .detail-recorte strong {
    color: var(--accent);
    font-weight: 600;
  }
  .detail-material-summary {
    margin-top: 0;
    margin-bottom: 0.95rem;
    color: var(--text);
  }
  .material-cards-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  @media (min-width: 760px) {
    .material-cards-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  .material-card {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 18px;
    padding: 0.95rem;
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }
  .material-card-title {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--text);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .material-card-text {
    font-size: 0.85rem;
    line-height: 1.6;
    color: var(--text2);
  }
  .material-card-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.72rem;
    color: var(--text3);
    flex-wrap: wrap;
  }
  .material-card-meta a {
    color: var(--accent);
    text-decoration: none;
    font-weight: 600;
  }
  .material-source-list {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    padding-top: 0.75rem;
  }
  .material-source-label {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--text3);
    letter-spacing: 0.5px;
  }
  .material-source-item {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    text-decoration: none;
    color: inherit;
    background: var(--bg3);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 0.8rem 0.9rem;
  }
  .material-source-item span {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text);
  }
  .material-source-item small {
    font-size: 0.7rem;
    color: var(--text3);
    word-break: break-all;
  }
  .repertorio-item {
    padding: 12px 0;
  }
  .repertorio-item+.repertorio-item {
    border-top: 0.5px solid var(--border);
  }
  .rep-nome {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--text);
    margin-bottom: 3px;
  }
  .rep-uso {
    font-size: 0.8rem;
    color: var(--text2);
    line-height: 1.5;
  }
  .detail-error {
    margin-bottom: 12px;
    border: 1px solid rgba(255, 107, 107, 0.2);
    background: rgba(255, 107, 107, 0.05);
    color: var(--red);
    font-size: 0.82rem;
    line-height: 1.55;
  }
  .cta-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 4px;
  }
`
