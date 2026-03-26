import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import {
  AI_RESPONSE_PREFERENCE_MAX_LENGTH,
  DEFAULT_AI_RESPONSE_PREFERENCE,
  loadAiResponsePreferenceText,
  saveAiResponsePreference,
  subscribeAiResponsePreference,
} from '../services/aiResponsePreferences.js'
import { buildEssayInsights, loadEssayHistory, subscribeEssayHistory } from '../services/essayInsights.js'
import {
  getCurrentPlanTier,
  getFreePlanUsageRows,
  MANUAL_AI_DAILY_LIMIT,
  subscribeFreePlanUsage,
} from '../services/freePlanUsage.js'

function maskEmail(email) {
  const value = String(email ?? '').trim()
  if (!value || value === 'Sem e-mail') return 'Sem e-mail'

  const [localPart, domainPart = ''] = value.split('@')
  if (!localPart || !domainPart) {
    return value
  }

  const maskPiece = (piece) => {
    const clean = String(piece ?? '').trim()
    if (!clean) return clean
    if (clean.length <= 2) return `${clean[0] ?? ''}*`
    if (clean.length === 3) return `${clean[0]}*${clean[2]}`
    return `${clean[0]}${'*'.repeat(Math.max(2, clean.length - 2))}${clean[clean.length - 1]}`
  }

  const [domainName, ...tldParts] = domainPart.split('.')
  const maskedDomain = domainName ? maskPiece(domainName) : domainName
  const tld = tldParts.length > 0 ? `.${tldParts.join('.')}` : ''

  return `${maskPiece(localPart)}@${maskedDomain}${tld}`
}

