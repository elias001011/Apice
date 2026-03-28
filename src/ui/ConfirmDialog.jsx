import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onCancel?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onCancel])

  if (!open || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div
      className="confirm-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel?.()
        }
      }}
    >
      <div
        className="card confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={`confirm-badge${danger ? ' danger' : ''}`}>
          {danger ? 'Atenção' : 'Confirmação'}
        </div>
        <div id="confirm-dialog-title" className="confirm-title">
          {title}
        </div>
        <div id="confirm-dialog-message" className="confirm-message">
          {message}
        </div>
        <div className="confirm-actions">
          <button type="button" className="btn-ghost" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn-primary${danger ? ' danger' : ''}`}
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
