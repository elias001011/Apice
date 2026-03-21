import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../theme/ThemeProvider.jsx'

export function AparenciaPage() {
  const { accent, setAccent, fontSize, setFontSize } = useTheme()

  return (
    <>
      <style>{aparenciaCss}</style>
      <Link to="/perfil" className="back-link">
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
        Voltar ao perfil
      </Link>
      <div className="page-header anim anim-d1">
        <div className="page-title">Aparência</div>
        <div className="page-sub">Personalize como o Ápice aparece para você.</div>
      </div>

      <div className="card anim anim-d2">
        <div className="card-title">Cores</div>
        <div className="toggle-row">
          <div className="toggle-info" style={{ marginBottom: 12 }}>
            <div className="toggle-label">Cor de destaque (global)</div>
            <div className="toggle-sub">Escolha a cor principal da interface do Ápice.</div>
          </div>
          <div className="color-options" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px 14px' }}>
            {['lime', 'cyan', 'blue', 'purple', 'pink', 'red', 'orange'].map(c => (
              <button 
                key={c}
                className={`color-btn ${c} ${accent === c ? 'active' : ''}`} 
                onClick={() => setAccent(c)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="card anim anim-d2">
        <div className="card-title">Texto</div>
        <div className="toggle-row">
          <div className="toggle-info">
            <div className="toggle-label">Tamanho da fonte</div>
            <div className="toggle-sub">{fontSize === 'sm' ? 'Pequeno' : (fontSize === 'lg' ? 'Grande' : 'Padrão')}</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className={`font-btn ${fontSize === 'sm' ? 'active' : ''}`} onClick={() => setFontSize('sm')}>A-</button>
            <button className={`font-btn ${fontSize === 'md' ? 'active' : ''}`} onClick={() => setFontSize('md')}>A</button>
            <button className={`font-btn ${fontSize === 'lg' ? 'active' : ''}`} onClick={() => setFontSize('lg')}>A+</button>
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

  .color-options {
    display: flex;
    gap: 12px;
  }
  .color-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    transition: transform 0.2s, border-color 0.2s;
  }
  .color-btn:hover {
    transform: scale(1.1);
  }
  .color-btn.active {
    border-color: var(--text);
    transform: scale(1.1);
  }
  .color-btn.lime { background: #c8f060; }
  .color-btn.blue { background: #60c8f0; }
  .color-btn.purple { background: #c060f0; }
  .color-btn.orange { background: #f0b860; }
  .color-btn.red { background: #f06060; }
  .color-btn.cyan { background: #60f0d8; }
  .color-btn.pink { background: #f060d8; }
`
