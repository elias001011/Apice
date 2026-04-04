import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import {
  AI_RESPONSE_PREFERENCE_MAX_LENGTH,
  AI_RESPONSE_PREFERENCE_PLACEHOLDER,
  loadAiResponsePreferenceText,
  saveAiResponsePreference,
  subscribeAiResponsePreference,
} from '../services/aiResponsePreferences.js'
import {
  AVATAR_ACCENT_OPTIONS,
  DEFAULT_AVATAR_SETTINGS,
  loadAvatarSettings,
  resolveAvatarAppearance,
  saveAvatarSettings,
  subscribeAvatarSettings,
} from '../services/avatarSettings.js'
import { buildEssayInsights, loadEssayHistory, subscribeEssayHistory } from '../services/essayInsights.js'
import {
  getCurrentBillingStatus,
  getCurrentAiDailyLimit,
  PAID_AI_DAILY_LIMIT,
  getFreePlanUsageRows,
  subscribeFreePlanUsage,
} from '../services/freePlanUsage.js'
import {
  getBillingStatusLabel,
  TRIAL_DAYS,
} from '../services/billingState.js'
import { usePwaInstall } from '../pwa/usePwaInstall.js'
import { useTheme } from '../theme/ThemeProvider.jsx'
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx'
import { AvatarVisual } from '../ui/AvatarVisual.jsx'

