import { useState } from 'react'
import { Link } from 'react-router-dom'

export function AparenciaPage() {
  const [fonte, setFonte] = useState('md')

  return (
    <>
      <style>{aparenciaCss}</style>
      <Link to="/perfil" className="back-link">
        <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
        Voltar ao perfil
      </Link>
      <div className="page-header anim anim-d1">
        <div className="page-title">Aparência</div>
        <div className="page-sub">Personalize como o Ápice aparece para você.</div>
      </div>

      <div className="card anim anim-d2">
        <div className="card-title">Tema</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
          O tema (claro/escuro) agora pode ser alternado direto no <strong style={{ color: 'var(--text)', fontWeight: 500 }}>header</strong> pelo botão de sol/lua.
        </div>
      </div>

      <div className="card anim anim-d2">
        <div className="card-title">Texto</div>
        <div className="toggle-row">
          <div className="toggle-info">
            <div className="toggle-label">Tamanho da fonte</div>
            <div className="toggle-sub">{fonte === 'sm' ? 'Pequeno' : (fonte === 'lg' ? 'Grande' : 'Padrão')}</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className={`font-btn ${fonte === 'sm' ? 'active' : ''}`} onClick={() => setFonte('sm')}>A-</button>
            <button className={`font-btn ${fonte === 'md' ? 'active' : ''}`} onClick={() => setFonte('md')}>A</button>
            <button className={`font-btn ${fonte === 'lg' ? 'active' : ''}`} onClick={() => setFonte('lg')}>A+</button>
          </div>
        </div>
      </div>
    </>
  )
}

const aparenciaCss = `
  .font-btn {
    background: var(--bg3);
    border: 1.5px solid var(--border2);
    border-radius: var(--radius-xs);
    padding: 6px 12px;
    color: var(--text2);
    font-size: 12px;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: border-color 0.2s, background 0.2s, transform 0.1s;
  }
  .font-btn:hover { border-color: var(--accent); }
  .font-btn:active { transform: scale(0.96); }
  .font-btn.active {
    background: var(--accent-dim);
    border-color: rgba(200, 240, 96, 0.3);
    color: var(--accent);
  }
`
