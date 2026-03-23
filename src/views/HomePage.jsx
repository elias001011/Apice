import { useAuth } from '../auth/AuthProvider.jsx'
import { Link } from 'react-router-dom'

export function HomePage() {
  const { user } = useAuth()
  
  const rawName = user?.user_metadata?.full_name || 'Convidado'
  const nameParts = rawName.split(' ')
  const firstName = nameParts[0]
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ''

  return (
    <>
      <style>{homeCss}</style>

      {/* Layout de 2 colunas no desktop / coluna única no mobile */}
      <div className="home-grid">

        {/* ── COLUNA ESQUERDA: Hero + Stats ── */}
        <div className="home-grid-left">

          {/* Hero */}
          <div className="hero anim anim-d1">
            <div className="hero-content">
              <div className="hero-label">Bem-vindo de volta</div>
              <div className="hero-name">
                {firstName} {lastName && <em>{lastName}</em>}
              </div>
              <div className="hero-sub">Sua preparação inteligente para o ENEM com o poder da IA.</div>
              <Link to="/corretor" className="hero-cta">
                Corrigir redação →
              </Link>
            </div>
            <div className="hero-deco" aria-hidden="true">
              <svg className="hero-star" viewBox="0 0 100 100">
                <path d="M50 0 C52 38, 62 48, 100 50 C62 52, 52 62, 50 100 C48 62, 38 52, 0 50 C38 48, 48 38, 50 0Z" />
              </svg>
            </div>
            <span className="hero-dot hero-dot-1" aria-hidden="true"></span>
            <span className="hero-dot hero-dot-2" aria-hidden="true"></span>
            <span className="hero-dot hero-dot-3" aria-hidden="true"></span>
          </div>

          {/* Stats */}
          <div className="stats-grid anim anim-d2">
            <div className="pv-stat pv-stat--dark">
              <div className="pv-stat-top">
                <div className="pv-stat-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </div>
                <div className="pv-stat-delta">↑ 3 esta semana</div>
              </div>
              <div>
                <div className="pv-stat-value">14</div>
                <div className="pv-stat-label">Redações este mês</div>
              </div>
              <div className="pv-bar" aria-hidden="true">
                <div className="pv-bar-fill" style={{ width: '70%' }}></div>
              </div>
            </div>

            <div className="pv-stat pv-stat--lime">
              <div className="pv-stat-top">
                <div className="pv-stat-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                </div>
                <div className="pv-stat-delta">↑ +40 pontos</div>
              </div>
              <div>
                <div className="pv-stat-value">
                  720 <span>/1000</span>
                </div>
                <div className="pv-stat-label">Última nota</div>
              </div>
              <div className="pv-bar" aria-hidden="true">
                <div className="pv-bar-fill" style={{ width: '72%' }}></div>
              </div>
            </div>
          </div>

        </div>

        {/* ── COLUNA DIREITA: Feature Cards ── */}
        <div className="home-grid-right">
          <div className="section-label anim anim-d3" style={{ marginTop: 0 }}>Ferramentas</div>

          <div className="features-stack">
            <a href="/corretor" className="pv-feature pv-feature--dark anim anim-d3">
              <div className="pv-feature-content">
                <div className="pv-feature-title">Corretor de Redação</div>
                <div className="pv-feature-desc">Envie sua redação e receba nota detalhada por competência em segundos.</div>
                <div className="pv-pill">IA • Nota 0–1000</div>
                <div className="pv-feature-btn">
                  Corrigir agora
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
              <div className="pv-feature-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </div>
              <div className="pv-feature-deco deco-sparkle" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <path d="M12 0C12.5 9,14.5 11.5,24 12C14.5 12.5,12.5 15,12 24C11.5 15,9.5 12.5,0 12C9.5 11.5,11.5 9,12 0Z" />
                </svg>
              </div>
            </a>

            <a href="/radar" className="pv-feature pv-feature--lime anim anim-d4">
              <div className="pv-feature-content">
                <div className="pv-feature-title">Radar 1000</div>
                <div className="pv-feature-desc">Descubra os temas com maior probabilidade de cair na redação do ENEM.</div>
                <div className="pv-pill">ENEM 2025 • Atualizado</div>
                <div className="pv-feature-btn">
                  Ver temas
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
              <div className="pv-feature-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="2" />
                  <path d="M16.24 7.76a6 6 0 010 8.49m-8.48-.01a6 6 0 010-8.49m11.31-2.82a10 10 0 010 14.14m-14.14 0a10 10 0 010-14.14" />
                </svg>
              </div>
              <div className="pv-feature-deco deco-circle" aria-hidden="true">
                <svg viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" strokeWidth="1.5" />
                </svg>
              </div>
            </a>
          </div>
        </div>

      </div>
    </>
  )
}

