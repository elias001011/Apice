import { useEffect, useState } from 'react'
import {
  TODAS_CONQUISTAS,
  loadConquistas,
  subscribeConquistas,
} from '../services/conquistas.js'

export function ConquistasPage() {
  const [state, setState] = useState(() => loadConquistas())

  useEffect(() => {
    const refresh = () => setState(loadConquistas())
    refresh()
    const unsub = subscribeConquistas(refresh)
    return unsub
  }, [])

  const unlocked = TODAS_CONQUISTAS.filter(
    (c) => !c.secret && state[c.id]?.unlockedAt,
  )
  const locked = TODAS_CONQUISTAS.filter(
    (c) => !c.secret && !state[c.id]?.unlockedAt,
  )
  const secrets = TODAS_CONQUISTAS.filter((c) => c.secret)
  const unlockedSecrets = secrets.filter((c) => state[c.id]?.unlockedAt)
  const lockedSecrets = secrets.filter((c) => !state[c.id]?.unlockedAt)

  const totalCount = TODAS_CONQUISTAS.length
  const unlockedCount = TODAS_CONQUISTAS.filter((c) => state[c.id]?.unlockedAt).length

  return (
    <div className="view-container">
      <style>{conqCss}</style>

      {/* Header */}
      <div className="page-header anim anim-d1">
        <h1 className="page-title">Conquistas</h1>
        <p className="page-sub">Sua jornada de evolução no Ápice recompensada.</p>
        <div className="conq-progress-row">
          <div className="conq-progress-bar">
            <div
              className="conq-progress-fill"
              style={{ width: `${Math.round((unlockedCount / totalCount) * 100)}%` }}
            />
          </div>
          <span className="conq-progress-label">
            {unlockedCount}/{totalCount}
          </span>
        </div>
      </div>

      {/* Desbloqueadas */}
      {unlocked.length > 0 && (
        <section className="conq-section anim anim-d2">
          <h3 className="section-label">Suas conquistas</h3>
          <div className="conq-grid">
            {unlocked.map((c) => (
              <ConqCard
                key={c.id}
                conquista={c}
                unlockedAt={state[c.id]?.unlockedAt}
                status="unlocked"
              />
            ))}
          </div>
        </section>
      )}

      {/* Por desbloquear */}
      {locked.length > 0 && (
        <section className="conq-section anim anim-d3">
          <h3 className="section-label">Disponíveis para desbloquear</h3>
          <div className="conq-grid">
            {locked.map((c) => (
              <ConqCard key={c.id} conquista={c} status="locked" />
            ))}
          </div>
        </section>
      )}

      {/* Secretas */}
      <section className="conq-section anim anim-d4">
        <h3 className="section-label">Conquistas secretas</h3>
        <div className="conq-grid">
          {unlockedSecrets.map((c) => (
            <ConqCard
              key={c.id}
              conquista={c}
              unlockedAt={state[c.id]?.unlockedAt}
              status="unlocked"
            />
          ))}
          {lockedSecrets.map((_, i) => (
            <ConqCard
              key={`secret-locked-${i}`}
              conquista={null}
              status="secret"
            />
          ))}
        </div>
      </section>
    </div>
  )
}

function formatDate(isoString) {
  if (!isoString) return ''
  try {
    return new Date(isoString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

function ConqCard({ conquista, status, unlockedAt }) {
  if (status === 'secret') {
    return (
      <div className="conq-card conq-card--secret">
        <div className="conq-icon">🔒</div>
        <div className="conq-info">
          <div className="conq-title">???</div>
          <div className="conq-desc">Desbloqueie para revelar</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`conq-card conq-card--${status}`}>
      <div className="conq-icon">{conquista.icon}</div>
      <div className="conq-info">
        <div className="conq-title">{conquista.title}</div>
        <div className="conq-desc">{conquista.desc}</div>
        {status === 'unlocked' && unlockedAt && (
          <div className="conq-date">{formatDate(unlockedAt)}</div>
        )}
      </div>
      {status === 'unlocked' && (
        <div className="conq-check" aria-hidden="true">✦</div>
      )}
    </div>
  )
}

const conqCss = `
  .conq-page {
    margin: 0 auto;
  }

  .conq-progress-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 12px;
  }

  .conq-progress-bar {
    flex: 1;
    height: 6px;
    background: var(--border);
    border-radius: 99px;
    overflow: hidden;
  }

  .conq-progress-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 99px;
    transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 0 8px rgba(var(--accent-rgb), 0.4);
  }

  .conq-progress-label {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--accent);
    min-width: 40px;
    text-align: right;
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
    position: relative;
    overflow: hidden;
  }

  /* Desbloqueadas */
  .conq-card--unlocked {
    border-color: var(--accent);
    background: linear-gradient(135deg, var(--bg2), var(--accent-dim));
    box-shadow: 0 8px 20px -10px rgba(var(--accent-rgb), 0.35);
  }

  .conq-card--unlocked:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 28px -10px rgba(var(--accent-rgb), 0.45);
  }

  .conq-card--unlocked .conq-icon {
    transform: scale(1.08);
    filter: drop-shadow(0 0 8px rgba(var(--accent-rgb), 0.4));
  }

  /* Bloqueadas */
  .conq-card--locked {
    opacity: 0.55;
    filter: grayscale(0.7);
  }

  /* Secretas */
  .conq-card--secret {
    background: var(--bg3);
    border-style: dashed;
    opacity: 0.45;
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

  .conq-card--unlocked .conq-icon {
    background: var(--accent-dim);
  }

  .conq-info {
    min-width: 0;
    flex: 1;
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

  .conq-date {
    font-size: 0.7rem;
    color: var(--accent);
    font-weight: 600;
    margin-top: 4px;
    opacity: 0.8;
  }

  .conq-check {
    font-size: 0.9rem;
    color: var(--accent);
    flex-shrink: 0;
    opacity: 0.7;
  }

  @media (max-width: 600px) {
    .conq-grid {
      grid-template-columns: 1fr;
    }
  }
`
