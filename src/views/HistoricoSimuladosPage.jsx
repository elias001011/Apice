import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAreasDisponiveis, getDisciplinasByArea } from '../services/enemApiService.js'
import { loadSimuladoHistory, subscribeSimuladoHistory } from '../services/simuladoHistory.js'

const FILTERS = ['Todas', 'Sem IA', 'Com IA']
const AREAS = getAreasDisponiveis()

function formatDate(value) {
  if (!value) return 'Recente'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recente'
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace(' de ', ' ')
}

function resolveAreaLabel(areaId) {
  const item = AREAS.find((area) => area.id === areaId)
  return item?.label || areaId || 'Simulado'
}

function resolveDisciplinaLabel(areaId, disciplinaId) {
  const areaDisciplinas = getDisciplinasByArea(areaId) || []
  const item = areaDisciplinas.find((disc) => disc.id === disciplinaId)
  return item?.label || disciplinaId
}

export function HistoricoSimuladosPage() {
  const [filtro, setFiltro] = useState('Todas')
  const [historico, setHistorico] = useState(() => loadSimuladoHistory())

  useEffect(() => {
    const refresh = () => setHistorico(loadSimuladoHistory())
    return subscribeSimuladoHistory(refresh)
  }, [])

  const filtrados = historico.filter((item) => {
    const iaCount = Number(item?.estatisticas?.ia) || 0
    if (filtro === 'Com IA') return iaCount > 0
    if (filtro === 'Sem IA') return iaCount === 0
    return true
  })

  const total = historico.length
  const mediaAcerto = total > 0
    ? Math.round(historico.reduce((sum, item) => sum + (Number(item.percentual) || 0), 0) / total)
    : 0
  const comIA = historico.filter((item) => (Number(item?.estatisticas?.ia) || 0) > 0).length
  const semIA = total - comIA

  return (
    <>
      <style>{historicoCss}</style>
      <div className="view-container">
        <Link to="/simulado" className="back-link">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Voltar aos simulados
        </Link>

        <div className="page-header anim anim-d1">
          <div className="page-title">Histórico de simulados</div>
          <div className="page-sub">
            Simulados concluídos, com resumo de desempenho, origem das questões e controle do uso de IA.
          </div>
        </div>

        <div className="history-summary anim anim-d1">
          <div className="summary-card">
            <span>Total</span>
            <strong>{total}</strong>
          </div>
          <div className="summary-card">
            <span>Média de acerto</span>
            <strong>{mediaAcerto}%</strong>
          </div>
          <div className="summary-card">
            <span>Com IA</span>
            <strong>{comIA}</strong>
          </div>
          <div className="summary-card">
            <span>Somente reais</span>
            <strong>{semIA}</strong>
          </div>
        </div>

        <div className="filter-row anim anim-d1">
          {FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              className={`filter-chip ${filtro === item ? 'active' : ''}`}
              onClick={() => setFiltro(item)}
            >
              {item}
            </button>
          ))}
        </div>

        {filtrados.length === 0 ? (
          <div className="empty-state card anim anim-d2">
            <div className="empty-title">Nenhum simulado encontrado.</div>
            <p className="empty-copy">
              Quando você concluir um simulado, ele aparece aqui com o resumo de acertos e a composição das questões.
            </p>
            <Link to="/simulado" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', marginTop: '0.75rem' }}>
              Fazer simulado
            </Link>
          </div>
        ) : (
          <div className="historico-grid">
            {filtrados.map((item, index) => {
              const areaLabel = resolveAreaLabel(item.area)
              const disciplinaLabels = Array.isArray(item.disciplinas)
                ? item.disciplinas.map((disciplina) => resolveDisciplinaLabel(item.area, disciplina))
                : []
              const iaCount = Number(item?.estatisticas?.ia) || 0

              return (
                <div
                  key={item.id}
                  className="simulado-item card anim anim-d2"
                  style={{ animationDelay: `${0.08 + (index * 0.04)}s` }}
                >
                  <div className="simulado-item-top">
                    <div>
                      <div className="simulado-item-title">{item.titulo || `Simulado de ${areaLabel}`}</div>
                      <div className="simulado-item-meta">
                        <span>{formatDate(item.data)}</span>
                        <span>{areaLabel}</span>
                        <span>{item.fonte || 'mista'}</span>
                      </div>
                    </div>
                    <div className="simulado-item-score">
                      {item.acertos}<span>/{item.total}</span>
                    </div>
                  </div>

                  <div className="simulado-progress">
                    <div className="simulado-progress-fill" style={{ width: `${Math.max(0, Math.min(100, Number(item.percentual) || 0))}%` }} />
                  </div>

                  <div className="simulado-item-percent">
                    Você acertou <strong>{Number(item.percentual) || 0}%</strong> das questões
                  </div>

                  {disciplinaLabels.length > 0 && (
                    <div className="simulado-pill-row">
                      {disciplinaLabels.slice(0, 4).map((disciplina) => (
                        <span key={disciplina} className="simulado-pill">
                          {disciplina}
                        </span>
                      ))}
                      {disciplinaLabels.length > 4 && (
                        <span className="simulado-pill muted">
                          +{disciplinaLabels.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="simulado-item-stats">
                    <div className="stat-box">
                      <span>Banco local</span>
                      <strong>{Number(item?.estatisticas?.bancoLocal) || 0}</strong>
                    </div>
                    <div className="stat-box">
                      <span>Questões reais</span>
                      <strong>{Number(item?.estatisticas?.reais) || 0}</strong>
                    </div>
                    <div className="stat-box">
                      <span>IA</span>
                      <strong>{iaCount}</strong>
                    </div>
                  </div>

                  {item.alerta && (
                    <div className="simulado-alert">
                      <strong>Aviso:</strong> {item.alerta}
                    </div>
                  )}

                  <div className="simulado-footer-row">
                    <span className={`simulado-badge ${iaCount > 0 ? 'warn' : 'ok'}`}>
                      {iaCount > 0 ? 'Com IA' : 'Somente reais'}
                    </span>
                    {item.limiteIAAplicado && (
                      <span className="simulado-badge muted">IA limitada</span>
                    )}
                    <span className="simulado-badge ghost">Registrado</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

const historicoCss = `
  .page-header {
    margin-bottom: 1.25rem;
  }

  .history-summary {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.85rem;
    margin-bottom: 1rem;
  }

  .summary-card {
    background: var(--bg2);
    border: 1.5px solid var(--border);
    border-radius: var(--radius);
    padding: 0.95rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .summary-card span {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text3);
  }

  .summary-card strong {
    font-size: 1.5rem;
    color: var(--text);
    font-family: 'DM Serif Display', serif;
  }

  .filter-row {
    display: flex;
    gap: 8px;
    margin-bottom: 1.25rem;
    overflow-x: auto;
    padding-bottom: 4px;
    scrollbar-width: none;
  }

  .filter-row::-webkit-scrollbar {
    display: none;
  }

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

  .filter-chip:hover {
    border-color: var(--border2);
  }

  .filter-chip.active {
    background: var(--accent-dim2);
    border-color: rgba(var(--accent-rgb), 0.4);
    color: var(--accent);
    font-weight: 500;
  }

  .historico-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.9rem;
  }

  .simulado-item {
    background: var(--bg2);
    border: 1.5px solid var(--border);
    border-radius: var(--radius);
    padding: 1.1rem 1.2rem;
    text-decoration: none;
    transition: border-color 0.2s, transform 0.25s, box-shadow 0.25s;
  }

  .simulado-item:hover {
    border-color: var(--border2);
    transform: translateY(-2px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  }

  .simulado-item-top {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
  }

  .simulado-item-title {
    font-size: 0.96rem;
    font-weight: 600;
    color: var(--text);
    line-height: 1.35;
  }

  .simulado-item-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    margin-top: 0.45rem;
  }

  .simulado-item-meta span {
    font-size: 0.72rem;
    color: var(--text3);
    background: var(--bg3);
    border-radius: 999px;
    padding: 2px 8px;
  }

  .simulado-item-score {
    font-family: 'DM Serif Display', serif;
    font-size: 1.8rem;
    color: var(--accent);
    white-space: nowrap;
  }

  .simulado-item-score span {
    font-size: 0.95rem;
    color: var(--text3);
  }

  .simulado-progress {
    height: 8px;
    border-radius: 999px;
    background: var(--bg3);
    overflow: hidden;
    margin-top: 0.95rem;
  }

  .simulado-progress-fill {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--accent), rgba(var(--accent-rgb), 0.7));
  }

  .simulado-item-percent {
    margin-top: 0.75rem;
    color: var(--text2);
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .simulado-pill-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    margin-top: 0.8rem;
  }

  .simulado-pill {
    background: var(--accent-dim2);
    color: var(--accent);
    border-radius: 999px;
    padding: 4px 10px;
    font-size: 0.72rem;
    font-weight: 600;
  }

  .simulado-pill.muted {
    background: var(--bg3);
    color: var(--text2);
  }

  .simulado-item-stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.6rem;
    margin-top: 0.95rem;
  }

  .stat-box {
    background: var(--bg3);
    border-radius: 14px;
    padding: 0.8rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .stat-box span {
    font-size: 0.72rem;
    color: var(--text3);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .stat-box strong {
    font-size: 1.2rem;
    color: var(--text);
  }

  .simulado-alert {
    margin-top: 0.85rem;
    padding: 0.9rem 1rem;
    border-radius: var(--radius);
    background: rgba(255, 193, 7, 0.08);
    border: 1.5px solid rgba(255, 193, 7, 0.25);
    color: var(--text2);
    font-size: 0.88rem;
    line-height: 1.45;
  }

  .simulado-footer-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    margin-top: 0.9rem;
  }

  .simulado-badge {
    border-radius: 999px;
    padding: 4px 10px;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  .simulado-badge.ok {
    background: rgba(34, 197, 94, 0.12);
    color: #16a34a;
  }

  .simulado-badge.warn {
    background: rgba(245, 158, 11, 0.12);
    color: #d97706;
  }

  .simulado-badge.muted {
    background: var(--bg3);
    color: var(--text2);
  }

  .simulado-badge.ghost {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text3);
  }

  .empty-state {
    text-align: center;
    padding: 2rem 1.25rem;
  }

  .empty-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 0.4rem;
  }

  .empty-copy {
    margin: 0;
    color: var(--text2);
    line-height: 1.55;
  }

  @media (min-width: 720px) {
    .history-summary {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  @media (min-width: 900px) {
    .historico-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
`
