import { useState } from 'react'
import { Link } from 'react-router-dom'

export function NotificacoesPage() {
  const [toggles, setToggles] = useState({
    radar: true,
    lembrete: true,
    dicas: false,
    app: true
  })

  const handleToggle = (key) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <>
      <Link to="/perfil" className="back-link">
        <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
        Voltar ao perfil
      </Link>
      <div className="page-header anim anim-d1">
        <div className="page-title">Notificações</div>
        <div className="page-sub">Escolha quais avisos deseja receber do Ápice.</div>
      </div>

      <div className="card anim anim-d2">
        <div className="card-title">E-mail</div>
        <div className="toggle-row">
          <div className="toggle-info">
            <div className="toggle-label">Novos temas no Radar 1000</div>
            <div className="toggle-sub">Avisa quando o radar for atualizado com novos temas prováveis</div>
          </div>
          <div className={`toggle ${toggles.radar ? 'on' : ''}`} onClick={() => handleToggle('radar')}>
            <div className="toggle-dot"></div>
          </div>
        </div>
        <div className="toggle-row">
          <div className="toggle-info">
            <div className="toggle-label">Lembrete semanal de estudos</div>
            <div className="toggle-sub">Receba um resumo do seu desempenho toda segunda-feira</div>
          </div>
          <div className={`toggle ${toggles.lembrete ? 'on' : ''}`} onClick={() => handleToggle('lembrete')}>
            <div className="toggle-dot"></div>
          </div>
        </div>
        <div className="toggle-row">
          <div className="toggle-info">
            <div className="toggle-label">Dicas de redação</div>
            <div className="toggle-sub">Conteúdo sobre competências e repertórios do ENEM</div>
          </div>
          <div className={`toggle ${toggles.dicas ? 'on' : ''}`} onClick={() => handleToggle('dicas')}>
            <div className="toggle-dot"></div>
          </div>
        </div>
      </div>

      <div className="card anim anim-d3">
        <div className="card-title">No app</div>
        <div className="toggle-row">
          <div className="toggle-info">
            <div className="toggle-label">Redação corrigida</div>
            <div className="toggle-sub">Notifica quando o resultado estiver pronto</div>
          </div>
          <div className={`toggle ${toggles.app ? 'on' : ''}`} onClick={() => handleToggle('app')}>
            <div className="toggle-dot"></div>
          </div>
        </div>
      </div>
    </>
  )
}