const perfilCss = `
  .profile-hero {
    background: var(--bg2);
    border: 1.5px solid var(--border);
    border-radius: 28px;
    padding: 1.75rem;
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 20px;
    position: relative;
    overflow: hidden;
  }

  .profile-avatar {
    width: 68px;
    height: 68px;
    flex-shrink: 0;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .profile-hero-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }

  .profile-name {
    font-family: 'DM Serif Display', serif;
    font-size: 1.6rem;
    color: var(--text);
  }

  .profile-email-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .profile-school {
    font-size: 0.85rem;
    color: var(--text2);
    opacity: 0.8;
  }

  .profile-email-toggle {
    background: none;
    border: none;
    padding: 0;
    color: var(--accent);
    cursor: pointer;
    display: flex;
    opacity: 0.7;
    transition: opacity 0.2s;
  }

  .profile-email-toggle:hover { opacity: 1; }

  .profile-badges-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 8px;
    flex-wrap: nowrap; /* Garante lado a lado */
  }

  .profile-plan {
    font-size: 0.65rem;
    font-weight: 700;
    background: var(--accent-dim);
    color: var(--accent);
    padding: 4px 10px;
    border-radius: 8px;
    text-transform: uppercase;
  }

  .pwa-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    background: var(--bg3);
    border: 1px solid var(--border);
    color: var(--text2);
    padding: 4px 10px;
    border-radius: 8px;
    font-size: 0.65rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .pwa-btn:hover:not(:disabled) {
    border-color: var(--accent);
    color: var(--accent);
  }

  .stats-row-small { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 2rem; }

  .stat-small {
    background: var(--bg3);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 1rem;
    text-align: center;
  }

  .stat-small-val { font-family: 'DM Serif Display', serif; font-size: 1.5rem; color: var(--text); }
  .stat-small-lbl { font-size: 0.7rem; color: var(--text3); font-weight: 600; text-transform: uppercase; margin-top: 4px; }

  .perfil-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    align-items: start;
  }

  .info-card { padding: 0.5rem 1.25rem; }
  .info-row { display: flex; align-items: center; justify-content: space-between; padding: 1.15rem 0; }
  .info-row + .info-row { border-top: 1px solid var(--border); }
  .info-k { font-size: 0.75rem; color: var(--text3); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
  .info-v { font-size: 0.95rem; color: var(--text); margin-top: 2px; }
  .info-action { font-size: 0.8rem; color: var(--accent); font-weight: 600; text-decoration: none; }

  .settings-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.15rem 0;
    text-decoration: none;
    color: var(--text);
  }

  .settings-item + .settings-item { border-top: 1px solid var(--border); }

  .settings-left { display: flex; align-items: center; gap: 12px; }
  .settings-icon { 
    width: 32px; 
    height: 32px; 
    background: var(--bg2); 
    border: 1px solid var(--border); 
    border-radius: 10px; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    color: var(--text2);
  }
  .settings-name { font-size: 0.95rem; font-weight: 500; }
  .settings-chevron { color: var(--text3); opacity: 0.5; }

  /* AI Pref Card Cleanup */
  .ai-pref-card { padding: 1.5rem; }
  .ai-pref-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
  .ai-pref-badge { font-size: 0.65rem; font-weight: 700; padding: 4px 10px; border-radius: 8px; text-transform: uppercase; background: var(--bg3); color: var(--text3); }
  .ai-pref-badge.active { background: var(--accent-dim); color: var(--accent); }

  .ai-pref-box {
    width: 100%;
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 1rem;
    font-size: 0.9rem;
    color: var(--text);
    margin-bottom: 1rem;
    transition: border-color 0.2s;
    resize: none;
  }
  .ai-pref-box:focus { border-color: var(--accent); outline: none; }

  .ai-pref-warning {
    font-size: 0.7rem;
    color: var(--text3);
    line-height: 1.5;
    background: var(--bg3);
    padding: 10px 12px;
    border-radius: 12px;
    border-left: 3px solid var(--accent);
    margin-bottom: 1rem;
  }

  .ai-pref-row { 
    display: flex; 
    align-items: center; 
    justify-content: space-between;
    gap: 1rem; 
    width: 100%;
  }
  
  .ai-save-btn {
    width: auto !important;
    padding: 8px 20px !important;
    font-size: 0.8rem !important;
    opacity: 0.9;
  }

  .ai-pref-count {
    font-size: 0.72rem;
    color: var(--text3);
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  /* Quota Card Cleanup */
  .quota-card { padding: 1.5rem; }
  .quota-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1.25rem; }
  .quota-title { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text3); }
  .quota-subtitle { font-size: 0.8rem; color: var(--text2); margin-top: 4px; line-height: 1.4; max-width: 240px; }
  .quota-head-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
    margin-left: 12px;
  }
  .quota-plan-badge { font-size: 0.65rem; font-weight: 700; padding: 4px 10px; border-radius: 8px; text-transform: uppercase; background: var(--bg3); color: var(--text3); }
  .quota-plan-badge.pro { background: var(--accent); color: #000; }
  .quota-help-btn {
    border: 1px solid var(--border);
    background: var(--bg3);
    color: var(--text2);
    font-size: 0.72rem;
    font-weight: 700;
    padding: 7px 12px;
    border-radius: 999px;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }
  .quota-help-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
    background: var(--bg2);
  }

  /* Meu Plano Card */
  .meu-plano-card {
    padding: 1.25rem 1.5rem;
    margin-bottom: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .meu-plano-left {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .meu-plano-label {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--text3);
    letter-spacing: 0.07em;
  }

  .meu-plano-tier {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .meu-plano-tier-badge {
    font-size: 0.6rem;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 6px;
    text-transform: uppercase;
    background: var(--bg3);
    color: var(--text3);
  }

  .meu-plano-tier-badge.pro {
    background: var(--accent);
    color: #0f0f0f;
  }

  .meu-plano-quota {
    font-size: 0.78rem;
    color: var(--text2);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .meu-plano-bar {
    height: 5px;
    width: 80px;
    background: var(--bg3);
    border-radius: 999px;
    overflow: hidden;
    flex-shrink: 0;
  }

  .meu-plano-bar-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 999px;
    transition: width 0.4s ease;
  }

  .meu-plano-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 9px 18px;
    background: var(--accent);
    color: #0f0f0f;
    border-radius: 12px;
    font-size: 0.82rem;
    font-weight: 700;
    text-decoration: none;
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .meu-plano-btn:hover {
    background: var(--accent2);
    transform: translateY(-1px);
  }

  .quota-main { margin-bottom: 0.5rem; }
  .quota-main-count { font-family: 'DM Serif Display', serif; font-size: 2.5rem; color: var(--text); }
  .quota-main-count span { font-family: 'DM Sans', sans-serif; font-size: 1rem; opacity: 0.5; }

  .quota-bar { height: 8px; background: var(--bg2); border-radius: 10px; overflow: hidden; }
  .quota-bar-fill { height: 100%; background: var(--accent); }
  .quota-meta { font-size: 0.8rem; color: var(--text3); margin-top: 8px; font-weight: 500; }

  .quota-breakdown { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 1.25rem; }
  .quota-breakdown-item { background: var(--bg3); padding: 10px 12px; border-radius: 12px; display: flex; justify-content: space-between; font-size: 0.75rem; }
  .quota-breakdown-item strong { color: var(--accent); }

  /* Avatar Card Cleanup */
  .avatar-card { padding: 1.5rem; }
  .avatar-card-top { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem; }
  .avatar-preview { width: 56px; height: 56px; border-radius: 50%; overflow: hidden; }
  .avatar-card-text { font-size: 0.8rem; color: var(--text3); margin-top: 2px; }

  .avatar-mode-row { 
    display: flex; 
    gap: 4px; 
    background: var(--bg3); 
    padding: 4px; 
    border-radius: 12px; 
    margin-bottom: 1.25rem; 
    border: 1px solid var(--border);
  }
  .avatar-mode-btn { 
    flex: 1; 
    padding: 8px; 
    border-radius: 8px; 
    border: none; 
    background: transparent; 
    color: var(--text2); 
    font-size: 0.8rem; 
    font-weight: 600; 
    cursor: pointer; 
    transition: all 0.2s;
  }
  .avatar-mode-btn.active { 
    background: var(--bg2); 
    color: var(--accent); 
    box-shadow: 0 2px 8px rgba(0,0,0,0.1); 
  }

  .avatar-color-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 1rem; }
  .avatar-color-btn { width: 28px; height: 28px; border-radius: 50%; border: 2px solid transparent; background: var(--bg3); padding: 0; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .avatar-color-btn.active { border-color: var(--accent); }
  .avatar-color-swatch { width: 18px; height: 18px; border-radius: 50%; border: 1px solid rgba(0,0,0,0.1); }

  /* Avatar Color Swatches */
  .avatar-color-swatch[data-accent="theme"] { background: var(--accent); }
  .avatar-color-swatch[data-accent="lime"] { background: #b8e84f; }
  .avatar-color-swatch[data-accent="blue"] { background: #4faaf0; }
  .avatar-color-swatch[data-accent="purple"] { background: #a84ff0; }
  .avatar-color-swatch[data-accent="orange"] { background: #f09a4f; }
  .avatar-color-swatch[data-accent="red"] { background: #f04f4f; }
  .avatar-color-swatch[data-accent="cyan"] { background: #4ff0d6; }
  .avatar-color-swatch[data-accent="pink"] { background: #f04fbc; }

  .avatar-actions { display: flex; gap: 8px; }
  .avatar-msg { font-size: 0.75rem; color: var(--accent); margin-top: 8px; text-align: center; }

  .logout-btn {
    width: 100%;
    background: none;
    border: 1.5px solid rgba(255, 100, 100, 0.2);
    color: var(--red);
    padding: 1rem;
    border-radius: 16px;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  .logout-btn:hover { background: rgba(255, 100, 100, 0.05); border-color: var(--red); }
  .logout-btn.danger {
    margin-top: 12px;
    border-color: rgba(225, 68, 68, 0.26);
    color: var(--red);
  }
  .logout-btn.danger:hover {
    background: rgba(225, 68, 68, 0.08);
    border-color: var(--red);
  }

  .account-danger-msg {
    margin-top: 10px;
    color: var(--red);
    font-size: 0.8rem;
    line-height: 1.5;
  }

  @media (max-width: 768px) {
    .perfil-grid { grid-template-columns: 1fr; }
    .profile-hero { flex-direction: column; text-align: center; padding: 2rem; }
    .profile-email-row, .profile-badges-row { justify-content: center; }
    .quota-head { flex-direction: column; gap: 12px; }
    .quota-head-right { align-items: flex-start; margin-left: 0; }
    .quota-subtitle { max-width: none; }
  }
`

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

