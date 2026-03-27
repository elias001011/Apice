import React from 'react'

const UNLOCKED = [
  { id: 1, icon: '🖊️', title: 'Viajante', desc: 'Crie sua primeira redação' },
  { id: 2, icon: '🔍', title: 'Curioso', desc: 'Use o Radar 1000 pela primeira vez' }
]

const AVAILABLE = [
  { id: 3, icon: '📝', title: 'Dedicado', desc: 'Crie 10 redações' },
  { id: 4, icon: '🏆', title: 'Centurião', desc: 'Crie 100 redações' },
  { id: 5, icon: '🧭', title: 'Explorador', desc: 'Consulte 10 temas diferentes no Radar' },
  { id: 6, icon: '🔥', title: 'Maratonista', desc: 'Mantenha um streak de 15 dias seguidos' },
  { id: 7, icon: '⚡', title: 'Lendário', desc: 'Mantenha um streak de 30 dias seguidos' },
  { id: 8, icon: '🎯', title: 'Perfeccionista', desc: 'Tire uma nota acima de 900 em uma redação' }
]

const SECRETS = [1, 2, 3] // 3 cards secretos

export function ConquistasPage() {
  return (
    <div className="conq-page">
      <style>{conqCss}</style>
      
      <div className="page-header anim anim-d1">
        <h1 className="page-title">Conquistas</h1>
        <p className="page-sub">Sua jornada de evolução no Ápice recompensada.</p>
      </div>

      <section className="conq-section anim anim-d2">
        <h3 className="section-label">Suas conquistas</h3>
        <div className="conq-grid">
          {UNLOCKED.map(c => (
            <div key={c.id} className="conq-card unlocked">
              <div className="conq-icon">{c.icon}</div>
              <div className="conq-info">
                <div className="conq-title">{c.title}</div>
                <div className="conq-desc">{c.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="conq-section anim anim-d3">
        <h3 className="section-label">Conquistas disponíveis</h3>
        <div className="conq-grid">
          {AVAILABLE.map(c => (
            <div key={c.id} className="conq-card locked">
              <div className="conq-icon">{c.icon}</div>
              <div className="conq-info">
                <div className="conq-title">{c.title}</div>
                <div className="conq-desc">{c.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="conq-section anim anim-d4">
        <h3 className="section-label">Conquistas secretas</h3>
        <div className="conq-grid">
          {SECRETS.map(s => (
            <div key={s} className="conq-card secret">
              <div className="conq-icon">🔒</div>
              <div className="conq-info">
                <div className="conq-title">???</div>
                <div className="conq-desc">Desbloqueie para revelar</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

const conqCss = `
  .conq-page {
    max-width: 900px;
    margin: 0 auto;
  }

  .conq-section {
    margin-bottom: 2.5rem;
  }

  .section-label {
    margin-bottom: 1rem;
    color: var(--text3);
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 700;
  }

  .conq-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 16px;
  }

  .conq-card {
    background: var(--bg2);
    border: 1.5px solid var(--border);
    border-radius: 20px;
    padding: 1.25rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    transition: all 0.2s;
  }

  /* Desbloqueadas */
  .conq-card.unlocked {
    border-color: var(--accent);
    background: linear-gradient(135deg, var(--bg2), var(--accent-dim));
    box-shadow: 0 8px 20px -10px var(--accent);
  }

  .conq-card.unlocked .conq-icon {
    transform: scale(1.1);
    filter: drop-shadow(0 0 8px rgba(var(--accent-rgb), 0.4));
  }

  /* Bloqueadas */
  .conq-card.locked {
    opacity: 0.6;
    filter: grayscale(0.8);
  }

  /* Secretas */
  .conq-card.secret {
    background: var(--bg3);
    border-style: dashed;
    opacity: 0.5;
  }

  .conq-icon {
    font-size: 2.2rem;
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg3);
    border-radius: 16px;
    flex-shrink: 0;
  }

  .conq-info {
    min-width: 0;
  }

  .conq-title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 2px;
  }

  .conq-desc {
    font-size: 0.8rem;
    color: var(--text2);
    line-height: 1.4;
  }

  @media (max-width: 600px) {
    .conq-grid {
      grid-template-columns: 1fr;
    }
  }
`
