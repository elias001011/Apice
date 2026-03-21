import { Link, useLocation, Navigate } from 'react-router-dom'

export function ResultadoRedacaoPage() {
  const location = useLocation();
  const res = location.state?.resultado;

  if (!res) {
    // Caso a pessoa entre direto na URL, volta pro corretor.
    return <Navigate to="/corretor" replace />;
  }

  // Define os blocos de competências baseados na resposta ou num falback
  const comps = res.competencias || [];

  return (
    <>
      <style>{resultadoCss}</style>
      <Link to="/corretor" className="back-link">
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
        Voltar ao corretor
      </Link>

      <div className="score-hero anim anim-d1">
        <div className="score-label">Sua nota</div>
        <div className="score-number">{res.notaTotal || 0}</div>
        <div className="score-max">de 1000 pontos</div>
      </div>

      <div className="card anim anim-d2">
        <div className="card-title">Nota por competência</div>
        <div className="comp-list">
          {comps.map((c, idx) => (
            <div className="comp-row" key={idx}>
              <div className="comp-header">
                <span className="comp-name">{c.nome}</span>
                <span className="comp-score-val">{c.nota} / 200</span>
              </div>
              <div className="progress-bg">
                <div 
                  className={`progress-fill ${c.nota < 120 ? 'mid' : ''}`} 
                  style={{ width: `${(c.nota / 200) * 100}%`, background: c.nota < 120 ? 'var(--amber)' : 'var(--accent)' }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {res.pontoForte && (
        <div className="feedback-block anim anim-d3">
          <div className="feedback-tag positive">Ponto forte</div>
          <div className="feedback-text">{res.pontoForte}</div>
        </div>
      )}

      {res.atencao && (
        <div className="feedback-block anim anim-d3">
          <div className="feedback-tag warning">Atenção</div>
          <div className="feedback-text">{res.atencao}</div>
        </div>
      )}

      {res.principalMelhorar && (
        <div className="feedback-block anim anim-d4">
          <div className="feedback-tag critical">Principal a melhorar</div>
          <div className="feedback-text">{res.principalMelhorar}</div>
        </div>
      )}

      {res.errosPt && Array.isArray(res.errosPt) && res.errosPt.length > 0 && (
        <div className="feedback-block anim anim-d4">
          <div className="feedback-tag" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text2)', border: '1px solid var(--border)' }}>Erros de Português (C1)</div>
          <div className="feedback-text" style={{ fontSize: 13 }}>
            <ul style={{ paddingLeft: 20, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {res.errosPt.map((erro, i) => (
                <li key={i}>
                  <strong style={{ color: 'var(--red)' }}>{erro.errado}</strong> → <span style={{ color: 'var(--text)' }}>{erro.corrigido}</span>
                  <div style={{ color: 'var(--text3)', fontSize: 11, marginTop: 2 }}>{erro.motivo}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {res.errosPt && typeof res.errosPt === 'string' && (
        <div className="feedback-block anim anim-d4">
          <div className="feedback-tag" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text2)', border: '1px solid var(--border)' }}>Erros de Português (C1)</div>
          <div className="feedback-text" style={{ fontSize: 12 }}>{res.errosPt}</div>
        </div>
      )}

      <div className="action-row anim anim-d4">
        <Link to="/corretor" className="btn-ghost">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Nova redação
        </Link>
        <Link to="/historico-redacoes" className="btn-ghost">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          Ver histórico
        </Link>
      </div>
    </>
  )
}

const resultadoCss = `
  .score-hero {
    background: var(--card-dark);
    border: 1.5px solid rgba(200, 240, 96, 0.2);
    border-radius: 24px;
    padding: 2.5rem 1.25rem 2rem;
    text-align: center;
    margin-bottom: 14px;
    position: relative;
    overflow: hidden;
  }
  .score-hero::before {
    content: '';
    position: absolute;
    top: -60px;
    left: 50%;
    transform: translateX(-50%);
    width: 220px;
    height: 220px;
    background: radial-gradient(circle, rgba(200, 240, 96, 0.1) 0%, transparent 70%);
    pointer-events: none;
  }
  .score-hero::after {
    content: '';
    position: absolute;
    top: 16px;
    right: 20px;
    width: 16px;
    height: 16px;
    background: var(--accent);
    clip-path: polygon(50% 0%, 61% 35%, 100% 50%, 61% 65%, 50% 100%, 39% 65%, 0% 50%, 39% 35%);
    opacity: 0.2;
  }
  .score-label {
    font-size: 11px;
    color: var(--text2);
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 10px;
  }
  .score-number {
    font-family: 'DM Serif Display', serif;
    font-size: 76px;
    color: var(--accent);
    line-height: 1;
    letter-spacing: -2px;
  }
  .score-max {
    font-size: 14px;
    color: var(--text3);
    margin-top: 4px;
  }
  .score-tag {
    display: inline-block;
    margin-top: 14px;
    background: var(--accent-dim2);
    border: 1.5px solid rgba(200, 240, 96, 0.3);
    border-radius: 20px;
    padding: 5px 16px;
    font-size: 12px;
    color: var(--accent);
    font-weight: 500;
  }
  .comp-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .comp-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 5px;
  }
  .comp-name {
    font-size: 12px;
    color: var(--text2);
  }
  .comp-score-val {
    font-size: 13px;
    font-weight: 500;
    color: var(--text);
  }
  .feedback-block {
    background: var(--bg2);
    border: 1.5px solid var(--border);
    border-radius: var(--radius);
    padding: 1.25rem;
    margin-bottom: 12px;
    transition: transform 0.25s;
  }
  .feedback-block:hover {
    transform: translateY(-2px);
  }
  .feedback-tag {
    display: inline-block;
    font-size: 10px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    padding: 3px 10px;
    border-radius: 20px;
    margin-bottom: 10px;
  }
  .feedback-tag.positive {
    background: rgba(200, 240, 96, 0.12);
    color: var(--accent);
    border: 1px solid rgba(200, 240, 96, 0.2);
  }
  .feedback-tag.warning {
    background: rgba(255, 184, 77, 0.12);
    color: var(--amber);
    border: 1px solid rgba(255, 184, 77, 0.2);
  }
  .feedback-tag.critical {
    background: rgba(255, 107, 107, 0.1);
    color: var(--red);
    border: 1px solid rgba(255, 107, 107, 0.15);
  }
  .feedback-text {
    font-size: 13px;
    color: var(--text);
    line-height: 1.65;
  }
  .feedback-text strong {
    color: var(--accent);
    font-weight: 500;
  }
  .feedback-text .warn {
    color: var(--amber);
    font-weight: 500;
  }
  .action-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 4px;
  }
`
