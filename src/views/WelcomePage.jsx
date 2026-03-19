import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

export function WelcomePage() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const { updateMetadata } = useAuth()
  const navigate = useNavigate()

  const handleSave = async (e) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      await updateMetadata({ full_name: name })
      navigate('/home')
    } catch (err) {
      console.error('Erro ao salvar nome:', err)
      alert('Ocorreu um erro ao salvar o nome.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{welcomeCss}</style>
      <div className="welcome-page">
        <div className="welcome-glow" />
        <div className="welcome-card anim anim-d1">
          <div className="welcome-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
          <h1>Bem-vindo ao Ápice</h1>
          <p>Para começarmos sua jornada, como gostaria de ser chamado?</p>
          
          <form onSubmit={handleSave} className="welcome-form">
            <div className="input-group">
              <label>Seu Nome</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Ex: Maria"
                className="input-field"
                required
                autoFocus
              />
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Salvando...' : 'Vamos Começar'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}

const welcomeCss = `
  .welcome-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg);
    padding: 1rem;
    position: relative;
    overflow: hidden;
  }

  .welcome-glow {
    position: absolute;
    top: -100px;
    left: 50%;
    transform: translateX(-50%);
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, rgba(200, 240, 96, 0.08) 0%, transparent 70%);
    pointer-events: none;
  }

  .welcome-card {
    background: var(--bg2);
    border: 1.5px solid var(--border);
    border-radius: 28px;
    padding: 3rem 2rem;
    width: 100%;
    max-width: 440px;
    text-align: center;
    position: relative;
    z-index: 1;
    box-shadow: 0 10px 40px rgba(0,0,0,0.1);
  }

  .welcome-icon {
    width: 64px;
    height: 64px;
    background: var(--accent);
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1.5rem;
    color: #0f0f0f;
  }

  .welcome-icon svg {
    width: 32px;
    height: 32px;
  }

  .welcome-card h1 {
    font-family: 'DM Serif Display', serif;
    font-size: 28px;
    color: var(--text);
    margin-bottom: 0.5rem;
  }

  .welcome-card p {
    font-size: 14px;
    color: var(--text2);
    margin-bottom: 2rem;
    line-height: 1.55;
  }

  .welcome-form {
    text-align: left;
  }

  .input-group {
    margin-bottom: 1.5rem;
  }

  .input-group label {
    display: block;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text3);
    margin-bottom: 8px;
    padding-left: 2px;
  }

  .btn-primary {
    width: 100%;
    padding: 14px;
    font-size: 14px;
    font-weight: 600;
  }
`