const homeCss = `
  .home-grid-left,
  .home-grid-right {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  /* Hero */
  .hero {
    background: var(--bg2);
    border: 1.5px solid var(--border);
    border-radius: 24px;
    padding: 1.75rem 1.5rem;
    margin-bottom: 12px;
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 1rem;
    position: relative;
    overflow: hidden;
    min-height: 180px;
  }

  @media (max-width: 767px) {
    .hero {
      padding: 1.25rem 1.25rem;
      min-height: 150px;
    }
  }

  .hero-content { position: relative; z-index: 2; }

  .hero-label {
    font-size: 11px;
    color: var(--text2);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 8px;
  }

  .hero-name {
    font-family: 'DM Serif Display', serif;
    font-size: 28px;
    color: var(--text);
    letter-spacing: -0.4px;
    line-height: 1.15;
    margin-bottom: 8px;
  }

  @media (max-width: 767px) {
    .hero-name { font-size: 22px; }
  }

  .hero-name em { font-style: normal; color: var(--accent); }

  .hero-sub {
    font-size: 13px;
    color: var(--text2);
    line-height: 1.6;
    max-width: 280px;
    margin-bottom: 14px;
  }

  @media (max-width: 767px) {
    .hero-sub { max-width: 100%; font-size: 13px; }
  }

  .hero-cta {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 9px 18px;
    background: var(--accent);
    color: #0f0f0f;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
    transition: background 0.2s, transform 0.1s;
  }
  .hero-cta:hover { background: var(--accent2); }
  .hero-cta:active { transform: scale(0.97); }

  .hero-deco { position: relative; z-index: 2; display: flex; align-items: center; justify-content: center; }

  .hero-star {
    width: 80px;
    height: 80px;
    fill: var(--accent);
    animation: spinSlow 12s linear infinite;
    opacity: 0.85;
  }

  @media (max-width: 767px) {
    .hero-star { width: 56px; height: 56px; }
  }

  @keyframes spinSlow { to { transform: rotate(360deg); } }

  .hero-dot { position: absolute; width: 4px; height: 4px; background: var(--accent); border-radius: 50%; opacity: 0.3; }
  .hero-dot-1 { top: 18px; right: 28px; }
  .hero-dot-2 { bottom: 24px; right: 60px; opacity: 0.15; width: 3px; height: 3px; }
  .hero-dot-3 { top: 50%; left: 45%; opacity: 0.12; width: 3px; height: 3px; }

  /* Stats */
  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 16px;
  }

  .pv-stat { border-radius: 20px; padding: 1.25rem; position: relative; overflow: hidden; min-height: 130px; display: flex; flex-direction: column; justify-content: space-between; }
  .pv-stat--dark { background: var(--bg3); border: 1.5px solid var(--border); }
  .pv-stat--lime { background: var(--accent); border: 1.5px solid var(--accent2); }

  .pv-stat-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 10px; }

  .pv-stat-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
  .pv-stat--dark .pv-stat-icon { background: var(--accent-dim); }
  .pv-stat--dark .pv-stat-icon svg { stroke: var(--accent); }
  .pv-stat--lime .pv-stat-icon { background: rgba(15, 15, 15, 0.08); }
  .pv-stat--lime .pv-stat-icon svg { stroke: #0f0f0f; }
  .pv-stat-icon svg { width: 18px; height: 18px; fill: none; stroke-width: 1.7; }

  .pv-stat-delta { font-size: 10px; padding: 2px 8px; border-radius: 20px; font-weight: 500; }
  .pv-stat--dark .pv-stat-delta { background: var(--accent-dim); color: var(--accent); }
  .pv-stat--lime .pv-stat-delta { background: rgba(15, 15, 15, 0.08); color: #0f0f0f; }

  .pv-stat-value { font-family: 'DM Serif Display', serif; font-size: 30px; line-height: 1; margin-bottom: 3px; }
  .pv-stat--dark .pv-stat-value { color: var(--text); }
  .pv-stat--lime .pv-stat-value { color: #0f0f0f; }
  .pv-stat-value span { font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 400; opacity: 0.5; }

  .pv-stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
  .pv-stat--dark .pv-stat-label { color: var(--text2); }
  .pv-stat--lime .pv-stat-label { color: rgba(15, 15, 15, 0.55); }

  .pv-bar { height: 3px; border-radius: 3px; overflow: hidden; }
  .pv-stat--dark .pv-bar { background: var(--border); }
  .pv-stat--lime .pv-bar { background: rgba(15, 15, 15, 0.1); }
  .pv-bar-fill { height: 100%; border-radius: 3px; }
  .pv-stat--dark .pv-bar-fill { background: var(--accent); }
  .pv-stat--lime .pv-bar-fill { background: #0f0f0f; }

  /* Features */
  .features-stack {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .pv-feature {
    border-radius: 24px;
    padding: 1.5rem 1.5rem 1.25rem;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 1rem;
    align-items: start;
    text-decoration: none;
    min-height: 190px;
    position: relative;
    overflow: hidden;
    transition: transform 0.25s ease, box-shadow 0.25s ease;
  }

  .pv-feature:hover { transform: translateY(-3px); box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12); }
  .pv-feature--dark { background: var(--bg2); border: 1.5px solid var(--border); }
  .pv-feature--lime { background: var(--accent); border: 1.5px solid var(--accent2); }

  .pv-feature-content { display: flex; flex-direction: column; gap: 8px; position: relative; z-index: 2; }

  .pv-feature-title { font-family: 'DM Serif Display', serif; font-size: 23px; line-height: 1.2; letter-spacing: -0.3px; }
  .pv-feature--dark .pv-feature-title { color: var(--text); }
  .pv-feature--lime .pv-feature-title { color: #0f0f0f; }

  .pv-feature-desc { font-size: 13px; line-height: 1.6; }
  .pv-feature--dark .pv-feature-desc { color: var(--text2); }
  .pv-feature--lime .pv-feature-desc { color: rgba(15, 15, 15, 0.6); }

  .pv-pill { display: inline-flex; align-items: center; gap: 5px; padding: 4px 12px; border-radius: 20px; font-size: 10px; font-weight: 500; letter-spacing: 0.3px; width: fit-content; }
  .pv-feature--dark .pv-pill { background: var(--accent-dim); border: 1px solid var(--accent-dim2); color: var(--accent); }
  .pv-feature--lime .pv-pill { background: rgba(15, 15, 15, 0.08); border: 1px solid rgba(15, 15, 15, 0.15); color: #0f0f0f; }

  .pv-feature-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 20px;
    border-radius: 12px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
    width: fit-content;
    margin-top: 4px;
    transition: background 0.2s, transform 0.1s;
    border: none;
    cursor: pointer;
  }
  .pv-feature-btn:active { transform: scale(0.97); }
  .pv-feature--dark .pv-feature-btn { background: var(--accent); color: #0f0f0f; }
  .pv-feature--dark .pv-feature-btn:hover { background: var(--accent2); }
  .pv-feature--lime .pv-feature-btn { background: #0f0f0f; color: #f0ede8; }
  .pv-feature--lime .pv-feature-btn:hover { background: #1e1e1e; }

  .pv-feature-icon { width: 56px; height: 56px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; position: relative; z-index: 2; }
  .pv-feature--dark .pv-feature-icon { background: var(--accent-dim); }
  .pv-feature--dark .pv-feature-icon svg { stroke: var(--accent); }
  .pv-feature--lime .pv-feature-icon { background: rgba(15, 15, 15, 0.06); }
  .pv-feature--lime .pv-feature-icon svg { stroke: #0f0f0f; }
  .pv-feature-icon svg { width: 26px; height: 26px; fill: none; stroke-width: 1.5; }

  .pv-feature-deco { position: absolute; opacity: 0.06; }
  .pv-feature--dark .pv-feature-deco svg { stroke: var(--accent); }
  .pv-feature--lime .pv-feature-deco svg { stroke: #0f0f0f; }
  .pv-feature-deco svg { fill: none; stroke-width: 1; }

  .deco-circle { bottom: -20px; right: -20px; width: 100px; height: 100px; opacity: 0.08; }
  .deco-sparkle { top: 14px; right: 70px; width: 20px; height: 20px; opacity: 0.15; }
`