export function PerfilPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [planTier, setPlanTierState] = useState(getCurrentPlanTier())
  const [usageRows, setUsageRows] = useState(getFreePlanUsageRows())
  const [insights, setInsights] = useState(() => buildEssayInsights(loadEssayHistory()))
  const [showEmail, setShowEmail] = useState(false)
  const [aiPreference, setAiPreference] = useState(() => loadAiResponsePreferenceText())
  const [aiPreferenceSaving, setAiPreferenceSaving] = useState(false)
  const [aiPreferenceMsg, setAiPreferenceMsg] = useState('')
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [pwaInstalled, setPwaInstalled] = useState(() => Boolean(typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)')?.matches))
  const [pwaHint, setPwaHint] = useState('')

  const name = user?.user_metadata?.full_name || 'Usuário'
  const email = user?.email || 'Sem e-mail'
  const maskedEmail = maskEmail(email)
  const visibleEmail = showEmail ? email : maskedEmail
  const school = user?.user_metadata?.school || 'Não informada'
  const quotaRow = usageRows[0] || {
    used: 0,
    limit: MANUAL_AI_DAILY_LIMIT,
    remaining: MANUAL_AI_DAILY_LIMIT,
    percent: 0,
    blocked: false,
    breakdown: [],
  }

  const getInitial = (n) => (n ? n[0].toUpperCase() : '?')

  // Captura o evento de instalação PWA
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

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  useEffect(() => {
    // Esse painel é local, então ele reage aos eventos do próprio navegador.
    // Quando qualquer tela consumir IA, os números aqui sobem sem precisar recarregar.
    const refresh = () => {
      setPlanTierState(getCurrentPlanTier())
      setUsageRows(getFreePlanUsageRows())
    }

    refresh()
    const unlistenUsage = subscribeFreePlanUsage(refresh)
    const refreshInsights = () => setInsights(buildEssayInsights(loadEssayHistory()))
    refreshInsights()
    const unlistenInsights = subscribeEssayHistory(refreshInsights)
    const refreshAiPreference = () => setAiPreference(loadAiResponsePreferenceText())
    refreshAiPreference()
    const unlistenAiPreference = subscribeAiResponsePreference(refreshAiPreference)

    return () => {
      unlistenUsage()
      unlistenInsights()
      unlistenAiPreference()
    }
  }, [])

  const handleAiPreferenceSave = async (event) => {
    event.preventDefault()
    setAiPreferenceMsg('')
    setAiPreferenceSaving(true)
    await Promise.resolve()

    try {
      const saved = saveAiResponsePreference(aiPreference)
      if (saved?.text) {
        setAiPreference(saved.text)
        setAiPreferenceMsg('Preferência salva e aplicada à IA.')
        return
      }

      setAiPreference(DEFAULT_AI_RESPONSE_PREFERENCE)
      setAiPreferenceMsg('A instrução foi vazia ou inválida. Voltei para o padrão simples.')
    } finally {
      setAiPreferenceSaving(false)
    }
  }

  return (
    <>
      <style>{perfilCss}</style>

      <div className="profile-hero anim anim-d1">
        <div className="profile-avatar">{getInitial(name)}</div>
        <div className="profile-hero-content">
          <div className="profile-name">{name}</div>
          <div className="profile-email-row">
            <div className="profile-school">Conta vinculada · {visibleEmail}</div>
            <button
              className="profile-email-toggle"
              type="button"
              onClick={() => setShowEmail((value) => !value)}
              aria-label={showEmail ? 'Ocultar e-mail' : 'Mostrar e-mail'}
              title={showEmail ? 'Ocultar e-mail' : 'Mostrar e-mail'}
              disabled={email === 'Sem e-mail'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {showEmail ? (
                  <>
                    <path d="M3 3l18 18" />
                    <path d="M10.58 10.58A3 3 0 0012 15a3 3 0 003-3 3 3 0 00-.42-1.58" />
                    <path d="M9.88 5.09A10 10 0 0112 5c7 0 11 7 11 7a17.8 17.8 0 01-3.17 4.31" />
                    <path d="M6.61 6.61C3.41 8.7 1 12 1 12s4 7 11 7a13.1 13.1 0 005.12-1" />
                  </>
                ) : (
                  <>
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                    <circle cx="12" cy="12" r="3" />
                  </>
                )}
              </svg>
            </button>
          </div>
          <div className="profile-plan">{planTier === 'free' ? 'Plano gratuito' : 'Plano pro'}</div>
          <button className="pwa-btn" type="button" onClick={handleInstallPwa} disabled={pwaInstalled}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v13M7 11l5 5 5-5" />
              <path d="M3 18h18" />
            </svg>
            {pwaInstalled ? 'PWA instalado' : 'Instalar PWA'}
          </button>
          {pwaHint && <div className="pwa-hint">{pwaHint}</div>}
        </div>
      </div>

      <div className="stats-row-small anim anim-d2">
        <div className="stat-small">
          <div className="stat-small-val">{insights.totalEssays}</div>
          <div className="stat-small-lbl">Redações</div>
        </div>
        <div className="stat-small">
          <div className="stat-small-val">{insights.bestScore}</div>
          <div className="stat-small-lbl">Melhor nota</div>
        </div>
        <div className="stat-small">
          <div className="stat-small-val">{insights.averageScore}</div>
          <div className="stat-small-lbl">Média geral</div>
        </div>
      </div>
      <div className="perfil-grid">
        <div className="perfil-col">
          <div className="section-label anim anim-d2" style={{ marginTop: '0.5rem' }}>
            Informações
          </div>
          <div className="card info-card anim anim-d2" style={{ marginBottom: '1.25rem' }}>
            <div className="info-row">
              <div className="info-left">
                <div className="info-k">Nome</div>
                <div className="info-v">{name}</div>
              </div>
              <Link to="/editar-perfil#nome" className="info-action">
                Alterar
              </Link>
            </div>
            <div className="info-row">
              <div className="info-left">
                <div className="info-k">E-mail</div>
                <div className="info-v">{maskedEmail}</div>
              </div>
              <Link to="/editar-perfil#email" className="info-action">
                Alterar
              </Link>
            </div>
            <div className="info-row">
              <div className="info-left">
                <div className="info-k">Escola</div>
                <div className="info-v">{school}</div>
              </div>
              <Link to="/editar-perfil#escola" className="info-action">
                Alterar
              </Link>
            </div>
            <div className="info-row">
              <div className="info-left">
                <div className="info-k">Avatar</div>
                <div className="info-v">Avatar com iniciais gerado a partir do seu nome</div>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text3)', fontStyle: 'italic', paddingRight: '12px' }}>Automático</span>
            </div>
            <div className="info-row">
              <div className="info-left">
                <div className="info-k">Senha</div>
                <div className="info-v">••••••••</div>
              </div>
              <Link to="/editar-perfil#senha" className="info-action">
                Alterar
              </Link>
            </div>
          </div>
        </div>

        <div className="perfil-col">
          <div className="section-label anim anim-d3">Preferências</div>
          <div className="card anim anim-d3" style={{ padding: '0 1.25rem', marginBottom: '1.25rem' }}>
            
            <Link to="/aparencia" className="settings-item">
              <div className="settings-left">
                <div className="settings-icon" aria-hidden="true">
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                  </svg>
                </div>
                <div className="settings-name">Aparência</div>
              </div>
              <div className="settings-chevron" aria-hidden="true">
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>
              </div>
            </Link>

            <Link to="/sobre" className="settings-item">
              <div className="settings-left">
                <div className="settings-icon" aria-hidden="true">
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div className="settings-name">Sobre o Ápice</div>
              </div>
              <div className="settings-chevron" aria-hidden="true">
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>
              </div>
            </Link>
          </div>

          <div className="section-label anim anim-d4">IA</div>
          <form className="card anim anim-d4 ai-pref-card" onSubmit={handleAiPreferenceSave}>
            <div className="card-title">Preferências de resposta</div>
            <div className="ai-pref-help">
              Se apresente e diga como a IA deve responder, com foco em tom, clareza e explicação. Exemplo: responda em linguagem simples e objetiva.
            </div>

            <textarea
              className="textarea-field ai-pref-box"
              value={aiPreference}
              maxLength={AI_RESPONSE_PREFERENCE_MAX_LENGTH}
              onChange={(event) => {
                setAiPreference(event.target.value)
                setAiPreferenceMsg('')
              }}
              placeholder={DEFAULT_AI_RESPONSE_PREFERENCE}
              rows={3}
            />

            <div className="ai-pref-row">
              <div className="ai-pref-count">
                {aiPreference.trim().length}/{AI_RESPONSE_PREFERENCE_MAX_LENGTH} caracteres
              </div>
              <button className="btn-primary ai-pref-save" type="submit" disabled={aiPreferenceSaving}>
                {aiPreferenceSaving ? 'Salvando...' : 'Salvar preferência'}
              </button>
            </div>

            <div className="ai-pref-warning">
              Sistema anti-sequestro: instruções para mudar nota, burlar critérios, responder em uma palavra, ou ignorar a correção serão descartadas.
            </div>

            {aiPreferenceMsg && (
              <div className="ai-pref-msg" aria-live="polite">
                {aiPreferenceMsg}
              </div>
            )}
          </form>

          <div className="card anim anim-d4" style={{ padding: '0 1.25rem', marginBottom: '1.25rem' }}>
            <Link to="/historico-redacoes" className="settings-item">
              <div className="settings-left">
                <div className="settings-icon" aria-hidden="true">
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div className="settings-name">Histórico de redações</div>
              </div>
              <div className="settings-chevron" aria-hidden="true">
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>
              </div>
            </Link>
          </div>

          <div className="section-label anim anim-d4">Uso de IA</div>
          <div className="card anim anim-d4 quota-card" style={{ marginBottom: '1.25rem' }}>
            <div className="quota-head">
              <div>
                <div className="quota-title">Cota diária manual</div>
                <div className="quota-subtitle">
                  {MANUAL_AI_DAILY_LIMIT} solicitações por dia. Tema dinâmico, correção, radar e chamadas diretas entram na mesma conta.
                </div>
              </div>
              <div className={`quota-plan-badge ${planTier === 'pro' ? 'pro' : 'free'}`}>
                {planTier === 'free' ? 'Plano free' : 'Plano pro'}
              </div>
            </div>

            <div className="quota-main">
              <div className="quota-main-count">
                {quotaRow.used}<span>/{quotaRow.limit}</span>
              </div>
              <div className="quota-main-label">
                Solicitações manuais usadas hoje
              </div>
            </div>

            <div className="quota-bar quota-bar--big" aria-hidden="true">
              <div className="quota-bar-fill" style={{ width: `${quotaRow.percent}%` }} />
            </div>

            <div className="quota-meta">
              {quotaRow.blocked
                ? 'Limite diário atingido.'
                : `${quotaRow.remaining} solicitação(ões) manual(ais) restantes hoje.`}
            </div>

            <div className="quota-breakdown">
              {quotaRow.breakdown.map((row) => (
                <div className="quota-breakdown-item" key={row.key}>
                  <span>{row.label}</span>
                  <strong>{row.used}</strong>
                </div>
              ))}
            </div>

            <div className="quota-footnote">
              Resumos automáticos não consomem essa cota. O botão de compra do Pro entra aqui depois.
            </div>
          </div>

          <button
            className="logout-btn anim anim-d4"
            type="button"
            onClick={handleLogout}
          >
            Sair da conta
          </button>
        </div>
      </div>
    </>
  )
}

