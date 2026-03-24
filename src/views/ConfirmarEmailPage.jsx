import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

export function ConfirmarEmailPage() {
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  
  const { confirmAccount } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const handleConfirm = async () => {
      const hash = window.location.hash
      if (hash && hash.includes('confirmation_token=')) {
        const token = hash.substring(1).split('=')[1]
        try {
          await confirmAccount(token)
          setSuccess(true)
        } catch (err) {
          console.error('Confirmation error:', err)
          setError('O link de confirmação parece inválido ou já foi utilizado.')
        } finally {
          setLoading(false)
        }
      } else {
        setError('Token de confirmação não encontrado.')
        setLoading(false)
      }
    }

    handleConfirm()
  }, [])

  return (
    <>
      <style>{confirmCss}</style>
      <div className="conf-page">
        <div className="conf-glow" aria-hidden="true" />
        <div className="conf-wrap">
          <div className="conf-card anim anim-d1">
            {loading ? (
              <div className="conf-loading">
                <div className="spinner"></div>
                <p>Confirmando sua conta...</p>
              </div>
            ) : success ? (
              <div className="conf-success">
                <div className="conf-icon success">✓</div>
                <h2>Conta Ativada!</h2>
                <p>Sua conta foi confirmada com sucesso. Agora você pode acessar todos os recursos.</p>
                <Link to="/login" className="btn-primary" style={{ textDecoration: 'none', display: 'block', marginTop: 20 }}>
                  Ir para Login
                </Link>
              </div>
            ) : (
              <div className="conf-error">
                <div className="conf-icon error">!</div>
                <h2>Ops! Houve um erro</h2>
                <p>{error}</p>
                <Link to="/login" className="btn-primary" style={{ textDecoration: 'none', display: 'block', marginTop: 20 }}>
                  Voltar ao Login
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

const confirmCss = `
  .conf-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }
  .conf-glow {
    position: fixed;
    top: -200px;
    left: 50%;
    transform: translateX(-50%);
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(200, 240, 96, 0.06) 0%, transparent 65%);
    pointer-events: none;
    z-index: 0;
  }
  .conf-card {
    background: var(--bg2);
    border: 1.5px solid var(--border2);
    border-radius: 24px;
    padding: 3rem 2rem;
    max-width: 400px;
    width: 100%;
    text-align: center;
    position: relative;
    z-index: 1;
  }
  .conf-icon {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    margin: 0 auto 1.5rem;
    font-weight: bold;
  }
  .conf-icon.success { background: var(--accent); color: #0f0f0f; }
  .conf-icon.error { background: rgba(234, 67, 53, 0.1); color: #ea4335; border: 1.5px solid rgba(234, 67, 53, 0.2); }
  
  h2 { font-family: 'DM Serif Display', serif; margin-bottom: 12px; font-size: 1.8rem; }
  p { color: var(--text2); font-size: 0.95rem; line-height: 1.6; }

  .conf-loading .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 15px;
  }

  @keyframes spin { to { transform: rotate(360deg); } }
`
