import { useState } from 'react'
import { Link } from 'react-router-dom'

export function HistoricoRedacoesPage() {
  const [filtro, setFiltro] = useState('Todas')

  return (
    <>
      <style>{historicoCss}</style>
      <Link to="/corretor" className="back-link">
        <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
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

      <Link to="/resultado-redacao" className="redacao-item anim anim-d2">
        <div className="redacao-top">
          <div className="redacao-tema">O impacto das redes sociais na saúde mental dos jovens brasileiros</div>
          <div className="redacao-nota">720</div>
        </div>
        <div className="redacao-meta">
          <span className="redacao-date">14 mar 2025</span>
          <span className="redacao-mode">Modo padrão</span>
        </div>
        <div className="redacao-bars">
          <div className="redacao-bar" style={{ height: '65%', background: 'var(--accent)', opacity: 0.7 }}></div>
          <div className="redacao-bar" style={{ height: '45%', background: 'var(--amber)', opacity: 0.8 }}></div>
          <div className="redacao-bar" style={{ height: '65%', background: 'var(--accent)', opacity: 0.7 }}></div>
          <div className="redacao-bar" style={{ height: '55%', background: 'var(--accent)', opacity: 0.7 }}></div>
          <div className="redacao-bar" style={{ height: '55%', background: 'var(--amber)', opacity: 0.8 }}></div>
        </div>
      </Link>

      <Link to="/resultado-redacao" className="redacao-item anim anim-d2">
        <div className="redacao-top">
          <div className="redacao-tema">Desafios para a inserção do jovem negro no mercado de trabalho</div>
          <div className="redacao-nota">680</div>
        </div>
        <div className="redacao-meta">
          <span className="redacao-date">10 mar 2025</span>
          <span className="redacao-mode">Modo rígido</span>
        </div>
        <div className="redacao-bars">
          <div className="redacao-bar" style={{ height: '60%', background: 'var(--accent)', opacity: 0.7 }}></div>
          <div className="redacao-bar" style={{ height: '40%', background: 'var(--amber)', opacity: 0.8 }}></div>
          <div className="redacao-bar" style={{ height: '55%', background: 'var(--accent)', opacity: 0.7 }}></div>
          <div className="redacao-bar" style={{ height: '50%', background: 'var(--accent)', opacity: 0.7 }}></div>
          <div className="redacao-bar" style={{ height: '40%', background: 'var(--red)', opacity: 0.8 }}></div>
        </div>
      </Link>

      <Link to="/resultado-redacao" className="redacao-item anim anim-d3">
        <div className="redacao-top">
          <div className="redacao-tema">A importância da educação financeira nas escolas públicas brasileiras</div>
          <div className="redacao-nota">760</div>
        </div>
        <div className="redacao-meta">
          <span className="redacao-date">5 mar 2025</span>
          <span className="redacao-mode">Modo padrão</span>
        </div>
        <div className="redacao-bars">
          <div className="redacao-bar" style={{ height: '75%', background: 'var(--accent)', opacity: 0.7 }}></div>
          <div className="redacao-bar" style={{ height: '60%', background: 'var(--accent)', opacity: 0.7 }}></div>
          <div className="redacao-bar" style={{ height: '70%', background: 'var(--accent)', opacity: 0.7 }}></div>
          <div className="redacao-bar" style={{ height: '65%', background: 'var(--accent)', opacity: 0.7 }}></div>
          <div className="redacao-bar" style={{ height: '60%', background: 'var(--accent)', opacity: 0.7 }}></div>
        </div>
      </Link>

      <Link to="/resultado-redacao" className="redacao-item anim anim-d3">
        <div className="redacao-top">
          <div className="redacao-tema">Consequências do uso excessivo de agrotóxicos na produção alimentar</div>
          <div className="redacao-nota">580</div>
        </div>
        <div className="redacao-meta">
          <span className="redacao-date">28 fev 2025</span>
          <span className="redacao-mode">Modo padrão</span>
        </div>
        <div className="redacao-bars">
          <div className="redacao-bar" style={{ height: '50%', background: 'var(--amber)', opacity: 0.8 }}></div>
          <div className="redacao-bar" style={{ height: '35%', background: 'var(--red)', opacity: 0.8 }}></div>
          <div className="redacao-bar" style={{ height: '50%', background: 'var(--amber)', opacity: 0.8 }}></div>
          <div className="redacao-bar" style={{ height: '45%', background: 'var(--amber)', opacity: 0.8 }}></div>
          <div className="redacao-bar" style={{ height: '30%', background: 'var(--red)', opacity: 0.8 }}></div>
        </div>
      </Link>
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
    font-size: 12px;
    color: var(--text2);
    cursor: pointer;
    transition: all 0.2s;
  }
  .filter-chip:hover { border-color: var(--border2); }
  .filter-chip.active {
    background: var(--accent-dim2);
    border-color: rgba(200, 240, 96, 0.4);
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
    font-size: 13px;
    font-weight: 500;
    color: var(--text);
    line-height: 1.4;
    flex: 1;
    padding-right: 12px;
  }
  .redacao-nota {
    font-family: 'DM Serif Display', serif;
    font-size: 22px;
    color: var(--accent);
    white-space: nowrap;
  }
  .redacao-meta {
    display: flex;
    gap: 12px;
  }
  .redacao-date {
    font-size: 11px;
    color: var(--text3);
  }
  .redacao-mode {
    font-size: 10px;
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
