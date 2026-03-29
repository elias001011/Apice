import { useState } from 'react'
import { Link, useLocation, Navigate, useNavigate } from 'react-router-dom'
import { clearCorretorDraft } from '../services/corretorDraft.js'
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx'

export function ResultadoRedacaoPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const res = location.state?.resultado;
  const [restartConfirmOpen, setRestartConfirmOpen] = useState(false);

  if (!res) {
    // Caso a pessoa entre direto na URL, volta pro corretor.
    return <Navigate to="/corretor" replace />;
  }

  // Define os blocos de competências baseados na resposta ou num falback
  const comps = res.competencias || [];

  const handleNovaRedacao = () => {
    clearCorretorDraft()
    navigate('/corretor')
  }

  return (
    <>
      <style>{resultadoCss}</style>
      
      <div className="view-container--wide anim anim-d1">
        <Link to="/corretor" className="back-link">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
          Voltar ao corretor
        </Link>

        <div className="result-top-row">
          <div className="result-col-left">
            <div className="score-hero">
              <div className="score-label">Desempenho Geral</div>
              <div className="score-number">{res.notaTotal || 0}</div>
              <div className="score-max">de 1000 pontos possíveis</div>
            </div>

            <div className="card comps-card">
              <div className="card-title">Desempenho por Competência</div>
              <div className="comp-list">
                {comps.map((c, idx) => (
                  <div className="comp-row" key={idx}>
                    <div className="comp-header">
                      <span className="comp-name">{c.nome}</span>
                      <span className="comp-score-val">{c.nota}</span>
                    </div>
                    <div className="progress-bg">
                      <div
                        className={`progress-fill ${c.nota < 120 ? 'mid' : ''}`}
                        style={{ width: `${(c.nota / 200) * 100}%`, background: c.nota < 120 ? 'var(--amber)' : 'var(--accent)' }}
                      ></div>
                    </div>
                    {c.descricao && <div className="comp-desc">{c.descricao}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="result-col-feedback">
            {res.pontoForte && (
              <div className="feedback-block">
                <div className="feedback-tag positive">✓ Ponto forte / Análise Geral</div>
                <div className="feedback-text">{res.pontoForte}</div>
              </div>
            )}

            {res.atencao && (
              <div className="feedback-block">
                <div className="feedback-tag warning">⚠ Atenção</div>
                <div className="feedback-text">{res.atencao}</div>
              </div>
            )}

            {res.principalMelhorar && (
              <div className="feedback-block">
                <div className="feedback-tag critical">✕ Principal a melhorar</div>
                <div className="feedback-text">{res.principalMelhorar}</div>
              </div>
            )}

            {res.errosPt && Array.isArray(res.errosPt) && res.errosPt.length > 0 && (
              <div className="feedback-block">
                <div className="feedback-tag info">Erros de Português (C1)</div>
                <div className="errors-list">
                  {res.errosPt.map((erro, i) => (
                    <div className="error-item" key={i}>
                      <div className="error-words">
                        <span className="word-wrong">{erro.errado}</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                        <span className="word-right">{erro.corrigido}</span>
                      </div>
                      <div className="error-reason">{erro.motivo}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="action-row" style={{ marginTop: '2rem' }}>
          <button
            type="button"
            className="btn-primary result-primary-action"
            onClick={() => setRestartConfirmOpen(true)}
          >
            Gerar nova redação
          </button>
          <Link to="/historico-redacoes" className="btn-ghost">
            Ver histórico completo
          </Link>
        </div>

        <ConfirmDialog
          open={restartConfirmOpen}
          title="Gerar uma nova redação?"
          message="Isso vai limpar o rascunho atual e voltar para o corretor. A análise já feita continua salva no histórico."
          confirmLabel="Sim, gerar"
          cancelLabel="Cancelar"
          danger
          onCancel={() => setRestartConfirmOpen(false)}
          onConfirm={() => {
            setRestartConfirmOpen(false)
            handleNovaRedacao()
          }}
        />
      </div>
    </>
  )
}

const resultadoCss = `
  .result-container {
    margin: 2rem auto;
  }
  .result-top-row {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    margin-top: 1.5rem;
    margin-bottom: 2rem;
  }
  .result-col-left {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }
  @media (min-width: 900px) {
    .result-top-row {
      flex-direction: row;
      align-items: flex-start;
    }
    .result-col-left {
      flex: 0 0 320px;
    }
    .score-hero {
      flex: 0 0 auto;
    }
    .result-col-feedback {
      flex: 1;
      min-width: 0;
    }
  }

  .score-hero {
    background: var(--bg2);
    border: 1px solid var(--border2);
    border-radius: 32px;
    padding: 3rem 2rem;
    text-align: center;
    position: relative;
    overflow: hidden;
    margin-bottom: 0;
  }
  @media (max-width: 899px) {
    .score-hero { margin-bottom: 0; }
  }
  .score-label {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--text3);
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 0.5rem;
  }
  .score-number {
    font-family: 'DM Serif Display', serif;
    font-size: 5.5rem;
    color: var(--accent);
    line-height: 1;
    margin: 10px 0;
  }
  .score-max {
    font-size: 0.85rem;
    color: var(--text3);
  }

  .comps-card { padding: 1.5rem; }
  .comp-list { 
    display: grid; 
    grid-template-columns: 1fr; 
    gap: 1.5rem; 
  }
  .comp-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
  .comp-name { font-size: 0.95rem; font-weight: 600; color: var(--text); }
  .comp-score-val { font-family: 'DM Serif Display', serif; font-size: 1.4rem; color: var(--accent); }
  .comp-desc { font-size: 0.82rem; color: var(--text2); line-height: 1.5; margin-top: 10px; padding-left: 6px; border-left: 2px solid var(--border); }

  .feedback-block {
    background: var(--bg2);
    border: 1px solid var(--border2);
    border-radius: 20px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }
  .feedback-tag {
    display: inline-block;
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    padding: 4px 12px;
    border-radius: 10px;
    margin-bottom: 12px;
  }
  .feedback-tag.positive { background: var(--accent-dim2); color: var(--accent); }
  .feedback-tag.warning { background: rgba(255, 184, 77, 0.1); color: var(--amber); }
  .feedback-tag.critical { background: rgba(255, 82, 82, 0.1); color: var(--red); }
  .feedback-tag.info { background: var(--bg3); color: var(--text2); border: 1px solid var(--border); }
  
  .feedback-text { font-size: 0.95rem; line-height: 1.7; color: var(--text); }

  .errors-list { display: flex; flex-direction: column; gap: 1rem; margin-top: 0.5rem; }
  .error-item { padding: 12px; background: var(--bg3); border-radius: 12px; border: 1px solid var(--border); }
  .error-words { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
  .word-wrong { color: var(--red); font-weight: 700; text-decoration: line-through; }
  .word-right { color: var(--accent); font-weight: 700; }
  .error-reason { font-size: 0.75rem; color: var(--text3); }

  .action-row { display: flex; gap: 12px; }
  .action-row .btn-primary {
    flex: 1.5;
    height: 48px;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    border: 1px solid rgba(var(--accent-rgb), 0.22);
    box-shadow: 0 14px 30px rgba(var(--accent-rgb), 0.18), 0 0 0 1px rgba(var(--accent-rgb), 0.06);
    font-weight: 700;
  }
  .action-row .btn-primary:hover {
    background: linear-gradient(135deg, var(--accent2), var(--accent));
    box-shadow: 0 18px 36px rgba(var(--accent-rgb), 0.22), 0 0 0 1px rgba(var(--accent-rgb), 0.08);
  }
  .action-row .btn-ghost { flex: 1; height: 48px; }
`
