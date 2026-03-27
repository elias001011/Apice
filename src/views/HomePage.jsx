import { useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth.js'
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

  const [insights, setInsights] = useState(() => buildEssayInsights(loadEssayHistory()))
  const [userSummary, setUserSummary] = useState(() => loadUserSummary())
  const [greeting, setGreeting] = useState(() => getGreetingLabel())
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [pwaInstalled, setPwaInstalled] = useState(() => Boolean(typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)')?.matches))
  const [pwaHint, setPwaHint] = useState('')
  const enemLabel = getEnemYearLabel()
  const [dailyQuote] = useState(() => frases[getDailyQuoteIndex()])

  // --- TIMER ENEM ---
  const [enemDate, setEnemDate] = useState(() => localStorage.getItem('apice:enem-date') || '')
  const [isEditingEnem, setIsEditingEnem] = useState(false)
  const [tempDate, setTempDate] = useState(enemDate)
  const [timeLeft, setTimeLeft] = useState({ months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const update = () => {
      if (!enemDate) return
      const target = new Date(enemDate + 'T00:00:00')
      const now = new Date()
      const diff = target - now

      if (diff <= 0) {
        setTimeLeft({ months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 })
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
      const seconds = totSeconds % 60

      setTimeLeft({ months, days, hours, minutes, seconds })
    }

    update()
    const timerId = setInterval(update, 1000)
    return () => clearInterval(timerId)
  }, [enemDate])

  const handleConfirmDate = () => {
    setEnemDate(tempDate)
    localStorage.setItem('apice:enem-date', tempDate)
    setIsEditingEnem(false)
  }

  // --- STREAK (MOCK) ---

  const streakDays = 4 // Mockado como solicitado


  // Captura evento de instalação PWA
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setPwaHint('')
    }
    const installedHandler = () => {
      setPwaInstalled(true)
      setPwaHint('')
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', installedHandler)
    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  const handleInstallPwa = async () => {
    if (pwaInstalled) return

    if (!deferredPrompt) {
      setPwaHint('Abra o app no Chrome ou no Edge para instalar como PWA.')
      return
    }

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setPwaInstalled(true)
      setPwaHint('')
    }
    setDeferredPrompt(null)
  }

  useEffect(() => {
    const refreshGreeting = () => setGreeting(getGreetingLabel())
    refreshGreeting()

    const intervalId = window.setInterval(refreshGreeting, 60_000)

    // O home escuta o histórico para mostrar dados reais sem precisar recarregar.
    const refresh = () => setInsights(buildEssayInsights(loadEssayHistory()))
    const refreshSummary = () => setUserSummary(loadUserSummary())
    refresh()
    refreshSummary()

    const unlistenHistory = subscribeEssayHistory(refresh)
    const unlistenSummary = subscribeUserSummary(refreshSummary)

    return () => {
      window.clearInterval(intervalId)
      unlistenHistory()
      unlistenSummary()
    }
  }, [])

  const ultimaNota = insights.latestEssay?.nota || 0
  const ultimaNotaPercent = Math.round((ultimaNota / 1000) * 100)

  return (
    <>
      <style>{homeCss}</style>
      <OnboardingModal user={user} />

      <OnboardingModal user={user} />

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
              
              <div className="hero-sub">Chegue ao ápice no ENEM com o poder da IA.</div>
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

          {/* Streak style Duolingo */}
          <div className="card streak-card anim anim-d2">
            <div className="streak-content">
              <div className="streak-fire">
                <span className="fire-icon">🔥</span>
                <div className="fire-glow" />
              </div>
              <div className="streak-text">
                <div className="streak-value">{streakDays} dias de ofensiva!</div>
                <div className="streak-msg">Continue assim! Não deixe o fogo apagar.</div>
              </div>
            </div>
          </div>

        </div>

        {/* ── COLUNA DIREITA preexistente: Feature Cards ── */}
        <div className="home-grid-right">
          <div className="section-label anim anim-d3" style={{ marginTop: 0 }}>Ferramentas</div>

          <div className="features-stack">
            {/* NOVO CARD DO TIMER ENEM */}
            <div className="pv-feature pv-feature--enem anim anim-d3">
              <div className="pv-feature-content">
                <div className="pv-feature-title" style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Contagem para o ENEM</div>
                {isEditingEnem ? (
                  <div className="enem-edit-box">
                    <input
                      type="date"
                      className="enem-input-new"
                      value={tempDate}
                      onChange={(e) => setTempDate(e.target.value)}
                    />
                    <button className="enem-confirm-btn" onClick={handleConfirmDate}>Confirmar</button>
                  </div>
                ) : !enemDate ? (
                  <button className="enem-setup-btn" onClick={() => setIsEditingEnem(true)}>
                    Clique aqui para selecionar a data do enem
                  </button>
                ) : (
                  <div className="enem-live-timer" onClick={() => { setTempDate(enemDate); setIsEditingEnem(true); }}>
                    <div className="timer-units">
                      <div className="timer-unit"><strong>{timeLeft.months}</strong><span>meses</span></div>
                      <div className="timer-unit"><strong>{timeLeft.days}</strong><span>dias</span></div>
                      <div className="timer-unit"><strong>{timeLeft.hours}</strong><span>h</span></div>
                      <div className="timer-unit"><strong>{timeLeft.minutes}</strong><span>m</span></div>
                      <div className="timer-unit"><strong>{timeLeft.seconds}</strong><span>s</span></div>
                    </div>
                    <div className="enem-edit-hint">Clique para alterar</div>
                  </div>
                )}

              </div>
              <div className="pv-feature-icon" style={{ opacity: 0.15 }}>
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
            </div>

            <a href="/corretor" className="pv-feature pv-feature--dark anim anim-d3">
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
            </a>

            <a href="/radar" className="pv-feature pv-feature--lime anim anim-d4">
              <div className="pv-feature-content">
                <div className="pv-feature-title">Radar 1000</div>
                <div className="pv-feature-desc">Descubra os temas com maior probabilidade de cair na redação do ENEM.</div>
                <div className="pv-pill">{enemLabel} • Atualizado</div>
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
            </a>
          </div>

        </div>

        {/* ── CARD DE FRASE (Posicionado via Grid Order) ── */}
        <div className="home-quote-container anim anim-d4">
          <div className="card quote-card-header">
            <div className="quote-icon-main">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--accent)"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/></svg>
            </div>
            <p className="quote-main-text">
              "{dailyQuote.text}"
            </p>
            {dailyQuote.author && (
              <div className="quote-author">
                — {dailyQuote.author}
              </div>
            )}
            <div className="quote-tag">💡 Inspiração</div>
          </div>
          
          {userSummary && (
            <div className="card performance-card">
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
  }

  /* Grid principal */
  @media (min-width: 768px) {
    .home-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }
    .home-quote-container {
      grid-column: 1 / -1; /* Ocupa as 2 colunas */
      margin: 0 auto;
      max-width: 800px;
    }

  }

  @media (max-width: 767px) {
    .home-grid {
      display: flex;
      flex-direction: column;
    }
    .home-quote-container {
      order: 99; /* Aparece por último no mobile */
    }
  }

  .home-quote-container {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .quote-card-header {
    padding: 2.25rem 2rem;
    background: var(--bg2);
    border: 1.5px solid var(--border);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1.15rem;
    position: relative;
    overflow: hidden;
  }
  
  html[data-theme="dark"] .quote-main-text {
    color: var(--text) !important; /* Aumentar contraste no tema escuro */
  }

  .quote-author {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--text2);
    margin-top: -0.5rem;
  }


  @media (max-width: 767px) {
    .quote-card-header {
      padding: 1.5rem 1.25rem;
    }
  }

  .quote-icon-main {
    opacity: 0.8;
  }

  .quote-main-text {
    font-family: 'DM Serif Display', serif;
    font-size: 1.6rem;
    color: var(--text);
    line-height: 1.4;
    max-width: 800px;
    margin: 0;
  }

  @media (max-width: 767px) {
    .quote-main-text {
      font-size: 1.25rem;
    }
  }

  .quote-tag {
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 1px;
    background: var(--accent-dim);
    padding: 4px 12px;
    border-radius: 999px;
  }

  /* Hero */
  .hero {
    background: var(--bg2);
    border: 1.5px solid var(--border);
    border-radius: 24px;
    padding: 1.75rem 1.5rem;
    margin-bottom: 12px;
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
    gap: 12px;
    margin-bottom: 12px;
  }

  /* Streak Card */
  .streak-card {
    background: linear-gradient(135deg, var(--bg2), var(--bg3));
    border-left: 4px solid #ff5722;
    margin-bottom: 12px;
  }
  .streak-content {
    display: flex;
    align-items: center;
    gap: 1.25rem;
  }
  .streak-fire {
    position: relative;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .fire-icon {
    font-size: 2.2rem;
    z-index: 2;
    animation: fireWobble 1.5s ease-in-out infinite;
  }
  .fire-glow {
    position: absolute;
    width: 30px;
    height: 30px;
    background: #ff5722;
    filter: blur(15px);
    border-radius: 50%;
    opacity: 0.4;
    animation: firePulse 2s ease-in-out infinite;
  }
  @keyframes fireWobble {
    0%, 100% { transform: translateY(0) scale(1); }
    50% { transform: translateY(-4px) scale(1.05) rotate(2deg); }
  }
  @keyframes firePulse {
    0%, 100% { transform: scale(1); opacity: 0.4; }
    50% { transform: scale(1.5); opacity: 0.6; }
  }
  .streak-value {
    font-size: 1.1rem;
    font-weight: 800;
    color: var(--text);
    letter-spacing: -0.2px;
  }
  .streak-msg {
    font-size: 0.8rem;
    color: var(--text2);
    margin-top: 2px;
  }

  .performance-card {
    margin-bottom: 16px;
  }

  .performance-summary {
    font-size: 0.9rem;
    line-height: 1.7;
    color: var(--text2);
    margin-bottom: 1rem;
  }

  .performance-grid {
    display: grid;
    gap: 0.85rem;
  }

  .performance-block {
    background: var(--bg3);
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
    gap: 6px;
  }

  .performance-chip {
    display: inline-flex;
    align-items: center;
    padding: 5px 10px;
    border-radius: 999px;
    background: var(--accent-dim);
    color: var(--accent);
    border: 1px solid var(--accent-dim2);
    font-size: 0.74rem;
    line-height: 1.2;
  }

  .performance-chip.muted {
    background: transparent;
    color: var(--text2);
    border-color: var(--border2);
  }

  .pv-stat { border-radius: 20px; padding: 1.25rem; position: relative; overflow: hidden; min-height: 130px; display: flex; flex-direction: column; justify-content: space-between; }
  .pv-stat--dark { background: var(--bg3); border: 1.5px solid var(--border); }
  .pv-stat--lime { background: var(--accent); border: 1.5px solid var(--accent2); }

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

  /* Features */
  .features-stack {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .pv-feature {
    border-radius: 24px;
    padding: 1.5rem 1.5rem 1.25rem;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 1rem;
    align-items: start;
    text-decoration: none;
    min-height: 190px;
    position: relative;
    overflow: hidden;
    transition: transform 0.25s ease, box-shadow 0.25s ease;
  }

  .pv-feature:hover { transform: translateY(-3px); box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12); }
  .pv-feature--dark { background: var(--bg2); border: 1.5px solid var(--border); }
  .pv-feature--lime { background: var(--accent); border: 1.5px solid var(--accent2); }
  .pv-feature--enem { 
    background: linear-gradient(135deg, var(--bg2), var(--accent-dim)); 
    border: 1.5px solid var(--accent);
    min-height: auto;
    padding: 0; /* Tiramos o padding para o botão ocupar tudo */
  }

  .pv-feature--enem .pv-feature-content {
    width: 100%;
    height: 100%;
  }

  .enem-setup-btn {
    width: 100%;
    height: 100%;
    background: transparent;
    border: none;
    color: var(--accent);
    font-size: 1rem;
    font-weight: 700;
    padding: 2rem 1.5rem;
    cursor: pointer;
    text-align: center;
    line-height: 1.4;
    transition: background 0.2s;
  }

  .enem-setup-btn:hover {
    background: rgba(var(--accent-rgb), 0.05);
  }

  .enem-edit-box {
    padding: 1.5rem;
  }

  .enem-live-timer {
    padding: 1.25rem 1.5rem;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .timer-units {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }
  .timer-unit {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 35px;
  }
  .timer-unit strong {
    font-size: 1.2rem;
    color: var(--text);
    font-family: 'DM Serif Display', serif;
    line-height: 1;
  }
  .timer-unit span {
    font-size: 0.65rem;
    color: var(--text3);
    text-transform: uppercase;
    font-weight: 700;
  }
  .enem-empty {
    font-size: 0.9rem;
    color: var(--text2);
    font-weight: 500;
  }
  .enem-edit-hint {
    font-size: 0.65rem;
    color: var(--accent);
    opacity: 0.7;
    font-weight: 600;
  }
  .enem-edit-box {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
    max-width: 200px;
  }
  .enem-input-new {
    background: var(--bg3);
    border: 1.5px solid var(--accent);
    color: var(--text);
    border-radius: 8px;
    padding: 6px 12px;
    font-family: inherit;
    font-size: 0.85rem;
    outline: none;
  }
  .enem-confirm-btn {
    background: var(--accent);
    color: #0f0f0f;
    border: none;
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
  }
  .enem-confirm-btn:hover {
    background: var(--accent2);
    transform: translateY(-1px);
  }

  .pv-feature-content { display: flex; flex-direction: column; gap: 8px; position: relative; z-index: 2; }

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
