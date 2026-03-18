import { Link } from 'react-router-dom'

export function SimplePage({ title, standalone = false }) {
  const content = (
    <>
      <div className="page-header anim anim-d1">
        <div className="page-title">{title}</div>
        <div className="page-sub">Página pronta para migrar o HTML correspondente.</div>
      </div>

      <div className="card anim anim-d2">
        <div className="card-title">Atalho</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link className="btn-ghost" to="/home">
            Voltar para início
          </Link>
          <Link className="btn-ghost" to="/perfil">
            Ir para perfil
          </Link>
        </div>
      </div>
    </>
  )

  if (!standalone) return content

  return (
    <div className="main" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      {content}
    </div>
  )
}