const DELETION_CONTACT_EMAIL = 'elias.juratti@outlook.com'

function buildDeletionRequestMailto({ name, email }) {
  const subject = encodeURIComponent('Solicitação de exclusão de conta')
  const body = encodeURIComponent(
    [
      'Olá, equipe do Ápice.',
      '',
      'Quero solicitar a exclusão permanente da minha conta.',
      '',
      `Nome: ${String(name ?? 'Usuário').trim() || 'Usuário'}`,
      `E-mail da conta: ${String(email ?? '').trim() || 'Não informado'}`,
      '',
      'Por favor, confirmem o procedimento e me avisem quando a exclusão for concluída.',
      '',
      'Obrigado(a).',
    ].join('\n'),
  )

  return `mailto:${DELETION_CONTACT_EMAIL}?subject=${subject}&body=${body}`
}

export function PerfilPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { canInstall: pwaCanInstall, isInstalled: pwaInstalled, installPwa } = usePwaInstall()
  const { theme, accent } = useTheme()
  const isMountedRef = useRef(true)
  const [usageRows, setUsageRows] = useState(getFreePlanUsageRows())
  const [insights, setInsights] = useState(() => buildEssayInsights(loadEssayHistory()))
  const [showEmail, setShowEmail] = useState(false)
  const [aiPreference, setAiPreference] = useState(() => loadAiResponsePreferenceText())
  const [aiPreferenceSaving, setAiPreferenceSaving] = useState(false)
  const [aiPreferenceMsg, setAiPreferenceMsg] = useState('')
  const [avatarSettings, setAvatarSettingsState] = useState(() => loadAvatarSettings())
  const [avatarDraft, setAvatarDraft] = useState(() => loadAvatarSettings())
  const [avatarSaving, setAvatarSaving] = useState(false)
  const [avatarMsg, setAvatarMsg] = useState('')
  const [pwaHint, setPwaHint] = useState('')
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)
  const [logoutLoading, setLogoutLoading] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const [avatarResetDialogOpen, setAvatarResetDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [quotaHelpDialogOpen, setQuotaHelpDialogOpen] = useState(false)

  const name = user?.user_metadata?.full_name || 'Usuário'
  const email = user?.email || 'Sem e-mail'
  const maskedEmail = maskEmail(email)
  const visibleEmail = showEmail ? email : maskedEmail
  const hasAiPreference = Boolean(aiPreference.trim())
  const aiPreferenceCount = aiPreference.length
  const school = user?.user_metadata?.school || 'Não informada'
  const avatarAppearance = resolveAvatarAppearance({
    name,
    settings: avatarSettings,
    theme,
    accent,
  })
  const avatarDraftAppearance = resolveAvatarAppearance({
    name,
    settings: avatarDraft,
    theme,
    accent,
  })
  const quotaRow = usageRows[0] || {
    used: 0,
    limit: getCurrentAiDailyLimit(),
    remaining: getCurrentAiDailyLimit(),
    percent: 0,
    blocked: false,
    breakdown: [],
  }
  const billingStatus = getCurrentBillingStatus()
  const billingStatusLabel = getBillingStatusLabel(billingStatus)

  const quotaHelpMessage = [
    'Cada vez que o app precisa gerar um resultado novo com IA, 1 uso é consumido.',
    '',
    'Conta gratuita: 5 usos por dia.',
    `Conta paga ou teste grátis ativo: ${PAID_AI_DAILY_LIMIT} usos por dia.`,
    '',
    'Cada um destes pontos conta como 1 uso quando você:',
    '- gera um tema dinâmico',
    '- corrige uma redação',
    '- faz uma chamada direta de IA',
    '- procura novos temas no Radar 1000',
    '- abre "Ver detalhes" em um tema que ainda não está salvo na sua conta',
    '- deixa o app atualizar o resumo automático do seu desempenho',
    '',
    'Não conta quando o conteúdo já existe salvo localmente ou na sua conta e o app só reapresenta esse dado.',
    'A contagem zera automaticamente na virada do dia no seu navegador.',
    '',
    `O teste grátis dura ${TRIAL_DAYS} dias e só pode ser usado uma vez por conta.`,
    'Se você mudar de conta, o cache daquela conta muda junto. Se o detalhe do radar ou outro resultado não estiver salvo nessa conta, o app precisa gerar de novo e isso volta a consumir cota.',
  ].join('\n')

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

  const handleLogoutRequest = () => {
    setLogoutError('')
    setLogoutDialogOpen(true)
  }

  const handleLogout = async () => {
    setLogoutError('')
    setLogoutLoading(true)

    try {
      await logout()
      if (isMountedRef.current) {
        setLogoutDialogOpen(false)
        navigate('/login', { replace: true })
      }
    } catch (err) {
      console.error('Logout error:', err)
      if (isMountedRef.current) {
        setLogoutError(err?.message || 'Não foi possível sair agora.')
      }
    } finally {
      if (isMountedRef.current) {
        setLogoutLoading(false)
      }
    }
  }

  const handleAvatarResetRequest = () => {
    setAvatarResetDialogOpen(true)
  }

  const handleAvatarReset = () => {
    setAvatarMsg('')
    const reset = saveAvatarSettings({
      ...DEFAULT_AVATAR_SETTINGS,
      updatedAt: new Date().toISOString(),
    })
    if (reset) {
      setAvatarSettingsState(reset)
      setAvatarDraft(reset)
      setAvatarMsg('Avatar restaurado para o padrão.')
    }
    setAvatarResetDialogOpen(false)
  }

  const handleRequestAccountDeletionEmail = () => {
    if (typeof window === 'undefined') return

    setDeleteDialogOpen(false)
    window.location.href = buildDeletionRequestMailto({ name, email })
  }

  useEffect(() => {
    isMountedRef.current = true

    // Esse painel é local, então ele reage aos eventos do próprio navegador.
    // Quando qualquer tela consumir IA, os números aqui sobem sem precisar recarregar.
    const refresh = () => {
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
    const refreshAvatar = () => {
      const stored = loadAvatarSettings()
      setAvatarSettingsState(stored)
      setAvatarDraft(stored)
    }
    refreshAvatar()
    const unlistenAvatar = subscribeAvatarSettings(refreshAvatar)

    return () => {
      unlistenUsage()
      unlistenInsights()
      unlistenAiPreference()
      unlistenAvatar()
    }
  }, [])

  useEffect(() => {
    return () => {
      isMountedRef.current = false
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

      setAiPreference('')
      setAiPreferenceMsg('Preferência removida. A IA voltou ao padrão do sistema.')
    } finally {
      setAiPreferenceSaving(false)
    }
  }

  const handleAvatarSave = async (event) => {
    event.preventDefault()
    setAvatarMsg('')
    setAvatarSaving(true)
    await Promise.resolve()

    try {
      const normalizedDraft = {
        mode: avatarDraft.mode === 'image' ? 'image' : 'initials',
        accent: AVATAR_ACCENT_OPTIONS.some((option) => option.key === avatarDraft.accent) ? avatarDraft.accent : 'theme',
        imageUrl: avatarDraft.imageUrl,
      }

      if (normalizedDraft.mode === 'image' && !String(normalizedDraft.imageUrl ?? '').trim()) {
        setAvatarMsg('Cole um link de imagem válido antes de salvar no modo imagem.')
        return
      }

      const saved = saveAvatarSettings(normalizedDraft)
      if (saved) {
        setAvatarSettingsState(saved)
        setAvatarDraft(saved)
        setAvatarMsg('Avatar salvo e sincronizado na nuvem.')
      }
    } finally {
      setAvatarSaving(false)
    }
  }

  return (
    <>
      <style>{perfilCss}</style>

      <div className="view-container">
        <div className="profile-hero anim anim-d1">
        <div className="profile-avatar" style={avatarAppearance.palette} title={avatarAppearance.summary}>
          <AvatarVisual
            key={`${avatarAppearance.mode}|${avatarAppearance.accent}|${avatarAppearance.imageUrl}|${avatarAppearance.updatedAt}`}
            appearance={avatarAppearance}
          />
        </div>
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
          <div className="profile-badges-row">
            <div className="profile-plan">{billingStatus === 'free' ? 'Plano gratuito' : billingStatus === 'trial' ? 'Teste grátis' : 'Plano pago'}</div>
            <button className="pwa-btn" type="button" onClick={handleInstallPwa} disabled={pwaInstalled}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v13M7 11l5 5 5-5" />
                <path d="M3 18h18" />
              </svg>
              {pwaInstalled ? 'PWA instalado' : 'Instalar'}
            </button>
          </div>
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

      {/* ── MEU PLANO ── */}
      <div className="section-label anim anim-d2" style={{ marginTop: '1rem' }}>Meu Plano</div>
      <div className="card meu-plano-card anim anim-d2">
        <div className="meu-plano-left">
          <div className="meu-plano-label">Plano Atual</div>
          <div className="meu-plano-tier">
            {billingStatus === 'free' ? 'Gratuito' : billingStatus === 'trial' ? 'Teste grátis' : 'Pago'}
            <span className={`meu-plano-tier-badge ${billingStatus === 'free' ? '' : 'pro'}`}>
              {billingStatus === 'free' ? 'Free' : billingStatus === 'trial' ? 'Trial' : 'Pago'}
            </span>
          </div>
          {billingStatus === 'free' && (
            <div className="meu-plano-quota">
              <div className="meu-plano-bar">
                <div
                  className="meu-plano-bar-fill"
                  style={{ width: `${quotaRow.percent}%`, background: quotaRow.blocked ? 'var(--red)' : 'var(--accent)' }}
                />
              </div>
              <span style={{ color: quotaRow.blocked ? 'var(--red)' : undefined }}>
                {quotaRow.used}/{quotaRow.limit} usos de IA hoje
              </span>
            </div>
          )}
        </div>
        {billingStatus === 'free' ? (
          <Link to="/planos" className="meu-plano-btn">
            Ver planos
          </Link>
        ) : (
          <Link to="/planos" className="meu-plano-btn" style={{ background: 'var(--bg3)', color: 'var(--accent)', border: '1.5px solid var(--accent)' }}>
            Gerenciar plano
          </Link>
        )}
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
                <div className="info-k">Senha</div>
                <div className="info-v">••••••••</div>
              </div>
              <Link to="/editar-perfil#senha" className="info-action">
                Alterar
              </Link>
            </div>
          </div>

          <div className="section-label anim anim-d3">Aparência e Redações</div>
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

        </div>

        <div className="perfil-col">
          <div className="section-label anim anim-d4" id="avatar" style={{ marginTop: '0.5rem' }}>Perfil Visual</div>
          <form className="card anim anim-d4 avatar-card" onSubmit={handleAvatarSave} style={{ marginBottom: '1.25rem' }}>
            <div className="avatar-card-top">
              <div className="avatar-preview" style={avatarDraftAppearance.palette}>
                <AvatarVisual
                  key={`${avatarDraftAppearance.mode}|${avatarDraftAppearance.accent}|${avatarDraftAppearance.imageUrl}|${avatarDraftAppearance.updatedAt}`}
                  appearance={avatarDraftAppearance}
                />
              </div>
              <div className="avatar-card-copy">
                <div className="card-title">Avatar</div>
                <div className="avatar-card-text">
                  Customize sua identidade visual no Ápice.
                </div>
              </div>
            </div>

            <div className="avatar-mode-row">
              <button
                type="button"
                className={`avatar-mode-btn${avatarDraft.mode !== 'image' ? ' active' : ''}`}
                onClick={() => setAvatarDraft((current) => ({ ...current, mode: 'initials', imageUrl: '' }))}
              >
                Iniciais
              </button>
              <button
                type="button"
                className={`avatar-mode-btn${avatarDraft.mode === 'image' ? ' active' : ''}`}
                onClick={() => setAvatarDraft((current) => ({ ...current, mode: 'image' }))}
              >
                Imagem
              </button>
            </div>

            {avatarDraft.mode !== 'image' ? (
              <div className="avatar-color-grid">
                {AVATAR_ACCENT_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className={`avatar-color-btn${avatarDraft.accent === option.key ? ' active' : ''}`}
                    onClick={() => setAvatarDraft((current) => ({ ...current, accent: option.key }))}
                    title={option.label}
                  >
                    <span className="avatar-color-swatch" data-accent={option.key} aria-hidden="true" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="input-group" style={{ marginTop: '0.85rem' }}>
                <input
                  className="input-field"
                  type="url"
                  value={avatarDraft.imageUrl || ''}
                  onChange={(event) => setAvatarDraft((current) => ({ ...current, imageUrl: event.target.value }))}
                  placeholder="https://exemplo.com/avatar.jpg"
                  autoComplete="off"
                  inputMode="url"
                />
              </div>
            )}

            <div className="avatar-actions" style={{ marginTop: '1.25rem' }}>
              <button className="btn-primary" type="submit" disabled={avatarSaving} style={{ width: 'auto', padding: '10px 24px', fontSize: '0.85rem' }}>
                {avatarSaving ? 'Gravando...' : 'Salvar Alterações'}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={handleAvatarResetRequest}
                title="Restaurar padrão"
                aria-label="Restaurar avatar padrão"
                style={{ width: '40px', height: '40px', padding: 0, justifyContent: 'center', borderRadius: '10px' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              </button>
            </div>
            {avatarMsg && <div className="avatar-msg">{avatarMsg}</div>}
          </form>

          <div className="section-label anim anim-d4">Personalização da IA</div>
          <form className="card anim anim-d4 ai-pref-card" onSubmit={handleAiPreferenceSave} style={{ marginBottom: '1.25rem' }}>
            <div className="ai-pref-top" style={{ marginBottom: '0.75rem' }}>
              <div className="card-title" style={{ margin: 0 }}>Instruções</div>
              <div className={`ai-pref-badge ${hasAiPreference ? 'active' : 'idle'}`}>
                {hasAiPreference ? 'Ativa' : 'Padrão'}
              </div>
            </div>

            <textarea
              id="ai-response-preference"
              className="textarea-field ai-pref-box"
              value={aiPreference}
              maxLength={AI_RESPONSE_PREFERENCE_MAX_LENGTH}
              onChange={(event) => {
                setAiPreference(event.target.value)
                setAiPreferenceMsg('')
              }}
              placeholder={AI_RESPONSE_PREFERENCE_PLACEHOLDER}
              rows={4}
              style={{ minHeight: '120px', marginBottom: '0.85rem' }}
            />

            <div className="ai-pref-warning">
              Ajuste de tom e clareza. Pedidos para mudar nota ou burlar critérios são ignorados.
            </div>

            <div className="ai-pref-row" style={{ marginTop: '1rem' }}>
              <div className="ai-pref-count" aria-live="polite">
                {aiPreferenceCount}/{AI_RESPONSE_PREFERENCE_MAX_LENGTH}
              </div>
              <button className="btn-primary ai-save-btn" type="submit" disabled={aiPreferenceSaving}>
                {aiPreferenceSaving ? 'Salvando...' : 'Salvar Preferências'}
              </button>
            </div>
            {aiPreferenceMsg && <div className="avatar-msg" style={{ marginTop: '8px', textAlign: 'center' }}>{aiPreferenceMsg}</div>}
          </form>

          <div className="section-label anim anim-d4">Uso de IA hoje</div>
          <div className="card anim anim-d4 quota-card" style={{ marginBottom: '1.25rem' }}>
            <div className="quota-head">
              <div>
                <div className="quota-title">Cota diária de IA</div>
                <div className="quota-subtitle">
                  {quotaRow.limit} solicitações por dia. Conte 1 uso sempre que a IA gerar um resultado novo.
                </div>
              </div>
              <div className="quota-head-right">
                <div className={`quota-plan-badge ${billingStatus === 'free' ? 'free' : 'pro'}`}>
                  {billingStatusLabel}
                </div>
                <button
                  type="button"
                  className="quota-help-btn"
                  onClick={() => setQuotaHelpDialogOpen(true)}
                >
                  Como sua cota é consumida?
                </button>
              </div>
            </div>

            <div className="quota-main">
              <div className="quota-main-count" style={{ color: quotaRow.blocked ? 'var(--red)' : 'var(--accent)' }}>
                {quotaRow.used}<span style={{ color: quotaRow.blocked ? 'inherit' : '' }}>/{quotaRow.limit}</span>
                {quotaRow.blocked && (
                  <span className="quota-alert" title="Limite atingido" style={{ color: 'var(--red)', fontSize: '1rem', marginLeft: '8px', verticalAlign: 'middle', display: 'inline-flex', alignItems: 'center' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    <span style={{ fontSize: '0.85rem', marginLeft: '4px', fontWeight: 600 }}>Limite atingido!</span>
                  </span>
                )}
              </div>
            </div>

            <div className="quota-bar quota-bar--big" aria-hidden="true">
              <div className="quota-bar-fill" style={{ width: `${quotaRow.percent}%` }} />
            </div>

            <div className="quota-meta">
              {quotaRow.blocked
                ? 'Limite diário atingido.'
                : `${quotaRow.remaining} solicitações restantes.`}
            </div>

            <div className="quota-breakdown">
              {quotaRow.breakdown.map((row) => (
                <div className="quota-breakdown-item" key={row.key}>
                  <span>{row.label}</span>
                  <strong>{row.used}</strong>
                </div>
              ))}
            </div>
          </div>

          <button
            className="logout-btn anim anim-d4"
            type="button"
            onClick={handleLogoutRequest}
          >
            Sair da minha conta
          </button>

          <button
            className="logout-btn danger anim anim-d4"
            type="button"
            onClick={() => {
              setDeleteDialogOpen(true)
            }}
            style={{ marginTop: 12 }}
          >
            Solicitar exclusão da conta
          </button>
        </div>
      </div>
    </div>
      <ConfirmDialog
        open={quotaHelpDialogOpen}
        title="Como sua cota é consumida?"
        message={quotaHelpMessage}
        confirmLabel="Entendi"
        cancelLabel="Fechar"
        onConfirm={() => setQuotaHelpDialogOpen(false)}
        onCancel={() => setQuotaHelpDialogOpen(false)}
      />
      <ConfirmDialog
        open={logoutDialogOpen}
        title="Sair da conta?"
        message={
          logoutError
            || 'Isso encerra sua sessão e limpa os dados locais deste navegador. Você poderá entrar novamente quando quiser.'
        }
        confirmLabel={logoutLoading ? 'Saindo...' : 'Sair da conta'}
        cancelLabel="Cancelar"
        danger
        confirmDisabled={logoutLoading}
        onConfirm={handleLogout}
        onCancel={() => {
          if (!logoutLoading) {
            setLogoutDialogOpen(false)
            setLogoutError('')
          }
        }}
      />
      <ConfirmDialog
        open={avatarResetDialogOpen}
        title="Restaurar avatar padrão?"
        message="Isso substitui seu avatar atual pelo padrão do Ápice. Você pode configurar tudo de novo depois."
        confirmLabel="Restaurar"
        cancelLabel="Cancelar"
        onConfirm={handleAvatarReset}
        onCancel={() => setAvatarResetDialogOpen(false)}
      />
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Solicitar exclusão da conta?"
        message={
          'No momento não é possível excluir a conta diretamente pelo app. Para solicitar a exclusão permanente, envie um e-mail para a equipe de desenvolvimento com o texto já pronto.'
        }
        confirmLabel="Abrir e-mail"
        cancelLabel="Fechar"
        danger={false}
        onConfirm={handleRequestAccountDeletionEmail}
        onCancel={() => {
          setDeleteDialogOpen(false)
        }}
      />
    </>
  )
}
