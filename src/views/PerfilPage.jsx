import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import { buildEssayInsights, loadEssayHistory, subscribeEssayHistory } from '../services/essayInsights.js'
import {
  getCurrentPlanTier,
  getFreePlanUsageRows,
  resetFreePlanUsage,
  setPlanTier,
  subscribeFreePlanUsage,
} from '../services/freePlanUsage.js'

export function PerfilPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [planTier, setPlanTierState] = useState(getCurrentPlanTier())
  const [usageRows, setUsageRows] = useState(getFreePlanUsageRows())
  const [insights, setInsights] = useState(() => buildEssayInsights(loadEssayHistory()))
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [pwaInstalled, setPwaInstalled] = useState(false)

  const name = user?.user_metadata?.full_name || 'Usuário'
  const email = user?.email || 'Sem e-mail'
  const school = user?.user_metadata?.school || 'Não informada'

  const getInitial = (n) => (n ? n[0].toUpperCase() : '?')

  // Captura o evento de instalação PWA
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setPwaInstalled(true))
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstallPwa = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setPwaInstalled(true)
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

    return () => {
      unlistenUsage()
      unlistenInsights()
    }
  }, [])

  const handlePlanTierChange = (event) => {
    const nextTier = event.target.value
    setPlanTier(nextTier)
    setPlanTierState(nextTier)
  }

  const handleResetFreeUsage = () => {
    resetFreePlanUsage()
    setUsageRows(getFreePlanUsageRows())
  }

  return (
    <>
      <style>{perfilCss}</style>

      <div className="profile-hero anim anim-d1">
        <div className="profile-avatar">{getInitial(name)}</div>
        <div>
          <div className="profile-name">{name}</div>
          <div className="profile-school">Conta vinculada · {email}</div>
          <div className="profile-plan">{planTier === 'free' ? 'Plano gratuito' : 'Plano pro'}</div>
          {!pwaInstalled && deferredPrompt && (
            <button className="pwa-btn" type="button" onClick={handleInstallPwa}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v13M7 11l5 5 5-5" />
                <path d="M3 18h18" />
              </svg>
              Baixar como PWA
            </button>
          )}
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
                <div className="info-v">{email}</div>
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

          <div className="section-label anim anim-d4">Plano e limites</div>
          <div className="card anim anim-d4" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
            <div className="quota-head">
              <div>
                <div className="quota-title">Cota do plano</div>
                <div className="quota-subtitle">
                  Limites locais para evitar gasto exagerado de IA no plano free.
                </div>
              </div>
              <select className="quota-select" value={planTier} onChange={handlePlanTierChange}>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
              </select>
            </div>

            <div className="quota-note">
              Edita os limites em <code>src/services/freePlanUsage.js</code>.
            </div>

            <div className="quota-grid">
              {usageRows.map(row => (
                <div className="quota-item" key={row.key}>
                  <div className="quota-row">
                    <span>{row.label}</span>
                    <strong>{row.used}/{row.limit}</strong>
                  </div>
                  <div className="quota-bar">
                    <div className="quota-bar-fill" style={{ width: `${row.percent}%` }} />
                  </div>
                  <div className="quota-meta">
                    {row.blocked ? 'Limite atingido hoje' : `${row.remaining} uso(s) restantes hoje`}
                  </div>
                </div>
              ))}
            </div>

            <div className="quota-actions">
              <button type="button" className="quota-reset" onClick={handleResetFreeUsage}>
                Zerar uso de hoje
              </button>
              <div className="quota-flag">
                {planTier === 'free'
                  ? 'Plano free ativo: os limites acima são aplicados.'
                  : 'Plano pro simulado: os limites locais ficam desbloqueados.'}
              </div>
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
    align-items: center;
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

  .profile-name {
    font-family: 'DM Serif Display', serif;
    font-size: 1.45rem;
    color: var(--text);
    letter-spacing: -0.3px;
  }

  .profile-school { font-size: 0.8rem; color: var(--text2); margin-top: 3px; }

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

  .quota-select {
    border: 1px solid var(--border);
    background: var(--bg3);
    color: var(--text);
    border-radius: 12px;
    padding: 8px 10px;
    font-size: 0.8rem;
  }

  .quota-note {
    font-size: 0.78rem;
    color: var(--text3);
    margin-bottom: 0.9rem;
  }

  .quota-grid {
    display: grid;
    gap: 0.85rem;
  }

  .quota-item {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 0.8rem 0.9rem;
  }

  .quota-row {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-size: 0.82rem;
    color: var(--text);
    margin-bottom: 0.55rem;
  }

  .quota-row strong {
    color: var(--accent);
    font-size: 0.8rem;
  }

  .quota-bar {
    height: 8px;
    background: var(--bg3);
    border-radius: 999px;
    overflow: hidden;
  }

  .quota-bar-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 999px;
  }

  .quota-meta {
    margin-top: 0.45rem;
    font-size: 0.72rem;
    color: var(--text3);
  }

  .quota-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 0.9rem;
    flex-wrap: wrap;
  }

  .quota-reset {
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text2);
    border-radius: 999px;
    padding: 8px 12px;
    font-size: 0.8rem;
    cursor: pointer;
  }

  .quota-reset:hover {
    border-color: var(--accent);
    color: var(--text);
  }

  .quota-flag {
    font-size: 0.75rem;
    color: var(--text3);
    line-height: 1.4;
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
  }

  .pwa-btn:hover { background: rgba(200, 240, 96, 0.15); }
  .pwa-btn:active { transform: scale(0.97); }
`