const perfilCss = `
  .profile-hero {
    background: var(--card-dark);
    border: 1.5px solid var(--border);
    border-radius: 24px;
    padding: 1.5rem;
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 14px;
    position: relative;
    overflow: hidden;
  }

  .profile-hero::after {
    content: '';
    position: absolute;
    top: 14px;
    right: 18px;
    width: 10px;
    height: 10px;
    background: var(--accent);
    clip-path: polygon(50% 0%, 61% 35%, 100% 50%, 61% 65%, 50% 100%, 39% 65%, 0% 50%, 39% 35%);
    opacity: 0.15;
  }

  .profile-avatar {
    width: 62px;
    height: 62px;
    flex-shrink: 0;
    background: var(--accent-dim2);
    border: 1.5px solid rgba(var(--accent-rgb), 0.35);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'DM Serif Display', serif;
    font-size: 1.6rem;
    color: var(--accent);
  }

  .profile-hero-content {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
    flex: 1;
    min-width: 0;
  }

  .profile-name {
    font-family: 'DM Serif Display', serif;
    font-size: 1.45rem;
    color: var(--text);
    letter-spacing: -0.3px;
  }

  .profile-email-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 4px;
  }

  .profile-school {
    font-size: 0.8rem;
    color: var(--text2);
    line-height: 1.45;
    word-break: break-word;
  }

  .profile-email-toggle {
    width: 28px;
    height: 28px;
    border: 1px solid var(--border2);
    background: var(--bg3);
    color: var(--text2);
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: border-color 0.2s, color 0.2s, background 0.2s, transform 0.1s;
    flex-shrink: 0;
  }

  .profile-email-toggle:hover {
    border-color: var(--accent);
    color: var(--accent);
    background: var(--accent-dim);
  }

  .profile-email-toggle:active {
    transform: scale(0.96);
  }

  .profile-email-toggle:disabled {
    cursor: default;
    opacity: 0.5;
    color: var(--text3);
    background: var(--bg3);
    border-color: var(--border);
  }

  .profile-plan {
    display: inline-block;
    margin-top: 6px;
    font-size: 0.65rem;
    font-weight: 500;
    background: var(--bg3);
    border: 1px solid var(--border2);
    border-radius: 20px;
    padding: 3px 10px;
    color: var(--text3);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .stats-row-small { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 1.5rem; }

  .stat-small {
    background: var(--bg2);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 12px 8px;
    text-align: center;
    transition: transform 0.25s;
  }
  .stat-small:hover { transform: translateY(-2px); }
  .stat-small-val { font-family: 'DM Serif Display', serif; font-size: 1.35rem; color: var(--text); }
  .stat-small-lbl { font-size: 0.65rem; color: var(--text3); margin-top: 2px; }

  .logout-btn {
    width: 100%;
    margin-top: 1rem;
    background: transparent;
    border: 1.5px solid rgba(255, 107, 107, 0.25);
    border-radius: var(--radius-sm);
    padding: 12px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.85rem;
    color: var(--red);
    cursor: pointer;
    transition: background 0.2s, transform 0.1s;
    text-decoration: none;
    display: block;
    text-align: center;
  }
  .logout-btn:hover { background: rgba(255, 107, 107, 0.06); }
  .logout-btn:active { transform: scale(0.98); }

  .info-card { padding: 1.25rem; }

  .info-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; }
  .info-row + .info-row { border-top: 0.5px solid var(--border); }

  .info-k { font-size: 0.75rem; color: var(--text3); text-transform: uppercase; letter-spacing: 0.7px; }
  .info-v { font-size: 0.85rem; color: var(--text); margin-top: 3px; }
  .info-left { padding-right: 12px; }

  .info-action {
    background: var(--bg3);
    border: 1.5px solid var(--border2);
    border-radius: 999px;
    padding: 6px 12px;
    font-size: 0.8rem;
    color: var(--text2);
    cursor: pointer;
    text-decoration: none;
    white-space: nowrap;
    transition: border-color 0.2s, color 0.2s;
  }

  .info-action:hover { border-color: var(--accent); color: var(--text); }

  .quota-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 0.9rem;
  }

  .quota-title {
    font-size: 0.92rem;
    font-weight: 600;
    color: var(--text);
  }

  .quota-subtitle {
    margin-top: 4px;
    font-size: 0.8rem;
    color: var(--text3);
    line-height: 1.5;
  }

  .quota-plan-badge {
    border-radius: 999px;
    padding: 7px 12px;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border: 1px solid var(--border2);
    background: var(--bg3);
    color: var(--text2);
    white-space: nowrap;
  }

  .quota-plan-badge.pro {
    background: rgba(var(--accent-rgb), 0.12);
    border-color: rgba(var(--accent-rgb), 0.26);
    color: var(--accent);
  }

  .quota-main {
    padding: 1rem 0 0.9rem;
  }

  .quota-main-count {
    font-family: 'DM Serif Display', serif;
    font-size: 2rem;
    line-height: 1;
    color: var(--text);
    letter-spacing: -0.3px;
  }

  .quota-main-count span {
    font-family: 'DM Sans', sans-serif;
    font-size: 0.95rem;
    color: var(--text3);
    font-weight: 500;
  }

  .quota-main-label {
    margin-top: 0.35rem;
    font-size: 0.82rem;
    color: var(--text2);
  }

  .quota-bar--big {
    height: 10px;
    background: var(--bg3);
  }

  .quota-breakdown {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-top: 0.9rem;
  }

  .quota-breakdown-item {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 0.85rem 0.95rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    font-size: 0.8rem;
    color: var(--text);
  }

  .quota-breakdown-item strong {
    color: var(--accent);
    font-size: 0.85rem;
  }

  .quota-bar-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 999px;
  }

  .quota-meta {
    margin-top: 0.45rem;
    font-size: 0.78rem;
    color: var(--text3);
  }

  .quota-footnote {
    margin-top: 0.95rem;
    font-size: 0.75rem;
    color: var(--text3);
    line-height: 1.5;
  }

  .ai-pref-card {
    padding: 1.25rem;
    margin-bottom: 1.25rem;
  }

  .ai-pref-help {
    margin-top: 0.4rem;
    font-size: 0.8rem;
    color: var(--text3);
    line-height: 1.55;
  }

  .ai-pref-box {
    margin-top: 0.85rem;
    min-height: 88px;
    resize: vertical;
    line-height: 1.6;
  }

  .ai-pref-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 0.85rem;
    flex-wrap: wrap;
  }

  .ai-pref-count {
    font-size: 0.75rem;
    color: var(--text3);
  }

  .ai-pref-save {
    width: auto;
    min-width: 180px;
    box-shadow: 0 12px 24px rgba(var(--accent-rgb), 0.16);
  }

  .ai-pref-warning {
    margin-top: 0.8rem;
    padding: 10px 12px;
    border-radius: 14px;
    background: var(--bg3);
    border: 1px solid var(--border);
    color: var(--text2);
    font-size: 0.76rem;
    line-height: 1.5;
  }

  .ai-pref-msg {
    margin-top: 0.75rem;
    font-size: 0.78rem;
    color: var(--accent);
    line-height: 1.45;
  }

  .pwa-hint {
    margin-top: 8px;
    font-size: 0.74rem;
    color: var(--text3);
    line-height: 1.45;
    text-align: left;
    max-width: 280px;
  }

  .pwa-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    background: rgba(200, 240, 96, 0.08);
    border: 1px solid rgba(200, 240, 96, 0.25);
    border-radius: 999px;
    padding: 5px 12px;
    font-size: 0.72rem;
    font-weight: 500;
    color: var(--accent);
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: background 0.2s, transform 0.1s;
    align-self: flex-start;
  }

  .pwa-btn:hover { background: rgba(200, 240, 96, 0.15); }
  .pwa-btn:active { transform: scale(0.97); }
  .pwa-btn:disabled {
    cursor: default;
    opacity: 0.75;
    transform: none;
  }

  @media (max-width: 560px) {
    .quota-head {
      flex-direction: column;
    }

    .quota-plan-badge {
      width: fit-content;
    }

    .quota-breakdown {
      grid-template-columns: 1fr;
    }

    .ai-pref-save {
      width: 100%;
      min-width: 0;
    }
  }
`
