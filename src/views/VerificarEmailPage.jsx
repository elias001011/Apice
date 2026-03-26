import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'

const RESEND_COOLDOWN = 120 // 2 minutos em segundos

export function VerificarEmailPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { resendConfirmation } = useAuth()

  // Pega o email passado pelo CadastroPage via state
  const email = location.state?.email || ''

  const [countdown, setCountdown] = useState(RESEND_COOLDOWN)
  const [canResend, setCanResend] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendMsg, setResendMsg] = useState('')
  const [resendError, setResendError] = useState('')
  const intervalRef = useRef(null)

  // Se não vier email na rota, redireciona para cadastro
  useEffect(() => {
    if (!email) {
      navigate('/cadastro', { replace: true })
    }
  }, [email, navigate])

  // Contador regressivo
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          setCanResend(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [])

  const handleResend = async () => {
    if (!canResend || resending) return
    setResending(true)
    setResendMsg('')
    setResendError('')
    try {
      await resendConfirmation(email)
      setResendMsg('E-mail de confirmação reenviado com sucesso!')
      setCanResend(false)
      setCountdown(RESEND_COOLDOWN)
      // Reinicia contador
      clearInterval(intervalRef.current)
      intervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current)
            setCanResend(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err) {
      console.error('Resend error:', err)
      setResendError('Não foi possível reenviar. Tente novamente mais tarde.')
    } finally {
      setResending(false)
    }
  }

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <>
      <style>{verifCss}</style>
      <div className="verif-page">
        <div className="verif-glow" aria-hidden="true" />
        <div className="verif-wrap">

          {/* Logo */}
          <div className="verif-logo-wrap anim anim-d1">
            <Link to="/login" className="verif-logo" style={{ textDecoration: 'none' }}>
              <div className="logo-icon" />
            </Link>
          </div>

          <div className="verif-card anim anim-d2">
            {/* Ícone envelope */}
            <div className="verif-envelope">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="3" />
                <polyline points="2,4 12,13 22,4" />
              </svg>
            </div>

            <h1 className="verif-title">Verifique seu e-mail</h1>
            <p className="verif-desc">
              Enviamos um link de confirmação para
            </p>
            <p className="verif-email">{email}</p>
            <p className="verif-desc" style={{ marginTop: '0.5rem' }}>
              Abra o e-mail e clique no link para ativar sua conta. Após confirmar, você será redirecionado automaticamente.
            </p>

            <div className="verif-divider" />

            {/* Feedback de reenvio */}
            {resendMsg && <div className="verif-feedback success" role="status" aria-live="polite">{resendMsg}</div>}
            {resendError && <div className="verif-feedback error" role="alert" aria-live="assertive">{resendError}</div>}

            {/* Botão de reenvio */}
            <div className="verif-resend-area">
              {canResend ? (
                <button
                  className="btn-primary verif-btn"
                  onClick={handleResend}
                  disabled={resending}
                >
                  {resending ? 'Reenviando...' : 'Reenviar e-mail de confirmação'}
                </button>
              ) : (
                <div className="verif-countdown-wrap">
                  <span className="verif-countdown-label">Reenviar em</span>
                  <span className="verif-countdown-timer">{formatTime(countdown)}</span>
                </div>
              )}
            </div>

            <p className="verif-hint">
              Não recebeu? Verifique a pasta de spam ou lixo eletrônico.
            </p>
          </div>

          <div className="verif-footer anim anim-d3">
            <Link to="/login">← Voltar ao login</Link>
          </div>
        </div>
      </div>
    </>
  )
}

const verifCss = `
  .verif-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem 1rem;
    position: relative;
  }

  .verif-glow {
    position: fixed;
    top: -200px;
    left: 50%;
    transform: translateX(-50%);
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(200, 240, 96, 0.07) 0%, transparent 65%);
    pointer-events: none;
    z-index: 0;
  }

  .verif-wrap {
    width: 100%;
    max-width: 460px;
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .verif-logo-wrap {
    margin-bottom: 1.75rem;
  }

  .verif-logo {
    width: 52px;
    height: 52px;
    background: var(--accent);
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #0f0f0f;
  }

  .verif-logo .logo-icon {
    width: 26px;
    height: 26px;
    background-color: currentColor;
    mask-image: url('/favicon_nova.svg');
    -webkit-mask-image: url('/favicon_nova.svg');
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
  }

  .verif-card {
    background: var(--bg2);
    border: 1.5px solid var(--border2);
    border-radius: 24px;
    padding: 2.5rem 2rem;
    width: 100%;
    text-align: center;
  }

  .verif-envelope {
    width: 72px;
    height: 72px;
    background: rgba(200, 240, 96, 0.1);
    border: 1.5px solid rgba(200, 240, 96, 0.25);
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1.5rem;
    color: var(--accent);
    animation: envelope-pulse 2.5s ease-in-out infinite;
  }

  .verif-envelope svg {
    width: 36px;
    height: 36px;
  }

  @keyframes envelope-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(200, 240, 96, 0.18); }
    50% { box-shadow: 0 0 0 10px rgba(200, 240, 96, 0); }
  }

  .verif-title {
    font-family: 'DM Serif Display', serif;
    font-size: 1.7rem;
    color: var(--text);
    margin-bottom: 0.75rem;
    font-weight: 400;
  }

  .verif-desc {
    font-size: 0.9rem;
    color: var(--text2);
    line-height: 1.6;
    margin: 0;
  }

  .verif-email {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--accent);
    margin: 0.2rem 0 0;
    word-break: break-all;
  }

  .verif-divider {
    height: 1px;
    background: var(--border);
    margin: 1.75rem 0;
  }

  .verif-feedback {
    padding: 10px 14px;
    border-radius: 12px;
    font-size: 0.82rem;
    margin-bottom: 1rem;
    text-align: center;
  }

  .verif-feedback.success {
    background: rgba(200, 240, 96, 0.1);
    color: var(--accent);
    border: 1px solid rgba(200, 240, 96, 0.25);
  }

  .verif-feedback.error {
    background: rgba(234, 67, 53, 0.1);
    color: #ea4335;
    border: 1px solid rgba(234, 67, 53, 0.2);
  }

  .verif-resend-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .verif-btn {
    width: 100%;
  }

  .verif-countdown-wrap {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    background: var(--bg3, rgba(255,255,255,0.04));
    border: 1px solid var(--border);
    border-radius: 14px;
    width: 100%;
    justify-content: center;
  }

  .verif-countdown-label {
    font-size: 0.85rem;
    color: var(--text2);
  }

  .verif-countdown-timer {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text);
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.05em;
  }

  .verif-hint {
    font-size: 0.78rem;
    color: var(--text3, var(--text2));
    margin-top: 1rem;
    opacity: 0.7;
  }

  .verif-footer {
    margin-top: 1.5rem;
    font-size: 0.82rem;
    color: var(--text3, var(--text2));
  }

  .verif-footer a {
    color: var(--accent);
    text-decoration: none;
    font-weight: 500;
  }

  .verif-footer a:hover {
    text-decoration: underline;
  }

  @media (max-width: 480px) {
    .verif-card { padding: 1.75rem 1.25rem; }
    .verif-title { font-size: 1.45rem; }
  }
`
