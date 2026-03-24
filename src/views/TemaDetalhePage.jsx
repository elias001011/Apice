import { Link } from 'react-router-dom'

export function TemaDetalhePage() {
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
          <div className="prob-hero-tema">Inteligência artificial e o mercado de trabalho</div>
        </div>
        <div className="prob-circle">
          <div className="prob-circle-num">87</div>
          <div className="prob-circle-pct">%</div>
        </div>
      </div>

      <div className="tags-row anim anim-d1">
        <span className="tag">Tecnologia</span>
        <span className="tag">Trabalho</span>
        <span className="tag">Desigualdade</span>
        <span className="tag">ENEM 2025</span>
      </div>

      <div className="card anim anim-d2">
        <div className="card-title">Por que este tema é provável</div>
        <div className="motivo-item">
          <div className="motivo-dot"></div>
          <div className="motivo-text">O ENEM acompanha o debate público com 1–2 anos de defasagem. A IA dominou noticiários em 2023 e 2024, tornando 2025 o momento natural para a abordagem.</div>
        </div>
        <div className="motivo-item">
          <div className="motivo-dot"></div>
          <div className="motivo-text">Temas de tecnologia e impacto social aparecem a cada 2 edições. A última abordagem direta foi em 2022 (manipulação comportamental).</div>
        </div>
        <div className="motivo-item">
          <div className="motivo-dot"></div>
          <div className="motivo-text">O enfoque esperado é social, não técnico: desemprego estrutural, desigualdade de acesso, requalificação profissional — todos alinhados com o perfil do ENEM.</div>
        </div>
      </div>

      <div className="card anim anim-d3">
        <div className="card-title">Repertórios recomendados</div>
        <div className="repertorio-item">
          <div className="rep-nome">Zygmunt Bauman — Modernidade Líquida</div>
          <div className="rep-uso">A fluidez das relações de trabalho e a precarização do emprego na era digital.</div>
          <div className="rep-como">Use com produtividade: conecte diretamente ao tema da instabilidade gerada pela automação, não apenas cite o nome.</div>
        </div>
        <div className="repertorio-item">
          <div className="rep-nome">Relatório da OIT (2023)</div>
          <div className="rep-uso">Estima que 25% dos empregos no Brasil têm alta probabilidade de automação até 2030.</div>
          <div className="rep-como">Dado forte para C2 — atribua corretamente à Organização Internacional do Trabalho.</div>
        </div>
        <div className="repertorio-item">
          <div className="rep-nome">Constituição Federal — Art. 7º</div>
          <div className="rep-uso">Direito ao trabalho digno como direito social fundamental.</div>
          <div className="rep-como">Ótimo para C5 — ao propor intervenção do Estado, referencie o dever constitucional.</div>
        </div>
      </div>

      <div className="card anim anim-d4">
        <div className="card-title">Estrutura sugerida para C5</div>
        <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.65 }}>
          <strong style={{ color: 'var(--accent)', fontWeight: 500 }}>Agente:</strong> O Ministério do Trabalho e Emprego<br />
          <strong style={{ color: 'var(--accent)', fontWeight: 500 }}>Ação:</strong> deve implementar programas de requalificação profissional<br />
          <strong style={{ color: 'var(--accent)', fontWeight: 500 }}>Meio:</strong> por meio de parcerias com universidades e plataformas de ensino digital<br />
          <strong style={{ color: 'var(--accent)', fontWeight: 500 }}>Finalidade:</strong> para garantir a inserção dos trabalhadores deslocados pela automação<br />
          <strong style={{ color: 'var(--accent)', fontWeight: 500 }}>Detalhe:</strong> respeitando o Art. 7º da Constituição Federal
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
