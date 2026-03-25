import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'

export function RedefinirSenhaPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [token, setToken] = useState('')
  
  const { confirmRecovery, updateMetadata } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Detect token in URL hash
    const hash = window.location.hash
    if (hash) {
      const tokenMatch = hash.match(/recovery_token=([^&]+)/)
      if (tokenMatch && tokenMatch[1]) {
        setToken(tokenMatch[1])
        return
      }
    }
    setError('Token de recuperação não encontrado ou link expirado.')
  }, [])

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      return setError('As senhas não coincidem.')
    }
    if (password.length < 8) {
      return setError('A senha deve ter pelo menos 8 caracteres.')
    }

    setError('')
    setLoading(true)

    try {
      // 1. Log in with the token
      const user = await confirmRecovery(token)
      // 2. Update the password
      await user.update({ password })
      
      setDone(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      console.error('Password reset error:', err)
      setError(err.message || 'Erro ao redefinir senha. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{redefinirSenhaCss}</style>
      <div className="rs-page">
        <div className="rs-glow" aria-hidden="true" />
        <div className="rs-wrap">
          <div className="rs-top anim anim-d1">
            <div className="rs-icon">
              <svg viewBox="0 0 24 24">
                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div className="rs-title">Redefinir sua senha</div>
            <div className="rs-sub">
              {done 
                ? 'Senha alterada com sucesso! Você será redirecionado para o login...' 
                : 'Escolha uma nova senha segura para sua conta.'}
            </div>
          </div>

          {!done ? (
            <form onSubmit={handleUpdate} className="rs-card anim anim-d2">
              {error && <div className="error-msg">{error}</div>}
              
              <div style={{ marginBottom: 14 }}>
                <label className="input-label">Nova Senha</label>
                <input 
                  type="password" 
                  className="input-field" 
                  placeholder="Mínimo 8 caracteres" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label className="input-label">Confirmar Nova Senha</label>
                <input 
                  type="password" 
                  className="input-field" 
                  placeholder="Repita a nova senha" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <button className="btn-primary" type="submit" disabled={loading || !token}>
                {loading ? 'Redefinindo...' : 'Trocar senha'}
              </button>
            </form>
          ) : (
            <div className="rs-card success-card anim anim-d2">
              <div style={{ textAlign: 'center' }}>
                <div className="success-icon">✓</div>
                <Link to="/login" className="btn-primary" style={{ textDecoration: 'none', display: 'block', marginTop: 20 }}>
                  Ir para Login agora
                </Link>
              </div>
            </div>
          )}

          <div className="rs-footer anim anim-d3">
             <Link to="/login">Voltar ao login</Link>
          </div>
        </div>
      </div>
    </>
  )
}

const redefinirSenhaCss = `
  .error-msg {
    background: rgba(234, 67, 53, 0.1);
    color: #ea4335;
    padding: 10px;
    border-radius: 12px;
    font-size: 0.8rem;
    margin-bottom: 15px;
    text-align: center;
    border: 1px solid rgba(234, 67, 53, 0.2);
  }

  .rs-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem 1rem;
    position: relative;
  }

  .rs-glow {
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

  .rs-wrap {
    width: 100%;
    max-width: 440px;
    position: relative;
    z-index: 1;
  }

  .rs-top {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 2rem;
  }

  .rs-icon {
    width: 56px;
    height: 56px;
    background: var(--bg2);
    border: 1.5px solid var(--border2);
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1rem;
  }

  .rs-icon svg {
    width: 24px;
    height: 24px;
    stroke: var(--text2);
    fill: none;
    stroke-width: 1.5;
  }

  .rs-title {
    font-family: 'DM Serif Display', serif;
    font-size: 1.7rem;
    color: var(--text);
    text-align: center;
    margin-bottom: 6px;
  }

  .rs-sub {
    font-size: 0.85rem;
    color: var(--text2);
    text-align: center;
    line-height: 1.55;
    max-width: 320px;
  }

  .rs-card {
    background: var(--bg2);
    border: 1.5px solid var(--border2);
    border-radius: 24px;
    padding: 2rem;
  }

  .success-icon {
    width: 48px;
    height: 48px;
    background: var(--accent);
    color: #0f0f0f;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    margin: 0 auto;
  }

  .rs-footer {
    text-align: center;
    margin-top: 1.5rem;
    font-size: 0.8rem;
  }

  .rs-footer a {
    color: var(--accent);
    text-decoration: none;
    font-weight: 500;
  }
`
