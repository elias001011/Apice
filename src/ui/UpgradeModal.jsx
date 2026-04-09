/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getUpgradeModalContent,
  PREMIUM_BENEFITS,
  UPGRADE_REASONS,
} from '../services/upgradeTrigger.js'

// ── Context ───────────────────────────────────────────────────────────────────
const UpgradeModalContext = createContext(null)

/**
 * Hook para abrir o UpgradeModal de qualquer componente filho.
 *
 * Uso:
 *   const { openUpgradeModal } = useUpgradeModal()
 *   openUpgradeModal({ reason: UPGRADE_REASONS.QUOTA_BLOCKED })
 */
export function useUpgradeModal() {
  const ctx = useContext(UpgradeModalContext)
  if (!ctx) {
    // Fallback seguro quando chamado fora do provider (ex: testes)
    return { openUpgradeModal: () => {}, closeUpgradeModal: () => {} }
  }
  return ctx
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function UpgradeModalProvider({ children }) {
  const [state, setState] = useState({
    open: false,
    reason: UPGRADE_REASONS.SOFT_INVITE,
    featureLabel: '',
  })

  const openUpgradeModal = useCallback(({ reason = UPGRADE_REASONS.SOFT_INVITE, featureLabel = '' } = {}) => {
    setState({ open: true, reason, featureLabel })
  }, [])

  const closeUpgradeModal = useCallback(() => {
    setState((prev) => ({ ...prev, open: false }))
  }, [])

  return (
    <UpgradeModalContext.Provider value={{ openUpgradeModal, closeUpgradeModal }}>
      {children}
      {state.open && (
        <UpgradeModal
          reason={state.reason}
          featureLabel={state.featureLabel}
          onClose={closeUpgradeModal}
        />
      )}
    </UpgradeModalContext.Provider>
  )
}

// ── Modal Component ───────────────────────────────────────────────────────────
function UpgradeModal({ reason, featureLabel, onClose }) {
  const navigate = useNavigate()
  const content = getUpgradeModalContent(reason, featureLabel)

  const handleSeePlans = () => {
    onClose()
    navigate('/planos')
  }

  return (
    <div
      className="upgrade-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <style>{upgradeModalCss}</style>
      <div className="upgrade-card anim-scale-up" role="dialog" aria-modal="true" aria-label="Conhecer os planos pagos">

        {/* Header */}
        <div className="upgrade-header">
          <div className="upgrade-icon-ring">
            <span className="upgrade-icon-emoji">{content.icon}</span>
          </div>
          <button
            className="upgrade-close-btn"
            onClick={onClose}
            aria-label="Fechar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="upgrade-body">
          <h2 className="upgrade-title">{content.title}</h2>
          <p className="upgrade-subtitle">{content.subtitle}</p>

          {/* Benefits list */}
          <div className="upgrade-benefits">
            {PREMIUM_BENEFITS.slice(0, 5).map((benefit) => (
              <div className="upgrade-benefit-row" key={benefit.label}>
                <span className="upgrade-benefit-icon">{benefit.icon}</span>
                <span className="upgrade-benefit-label">{benefit.label}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            id="upgrade-modal-cta"
            className="upgrade-cta-btn"
            onClick={handleSeePlans}
          >
            <span>Ver planos e preços</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>

          <button
            id="upgrade-modal-dismiss"
            className="upgrade-dismiss-btn"
            onClick={onClose}
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  )
}

// ── CSS ───────────────────────────────────────────────────────────────────────
const upgradeModalCss = `
  .upgrade-overlay {
    position: fixed;
    inset: 0;
    background: var(--overlay-surface);
    backdrop-filter: blur(var(--overlay-blur));
    -webkit-backdrop-filter: blur(var(--overlay-blur));
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    animation: upgradeOverlayIn 0.25s ease-out forwards;
  }

  @keyframes upgradeOverlayIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .upgrade-card {
    background: var(--modal-surface);
    border: 1px solid var(--modal-border);
    border-radius: 28px;
    width: 100%;
    max-width: 440px;
    overflow: hidden;
    box-shadow: var(--modal-shadow);
    backdrop-filter: blur(var(--modal-blur)) saturate(var(--glass-saturate));
    -webkit-backdrop-filter: blur(var(--modal-blur)) saturate(var(--glass-saturate));
    position: relative;
    isolation: isolate;
  }

  .upgrade-header {
    background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.08), rgba(var(--accent-rgb), 0.02));
    padding: 2rem 2rem 1.5rem;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    border-bottom: 1px solid var(--border);
  }

  html[data-fx="none"] .upgrade-header {
    background: var(--bg3);
  }

  html[data-fx="blur"] .upgrade-header {
    background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.1), rgba(255, 255, 255, 0.03));
  }

  html[data-theme="dark"][data-fx="blur"] .upgrade-header {
    background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.12), rgba(255, 255, 255, 0.02));
  }

  .upgrade-icon-ring {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 20px rgba(var(--accent-rgb), 0.24);
  }

  html[data-fx="none"] .upgrade-overlay {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  html[data-fx="none"] .upgrade-card {
    box-shadow: none;
  }

  html[data-fx="none"] .upgrade-icon-ring {
    background: var(--bg3);
    border: 1px solid var(--border);
    box-shadow: none;
  }

  .upgrade-icon-emoji {
    font-size: 1.75rem;
    line-height: 1;
  }

  .upgrade-close-btn {
    background: var(--bg3);
    border: 1px solid var(--border);
    border-radius: 10px;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text3);
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .upgrade-close-btn:hover {
    background: var(--bg2);
    color: var(--text);
    border-color: var(--border2);
  }

  html[data-fx="none"] .upgrade-close-btn {
    background: var(--bg3);
    box-shadow: none;
  }

  html[data-fx="none"] .upgrade-close-btn:hover {
    background: var(--bg2);
    border-color: var(--border);
  }

  .upgrade-body {
    padding: 1.75rem 2rem 2rem;
  }

  .upgrade-title {
    font-family: 'DM Serif Display', serif;
    font-size: 1.6rem;
    color: var(--text);
    margin-bottom: 0.6rem;
    line-height: 1.2;
  }

  .upgrade-subtitle {
    font-size: 0.9rem;
    color: var(--text2);
    line-height: 1.65;
    margin-bottom: 1.5rem;
  }

  .upgrade-benefits {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 1.75rem;
    padding: 1.25rem;
    background: var(--bg3);
    border-radius: 16px;
    border: 1px solid var(--border);
  }

  html[data-fx="none"] .upgrade-benefits {
    background: var(--bg3);
  }

  .upgrade-benefit-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .upgrade-benefit-icon {
    font-size: 1.1rem;
    flex-shrink: 0;
    width: 22px;
    text-align: center;
  }

  .upgrade-benefit-label {
    font-size: 0.875rem;
    color: var(--text);
    font-weight: 500;
  }

  .upgrade-cta-btn {
    width: 100%;
    padding: 14px;
    background: var(--accent);
    color: #0f0f0f;
    border: none;
    border-radius: 14px;
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.2s;
    box-shadow: 0 6px 20px rgba(var(--accent-rgb), 0.3);
    margin-bottom: 12px;
  }

  .upgrade-cta-btn:hover {
    background: var(--accent2);
    transform: translateY(-2px);
    box-shadow: 0 10px 28px rgba(var(--accent-rgb), 0.4);
  }

  html[data-fx="none"] .upgrade-cta-btn {
    background: var(--bg3);
    color: var(--text);
    border: 1px solid var(--border);
    box-shadow: none;
  }

  html[data-fx="none"] .upgrade-cta-btn:hover {
    background: var(--bg2);
    transform: none;
    box-shadow: none;
  }

  .upgrade-cta-btn:active {
    transform: translateY(0);
  }

  .upgrade-dismiss-btn {
    width: 100%;
    padding: 11px;
    background: transparent;
    color: var(--text3);
    border: 1.5px solid var(--border2);
    border-radius: 14px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .upgrade-dismiss-btn:hover {
    color: var(--text2);
    border-color: var(--accent);
    background: var(--accent-dim);
  }

  html[data-fx="none"] .upgrade-dismiss-btn {
    background: var(--bg3);
    border-color: var(--border);
    box-shadow: none;
  }

  html[data-fx="none"] .upgrade-dismiss-btn:hover {
    color: var(--text);
    background: var(--bg2);
    border-color: var(--border2);
  }

  .anim-scale-up {
    animation: scaleUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  @keyframes scaleUp {
    from { opacity: 0; transform: scale(0.94) translateY(12px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
`
