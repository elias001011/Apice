import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'

export function EditarPerfilPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, updateAccount } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [school, setSchool] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    setFullName(user?.user_metadata?.full_name || '')
    setEmail(user?.email || '')
    setSchool(user?.user_metadata?.school || '')
  }, [user])

  useEffect(() => {
    const targetId = location.hash.replace('#', '')
    if (!targetId) return

    const element = document.getElementById(targetId)
    if (!element) return

    element.scrollIntoView({ block: 'center', behavior: 'smooth' })
    if (typeof element.focus === 'function') {
      element.focus({ preventScroll: true })
    }
  }, [location.hash])

  const firstName = fullName.trim().split(/\s+/)[0] || ''

  const handleSave = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (password || confirmPassword) {
      if (password !== confirmPassword) {
        setError('As senhas informadas não coincidem.')
        return
      }
      if (password.length < 8) {
        setError('A nova senha precisa ter pelo menos 8 caracteres.')
        return
      }
    }

    setLoading(true)

    try {
      const payload = {
        data: {
          full_name: fullName.trim(),
          first_name: firstName,
          school: school.trim(),
        },
      }

      if (email.trim() && email.trim() !== user?.email) {
        payload.email = email.trim()
      }

      if (password) {
        payload.password = password
      }

      await updateAccount(payload)
      setSuccess(
        email.trim() !== user?.email
          ? 'Dados salvos. Se você alterou o e-mail, confirme a mudança no endereço novo.'
          : 'Perfil atualizado com sucesso.',
      )
      setPassword('')
      setConfirmPassword('')
    } catch (err) {
      console.error('Update profile error:', err)
      setError(err?.message || 'Não foi possível atualizar o perfil agora.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{editCss}</style>
      <div className="view-container">
        <Link to="/perfil" className="back-link">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
          Voltar ao perfil
        </Link>

      <div className="page-header anim anim-d1">
        <div className="page-title">Editar perfil</div>
        <div className="page-sub">Atualize suas informações pessoais, e-mail e senha.</div>
      </div>

      <form className="card anim anim-d2" onSubmit={handleSave}>
        {error && <div className="form-msg error">{error}</div>}
        {success && <div className="form-msg success">{success}</div>}

        <div className="input-group" style={{ marginBottom: 13 }}>
          <label className="input-label">Nome completo</label>
          <input
            id="nome"
            type="text"
            className="input-field"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Seu nome"
            required
          />
        </div>

        <div className="input-group" style={{ marginBottom: 13 }}>
          <label className="input-label">E-mail</label>
          <input
            id="email"
            type="email"
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            required
          />
        </div>

        <div className="input-group" style={{ marginBottom: 13 }}>
          <label className="input-label">Escola</label>
          <input
            id="escola"
            type="text"
            className="input-field"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            placeholder="Sua escola"
          />
        </div>

        <div className="card-subtitle" style={{ marginBottom: 10 }}>Segurança</div>

        <div className="input-group" style={{ marginBottom: 13 }}>
          <label className="input-label">Nova senha</label>
          <input
            id="senha"
            type="password"
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Deixe em branco para manter a atual"
            minLength={8}
          />
        </div>

        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="input-label">Confirmar nova senha</label>
          <input
            id="confirmar-senha"
            type="password"
            className="input-field"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repita a nova senha"
            minLength={8}
          />
        </div>

        <button className="btn-primary" style={{ marginTop: 18, width: 'auto', padding: '0 2.5rem' }} type="submit" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </form>

      <button
        className="btn-ghost"
        type="button"
        style={{ marginTop: 12, width: '100%' }}
        onClick={() => navigate('/perfil')}
      >
        Voltar sem salvar
      </button>

      <div className="edit-hint">
        Se você alterar o e-mail, o Netlify Identity pode pedir confirmação no novo endereço.
      </div>
    </div>
    </>
  )
}

const editCss = `
  .form-msg {
    padding: 10px 12px;
    border-radius: 12px;
    font-size: 0.82rem;
    margin-bottom: 14px;
    line-height: 1.5;
  }

  .form-msg.error {
    background: rgba(234, 67, 53, 0.1);
    border: 1px solid rgba(234, 67, 53, 0.2);
    color: #ea4335;
  }

  .form-msg.success {
    background: rgba(var(--accent-rgb), 0.1);
    border: 1px solid rgba(var(--accent-rgb), 0.22);
    color: var(--accent);
  }

  .card-subtitle {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.7px;
    text-transform: uppercase;
    color: var(--text3);
  }

  .edit-hint {
    margin-top: 10px;
    font-size: 0.78rem;
    color: var(--text3);
    line-height: 1.55;
  }
`
