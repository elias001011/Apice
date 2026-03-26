import { Link, useLocation } from 'react-router-dom'
import { getEnemYearLabel } from '../services/examYear.js'

const FALLBACK_TEMA = {
  titulo: 'Inteligência artificial e o mercado de trabalho',
  probabilidade: 87,
  tags: [
    { label: 'Tecnologia', tipo: 'area-ciencia' },
    { label: 'Trabalho', tipo: 'area-social' },
    { label: 'Desigualdade', tipo: 'area-social' },
  ],
  justificativa: 'Tema dominante no debate público e com alta chance de recorte social na prova.',
}

export function TemaDetalhePage() {
  const location = useLocation()
  const enemLabel = getEnemYearLabel()
  const tema = location.state?.tema || FALLBACK_TEMA
  const temaTitulo = String(tema?.titulo ?? FALLBACK_TEMA.titulo)
  const probabilidade = Number.isFinite(Number(tema?.probabilidade)) ? Number(tema.probabilidade) : FALLBACK_TEMA.probabilidade
  const tags = Array.isArray(tema?.tags) && tema.tags.length > 0 ? tema.tags : FALLBACK_TEMA.tags
  const justificativa = String(tema?.justificativa ?? FALLBACK_TEMA.justificativa)

  return (
    <>
      <style>{temaDetalheCss}</style>
      <Link to="/radar" className="back-link">
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
        Voltar ao Radar 1000
      </Link>

      <div className="prob-hero anim anim-d1">
        <div className="prob-hero-left">
          <div className="prob-hero-label">Tema em análise</div>
          <div className="prob-hero-tema">{temaTitulo}</div>
        </div>
        <div className="prob-circle">
          <div className="prob-circle-num">{probabilidade}</div>
          <div className="prob-circle-pct">%</div>
        </div>
      </div>

      <div className="tags-row anim anim-d1">
        {tags.map((tag, index) => (
          <span key={`${String(tag?.label ?? tag)}-${index}`} className="tag">
            {String(tag?.label ?? tag)}
          </span>
        ))}
        <span className="tag">{enemLabel}</span>
      </div>

      <div className="card anim anim-d2">
        <div className="card-title">Por que este tema é provável</div>
        <div className="motivo-item">
          <div className="motivo-dot"></div>
          <div className="motivo-text">{justificativa}</div>
        </div>
        <div className="motivo-item">
          <div className="motivo-dot"></div>
          <div className="motivo-text">Para a redação, o recorte mais seguro costuma ser social: impacto coletivo, desigualdade de acesso, políticas públicas e consequências no cotidiano.</div>
        </div>
        <div className="motivo-item">
          <div className="motivo-dot"></div>
          <div className="motivo-text">Se quiser aumentar a força argumentativa, conecte o tema a direitos fundamentais, escola, Estado e responsabilidade social.</div>
        </div>
      </div>

      <div className="card anim anim-d3">
        <div className="card-title">Repertórios recomendados</div>
        <div className="repertorio-item">
          <div className="rep-nome">Constituição Federal</div>
          <div className="rep-uso">Use como base para discutir dever do Estado, direitos sociais e proteção cidadã.</div>
          <div className="rep-como">Conecte o artigo ao problema específico do tema, sem deixar a citação solta.</div>
        </div>
        <div className="repertorio-item">
          <div className="rep-nome">Dados recentes de institutos oficiais</div>
          <div className="rep-uso">IBGE, INEP, IPEA, OMS ou ONU ajudam a sustentar a argumentação com credibilidade.</div>
          <div className="rep-como">Escolha apenas um dado real que dialogue diretamente com o recorte do tema.</div>
        </div>
        <div className="repertorio-item">
          <div className="rep-nome">Direitos humanos e cidadania</div>
          <div className="rep-uso">Boa ponte para falar de inclusão, acesso e redução de desigualdades.</div>
          <div className="rep-como">Use esse repertório para mostrar dimensão social do problema, não só opinião pessoal.</div>
        </div>
      </div>

      <div className="card anim anim-d4">
        <div className="card-title">Estrutura sugerida para C5</div>
        <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.65 }}>
          <strong style={{ color: 'var(--accent)', fontWeight: 500 }}>Agente:</strong> um órgão público diretamente ligado ao problema<br />
          <strong style={{ color: 'var(--accent)', fontWeight: 500 }}>Ação:</strong> implementar política, campanha ou programa de enfrentamento<br />
          <strong style={{ color: 'var(--accent)', fontWeight: 500 }}>Meio:</strong> por meio de parcerias com escolas, mídia, saúde ou assistência social<br />
          <strong style={{ color: 'var(--accent)', fontWeight: 500 }}>Finalidade:</strong> para reduzir impactos e garantir acesso a direitos<br />
          <strong style={{ color: 'var(--accent)', fontWeight: 500 }}>Detalhe:</strong> com acompanhamento, metas e divulgação dos resultados
        </div>
      </div>

      <div className="cta-row anim anim-d4">
        <Link to="/corretor" className="btn-primary">Escrever sobre este tema</Link>
        <Link to="/radar" className="btn-ghost">Ver outros temas</Link>
      </div>
    </>
  )
}

const temaDetalheCss = `
  .prob-hero {
    background: var(--card-dark);
    border: 1.5px solid rgba(200, 240, 96, 0.2);
    border-radius: 24px;
    padding: 1.75rem 1.25rem;
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
    overflow: hidden;
  }
  .prob-hero::after {
    content: '';
    position: absolute;
    top: 14px;
    right: 60px;
    width: 4px;
    height: 4px;
    background: var(--accent);
    border-radius: 50%;
    opacity: 0.2;
  }
  .prob-hero-label {
    font-size: 0.75rem;
    color: var(--text2);
    text-transform: uppercase;
    letter-spacing: 0.7px;
    margin-bottom: 6px;
  }
  .prob-hero-tema {
    font-family: 'DM Serif Display', serif;
    font-size: 1.35rem;
    color: var(--text);
    letter-spacing: -0.3px;
    line-height: 1.3;
    max-width: 220px;
  }
  .prob-circle {
    width: 68px;
    height: 68px;
    flex-shrink: 0;
    background: var(--accent-dim2);
    border: 1.5px solid rgba(200, 240, 96, 0.3);
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .prob-circle-num {
    font-family: 'DM Serif Display', serif;
    font-size: 1.6rem;
    color: var(--accent);
    line-height: 1;
  }
  .prob-circle-pct {
    font-size: 0.65rem;
    color: var(--accent);
    opacity: 0.7;
  }
  .tags-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 1.25rem;
  }
  .tag {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 4px 12px;
    font-size: 0.75rem;
    color: var(--text2);
  }
  .motivo-item {
    display: flex;
    gap: 10px;
    padding: 10px 0;
  }
  .motivo-item+.motivo-item {
    border-top: 0.5px solid var(--border);
  }
  .motivo-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
    flex-shrink: 0;
    margin-top: 5px;
  }
  .motivo-text {
    font-size: 0.85rem;
    color: var(--text);
    line-height: 1.55;
  }
  .repertorio-item {
    padding: 12px 0;
  }
  .repertorio-item+.repertorio-item {
    border-top: 0.5px solid var(--border);
  }
  .rep-nome {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--text);
    margin-bottom: 3px;
  }
  .rep-uso {
    font-size: 0.8rem;
    color: var(--text2);
    line-height: 1.5;
  }
  .rep-como {
    font-size: 0.75rem;
    color: var(--accent);
    margin-top: 4px;
    font-weight: 500;
  }
  .cta-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 4px;
  }
`
