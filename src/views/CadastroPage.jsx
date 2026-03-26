import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import { POLICY_URL, loadPolicyConsent, savePolicyConsent } from '../services/policyConsent.js'

function EyeOpen() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOff() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

export function CadastroPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [nome, setNome] = useState('')
  const [sobrenome, setSobrenome] = useState('')
  const [acceptedPolicies, setAcceptedPolicies] = useState(() => loadPolicyConsent())
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const navigate = useNavigate()
  const { signup } = useAuth()

  const handleSignup = async (e) => {
    e.preventDefault()
    setError('')

    if (!acceptedPolicies) {
      setError('Você precisa aceitar os Termos de uso e a Política de privacidade para criar sua conta.')
      return
    }

    setLoading(true)

    try {
      await signup(email, password, { 
        full_name: `${nome} ${sobrenome}`.trim(),
        first_name: nome
      })
      // Salva a senha temporariamente para possível reenvio de confirmação
      sessionStorage.setItem('_apice_verif_pw', password)
      navigate('/verificar-email', { state: { email } })
    } catch (err) {
      console.error('Signup error:', err)
      const msg = err?.json?.msg || err?.message || ''
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists')) {
        setError('Este e-mail já está cadastrado. Tente fazer login.')
      } else if (msg) {
        setError(`Erro: ${msg}`)
      } else {
        setError('Erro ao criar conta. Verifique os dados ou tente outro e-mail.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{cadastroCss}</style>
      <div className="cad-page">
        <div className="cad-glow" aria-hidden="true" />
        <div className="cad-wrap">
          <div className="cad-top anim anim-d1">
            <Link to="/login" className="cad-logo" style={{ textDecoration: 'none' }}>
              <div className="logo-icon" />
            </Link>
            <div className="cad-title">Criar conta gratuita</div>
            <div className="cad-sub">Comece a estudar para o ENEM hoje</div>
          </div>

          <form onSubmit={handleSignup} className="cad-card anim anim-d2">
            {error && (
              <div className="error-msg" role="alert" aria-live="assertive">
                {error}
              </div>
            )}
            
            <div className="cad-input-row">
              <div>
                <label className="input-label">Nome</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Maria" 
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="input-label">Sobrenome</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Alves" 
                  value={sobrenome}
                  onChange={(e) => setSobrenome(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="cad-input-group">
              <label className="input-label">E-mail</label>
              <input 
                type="email" 
                className="input-field" 
                placeholder="seu@email.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="cad-input-group">
              <label className="input-label">Senha</label>
              <div className="pass-wrap">
                <input 
                  type={showPass ? 'text' : 'password'}
                  className="input-field" 
                  placeholder="Mínimo 8 caracteres" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className="pass-toggle"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPass ? <EyeOff /> : <EyeOpen />}
                </button>
              </div>
            </div>

            <div className="cad-terms">
              <input
                type="checkbox"
                id="termos"
                checked={acceptedPolicies}
                onChange={(e) => {
                  const next = e.target.checked
                  setAcceptedPolicies(next)
                  savePolicyConsent(next)
                }}
              />
              <label htmlFor="termos">
                Concordo com os <a href={POLICY_URL} target="_blank" rel="noreferrer">Termos de uso</a> e a <a href={POLICY_URL} target="_blank" rel="noreferrer">Política de privacidade</a>
              </label>
            </div>

            {!acceptedPolicies && (
              <p className="cad-terms-note" aria-live="polite">
                Aceite os termos para criar sua conta.
              </p>
            )}

            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Criando conta...' : 'Criar minha conta'}
            </button>
          </form>

          <div className="cad-footer anim anim-d3">
            Já tem conta? <Link to="/login">Entrar</Link>
          </div>
        </div>
      </div>
    </>
  )
}

const cadastroCss = `
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

  .cad-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem 1rem;
    position: relative;
  }

  .cad-glow {
    position: fixed;
    top: -200px;
    left: 50%;
    transform: translateX(-50%);
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(var(--accent-rgb), 0.06) 0%, transparent 65%);
    pointer-events: none;
    z-index: 0;
  }

  .cad-wrap {
    width: 100%;
    max-width: 460px;
    position: relative;
    z-index: 1;
  }

  .cad-top {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 1.75rem;
  }

  .cad-logo {
    width: 52px;
    height: 52px;
    background: var(--accent);
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1rem;
    position: relative;
    cursor: pointer;
    flex-shrink: 0;
    color: #0f0f0f;
  }

  .cad-logo .logo-icon {
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

  .cad-title {
    font-family: 'DM Serif Display', serif;
    font-size: 1.7rem;
    color: var(--text);
    text-align: center;
    margin-bottom: 5px;
  }

  .cad-sub {
    font-size: 0.85rem;
    color: var(--text2);
    text-align: center;
  }

  .cad-card {
    background: var(--bg2);
    border: 1.5px solid var(--border2);
    border-radius: 24px;
    padding: 2rem;
  }

  .cad-input-group { margin-bottom: 13px; }

  .cad-input-row {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
    margin-bottom: 13px;
  }

  @media (min-width: 520px) {
    .cad-input-row { grid-template-columns: 1fr 1fr; }
  }

  .cad-terms {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin: 1rem 0;
  }

  .cad-terms input[type="checkbox"] {
    width: 16px;
    height: 16px;
    margin-top: 1px;
    accent-color: var(--accent);
    cursor: pointer;
  }

  .cad-terms label {
    font-size: 0.8rem;
    color: var(--text2);
    line-height: 1.5;
  }

  .cad-terms label a {
    color: var(--accent);
    text-decoration: none;
    font-weight: 500;
  }

  .cad-terms label a:hover {
    text-decoration: underline;
  }

  .cad-terms-note {
    margin: -0.35rem 0 1rem 26px;
    font-size: 0.75rem;
    color: var(--amber);
    line-height: 1.45;
  }

  .pass-wrap {
    position: relative;
  }

  .pass-wrap .input-field {
    padding-right: 42px;
    width: 100%;
  }

  .pass-toggle {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text3);
    display: flex;
    align-items: center;
    padding: 0;
    transition: color 0.2s;
  }

  .pass-toggle:hover { color: var(--text); }

  .cad-footer {
    text-align: center;
    margin-top: 1.5rem;
    margin-bottom: 2rem;
    font-size: 0.8rem;
    color: var(--text3);
  }

  .cad-footer a {
    color: var(--accent);
    text-decoration: none;
    font-weight: 500;
  }

  @media (max-width: 480px) {
    .cad-page { padding-top: 2.5rem; }
    .cad-title { font-size: 1.45rem; }
    .cad-card { padding: 1.25rem; }
  }
`
