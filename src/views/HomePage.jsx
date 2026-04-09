import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
  getEnemCalendarState,
  loadManualEnemDate,
  saveManualEnemDate,
} from '../services/enemCalendar.js'
import {
  loadRadarSnapshot,
  subscribeRadarSnapshot,
} from '../services/radarState.js'
import {
  fetchClima,
  getLastClimaResult,
  isClimaResultFresh,
} from '../services/climaService.js'
import {
  loadWeatherCardEnabled,
  loadWeatherLocation,
  saveWeatherLocation,
  subscribeWeatherCardEnabled,
  subscribeWeatherLocation,
  filterCitySuggestions,
} from '../services/weatherPreferences.js'
import { saveProfessorHandoff } from '../services/professorHandoff.js'
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

function formatWeatherDescription(value) {
  const text = String(value || '').trim()
  if (!text) return 'Condições atuais'
  // Corrige capitalização de descrições em português
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function formatWeatherUpdatedAt(value) {
  if (!value) return 'Atualização pendente'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Atualização pendente'

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Agora mesmo'
  if (diffMins < 60) return `Há ${diffMins} min`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `Há ${diffHours}h`

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  
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
  const [weatherCardEnabled, setWeatherCardEnabled] = useState(() => loadWeatherCardEnabled())
  const [weatherLocation, setWeatherLocation] = useState(() => loadWeatherLocation())
  const [weatherData, setWeatherData] = useState(() => {
    const location = loadWeatherLocation()
    const cached = getLastClimaResult()
    return isClimaResultFresh(cached, location) ? cached : null
  })
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherError, setWeatherError] = useState('')
  const [citySearchQuery, setCitySearchQuery] = useState('')
  const [citySearchOpen, setCitySearchOpen] = useState(false)
  const [citySearchFocused, setCitySearchFocused] = useState(-1)
  const [professorMessage, setProfessorMessage] = useState('')
  const [professorMessageError, setProfessorMessageError] = useState('')
  const enemLabel = getEnemYearLabel()
  const [dailyQuote] = useState(() => frases[getDailyQuoteIndex()])

  // --- TIMER ENEM ---
  const [initialManualEnemDate] = useState(() => loadManualEnemDate())
  const [enemDate, setEnemDate] = useState(() => initialManualEnemDate)
  const [isEditingEnem, setIsEditingEnem] = useState(false)
  const [tempDate, setTempDate] = useState(enemDate)
  const [enemState, setEnemState] = useState(() => getEnemCalendarState({ manualDate: initialManualEnemDate }))

  const handleOpenEnemEditor = () => {
    setTempDate(loadManualEnemDate() || enemDate || '')
    setIsEditingEnem(true)
  }

  const handleCancelEnemEditor = () => {
    setTempDate(loadManualEnemDate() || enemDate || '')
    setIsEditingEnem(false)
  }

  useEffect(() => {
    const update = () => {
      const nextManualDate = loadManualEnemDate()
      setEnemDate((current) => (current === nextManualDate ? current : nextManualDate))
      setEnemState(getEnemCalendarState({ referenceDate: new Date(), manualDate: nextManualDate }))
    }

    update()
    const timerId = setInterval(update, 1000)
    return () => clearInterval(timerId)
  }, [])

  useEffect(() => {
    const refreshManualDate = () => {
      const nextManualDate = loadManualEnemDate()
      setEnemDate(nextManualDate)
      if (!isEditingEnem) {
        setTempDate(nextManualDate)
      }
    }

    window.addEventListener('apice:enem-date-updated', refreshManualDate)
    return () => window.removeEventListener('apice:enem-date-updated', refreshManualDate)
  }, [isEditingEnem])

  const handleConfirmDate = () => {
    if (!tempDate) return
    setEnemDate(tempDate)
    saveManualEnemDate(tempDate)
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
    const unlistenWeatherLocation = subscribeWeatherLocation(setWeatherLocation)
    const unlistenWeatherCardEnabled = subscribeWeatherCardEnabled(setWeatherCardEnabled)

    return () => {
      window.clearInterval(intervalId)
      unlistenHistory()
      unlistenSummary()
      unlistenRadar()
      unlistenWeatherLocation()
      unlistenWeatherCardEnabled()
    }
  }, [])

  useEffect(() => {
    if (!weatherCardEnabled) {
      setWeatherLoading(false)
      setWeatherError('')
      return undefined
    }

    let cancelled = false
    const cached = getLastClimaResult()
    const hasFreshCache = isClimaResultFresh(cached, weatherLocation)

    if (hasFreshCache) {
      setWeatherData(cached)
      setWeatherError('')
      setWeatherLoading(false)
      return undefined
    }

    if (cached?.requestedCityKey === String(weatherLocation || '').trim().toLowerCase()) {
      setWeatherData(cached)
    } else {
      setWeatherData(null)
    }
    setWeatherError('')
    setWeatherLoading(true)

    const fetchWeather = async () => {
      try {
        const data = await fetchClima(weatherLocation)
        if (!cancelled) {
          setWeatherData(data)
          setWeatherError('')
        }
      } catch (error) {
        if (!cancelled) {
          setWeatherError(error?.message || 'Não foi possível atualizar o clima agora.')
        }
      } finally {
        if (!cancelled) {
          setWeatherLoading(false)
        }
      }
    }

    void fetchWeather()

    // Auto-update: verifica a cada 5 minutos se o cache expirou
    const intervalId = setInterval(() => {
      if (cancelled) return
      const currentCached = getLastClimaResult()
      const stillFresh = isClimaResultFresh(currentCached, weatherLocation)
      if (!stillFresh && !weatherLoading) {
        void fetchWeather()
      }
    }, 5 * 60 * 1000) // 5 minutos

    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [weatherCardEnabled, weatherLocation])

  const ultimaNota = insights.latestEssay?.nota || 0
  const ultimaNotaPercent = Math.round((ultimaNota / 1000) * 100)
  const weatherDescription = formatWeatherDescription(weatherData?.descricao)
  const weatherUpdatedAt = formatWeatherUpdatedAt(weatherData?.fetchedAt)
  const weatherHeaderLocation = weatherData?.cidade || weatherLocation
  const weatherCountry = weatherData?.pais || ''
  const hasWeatherData = Boolean(weatherData)

  // Busca inteligente de cidades
  const citySuggestions = filterCitySuggestions(citySearchQuery)
  const showSuggestions = citySearchOpen && citySearchQuery.trim().length > 0

  function handleCitySearchFocus() {
    setCitySearchOpen(true)
    setCitySearchFocused(-1)
  }

  function handleCitySearchBlur() {
    // Fecha o dropdown após um delay para permitir clique nas sugestões
    setTimeout(() => {
      setCitySearchOpen(false)
      setCitySearchFocused(-1)
    }, 150)
  }

  function handleCitySelect(city) {
    setWeatherLocation(city)
    saveWeatherLocation(city)
    setCitySearchQuery('')
    setCitySearchOpen(false)
    setCitySearchFocused(-1)
  }

  function handleCitySearchKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCitySearchFocused(prev => Math.min(prev + 1, citySuggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCitySearchFocused(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (citySearchFocused >= 0 && citySuggestions[citySearchFocused]) {
        handleCitySelect(citySuggestions[citySearchFocused])
      } else if (citySuggestions.length > 0) {
        handleCitySelect(citySuggestions[0])
      }
    } else if (e.key === 'Escape') {
      setCitySearchOpen(false)
      setCitySearchFocused(-1)
    }
  }

  function handleProfessorWidgetSubmit(event) {
    event.preventDefault()

    const message = professorMessage.trim()
    if (!message) {
      setProfessorMessageError('Escreva uma dúvida antes de enviar.')
      return
    }

    const handoff = saveProfessorHandoff({
      message,
      categoryId: 'duvidas',
      source: 'home-widget',
    })

    setProfessorMessage('')
    setProfessorMessageError('')
    navigate('/professor', { state: { handoff } })
  }

  const weatherCard = weatherCardEnabled ? (
    <section className={`weather-card anim anim-d2${weatherLoading ? ' is-loading' : ''}`}>
      <div className="weather-card-top">
        <div>
          <div className="weather-card-kicker">Clima agora</div>
          <div className="weather-card-location">
            <strong>{weatherHeaderLocation}</strong>
            {weatherCountry && <span>{weatherCountry}</span>}
          </div>
        </div>
        <div className="weather-city-search">
          <input
            type="text"
            className="weather-city-input"
            placeholder="Buscar cidade..."
            value={citySearchQuery}
            onChange={e => setCitySearchQuery(e.target.value)}
            onFocus={handleCitySearchFocus}
            onBlur={handleCitySearchBlur}
            onKeyDown={handleCitySearchKeyDown}
            aria-label="Buscar cidade para ver o clima"
            aria-expanded={showSuggestions}
            aria-haspopup="listbox"
          />
          {showSuggestions && citySuggestions.length > 0 && (
            <ul className="weather-city-dropdown" role="listbox">
              {citySuggestions.map((city, idx) => (
                <li
                  key={city}
                  role="option"
                  aria-selected={idx === citySearchFocused}
                  className={`weather-city-option${idx === citySearchFocused ? ' is-focused' : ''}`}
                  onClick={() => handleCitySelect(city)}
                  onMouseEnter={() => setCitySearchFocused(idx)}
                >
                  {city}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {hasWeatherData ? (
        <>
          <div className="weather-card-core">
            <div className="weather-icon-shell" aria-hidden="true">
              {weatherData.icone ? (
                <img
                  src={`https://openweathermap.org/img/wn/${weatherData.icone}@2x.png`}
                  alt=""
                  className="weather-icon"
                />
              ) : (
                <svg viewBox="0 0 24 24" className="weather-fallback-icon">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                </svg>
              )}
            </div>

            <div className="weather-card-main">
              <div className="weather-temp-row">
                <div className="weather-temp">{weatherData.temperatura}°</div>
                <div className="weather-summary">
                  <strong>{weatherDescription}</strong>
                  <span>Sensação {weatherData.sensacao}°C</span>
                </div>
              </div>

              <div className="weather-chip-row">
                <span>Máx {weatherData.maxima}°</span>
                <span>Mín {weatherData.minima}°</span>
                <span>Umidade {weatherData.umidade}%</span>
                <span>Vento {weatherData.vento} km/h</span>
              </div>
            </div>
          </div>

          <div className="weather-meta-strip">
            <span>Visib. {weatherData.visibilidadeKm ?? '--'} km</span>
            <span>Pressão {weatherData.pressao ?? '--'} hPa</span>
            <span>Nuvens {weatherData.nuvens ?? '--'}%</span>
            <span>Atualizado {weatherUpdatedAt}</span>
          </div>

          {weatherError && (
            <div className="weather-inline-note">
              Mostrando o último resultado salvo. {weatherError}
            </div>
          )}
        </>
      ) : (
        <div className="weather-empty-state">
          <div className="weather-empty-copy">
            {weatherLoading ? 'Buscando o clima da sua região...' : 'Ainda não conseguimos carregar o clima da sua região.'}
          </div>
          {!weatherLoading && weatherError && (
            <div className="weather-inline-note">{weatherError}</div>
          )}
        </div>
      )}
    </section>
  ) : null

  const enemCard = (
    <section
      className="enem-card anim anim-d5 home-enem-card"
    >
      <div className="enem-card-header">
        <div className="enem-card-kicker">Calendário do {enemLabel}</div>
        <h2 className="enem-card-title">Contagem para a prova</h2>
        <p className="enem-card-copy">
          {enemState.copy}
        </p>
      </div>

      <div className="enem-card-meta">
        <span className={`enem-card-badge${enemState.hasSavedDate ? ' active' : ''}`}>
          {enemState.badge}
        </span>
        {enemState.canEditManual && !isEditingEnem && (
          <button type="button" className="enem-card-link" onClick={handleOpenEnemEditor}>
            {enemDate ? 'Alterar data' : 'Definir data'}
          </button>
        )}
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
          {enemState.status === 'today' ? (
            <div className="enem-today-state">
              <div className="enem-today-title">Hoje é o dia da prova!</div>
              <p>{enemState.dateRangeLabel}</p>
            </div>
          ) : enemState.status === 'past' ? (
            <div className="enem-ended-state">
              <div className="enem-empty-title">
                {enemState.isCalendarMode ? 'Calendário concluído' : 'Data já passou'}
              </div>
              <p>
                {enemState.isCalendarMode
                  ? `O calendário oficial do ${enemLabel} já passou.`
                  : 'A data salva já passou.'}
              </p>
            </div>
          ) : enemState.status === 'countdown' ? (
            <div className="enem-countdown-row">
              <div className="enem-countdown-chip">
                <strong>{enemState.countdown.months}</strong>
                <span>Meses</span>
              </div>
              <div className="enem-countdown-chip">
                <strong>{enemState.countdown.days}</strong>
                <span>Dias</span>
              </div>
              <div className="enem-countdown-chip">
                <strong>{enemState.countdown.hours}</strong>
                <span>Horas</span>
              </div>
              <div className="enem-countdown-chip enem-countdown-chip--accent">
                <strong>{enemState.countdown.minutes}</strong>
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
          </div>

          {weatherCard}

          {enemCard}

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
            </Link>

            <Link to="/radar" className="pv-feature pv-feature--lime anim anim-d4 home-radar-card">
              <div className="pv-feature-content">
                <div className="pv-feature-title">Radar 1000</div>
                <div className="pv-feature-desc">
                  Descubra os temas com maior probabilidade de cair na redação do ENEM.
                </div>
                <div className="pv-pill">
                  {radarSnapshot?.temas?.length
                    ? `${radarSnapshot.temas.length} temas salvos`
                    : radarSnapshot?.nextSearchAt
                      ? 'Radar sincronizado'
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
            </Link>

            <form
              className="pv-feature pv-feature--dark pv-feature--professor anim anim-d4 home-professor-card"
              onSubmit={handleProfessorWidgetSubmit}
            >
              <div className="pv-feature-content">
                <div className="pv-feature-title">Professor IA</div>
                <div className="pv-feature-desc">
                  Escreva sua dúvida aqui e eu encaminho direto para a conversa do professor.
                </div>
                <label className="prof-widget-input-shell">
                  <span className="sr-only">Mensagem para o professor</span>
                  <textarea
                    className="prof-widget-input"
                    value={professorMessage}
                    onChange={(event) => {
                      setProfessorMessage(event.target.value)
                      if (professorMessageError) setProfessorMessageError('')
                    }}
                    placeholder="Ex: como montar uma tese mais forte para a redação?"
                    rows={3}
                    aria-label="Mensagem para o professor"
                  />
                </label>
                <div className="prof-widget-actions">
                  <button type="submit" className="pv-feature-btn prof-widget-btn">
                    Enviar para o Professor
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                  <div className="prof-widget-hint">Abre o Professor já com sua dúvida preenchida.</div>
                </div>
                {professorMessageError && <div className="prof-widget-error">{professorMessageError}</div>}
              </div>
              <div className="pv-feature-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
              </div>
            </form>

            {userSummary && (
              <div className="card performance-card anim anim-d4 home-performance-card">
                <div className="card-title">Análise de Desempenho</div>
                <div className="performance-summary">{userSummary.resumo || 'Resumo ainda não disponível.'}</div>
                <div className="performance-grid">
                  {Array.isArray(userSummary.forcas) && userSummary.forcas.length > 0 && (
                    <div className="performance-block performance-block--positive">
                      <div className="performance-label">Pontos fortes</div>
                      <div className="performance-chips">
                        {userSummary.forcas.slice(0, 3).map((item) => (
                          <span key={item} className="performance-chip">{item}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {Array.isArray(userSummary.errosRecorrentes) && userSummary.errosRecorrentes.length > 0 && (
                    <div className="performance-block performance-block--negative">
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
    gap: 1.15rem;
    min-width: 0;
  }

  html.layout-compact .home-grid-left,
  html.layout-compact .home-grid-right {
    gap: 0.9rem;
  }

  .home-grid {
    display: flex;
    flex-direction: column;
    gap: 1.15rem;
  }

  html.layout-compact .home-grid {
    gap: 0.9rem;
  }

  /* Grid principal */
  @media (min-width: 768px) {
    .home-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 1.15rem;
      align-items: start;
    }
  }


  .features-stack .pv-feature--quote {
    background: var(--bg3);
    border: 1.5px solid var(--border);
    min-height: auto;
    padding: 1.15rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    cursor: default;
    width: 100%;
    height: fit-content;
    align-self: start;
  }

  html.layout-compact .features-stack .pv-feature--quote {
    padding: 1rem 1.05rem;
  }

  html[data-fx="gradients"] .features-stack .pv-feature--quote {
    background: linear-gradient(145deg, rgba(var(--accent-rgb), 0.015), transparent 60%), var(--bg3);
  }

  .features-stack .pv-feature--quote:hover {
    transform: none;
    box-shadow: none;
  }

  .home-radar-card {
    width: 100%;
    align-self: stretch;
    margin-top: 0;
    min-height: 172px;
    box-shadow: 0 12px 26px rgba(8, 9, 4, 0.045);
  }

  html.layout-compact .home-radar-card {
    min-height: 156px;
  }

  .home-radar-card .pv-feature-content {
    gap: 10px;
  }

  html[data-fx="gradients"] .home-radar-card {
    background:
      radial-gradient(circle at top right, rgba(255, 255, 255, 0.05), transparent 28%),
      linear-gradient(145deg, rgba(var(--accent-rgb), 0.05), rgba(var(--accent-rgb), 0.022)),
      var(--bg2) !important;
    border-color: rgba(var(--accent-rgb), 0.1) !important;
  }

  html[data-fx="blur"] .home-radar-card {
    background:
      radial-gradient(circle at top right, rgba(255, 255, 255, 0.05), transparent 28%),
      linear-gradient(145deg, rgba(var(--accent-rgb), 0.04), rgba(var(--accent-rgb), 0.018)),
      var(--bg2-glass) !important;
    border-color: rgba(var(--accent-rgb), 0.1) !important;
    box-shadow: 0 14px 30px rgba(8, 9, 4, 0.07), inset 0 1px 0 rgba(255, 255, 255, 0.06) !important;
  }

  html[data-fx="none"] .home-radar-card {
    background: var(--bg2) !important;
    border-color: var(--border) !important;
    box-shadow: none !important;
  }

  html[data-fx="none"] .home-radar-card .pv-feature-icon {
    background: var(--bg3) !important;
    border: 1px solid var(--border) !important;
    box-shadow: none !important;
  }

  html[data-fx="none"] .home-radar-card .pv-feature-icon svg {
    stroke: var(--accent) !important;
  }

  html[data-fx="none"] .home-radar-card .pv-pill {
    background: var(--bg3) !important;
    border-color: var(--border) !important;
    color: var(--text2) !important;
  }

  html[data-fx="none"] .home-radar-card .pv-feature-btn {
    background: var(--bg3) !important;
    color: var(--text) !important;
    border: 1px solid var(--border) !important;
    box-shadow: none !important;
  }

  form.home-professor-card.pv-feature {
    display: flex;
    align-items: stretch;
    gap: 1rem;
    min-height: auto;
    cursor: default;
  }

  form.home-professor-card.pv-feature:hover {
    transform: none;
    box-shadow: 0 16px 38px rgba(8, 9, 4, 0.06);
    border-color: rgba(var(--accent-rgb), 0.08);
  }

  form.home-professor-card.pv-feature .pv-feature-content {
    flex: 1;
    gap: 0.7rem;
  }

  .prof-widget-input-shell {
    display: block;
  }

  .prof-widget-input {
    width: 100%;
    min-height: 86px;
    resize: vertical;
    border-radius: 16px;
    border: 1px solid rgba(var(--accent-rgb), 0.12);
    background: rgba(var(--accent-rgb), 0.04);
    color: var(--text);
    padding: 0.85rem 0.95rem;
    font: inherit;
    font-size: 0.85rem;
    line-height: 1.55;
    outline: none;
    transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
  }

  .prof-widget-input::placeholder {
    color: var(--text3);
  }

  .prof-widget-input:focus {
    border-color: var(--accent);
    background: rgba(var(--accent-rgb), 0.08);
    box-shadow: 0 0 0 3px var(--accent-dim);
  }

  html[data-fx="blur"] .prof-widget-input {
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(calc(var(--glass-blur) * 0.42));
    -webkit-backdrop-filter: blur(calc(var(--glass-blur) * 0.42));
  }

  .prof-widget-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  form.home-professor-card.pv-feature .prof-widget-btn {
    margin-top: 0;
  }

  .prof-widget-hint {
    font-size: 0.72rem;
    line-height: 1.45;
    color: var(--text3);
    max-width: 28ch;
  }

  .prof-widget-error {
    font-size: 0.74rem;
    line-height: 1.5;
    color: var(--red);
    margin-top: -0.15rem;
  }

  .weather-card {
    width: 100%;
    padding: 0.9rem 0.95rem;
    border-radius: 20px;
    border: 1px solid rgba(var(--accent-rgb), 0.08);
    background: linear-gradient(145deg, rgba(var(--accent-rgb), 0.02), transparent 62%), var(--bg2);
    box-shadow: 0 14px 30px rgba(8, 9, 4, 0.05);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    position: relative;
    overflow: hidden;
  }

  html[data-fx="blur"] .weather-card {
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.03)),
      var(--bg2-glass);
    border-color: rgba(255, 255, 255, 0.22);
    backdrop-filter: blur(var(--floating-blur)) saturate(var(--glass-saturate));
    -webkit-backdrop-filter: blur(var(--floating-blur)) saturate(var(--glass-saturate));
    box-shadow: 0 18px 44px rgba(8, 9, 4, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.16);
  }

  html[data-theme="dark"][data-fx="blur"] .weather-card {
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.008)),
      var(--bg2-glass);
    border-color: rgba(255, 255, 255, 0.1);
  }

  html[data-theme="dark"] .weather-card {
    border-color: rgba(var(--accent-rgb), 0.12);
  }

  html[data-fx="none"] .weather-card {
    background: var(--bg2) !important;
    border-color: var(--border) !important;
    box-shadow: none !important;
  }

  html[data-fx="none"] .weather-card .weather-icon-shell {
    background: var(--bg3) !important;
    border-color: var(--border) !important;
    box-shadow: none !important;
  }

  html[data-fx="none"] .weather-card .weather-icon {
    filter: none !important;
  }

  html[data-fx="none"] .weather-card .weather-chip-row span,
  html[data-fx="none"] .weather-card .weather-meta-strip span {
    background: var(--bg3) !important;
    border-color: var(--border) !important;
    color: var(--text2) !important;
  }

  html[data-fx="none"] .weather-card .weather-city-input {
    background: var(--bg3) !important;
    border-color: var(--border) !important;
    box-shadow: none !important;
  }

  html[data-fx="none"] .weather-card .weather-city-input:focus {
    background: var(--bg3) !important;
    border-color: var(--border2) !important;
  }

  html[data-fx="none"] .weather-card .weather-city-dropdown {
    background: var(--bg2) !important;
    border-color: var(--border) !important;
    box-shadow: none !important;
  }

  html[data-fx="none"] .weather-card .weather-city-option:hover,
  html[data-fx="none"] .weather-card .weather-city-option.is-focused {
    background: var(--bg3) !important;
    color: var(--text) !important;
  }

  html[data-fx="none"] .weather-card .weather-inline-note {
    background: var(--bg3) !important;
    border-color: var(--border) !important;
  }

  .weather-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .weather-card-kicker {
    font-size: 0.64rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text3);
    margin-bottom: 0.2rem;
  }

  .weather-card-location {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    align-items: baseline;
  }

  .weather-card-location strong {
    font-family: 'DM Serif Display', serif;
    font-size: 1.05rem;
    line-height: 1;
    color: var(--text);
    font-weight: 400;
  }

  .weather-card-location span {
    font-size: 0.74rem;
    color: var(--text3);
    font-weight: 700;
  }

  .weather-city-search {
    position: relative;
    min-width: 180px;
  }

  .weather-city-input {
    width: 100%;
    min-height: 34px;
    padding: 0.35rem 0.7rem;
    border-radius: 12px;
    border: 1px solid rgba(var(--accent-rgb), 0.15);
    background: rgba(var(--accent-rgb), 0.04);
    color: var(--text);
    font-size: 0.78rem;
    font-weight: 500;
    outline: none;
    transition: border-color 0.15s ease, background 0.15s ease;
  }

  .weather-city-input::placeholder {
    color: var(--text3);
    opacity: 0.7;
  }

  .weather-city-input:focus {
    border-color: var(--accent);
    background: rgba(var(--accent-rgb), 0.08);
  }

  .weather-city-dropdown {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    right: 0;
    z-index: 10;
    max-height: 200px;
    overflow-y: auto;
    border-radius: 12px;
    border: 1px solid var(--border2);
    background: var(--bg2);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .weather-city-option {
    padding: 0.45rem 0.75rem;
    font-size: 0.8rem;
    color: var(--text2);
    cursor: pointer;
    transition: background 0.1s ease, color 0.1s ease;
  }

  .weather-city-option:hover,
  .weather-city-option.is-focused {
    background: rgba(var(--accent-rgb), 0.1);
    color: var(--accent);
  }

  .weather-card-core {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 0.8rem;
    align-items: center;
  }

  .weather-card-main {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .weather-temp-row {
    display: flex;
    align-items: center;
    gap: 0.8rem;
  }

  .weather-temp {
    font-family: 'DM Serif Display', serif;
    font-size: 2.5rem;
    line-height: 0.86;
    color: var(--text);
    letter-spacing: -0.05em;
  }

  .weather-summary {
    display: flex;
    flex-direction: column;
    gap: 0.22rem;
  }

  .weather-summary strong {
    font-size: 0.9rem;
    line-height: 1.2;
    color: var(--text);
  }

  .weather-summary span {
    font-size: 0.78rem;
    color: var(--text2);
  }

  .weather-chip-row,
  .weather-meta-strip {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .weather-chip-row span,
  .weather-meta-strip span {
    display: inline-flex;
    align-items: center;
    min-height: 24px;
    padding: 0 9px;
    border-radius: 999px;
    background: rgba(var(--accent-rgb), 0.05);
    border: 1px solid rgba(var(--accent-rgb), 0.1);
    font-size: 0.68rem;
    font-weight: 700;
    color: var(--text2);
  }

  .weather-icon-shell {
    width: 64px;
    height: 64px;
    border-radius: 18px;
    background: radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.62), rgba(var(--accent-rgb), 0.12));
    border: 1px solid rgba(var(--accent-rgb), 0.12);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 12px 24px rgba(var(--accent-rgb), 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .weather-icon {
    width: 60px;
    height: 60px;
    object-fit: contain;
    filter: drop-shadow(0 8px 12px rgba(0, 0, 0, 0.08));
  }

  .weather-fallback-icon {
    width: 28px;
    height: 28px;
    fill: none;
    stroke: var(--accent);
    stroke-width: 1.8;
  }

  .weather-inline-note {
    font-size: 0.74rem;
    line-height: 1.5;
    color: var(--text2);
    padding: 0.6rem 0.7rem;
    border-radius: 12px;
    border: 1px solid rgba(var(--accent-rgb), 0.1);
    background: rgba(var(--accent-rgb), 0.05);
  }

  .weather-empty-state {
    min-height: 92px;
    border-radius: 16px;
    border: 1px dashed var(--border2);
    background: var(--bg3);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 0.55rem;
    padding: 1rem;
    text-align: center;
  }

  .weather-empty-copy {
    font-size: 0.82rem;
    line-height: 1.55;
    color: var(--text2);
    max-width: 32ch;
  }

  .enem-card {
    width: 100%;
    max-width: none;
    padding: 1rem 1.05rem;
    border-radius: 22px;
    border: 1px solid rgba(var(--accent-rgb), 0.08);
    background: linear-gradient(180deg, rgba(var(--accent-rgb), 0.02), transparent 34%), var(--bg2);
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    align-self: stretch;
    position: relative;
    overflow: hidden;
    box-shadow: 0 16px 38px rgba(8, 9, 4, 0.06);
  }

  html.layout-compact .enem-card {
    padding: 0.9rem 0.95rem;
    border-radius: 20px;
  }

  html[data-fx="gradients"] .enem-card {
    background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.015), transparent 58%), var(--bg2);
  }

  html[data-fx="gradients"] .weather-card {
    background: linear-gradient(145deg, rgba(var(--accent-rgb), 0.04), transparent 70%), var(--bg2);
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

  html.layout-compact .enem-card-title {
    font-size: 1.32rem;
  }

  .enem-card-copy {
    margin: 0;
    max-width: 46ch;
    font-size: 0.88rem;
    line-height: 1.55;
    color: var(--text2);
  }

  html.layout-compact .enem-card-copy {
    font-size: 0.82rem;
    line-height: 1.5;
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

  .enem-today-state,
  .enem-ended-state {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 0.95rem 1rem;
  }

  .enem-today-state {
    background: linear-gradient(145deg, rgba(var(--accent-rgb), 0.08), transparent 70%), var(--bg2);
    border-color: var(--accent-dim2);
  }

  .enem-empty-title {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 6px;
  }

  .enem-today-title {
    font-size: 0.95rem;
    font-weight: 800;
    color: var(--accent);
    margin-bottom: 6px;
  }

  .enem-empty-state p,
  .enem-today-state p,
  .enem-ended-state p {
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
    .weather-card {
      padding: 0.82rem 0.85rem;
      border-radius: 18px;
      gap: 0.7rem;
    }

    .weather-card-top {
      flex-direction: column;
      align-items: stretch;
    }

    .weather-city-search {
      min-width: unset;
      width: 100%;
    }

    .weather-icon-shell {
      width: 58px;
      height: 58px;
      border-radius: 16px;
    }

    .weather-icon {
      width: 54px;
      height: 54px;
    }

    .weather-temp {
      font-size: 2.15rem;
    }

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
    .weather-card-core {
      grid-template-columns: 1fr;
      justify-items: start;
    }

    .weather-temp-row {
      align-items: flex-start;
      gap: 0.65rem;
    }

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

  html.layout-compact .pv-quote-text {
    font-size: 1.08rem;
    line-height: 1.4;
  }

  .pv-quote-author {
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--text3);
    opacity: 0.8;
  }

  html.layout-compact .pv-quote-author {
    font-size: 0.72rem;
  }

  /* Hero */
  .hero {
    background: linear-gradient(180deg, rgba(var(--accent-rgb), 0.02), transparent 34%), var(--bg2);
    border: 1px solid rgba(var(--accent-rgb), 0.08);
    border-radius: 24px;
    padding: 1.75rem 1.5rem;
    margin-bottom: 0;
    display: grid;
    grid-template-columns: 1fr;
    align-items: start;
    gap: 0.9rem;
    position: relative;
    overflow: hidden;
    min-height: 180px;
    box-shadow: 0 16px 38px rgba(8, 9, 4, 0.06);
  }

  html.layout-compact .hero {
    padding: 1.2rem 1.15rem;
    border-radius: 20px;
    min-height: 156px;
  }

  html[data-fx="gradients"] .hero {
    background: linear-gradient(145deg, rgba(var(--accent-rgb), 0.02), transparent 58%), var(--bg2);
  }

  html[data-fx="blur"] .hero {
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.03)),
      var(--bg2-glass);
    border-color: rgba(255, 255, 255, 0.24);
    backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
    -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
    box-shadow: 0 18px 44px rgba(8, 9, 4, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.18);
  }

  html[data-theme="dark"][data-fx="blur"] .hero {
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01)),
      var(--bg2-glass);
    border-color: rgba(255, 255, 255, 0.1);
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

  html.layout-compact .hero-label {
    font-size: 0.7rem;
    margin-bottom: 6px;
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

  html.layout-compact .hero-name {
    font-size: 1.58rem;
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

  html.layout-compact .hero-sub {
    font-size: 0.8rem;
    max-width: 28ch;
    margin-bottom: 10px;
  }

  .hero-cta {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 9px 18px;
    background: linear-gradient(145deg, var(--accent), var(--accent2));
    color: #0f0f0f;
    border-radius: 10px;
    font-size: 0.85rem;
    font-weight: 600;
    text-decoration: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    box-shadow: 0 14px 28px rgba(var(--accent-rgb), 0.2);
    transition: background 0.2s, transform 0.1s, box-shadow 0.2s;
  }
  .hero-cta:hover { background: linear-gradient(145deg, var(--accent2), var(--accent)); }
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

  /* Stats */
  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    margin-bottom: 0;
  }

  html.layout-compact .stats-grid {
    gap: 10px;
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
    background: linear-gradient(180deg, rgba(var(--accent-rgb), 0.02), transparent 34%), var(--bg3);
    border: 1px solid rgba(var(--accent-rgb), 0.08);
    border-radius: 16px;
    padding: 0.85rem 0.95rem;
    box-shadow: 0 12px 28px rgba(8, 9, 4, 0.04);
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
    border: 1px solid rgba(var(--accent-rgb), 0.08);
    background: linear-gradient(180deg, rgba(var(--accent-rgb), 0.02), transparent 34%), var(--bg2);
    box-shadow: 0 16px 38px rgba(8, 9, 4, 0.06);
    transition: transform 0.25s ease, border-color 0.2s, box-shadow 0.25s;
  }

  html.layout-compact .pv-stat {
    padding: 0.95rem;
    min-height: 108px;
    border-radius: 18px;
  }
  .pv-stat:hover { 
    transform: translateY(-3px);
    box-shadow: 0 22px 48px rgba(8, 9, 4, 0.1);
  }
  .pv-stat--dark { background: linear-gradient(180deg, rgba(var(--accent-rgb), 0.02), transparent 34%), var(--bg2); }
  .pv-stat--dark:hover { border-color: rgba(var(--accent-rgb), 0.18); }
  .pv-stat--lime {
    background:
      radial-gradient(circle at top right, rgba(var(--accent-rgb), 0.25), transparent 40%),
      linear-gradient(145deg, rgba(var(--accent-rgb), 0.25), rgba(var(--accent-rgb), 0.15));
    border: 1px solid rgba(var(--accent-rgb), 0.25);
  }
  .pv-stat--lime:hover { border-color: rgba(var(--accent-rgb), 0.35); }

  .pv-stat-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 10px; }

  .pv-stat-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
  .pv-stat--dark .pv-stat-icon { background: var(--accent-dim); }
  .pv-stat--dark .pv-stat-icon svg { stroke: var(--accent); }
  .pv-stat--lime .pv-stat-icon { background: rgba(255, 255, 255, 0.25); }
  .pv-stat--lime .pv-stat-icon svg { stroke: #0f0f0f; }
  .pv-stat-icon svg { width: 18px; height: 18px; fill: none; stroke-width: 1.7; }

  .pv-stat-delta { font-size: 0.65rem; padding: 2px 8px; border-radius: 20px; font-weight: 500; }
  .pv-stat--dark .pv-stat-delta { background: var(--accent-dim); color: var(--accent); }
  .pv-stat--lime .pv-stat-delta { background: rgba(255, 255, 255, 0.25); color: #0f0f0f; }

  .pv-stat-value { font-family: 'DM Serif Display', serif; font-size: 2rem; line-height: 1; margin-bottom: 3px; }
  .pv-stat--dark .pv-stat-value { color: var(--text); }
  .pv-stat--lime .pv-stat-value { color: #0f0f0f; }
  .pv-stat-value span { font-family: 'DM Sans', sans-serif; font-size: 0.9rem; font-weight: 400; opacity: 0.5; }

  html.layout-compact .pv-stat-value {
    font-size: 1.8rem;
  }

  .pv-stat-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
  .pv-stat--dark .pv-stat-label { color: var(--text2); }
  .pv-stat--lime .pv-stat-label { color: rgba(15, 15, 15, 0.7); }

  .pv-bar { height: 3px; border-radius: 3px; overflow: hidden; }
  .pv-stat--dark .pv-bar { background: var(--border); }
  .pv-stat--lime .pv-bar { background: rgba(15, 15, 15, 0.15); }
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
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .pv-stat {
      padding: 0.9rem;
      min-height: 112px;
    }

    .pv-stat-value {
      font-size: 1.7rem;
    }

    .pv-stat-label {
      font-size: 0.68rem;
      margin-bottom: 8px;
    }

    .pv-stat-delta {
      max-width: calc(100% - 40px);
      white-space: nowrap;
    }
  }

  /* Features */
  .features-stack {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .home-enem-card--left {
    margin-top: 0;
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
    border: 1px solid rgba(var(--accent-rgb), 0.08);
    box-shadow: 0 16px 38px rgba(8, 9, 4, 0.06);
    transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.2s ease;
  }

  html.layout-compact .pv-feature {
    padding: 1.1rem 1.1rem 0.95rem;
    min-height: 164px;
    border-radius: 20px;
  }

  .pv-feature:hover { 
    transform: translateY(-3px); 
    box-shadow: 0 22px 46px rgba(8, 9, 4, 0.1); 
    border-color: rgba(var(--accent-rgb), 0.18);
  }
  .pv-feature--dark { background: linear-gradient(180deg, rgba(var(--accent-rgb), 0.02), transparent 34%), var(--bg2); }
  .pv-feature--lime {
    background:
      radial-gradient(circle at top right, rgba(var(--accent-rgb), 0.15), transparent 40%),
      linear-gradient(145deg, rgba(var(--accent-rgb), 0.12), rgba(var(--accent-rgb), 0.06)),
      var(--bg2);
    border: 1px solid rgba(var(--accent-rgb), 0.2);
  }

  html[data-theme="dark"] .pv-feature--lime {
    background:
      radial-gradient(circle at top right, rgba(255, 255, 255, 0.08), transparent 40%),
      linear-gradient(145deg, rgba(var(--accent-rgb), 0.12), rgba(var(--accent-rgb), 0.05)),
      var(--bg2);
    border-color: rgba(var(--accent-rgb), 0.18);
  }
  .pv-feature-content { display: flex; flex-direction: column; gap: 7px; position: relative; z-index: 2; }

  html[data-fx="gradients"] .pv-feature--dark {
    background: linear-gradient(145deg, rgba(var(--accent-rgb), 0.015), transparent 58%), var(--bg2);
  }

  html[data-fx="blur"] .pv-feature--dark {
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02)),
      var(--bg2-glass);
    border-color: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
    -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
    box-shadow: 0 16px 40px rgba(8, 9, 4, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.14);
  }

  html[data-theme="dark"][data-fx="blur"] .pv-feature--dark {
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.008)),
      var(--bg2-glass);
    border-color: rgba(255, 255, 255, 0.08);
  }

  html[data-fx="blur"] .pv-feature--lime {
    background:
      radial-gradient(circle at top right, rgba(var(--accent-rgb), 0.12), transparent 35%),
      linear-gradient(145deg, rgba(var(--accent-rgb), 0.08), rgba(var(--accent-rgb), 0.04)),
      var(--bg2-glass);
    border-color: rgba(var(--accent-rgb), 0.2);
    backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
    -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  }

  .pv-feature-title { font-family: 'DM Serif Display', serif; font-size: 1.5rem; line-height: 1.2; letter-spacing: -0.3px; }
  .pv-feature--dark .pv-feature-title { color: var(--text); }
  .pv-feature--lime .pv-feature-title { color: var(--text); }
  html.layout-compact .pv-feature-title {
    font-size: 1.32rem;
  }

  .pv-feature-desc { font-size: 0.85rem; line-height: 1.6; }
  .pv-feature--dark .pv-feature-desc { color: var(--text2); }
  .pv-feature--lime .pv-feature-desc { color: var(--text2); }

  html.layout-compact .pv-feature-desc {
    font-size: 0.8rem;
    line-height: 1.5;
  }

  .pv-pill { display: inline-flex; align-items: center; gap: 5px; padding: 4px 12px; border-radius: 20px; font-size: 0.65rem; font-weight: 500; letter-spacing: 0.3px; width: fit-content; }
  .pv-feature--dark .pv-pill { background: var(--accent-dim); border: 1px solid var(--accent-dim2); color: var(--accent); }
  .pv-feature--lime .pv-pill { background: rgba(var(--accent-rgb), 0.1); border: 1px solid rgba(var(--accent-rgb), 0.12); color: var(--text); }
  html[data-theme="dark"] .pv-feature--lime .pv-pill { background: rgba(255, 255, 255, 0.06); border-color: rgba(255, 255, 255, 0.06); color: var(--text); }

  html.layout-compact .pv-pill,
  html.layout-compact .pv-feature-btn {
    font-size: 0.78rem;
  }

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
  .pv-feature--lime .pv-feature-btn { background: var(--bg3); color: var(--text); border: 1px solid rgba(var(--accent-rgb), 0.12); }
  .pv-feature--lime .pv-feature-btn:hover { background: var(--bg2); }

  .pv-feature-icon { width: 56px; height: 56px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; position: relative; z-index: 2; }
  .pv-feature--dark .pv-feature-icon { background: var(--accent-dim); }
  .pv-feature--dark .pv-feature-icon svg { stroke: var(--accent); }
  .pv-feature--lime .pv-feature-icon { background: rgba(var(--accent-rgb), 0.08); }
  .pv-feature--lime .pv-feature-icon svg { stroke: var(--accent); }
  .pv-feature-icon svg { width: 26px; height: 26px; fill: none; stroke-width: 1.5; }
  .performance-card {
    background: linear-gradient(180deg, rgba(var(--accent-rgb), 0.02), transparent 30%), var(--bg2);
    border: 1px solid rgba(var(--accent-rgb), 0.08);
    padding: 1.35rem 1.5rem;
    position: relative;
    overflow: hidden;
    box-shadow: 0 16px 38px rgba(8, 9, 4, 0.06);
  }

  html[data-fx="gradients"] .performance-card {
    background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.015), transparent 58%), var(--bg2);
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
  .performance-block {
    min-width: 0;
    background: var(--bg3);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 0.85rem 0.95rem;
    transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
  }

  .performance-block:hover {
    transform: translateY(-1px);
    background: var(--bg2);
    border-color: var(--border2);
  }

  html[data-fx="gradients"] .performance-block--positive {
    background: linear-gradient(145deg, rgba(var(--accent-rgb), 0.12), transparent 88%), var(--bg3);
    border-color: rgba(var(--accent-rgb), 0.16);
  }

  html[data-fx="gradients"] .performance-block--negative {
    background: linear-gradient(145deg, rgba(225, 68, 68, 0.09), transparent 88%), var(--bg3);
    border-color: rgba(225, 68, 68, 0.16);
  }

  .performance-label {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text3);
    margin-bottom: 0.75rem;
  }
  .performance-block--positive .performance-label {
    color: var(--accent);
  }

  .performance-block--negative .performance-label {
    color: var(--red);
  }

  .performance-chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .performance-chip {
    font-size: 0.75rem;
    background: var(--bg2);
    border: 1px solid var(--border);
    padding: 6px 12px;
    border-radius: 11px;
    color: var(--text2);
    transition: all 0.2s;
  }

  html[data-fx="gradients"] .performance-block--positive .performance-chip {
    background: var(--accent-dim);
    color: var(--accent);
    border-color: var(--accent-dim2);
  }

  html[data-fx="gradients"] .performance-block--negative .performance-chip {
    background: rgba(225, 68, 68, 0.08);
    color: var(--red);
    border-color: rgba(225, 68, 68, 0.16);
  }

  .performance-chip:hover {
    transform: none;
    box-shadow: none;
    background: var(--bg2);
    color: var(--text2);
    border-color: var(--border2);
  }

  html[data-fx="gradients"] .performance-block--negative .performance-chip.muted {
    background: rgba(225, 68, 68, 0.06);
    color: var(--red);
    border-color: rgba(225, 68, 68, 0.12);
  }

  html[data-fx="none"] .hero,
  html[data-fx="none"] .enem-card,
  html[data-fx="none"] .performance-card,
  html[data-fx="none"] .features-stack .pv-feature--quote,
  html[data-fx="none"] .pv-feature--dark,
  html[data-fx="none"] .weather-card {
    background: var(--bg2);
  }

  html[data-fx="none"] .pv-feature--lime {
    background: var(--bg2) !important;
    border-color: var(--border) !important;
    box-shadow: none !important;
  }

  html[data-fx="none"] .pv-feature--lime .pv-feature-icon {
    background: var(--bg3) !important;
    border: 1px solid var(--border) !important;
    box-shadow: none !important;
  }

  html[data-fx="none"] .pv-feature--lime .pv-pill {
    background: var(--bg3) !important;
    border-color: var(--border) !important;
    color: var(--text2) !important;
  }

  html[data-fx="none"] .pv-feature--lime .pv-feature-btn {
    background: var(--bg3) !important;
    border-color: var(--border) !important;
    box-shadow: none !important;
  }

  html[data-fx="none"] .pv-stat--dark,
  html[data-fx="none"] .performance-block {
    background: var(--bg3);
  }

  html[data-fx="none"] .pv-stat--lime {
    background: var(--bg2) !important;
    border-color: var(--border) !important;
    box-shadow: none !important;
  }

  html[data-fx="none"] .pv-stat--lime .pv-stat-icon {
    background: var(--bg3) !important;
  }

  html[data-fx="none"] .pv-stat--lime .pv-stat-delta {
    background: var(--bg3) !important;
    color: var(--text2) !important;
  }

  html[data-fx="none"] .pv-stat--lime .pv-stat-value {
    color: var(--text) !important;
  }

  html[data-fx="none"] .pv-stat--lime .pv-stat-label {
    color: var(--text3) !important;
  }

  html[data-fx="none"] .pv-stat--lime .pv-bar {
    background: var(--border) !important;
  }

  .pwa-home-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    background: transparent;
    border: 1px solid rgba(var(--accent-rgb), 0.28);
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
    background: rgba(var(--accent-rgb), 0.1);
    border-color: rgba(var(--accent-rgb), 0.55);
  }

  .pwa-home-btn:active { transform: scale(0.96); }
`
