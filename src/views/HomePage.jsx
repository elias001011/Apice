import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import { usePwaInstall } from '../pwa/usePwaInstall.js'
import {
  buildEssayInsights,
  loadEssayHistory,
  subscribeEssayHistory,
} from '../services/essayInsights.js'
import {
  loadUserSummary,
  subscribeUserSummary,
} from '../services/userSummary.js'
import { getEnemYearLabel } from '../services/examYear.js'
import {
  loadRadarSnapshot,
  subscribeRadarSnapshot,
} from '../services/radarState.js'
import frases from '../data/frases.json'
import { OnboardingModal } from '../ui/OnboardingModal.jsx'

function getDailyQuoteIndex() {
  const date = new Date()
  const val = date.getFullYear() * 1000 + (date.getMonth() * 31) + date.getDate()
  return val % frases.length
}

function getGreetingLabel(date = new Date()) {
  const hour = date.getHours()

  if (hour >= 5 && hour < 12) return 'Bom dia'
  if (hour >= 12 && hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

export function HomePage() {
  const { user } = useAuth()
  
  const rawName = user?.user_metadata?.full_name || 'Sua conta'
  const nameParts = rawName.split(' ')
  const firstName = nameParts[0]
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ''

  const { canInstall: pwaCanInstall, isInstalled: pwaInstalled, installPwa } = usePwaInstall()
  const [insights, setInsights] = useState(() => buildEssayInsights(loadEssayHistory()))
  const [userSummary, setUserSummary] = useState(() => loadUserSummary())
  const [radarSnapshot, setRadarSnapshot] = useState(() => loadRadarSnapshot())
  const [greeting, setGreeting] = useState(() => getGreetingLabel())
  const [pwaHint, setPwaHint] = useState('')
  const enemLabel = getEnemYearLabel()
  const [dailyQuote] = useState(() => frases[getDailyQuoteIndex()])

  // --- TIMER ENEM ---
  const [enemDate, setEnemDate] = useState(() => localStorage.getItem('apice:enem-date') || '')
  const [isEditingEnem, setIsEditingEnem] = useState(false)
  const [tempDate, setTempDate] = useState(enemDate)
  const [timeLeft, setTimeLeft] = useState({ months: 0, days: 0, hours: 0, minutes: 0 })

  const formatEnemDateLabel = (value) => {
    if (!value) return 'Data não definida'

    const parsedDate = new Date(`${value}T00:00:00`)
    if (Number.isNaN(parsedDate.getTime())) return 'Data não definida'

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(parsedDate)
  }

  const handleOpenEnemEditor = () => {
    setTempDate(enemDate || '')
    setIsEditingEnem(true)
  }

  const handleCancelEnemEditor = () => {
    setTempDate(enemDate || '')
    setIsEditingEnem(false)
  }

  useEffect(() => {
    const update = () => {
      if (!enemDate) return
      const target = new Date(enemDate + 'T00:00:00')
      const now = new Date()
      const diff = target - now

      if (diff <= 0) {
        setTimeLeft({ months: 0, days: 0, hours: 0, minutes: 0 })
        return
      }

      const totSeconds = Math.floor(diff / 1000)
      const totMinutes = Math.floor(totSeconds / 60)
      const totHours = Math.floor(totMinutes / 60)
      const totDays = Math.floor(totHours / 24)
      
      const months = Math.floor(totDays / 30)
      const days = totDays % 30
      const hours = totHours % 24
      const minutes = totMinutes % 60
      setTimeLeft({ months, days, hours, minutes })
    }

    update()
    const timerId = setInterval(update, 1000)
    return () => clearInterval(timerId)
  }, [enemDate])

  const handleConfirmDate = () => {
    if (!tempDate) return
    setEnemDate(tempDate)
    localStorage.setItem('apice:enem-date', tempDate)
    setIsEditingEnem(false)
  }

  const handleInstallPwa = async () => {
    if (pwaInstalled) return

    if (!pwaCanInstall) {
      setPwaHint('Abra o app no Chrome ou no Edge para instalar como PWA.')
      return
    }

    try {
      const result = await installPwa()
      if (result?.outcome === 'accepted') {
        setPwaHint('')
        return
      }

      if (result?.outcome === 'dismissed') {
        setPwaHint('A instalação foi cancelada. Você pode tentar novamente quando quiser.')
      }
    } catch (error) {
      setPwaHint(error?.message || 'A instalação do PWA ainda não está disponível neste navegador.')
    }
  }

  useEffect(() => {
    const refreshGreeting = () => setGreeting(getGreetingLabel())
    refreshGreeting()

    const intervalId = window.setInterval(refreshGreeting, 60_000)

    // O home escuta o histórico para mostrar dados reais sem precisar recarregar.
    const refresh = () => setInsights(buildEssayInsights(loadEssayHistory()))
    const refreshSummary = () => setUserSummary(loadUserSummary())
    const refreshRadar = () => setRadarSnapshot(loadRadarSnapshot())
    refresh()
    refreshSummary()
    refreshRadar()

    const unlistenHistory = subscribeEssayHistory(refresh)
    const unlistenSummary = subscribeUserSummary(refreshSummary)
    const unlistenRadar = subscribeRadarSnapshot(refreshRadar)

    return () => {
      window.clearInterval(intervalId)
      unlistenHistory()
      unlistenSummary()
      unlistenRadar()
    }
  }, [])

  const ultimaNota = insights.latestEssay?.nota || 0
  const ultimaNotaPercent = Math.round((ultimaNota / 1000) * 100)
  const showPerformance = Boolean(userSummary)
  const enemCard = (
    <section
      className={`enem-card anim anim-d5 home-enem-card ${
        showPerformance ? 'home-enem-card--left' : 'home-enem-card--right'
      }`}
    >
      <div className="enem-card-header">
        <div className="enem-card-kicker">Calendário do {enemLabel}</div>
        <h2 className="enem-card-title">Contagem para a prova</h2>
        <p className="enem-card-copy">
          {enemDate
            ? `Data manual salva: ${formatEnemDateLabel(enemDate)}.`
            : 'Defina a data oficial manualmente para manter a contagem atualizada.'}
        </p>
      </div>

      <div className="enem-card-meta">
        <span className={`enem-card-badge${enemDate ? ' active' : ''}`}>
          {enemDate ? 'Data salva' : 'Data pendente'}
        </span>
        <button type="button" className="enem-card-link" onClick={handleOpenEnemEditor}>
          {enemDate ? 'Alterar data' : 'Definir data'}
        </button>
      </div>

      {isEditingEnem ? (
        <div className="enem-editor">
          <label className="enem-editor-field">
            <span>Data da prova</span>
            <div className="enem-input-wrapper">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <input
                type="date"
                className="enem-input-new"
                value={tempDate}
                onChange={(e) => setTempDate(e.target.value)}
              />
            </div>
          </label>
          <div className="enem-editor-actions">
            <button type="button" className="btn-ghost" onClick={handleCancelEnemEditor}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleConfirmDate}
              disabled={!tempDate}
              style={{ width: 'auto', paddingInline: '18px' }}
            >
              Salvar data
            </button>
          </div>
        </div>
      ) : (
        <>
          {enemDate ? (
            <div className="enem-countdown-row">
              <div className="enem-countdown-chip">
                <strong>{timeLeft.months}</strong>
                <span>Meses</span>
              </div>
              <div className="enem-countdown-chip">
                <strong>{timeLeft.days}</strong>
                <span>Dias</span>
              </div>
              <div className="enem-countdown-chip">
                <strong>{timeLeft.hours}</strong>
                <span>Horas</span>
              </div>
              <div className="enem-countdown-chip enem-countdown-chip--accent">
                <strong>{timeLeft.minutes}</strong>
                <span>Minutos</span>
              </div>
            </div>
          ) : (
            <div className="enem-empty-state">
              <div className="enem-empty-title">Ainda sem data definida</div>
              <p>Toque em “Definir data” para cadastrar a prova manualmente.</p>
            </div>
          )}
        </>
      )}
    </section>
  )

  return (
    <>
      <style>{homeCss}</style>
      <OnboardingModal />

      <div className="view-container">
        {/* Layout de 2 colunas no desktop / coluna única no mobile */}
        <div className="home-grid">

        {/* ── COLUNA ESQUERDA: Hero + Stats ── */}
        <div className="home-grid-left">

          {/* Hero */}
          <div className="hero anim anim-d1">
            <div className="hero-content">
              <div className="hero-label">{greeting}</div>
              <div className="hero-name">
                {firstName} {lastName && <em>{lastName}</em>}
              </div>
              
              <div className="hero-sub">Chegue ao ápice na redação do {enemLabel} com o poder da IA.</div>
              <button className="hero-cta hero-cta--pwa" type="button" onClick={handleInstallPwa} disabled={pwaInstalled}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 2v13M7 11l5 5 5-5" />
                  <path d="M3 18h18" />
                </svg>
                {pwaInstalled ? 'PWA instalado' : 'Instalar PWA'}
              </button>
              {pwaHint && <div className="hero-pwa-hint">{pwaHint}</div>}
            </div>
            <div className="hero-deco" aria-hidden="true">
              <svg className="hero-star" viewBox="0 0 100 100">
                <path d="M50 0 C52 38, 62 48, 100 50 C62 52, 52 62, 50 100 C48 62, 38 52, 0 50 C38 48, 48 38, 50 0Z" />
              </svg>
            </div>
            <span className="hero-dot hero-dot-1" aria-hidden="true"></span>
            <span className="hero-dot hero-dot-2" aria-hidden="true"></span>
            <span className="hero-dot hero-dot-3" aria-hidden="true"></span>
          </div>

          {/* Stats */}
          <div className="stats-grid anim anim-d2">
            <div className="pv-stat pv-stat--dark">
              <div className="pv-stat-top">
                <div className="pv-stat-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </div>
                {insights.essaysThisWeek > 0 && (
                  <div className="pv-stat-delta">↑ {insights.essaysThisWeek} esta semana</div>
                )}
              </div>
              <div>
                <div className="pv-stat-value">{insights.essaysThisMonth}</div>
                <div className="pv-stat-label">Redações este mês</div>
              </div>
              <div className="pv-bar" aria-hidden="true">
                <div className="pv-bar-fill" style={{ width: `${Math.min(insights.essaysThisMonth * 10, 100)}%` }}></div>
              </div>
            </div>

            <div className="pv-stat pv-stat--lime">
              <div className="pv-stat-top">
                <div className="pv-stat-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                </div>
                <div className="pv-stat-delta">Foco na nota 1000</div>
              </div>
              <div>
                <div className="pv-stat-value">
                  {ultimaNota} <span>/1000</span>
                </div>
                <div className="pv-stat-label">Última nota</div>
              </div>
              <div className="pv-bar" aria-hidden="true">
                <div className="pv-bar-fill" style={{ width: `${ultimaNotaPercent}%` }}></div>
              </div>
            </div>
          </div>

          <Link to="/radar" className="pv-feature pv-feature--lime anim anim-d3 home-radar-card">
            <div className="pv-feature-content">
              <div className="pv-feature-title">Radar 1000</div>
              <div className="pv-feature-desc">
                Descubra os temas com maior probabilidade de cair na redação do ENEM.
              </div>
              <div className="pv-pill">
                {radarSnapshot?.temas?.length
                  ? `${radarSnapshot.temas.length} temas salvos`
                  : `${enemLabel} • Atualizado`}
              </div>
              <div className="pv-feature-btn">
                Ver temas
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </div>
            <div className="pv-feature-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="2" />
                <path d="M16.24 7.76a6 6 0 010 8.49m-8.48-.01a6 6 0 010-8.49m11.31-2.82a10 10 0 010 14.14m-14.14 0a10 10 0 010-14.14" />
              </svg>
            </div>
            <div className="pv-feature-deco deco-circle" aria-hidden="true">
              <svg viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" strokeWidth="1.5" />
              </svg>
            </div>
          </Link>

          {showPerformance ? enemCard : null}
        </div>

        {/* ── COLUNA DIREITA preexistente: Feature Cards ── */}
        <div className="home-grid-right">
          <div className="section-label anim anim-d3" style={{ marginTop: 0 }}>Ferramentas</div>

          <div className="features-stack">
            <Link to="/corretor" className="pv-feature pv-feature--dark anim anim-d3">
              <div className="pv-feature-content">
                <div className="pv-feature-title">Corretor de Redação</div>
                <div className="pv-feature-desc">Envie sua redação e receba nota detalhada por competência em segundos.</div>
                <div className="pv-pill">IA • Nota 0–1000</div>
                <div className="pv-feature-btn">
                  Corrigir agora
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
              <div className="pv-feature-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </div>
              <div className="pv-feature-deco deco-sparkle" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <path d="M12 0C12.5 9,14.5 11.5,24 12C14.5 12.5,12.5 15,12 24C11.5 15,9.5 12.5,0 12C9.5 11.5,11.5 9,12 0Z" />
                </svg>
              </div>
            </Link>

            {userSummary && (
              <div className="card performance-card anim anim-d4 home-performance-card">
                <div className="card-title">Análise de Desempenho</div>
                <div className="performance-summary">{userSummary.resumo || 'Resumo ainda não disponível.'}</div>
                <div className="performance-grid">
                  {Array.isArray(userSummary.forcas) && userSummary.forcas.length > 0 && (
                    <div className="performance-block">
                      <div className="performance-label">Pontos fortes</div>
                      <div className="performance-chips">
                        {userSummary.forcas.slice(0, 3).map((item) => (
                          <span key={item} className="performance-chip">{item}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {Array.isArray(userSummary.errosRecorrentes) && userSummary.errosRecorrentes.length > 0 && (
                    <div className="performance-block">
                      <div className="performance-label">Erros recorrentes</div>
                      <div className="performance-chips">
                        {userSummary.errosRecorrentes.slice(0, 3).map((item) => (
                          <span key={item} className="performance-chip muted">{item}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="pv-feature pv-feature--quote anim anim-d4">
              <div className="pv-feature-content">
                <div className="quote-icon-small">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--accent)"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/></svg>
                </div>
                <p className="pv-quote-text">
                  "{dailyQuote.text}"
                </p>
                {dailyQuote.author && (
                  <div className="pv-quote-author">
                    — {dailyQuote.author}
                  </div>
                )}
              </div>
            </div>

            {!showPerformance ? enemCard : null}
          </div>
        </div>
      </div>
      </div>
  </>
)
}

const homeCss = `
  .home-grid-left,
  .home-grid-right {
    display: flex;
    flex-direction: column;
    gap: 0;
    min-width: 0;
  }

  .home-grid {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  /* Grid principal */
  @media (min-width: 768px) {
    .home-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 1rem;
      align-items: start;
    }
  }


  .features-stack .pv-feature--quote {
    background: linear-gradient(145deg, rgba(var(--accent-rgb), 0.03), transparent 44%), var(--bg3);
    border: 1.5px solid var(--border);
    min-height: auto;
    padding: 1.1rem 1.2rem;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    cursor: default;
    width: 100%;
    height: fit-content;
    align-self: start;
  }

  .features-stack .pv-feature--quote:hover {
    transform: none;
    box-shadow: none;
  }

  .home-radar-card {
    width: 100%;
    align-self: stretch;
    margin-top: 8px;
    min-height: 172px;
  }

  .home-radar-card .pv-feature-content {
    gap: 10px;
  }

  .enem-card {
    width: 100%;
    max-width: none;
    padding: 1rem 1.05rem;
    border-radius: 22px;
    border: 1.5px solid var(--border);
    background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.03), transparent 42%), linear-gradient(135deg, var(--bg2), var(--bg3));
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    align-self: stretch;
    position: relative;
    overflow: hidden;
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.05);
  }

  .enem-card-header,
  .enem-editor {
    position: relative;
    z-index: 1;
  }

  .enem-card-header {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .enem-card-kicker {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--text3);
  }

  .enem-card-title {
    margin: 0;
    font-family: 'DM Serif Display', serif;
    font-size: 1.5rem;
    line-height: 1.05;
    color: var(--text);
  }

  .enem-card-copy {
    margin: 0;
    max-width: 46ch;
    font-size: 0.88rem;
    line-height: 1.55;
    color: var(--text2);
  }

  .enem-card-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
  }

  .enem-card-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 28px;
    padding: 0 10px;
    border-radius: 999px;
    background: var(--bg3);
    border: 1px solid var(--border);
    color: var(--text3);
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .enem-card-badge.active {
    background: var(--accent-dim);
    border-color: var(--accent-dim2);
    color: var(--accent);
  }

  .enem-card-link {
    border: none;
    background: none;
    color: var(--accent);
    font: inherit;
    font-size: 0.84rem;
    font-weight: 700;
    cursor: pointer;
    padding: 0;
  }

  .enem-card-link:hover {
    text-decoration: underline;
  }

  .enem-editor {
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
  }

  .enem-editor-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text3);
  }

  .enem-input-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--bg2);
    border: 1.5px solid var(--border2);
    border-radius: 14px;
    padding: 9px 11px;
  }

  .enem-input-new {
    width: 100%;
    border: none;
    background: transparent;
    color: var(--text);
    font: inherit;
    font-size: 0.92rem;
    min-height: 28px;
    outline: none;
  }

  .enem-input-new::-webkit-calendar-picker-indicator {
    cursor: pointer;
    opacity: 0.7;
  }

  .enem-editor-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .enem-countdown-row {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
    justify-content: flex-start;
  }

  .enem-countdown-chip {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 0.7rem 0.8rem;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.3rem;
    text-align: center;
  }

  .enem-countdown-chip strong {
    font-family: 'DM Serif Display', serif;
    font-size: 1.2rem;
    line-height: 1;
    color: var(--text);
  }

  .enem-countdown-chip span {
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text3);
  }

  .enem-countdown-chip--accent {
    background: var(--accent);
    border-color: var(--accent2);
  }

  .enem-countdown-chip--accent strong {
    color: #0f0f0f;
  }

  .enem-countdown-chip--accent span {
    color: rgba(15, 15, 15, 0.68);
  }

  .enem-empty-state {
    background: var(--bg2);
    border: 1px dashed var(--border2);
    border-radius: 16px;
    padding: 0.95rem 1rem;
  }

  .enem-empty-title {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 6px;
  }

  .enem-empty-state p {
    margin: 0;
    color: var(--text2);
    line-height: 1.55;
    font-size: 0.86rem;
  }

  .enem-editor-actions {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 10px;
    flex-wrap: wrap;
  }

  .enem-editor-actions .btn-primary {
    margin-left: auto;
    width: auto;
    padding-inline: 18px;
  }

  .enem-editor-actions .btn-ghost {
    width: auto;
  }

  @media (max-width: 767px) {
    .enem-card {
      padding: 0.95rem;
      margin: 12px auto 0;
      gap: 0.75rem;
    }

    .enem-card-title {
      font-size: 1.35rem;
    }

    .enem-card-copy {
      font-size: 0.85rem;
    }

    .enem-countdown-row {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 7px;
    }

    .enem-countdown-chip {
      padding: 0.65rem 0.7rem;
    }

    .enem-editor-actions {
      justify-content: stretch;
    }

    .enem-editor-actions .btn-ghost,
    .enem-editor-actions .btn-primary {
      width: 100%;
      margin-left: 0;
    }
  }

  @media (max-width: 480px) {
    .enem-card {
      padding: 0.95rem;
    }

    .enem-countdown-chip {
      padding: 0.6rem 0.65rem;
    }

    .enem-countdown-chip strong {
      font-size: 1.05rem;
    }
  }

  .quote-icon-small {
    opacity: 0.5;
    margin-bottom: -4px;
  }

  .pv-quote-text {
    font-family: 'DM Serif Display', serif;
    font-size: 1.25rem;
    color: var(--text);
    line-height: 1.45;
    margin: 0;
  }

  .pv-quote-author {
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--text3);
    opacity: 0.8;
  }

  /* Hero */
  .hero {
    background: linear-gradient(145deg, rgba(var(--accent-rgb), 0.035), transparent 42%), var(--bg2);
    border: 1.5px solid var(--border);
    border-radius: 24px;
    padding: 1.75rem 1.5rem;
    margin-bottom: 8px;
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 1rem;
    position: relative;
    overflow: hidden;
    min-height: 180px;
  }

  @media (max-width: 767px) {
    .hero {
      padding: 1.25rem 1.25rem;
      min-height: 150px;
    }
  }

  .hero-content { position: relative; z-index: 2; }

  .hero-label {
    font-size: 0.75rem;
    color: var(--text2);
    text-transform: none;
    letter-spacing: 0;
    font-weight: 600;
    margin-bottom: 8px;
  }
  .hero-name {
    font-family: 'DM Serif Display', serif;
    font-size: 1.8rem;
    line-height: 1.1;
    color: var(--text);
    margin-bottom: 4px;
  }

  @media (max-width: 767px) {
    .hero-name { font-size: 1.45rem; }
  }


  .hero-name em { font-style: normal; color: var(--accent); }

  .hero-sub {
    font-size: 0.85rem;
    color: var(--text2);
    line-height: 1.6;
    max-width: 320px;
    margin-bottom: 14px;
  }

  @media (max-width: 767px) {
    .hero-sub { max-width: 100%; font-size: 0.85rem; }
  }

  .hero-cta {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 9px 18px;
    background: var(--accent);
    color: #0f0f0f;
    border-radius: 10px;
    font-size: 0.85rem;
    font-weight: 600;
    text-decoration: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.2s, transform 0.1s;
  }
  .hero-cta:hover { background: var(--accent2); }
  .hero-cta:active { transform: scale(0.97); }

  .hero-cta:disabled {
    cursor: default;
    opacity: 0.75;
    transform: none;
  }

  .hero-cta--pwa {
    margin-top: 2px;
    margin-bottom: 0;
  }

  .hero-pwa-hint {
    margin-top: 8px;
    margin-bottom: 10px;
    font-size: 0.74rem;
    color: var(--text3);
    line-height: 1.45;
    max-width: 280px;
  }

  .hero-deco { position: relative; z-index: 2; display: flex; align-items: center; justify-content: center; }

  .hero-star {
    width: 80px;
    height: 80px;
    fill: var(--accent);
    animation: spinSlow 12s linear infinite;
    opacity: 0.85;
  }

  @media (max-width: 767px) {
    .hero-star { width: 56px; height: 56px; }
  }

  @keyframes spinSlow { to { transform: rotate(360deg); } }

  .hero-dot { position: absolute; width: 4px; height: 4px; background: var(--accent); border-radius: 50%; opacity: 0.3; }
  .hero-dot-1 { top: 18px; right: 28px; }
  .hero-dot-2 { bottom: 24px; right: 60px; opacity: 0.15; width: 3px; height: 3px; }
  .hero-dot-3 { top: 50%; left: 45%; opacity: 0.12; width: 3px; height: 3px; }

  /* Stats */
  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 8px;
  }

  .performance-card {
    margin-top: 0;
  }

  .performance-summary {
    font-size: 0.9rem;
    line-height: 1.7;
    color: var(--text2);
    margin-bottom: 0.95rem;
  }

  .performance-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    gap: 0.9rem;
  }

  .performance-block {
    background: linear-gradient(145deg, rgba(var(--accent-rgb), 0.02), transparent 46%), var(--bg3);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 0.85rem 0.95rem;
  }

  .performance-label {
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.7px;
    text-transform: uppercase;
    color: var(--text3);
    margin-bottom: 0.55rem;
  }

  .performance-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }

  .performance-chip {
    display: inline-flex;
    align-items: center;
    padding: 5px 10px;
    border-radius: 11px;
    background: var(--accent-dim);
    color: var(--accent);
    border: 1px solid var(--accent-dim2);
    font-size: 0.75rem;
    line-height: 1.2;
  }

  .performance-chip.muted {
    background: transparent;
    color: var(--text2);
    border-color: var(--border2);
  }

  .pv-stat { 
    border-radius: 20px; 
    padding: 1.15rem;
    position: relative;
    overflow: hidden;
    min-height: 124px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: transform 0.25s ease, border-color 0.2s, box-shadow 0.25s;
  }
  .pv-stat:hover { 
    transform: translateY(-4px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  }
  .pv-stat--dark { background: linear-gradient(145deg, rgba(var(--accent-rgb), 0.03), transparent 42%), var(--bg3); border: 1.5px solid var(--border); }
  .pv-stat--dark:hover { border-color: var(--accent); }
  .pv-stat--lime { background: linear-gradient(145deg, rgba(255, 255, 255, 0.06), transparent 35%), var(--accent); border: 1.5px solid var(--accent2); }
  .pv-stat--lime:hover { border-color: var(--accent2); }

  .pv-stat-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 10px; }

  .pv-stat-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
  .pv-stat--dark .pv-stat-icon { background: var(--accent-dim); }
  .pv-stat--dark .pv-stat-icon svg { stroke: var(--accent); }
  .pv-stat--lime .pv-stat-icon { background: rgba(15, 15, 15, 0.08); }
  .pv-stat--lime .pv-stat-icon svg { stroke: #0f0f0f; }
  .pv-stat-icon svg { width: 18px; height: 18px; fill: none; stroke-width: 1.7; }

  .pv-stat-delta { font-size: 0.65rem; padding: 2px 8px; border-radius: 20px; font-weight: 500; }
  .pv-stat--dark .pv-stat-delta { background: var(--accent-dim); color: var(--accent); }
  .pv-stat--lime .pv-stat-delta { background: rgba(15, 15, 15, 0.08); color: #0f0f0f; }

  .pv-stat-value { font-family: 'DM Serif Display', serif; font-size: 2rem; line-height: 1; margin-bottom: 3px; }
  .pv-stat--dark .pv-stat-value { color: var(--text); }
  .pv-stat--lime .pv-stat-value { color: #0f0f0f; }
  .pv-stat-value span { font-family: 'DM Sans', sans-serif; font-size: 0.9rem; font-weight: 400; opacity: 0.5; }

  .pv-stat-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
  .pv-stat--dark .pv-stat-label { color: var(--text2); }
  .pv-stat--lime .pv-stat-label { color: rgba(15, 15, 15, 0.55); }

  .pv-bar { height: 3px; border-radius: 3px; overflow: hidden; }
  .pv-stat--dark .pv-bar { background: var(--border); }
  .pv-stat--lime .pv-bar { background: rgba(15, 15, 15, 0.1); }
  .pv-bar-fill { height: 100%; border-radius: 3px; }
  .pv-stat--dark .pv-bar-fill { background: var(--accent); }
  .pv-stat--lime .pv-bar-fill { background: #0f0f0f; }

  @media (max-width: 767px) {
    .pv-stat-top {
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 8px;
    }

    .pv-stat-delta {
      font-size: 0.6rem;
      padding: 2px 6px;
      line-height: 1.2;
      margin-left: auto;
      text-align: right;
    }
  }

  @media (max-width: 480px) {
    .stats-grid {
      grid-template-columns: 1fr;
    }

    .pv-stat-delta {
      max-width: calc(100% - 44px);
      white-space: nowrap;
    }
  }

  /* Features */
  .features-stack {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .home-enem-card--left {
    margin-top: 8px;
  }

  .home-enem-card--right {
    margin-top: 0;
  }

  .pv-feature {
    border-radius: 24px;
    padding: 1.4rem 1.4rem 1.15rem;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 1rem;
    align-items: start;
    text-decoration: none;
    min-height: 182px;
    position: relative;
    overflow: hidden;
    transition: transform 0.25s ease, box-shadow 0.25s ease;
  }

  .pv-feature:hover { 
    transform: translateY(-4px); 
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12); 
    border-color: var(--accent);
  }
  .pv-feature--dark { background: linear-gradient(145deg, rgba(var(--accent-rgb), 0.035), transparent 42%), var(--bg2); border: 1.5px solid var(--border); }
  .pv-feature--lime { background: linear-gradient(145deg, rgba(255, 255, 255, 0.06), transparent 35%), var(--accent); border: 1.5px solid var(--accent2); }
  .pv-feature-content { display: flex; flex-direction: column; gap: 7px; position: relative; z-index: 2; }

  .pv-feature-title { font-family: 'DM Serif Display', serif; font-size: 1.5rem; line-height: 1.2; letter-spacing: -0.3px; }
  .pv-feature--dark .pv-feature-title { color: var(--text); }
  .pv-feature--lime .pv-feature-title { color: #0f0f0f; }

  .pv-feature-desc { font-size: 0.85rem; line-height: 1.6; }
  .pv-feature--dark .pv-feature-desc { color: var(--text2); }
  .pv-feature--lime .pv-feature-desc { color: rgba(15, 15, 15, 0.6); }

  .pv-pill { display: inline-flex; align-items: center; gap: 5px; padding: 4px 12px; border-radius: 20px; font-size: 0.65rem; font-weight: 500; letter-spacing: 0.3px; width: fit-content; }
  .pv-feature--dark .pv-pill { background: var(--accent-dim); border: 1px solid var(--accent-dim2); color: var(--accent); }
  .pv-feature--lime .pv-pill { background: rgba(15, 15, 15, 0.08); border: 1px solid rgba(15, 15, 15, 0.15); color: #0f0f0f; }

  .pv-feature-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 20px;
    border-radius: 12px;
    font-family: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    text-decoration: none;
    width: fit-content;
    margin-top: 4px;
    transition: background 0.2s, transform 0.1s;
    border: none;
    cursor: pointer;
  }
  .pv-feature-btn:active { transform: scale(0.97); }
  .pv-feature--dark .pv-feature-btn { background: var(--accent); color: #0f0f0f; }
  .pv-feature--dark .pv-feature-btn:hover { background: var(--accent2); }
  .pv-feature--lime .pv-feature-btn { background: #0f0f0f; color: #f0ede8; }
  .pv-feature--lime .pv-feature-btn:hover { background: #1e1e1e; }

  .pv-feature-icon { width: 56px; height: 56px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; position: relative; z-index: 2; }
  .pv-feature--dark .pv-feature-icon { background: var(--accent-dim); }
  .pv-feature--dark .pv-feature-icon svg { stroke: var(--accent); }
  .pv-feature--lime .pv-feature-icon { background: rgba(15, 15, 15, 0.06); }
  .pv-feature--lime .pv-feature-icon svg { stroke: #0f0f0f; }
  .pv-feature-icon svg { width: 26px; height: 26px; fill: none; stroke-width: 1.5; }

  .pv-feature-deco { position: absolute; opacity: 0.06; }
  .performance-card {
    background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.03), transparent 44%), linear-gradient(135deg, var(--bg2), var(--bg3));
    border-left: 4px solid var(--accent);
    padding: 1.35rem 1.5rem;
    position: relative;
    overflow: hidden;
  }
  .performance-card::after {
    content: '';
    position: absolute;
    top: -10px; right: -10px;
    width: 60px; height: 60px;
    background: radial-gradient(circle at center, rgba(var(--accent-rgb), 0.15), transparent 70%);
    pointer-events: none;
  }
  .performance-summary {
    font-size: 0.95rem;
    line-height: 1.6;
    color: var(--text);
    margin-bottom: 1.1rem;
  }
  .performance-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    gap: 0.9rem;
  }
  .performance-block { min-width: 0; }
  .performance-label {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text3);
    margin-bottom: 0.75rem;
  }
  .performance-chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .performance-chip {
    font-size: 0.75rem;
    background: var(--bg3);
    border: 1px solid var(--border);
    padding: 6px 12px;
    border-radius: 11px;
    color: var(--text2);
    transition: all 0.2s;
  }
  .performance-chip:hover {
    border-color: var(--accent);
    color: var(--accent);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }

  .pv-feature--dark .pv-feature-deco svg { stroke: var(--accent); }
  .pv-feature--lime .pv-feature-deco svg { stroke: #0f0f0f; }
  .pv-feature-deco svg { fill: none; stroke-width: 1; }

  .deco-circle { bottom: -20px; right: -20px; width: 100px; height: 100px; opacity: 0.08; }
  .deco-sparkle { top: 14px; right: 70px; width: 20px; height: 20px; opacity: 0.15; }

  .pwa-home-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    background: transparent;
    border: 1px solid rgba(200, 240, 96, 0.3);
    border-radius: 999px;
    padding: 6px 14px;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--accent);
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: background 0.2s, transform 0.15s;
    letter-spacing: 0.01em;
  }

  .pwa-home-btn:hover {
    background: rgba(200, 240, 96, 0.1);
    border-color: var(--accent);
  }

  .pwa-home-btn:active { transform: scale(0.96); }
`
