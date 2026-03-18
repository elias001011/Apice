import { Link, useNavigate } from 'react-router-dom'

export function EditarPerfilPage() {
  const navigate = useNavigate()
  return (
    <>
      <Link to="/perfil" className="back-link">
        <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
        Voltar ao perfil
      </Link>
      <div className="page-header anim anim-d1">
        <div className="page-title">Editar perfil</div>
        <div className="page-sub">Atualize suas informações pessoais.</div>
      </div>

      <div className="card anim anim-d2">
        <div className="input-group" style={{ marginBottom: 13 }}>
          <label className="input-label">Nome</label>
          <input type="text" className="input-field" defaultValue="Maria" />
        </div>
        <div className="input-group" style={{ marginBottom: 13 }}>
          <label className="input-label">Sobrenome</label>
          <input type="text" className="input-field" defaultValue="Alves" />
        </div>
        <div className="input-group" style={{ marginBottom: 13 }}>
          <label className="input-label">E-mail</label>
          <input type="email" className="input-field" defaultValue="maria.alves@email.com" />
        </div>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="input-label">Escola</label>
          <input type="text" className="input-field" defaultValue="E.E. Presidente Vargas" />
        </div>
      </div>

      <button className="btn-primary anim anim-d3" onClick={() => navigate('/perfil')} type="button">
        Salvar alterações
      </button>
    </>
  )
}
