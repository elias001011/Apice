import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { loadEssayHistory, subscribeEssayHistory } from '../services/essayInsights.js'

export function HistoricoRedacoesPage() {
  const [filtro, setFiltro] = useState('Todas')
  const [historico, setHistorico] = useState(() => loadEssayHistory())

  useEffect(() => {
    const refresh = () => setHistorico(loadEssayHistory())
    return subscribeEssayHistory(refresh)
  }, [])

  const filtradas = historico.filter(h => {
    if (filtro === 'Acima de 800') return h.nota >= 800
    if (filtro === '600–800') return h.nota >= 600 && h.nota < 800
    if (filtro === 'Abaixo de 600') return h.nota < 600
    return true
  })

  // Format date helper
  const fmtDate = (iso) => {
    if (!iso) return 'Recente'
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace(' de ', ' ')
  }

  return (
    <>
      <style>{historicoCss}</style>
      <div className="view-container">
        <Link to="/corretor" className="back-link">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
          Voltar ao corretor
        </Link>

      <div className="page-header anim anim-d1">
        <div className="page-title">Histórico</div>
        <div className="page-sub">Todas as suas redações corrigidas pelo Ápice.</div>
      </div>

      <div className="filter-row anim anim-d1">
        {['Todas', 'Acima de 800', '600–800', 'Abaixo de 600', 'Modo rígido'].map(f => (
          <div key={f} className={`filter-chip ${filtro === f ? 'active' : ''}`} onClick={() => setFiltro(f)}>
            {f}
          </div>
        ))}
      </div>

      {filtradas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text2)', fontSize: 13 }}>
          Nenhuma redação encontrada.
        </div>
      ) : (
        <div className="historico-grid">
          {filtradas.map((red, idx) => (
            <Link to="/resultado-redacao" state={{ resultado: red.feedback }} className="redacao-item anim" style={{ animationDelay: `${0.1 + (idx * 0.05)}s` }} key={red.id}>
              <div className="redacao-top">
                <div className="redacao-tema">{red.tema}</div>
                <div className="redacao-nota">{red.nota}</div>
              </div>
              <div className="redacao-meta">
                <span className="redacao-date">{fmtDate(red.data)}</span>
                <span className="redacao-mode">Registrado</span>
              </div>
              <div className="redacao-bars">
                 {red.feedback?.competencias?.map((c, i) => (
                    <div key={i} className="redacao-bar" style={{ height: `${Math.max(20, (c.nota/200)*100)}%`, background: c.nota < 120 ? 'var(--amber)' : 'var(--accent)', opacity: 0.8 }}></div>
                 ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
    </>
  )
}

const historicoCss = `
  .filter-row {
    display: flex;
    gap: 8px;
    margin-bottom: 1.25rem;
    overflow-x: auto;
    padding-bottom: 4px;
    scrollbar-width: none;
  }
  .filter-row::-webkit-scrollbar { display: none; }
  .filter-chip {
    white-space: nowrap;
    background: var(--bg2);
    border: 1.5px solid var(--border);
    border-radius: 20px;
    padding: 6px 14px;
    font-size: 0.8rem;
    color: var(--text2);
    cursor: pointer;
    transition: all 0.2s;
  }
  .filter-chip:hover { border-color: var(--border2); }
  .filter-chip.active {
    background: var(--accent-dim2);
    border-color: rgba(var(--accent-rgb), 0.4);
    color: var(--accent);
    font-weight: 500;
  }
  .redacao-item {
    background: var(--bg2);
    border: 1.5px solid var(--border);
    border-radius: var(--radius);
    padding: 1.1rem 1.25rem;
    margin-bottom: 10px;
    text-decoration: none;
    display: block;
    transition: border-color 0.2s, transform 0.25s;
    opacity: 0;
    transform: translateY(12px);
    animation: fadeSlideUp 0.4s ease forwards;
  }

  @media (min-width: 768px) {
    .historico-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .redacao-item { margin-bottom: 0; }
  }
  .redacao-item:hover {
    border-color: var(--border2);
    transform: translateY(-2px);
  }
  .redacao-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 8px;
  }
  .redacao-tema {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--text);
    line-height: 1.4;
    flex: 1;
    padding-right: 12px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .redacao-nota {
    font-family: 'DM Serif Display', serif;
    font-size: 1.45rem;
    color: var(--accent);
    white-space: nowrap;
  }
  .redacao-meta {
    display: flex;
    gap: 12px;
  }
  .redacao-date {
    font-size: 0.75rem;
    color: var(--text3);
  }
  .redacao-mode {
    font-size: 0.65rem;
    color: var(--text3);
    background: var(--bg3);
    border-radius: 10px;
    padding: 1px 8px;
  }
  .redacao-bars {
    display: flex;
    gap: 3px;
    margin-top: 10px;
    align-items: flex-end;
    height: 20px;
  }
  .redacao-bar {
    flex: 1;
    border-radius: 3px;
  }
`
