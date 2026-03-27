import { useEffect, useState } from 'react'
import { subscribeConquistaDesbloqueada } from '../services/conquistas.js'

const TOAST_DURATION_MS = 4500

export function ConquistaToast() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const handleUnlock = (event) => {
      const { conquista } = event.detail || {}
      if (!conquista) return

      const id = `${conquista.id}-${Date.now()}`
      const toast = { id, conquista, exiting: false }

      setToasts((prev) => [...prev, toast])

      // Marca como exiting antes de remover para animar saída
      setTimeout(() => {
        setToasts((prev) =>
          prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
        )
      }, TOAST_DURATION_MS - 400)

      // Remove do array após a animação
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, TOAST_DURATION_MS)
    }

    const unsub = subscribeConquistaDesbloqueada(handleUnlock)
    return unsub
  }, [])

  if (toasts.length === 0) return null

  return (
    <>
      <style>{toastCss}</style>
      <div className="conquista-toast-container" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`conquista-toast ${t.exiting ? 'conquista-toast--exit' : ''}`}
            role="status"
          >
            <div className="ct-glow" aria-hidden="true" />
            <div className="ct-icon">{t.conquista.icon}</div>
            <div className="ct-body">
              <div className="ct-label">Conquista desbloqueada!</div>
              <div className="ct-title">{t.conquista.title}</div>
              <div className="ct-desc">{t.conquista.desc}</div>
            </div>
            <div className="ct-sparkle" aria-hidden="true">✦</div>
          </div>
        ))}
      </div>
    </>
  )
}

const toastCss = `
  .conquista-toast-container {
    position: fixed;
    bottom: calc(var(--tab-h, 70px) + 16px);
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: center;
    pointer-events: none;
    width: min(420px, 92vw);
  }

  @media (min-width: 768px) {
    .conquista-toast-container {
      bottom: 24px;
      left: auto;
      right: 24px;
      transform: none;
      align-items: flex-end;
    }
  }

  .conquista-toast {
    position: relative;
    display: flex;
    align-items: center;
    gap: 14px;
    background: var(--bg2);
    border: 1.5px solid var(--accent);
    border-radius: 20px;
    padding: 14px 18px;
    width: 100%;
    box-shadow:
      0 8px 32px rgba(0,0,0,0.18),
      0 0 0 1px rgba(var(--accent-rgb), 0.12),
      0 0 40px rgba(var(--accent-rgb), 0.08);
    overflow: hidden;
    animation: ctSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }

  .conquista-toast--exit {
    animation: ctSlideOut 0.4s ease-in both;
  }

  @keyframes ctSlideIn {
    from {
      opacity: 0;
      transform: translateY(24px) scale(0.92);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes ctSlideOut {
    from {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
    to {
      opacity: 0;
      transform: translateY(16px) scale(0.95);
    }
  }

  .ct-glow {
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.06) 0%, transparent 60%);
    pointer-events: none;
  }

  .ct-icon {
    font-size: 2rem;
    width: 52px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--accent-dim);
    border-radius: 14px;
    flex-shrink: 0;
    position: relative;
    z-index: 1;
    animation: ctIconPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both;
  }

  @keyframes ctIconPop {
    from { transform: scale(0.5) rotate(-15deg); opacity: 0; }
    to { transform: scale(1) rotate(0deg); opacity: 1; }
  }

  .ct-body {
    flex: 1;
    min-width: 0;
    position: relative;
    z-index: 1;
  }

  .ct-label {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    color: var(--accent);
    margin-bottom: 2px;
  }

  .ct-title {
    font-size: 1rem;
    font-weight: 800;
    color: var(--text);
    line-height: 1.2;
    margin-bottom: 2px;
  }

  .ct-desc {
    font-size: 0.75rem;
    color: var(--text2);
    line-height: 1.4;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .ct-sparkle {
    font-size: 1rem;
    color: var(--accent);
    opacity: 0.6;
    flex-shrink: 0;
    position: relative;
    z-index: 1;
    animation: ctSparkle 1.5s ease-in-out infinite;
  }

  @keyframes ctSparkle {
    0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.6; }
    50% { transform: scale(1.4) rotate(20deg); opacity: 1; }
  }
`
