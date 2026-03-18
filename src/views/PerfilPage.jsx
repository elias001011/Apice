import { Link, useNavigate } from 'react-router-dom'

export function PerfilPage() {
  const navigate = useNavigate()

  return (
    <>
      <style>{perfilCss}</style>

      <div className="profile-hero anim anim-d1">
        <div className="profile-avatar">M</div>
        <div>
          <div className="profile-name">Maria Alves</div>
          <div className="profile-school">E.E. Presidente Vargas · 3º ano</div>
          <div className="profile-plan">Plano gratuito</div>
        </div>
      </div>

      <div className="stats-row-small anim anim-d2">
        <div className="stat-small">
          <div className="stat-small-val">14</div>
          <div className="stat-small-lbl">Redações</div>
        </div>
        <div className="stat-small">
          <div className="stat-small-val">720</div>
          <div className="stat-small-lbl">Melhor nota</div>
        </div>
        <div className="stat-small">
          <div className="stat-small-val">+12%</div>
          <div className="stat-small-lbl">Evolução</div>
        </div>
      </div>

      <div className="section-label anim anim-d2" style={{ marginTop: '0.5rem' }}>
        Informações
      </div>
      <div className="card info-card anim anim-d2" style={{ marginBottom: '1.25rem' }}>
        <div className="info-row">
          <div className="info-left">
            <div className="info-k">Nome</div>
            <div className="info-v">Maria Alves</div>
          </div>
          <Link to="/editar-perfil" className="info-action">
            Alterar
          </Link>
        </div>
        <div className="info-row">
          <div className="info-left">
            <div className="info-k">E-mail</div>
            <div className="info-v">maria.alves@email.com</div>
          </div>
          <Link to="/editar-perfil" className="info-action">
            Alterar
          </Link>
        </div>
        <div className="info-row">
          <div className="info-left">
            <div className="info-k">Foto</div>
            <div className="info-v">Avatar com iniciais (placeholder)</div>
          </div>
          <Link to="/editar-perfil" className="info-action">
            Alterar
          </Link>
        </div>
        <div className="info-row">
          <div className="info-left">
            <div className="info-k">Senha</div>
            <div className="info-v">••••••••</div>
          </div>
          <button className="info-action" type="button" title="Backend fará a ação" onClick={() => {}}>
            Alterar
          </button>
        </div>
      </div>

      <div className="section-label anim anim-d3">Preferências</div>
      <div className="card anim anim-d3" style={{ padding: '0 1.25rem', marginBottom: '1.25rem' }}>
        <Link to="/notificacoes" className="settings-item">
          <div className="settings-left">
            <div className="settings-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
            </div>
            <div className="settings-name">Notificações</div>
          </div>
          <div className="settings-chevron" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </Link>
        <Link to="/sobre" className="settings-item">
          <div className="settings-left">
            <div className="settings-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div className="settings-name">Sobre o Ápice</div>
          </div>
          <div className="settings-chevron" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </Link>
      </div>

      <div className="card anim anim-d4" style={{ padding: '0 1.25rem', marginBottom: '1.25rem' }}>
        <Link to="/historico-redacoes" className="settings-item">
          <div className="settings-left">
            <div className="settings-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div className="settings-name">Histórico de redações</div>
          </div>
          <div className="settings-chevron" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </Link>
      </div>

      <button
        className="logout-btn anim anim-d4"
        type="button"
        onClick={() => {
          navigate('/login')
        }}
      >
        Sair da conta
      </button>
    </>
  )
}

const perfilCss = `
  .profile-hero {
    background: var(--card-dark);
    border: 1.5px solid var(--border);
    border-radius: 24px;
    padding: 1.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 14px;
    position: relative;
    overflow: hidden;
  }

  .profile-hero::after {
    content: '';
    position: absolute;
    top: 14px;
    right: 18px;
    width: 10px;
    height: 10px;
    background: var(--accent);
    clip-path: polygon(50% 0%, 61% 35%, 100% 50%, 61% 65%, 50% 100%, 39% 65%, 0% 50%, 39% 35%);
    opacity: 0.15;
  }

  .profile-avatar {
    width: 62px;
    height: 62px;
    flex-shrink: 0;
    background: var(--accent-dim2);
    border: 1.5px solid rgba(200, 240, 96, 0.35);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'DM Serif Display', serif;
    font-size: 24px;
    color: var(--accent);
  }

  .profile-name {
    font-family: 'DM Serif Display', serif;
    font-size: 22px;
    color: var(--text);
    letter-spacing: -0.3px;
  }

  .profile-school { font-size: 12px; color: var(--text2); margin-top: 3px; }

  .profile-plan {
    display: inline-block;
    margin-top: 6px;
    font-size: 10px;
    font-weight: 500;
    background: var(--bg3);
    border: 1px solid var(--border2);
    border-radius: 20px;
    padding: 3px 10px;
    color: var(--text3);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .stats-row-small { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 1.5rem; }

  .stat-small {
    background: var(--bg2);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 12px 8px;
    text-align: center;
    transition: transform 0.25s;
  }
  .stat-small:hover { transform: translateY(-2px); }
  .stat-small-val { font-family: 'DM Serif Display', serif; font-size: 20px; color: var(--text); }
  .stat-small-lbl { font-size: 10px; color: var(--text3); margin-top: 2px; }

  .logout-btn {
    width: 100%;
    margin-top: 1rem;
    background: transparent;
    border: 1.5px solid rgba(255, 107, 107, 0.25);
    border-radius: var(--radius-sm);
    padding: 12px;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    color: var(--red);
    cursor: pointer;
    transition: background 0.2s, transform 0.1s;
    text-decoration: none;
    display: block;
    text-align: center;
  }
  .logout-btn:hover { background: rgba(255, 107, 107, 0.06); }
  .logout-btn:active { transform: scale(0.98); }

  .info-card { padding: 1.25rem; }

  .info-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; }
  .info-row + .info-row { border-top: 0.5px solid var(--border); }

  .info-k { font-size: 11px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.7px; }
  .info-v { font-size: 13px; color: var(--text); margin-top: 3px; }
  .info-left { padding-right: 12px; }

  .info-action {
    background: var(--bg3);
    border: 1.5px solid var(--border2);
    border-radius: 999px;
    padding: 6px 12px;
    font-size: 12px;
    color: var(--text2);
    cursor: pointer;
    text-decoration: none;
    white-space: nowrap;
    transition: border-color 0.2s, color 0.2s;
  }

  .info-action:hover { border-color: var(--accent); color: var(--text); }
`

