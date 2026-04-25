import { useCallback, useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { getAiUsageDayKey, subscribeFreePlanUsage } from '../services/freePlanUsage.js'
import { subscribeBillingState } from '../services/billingState.js'
import { getQuotaInfo } from '../services/upgradeTrigger.js'
import '../styles/quotaBanner.css'

const DISMISSED_KEY = 'apice:quota-banner-dismissed-day:v1'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readDismissedDayKey() {
  if (!canUseStorage()) return ''
  try {
    return localStorage.getItem(DISMISSED_KEY) || ''
  } catch {
    return ''
  }
}

function storeDismissedDayKey(dayKey) {
  if (!canUseStorage()) return
  try {
    localStorage.setItem(DISMISSED_KEY, dayKey)
  } catch {
    // ignore
  }
}

function resolveBannerState() {
  const quota = getQuotaInfo()
  const dayKey = getAiUsageDayKey()
  const dismissedDayKey = readDismissedDayKey()
  const visible = quota.status === 'free' && quota.blocked && dismissedDayKey !== dayKey

  return {
    visible,
    dayKey,
    quota,
  }
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.72 3h16.92a2 2 0 0 0 1.72-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

export function QuotaLimitBanner() {
  const [state, setState] = useState(() => resolveBannerState())

  const refresh = useCallback(() => {
    setState(resolveBannerState())
  }, [])

  useEffect(() => {
    const unlistenUsage = subscribeFreePlanUsage(refresh)
    const unlistenBilling = subscribeBillingState(refresh)

    return () => {
      unlistenUsage()
      unlistenBilling()
    }
  }, [refresh])

  const handleClose = useCallback(() => {
    storeDismissedDayKey(state.dayKey)
    setState((prev) => ({ ...prev, visible: false }))
  }, [state.dayKey])

  if (!state.visible) return null

  const { quota } = state
  const isGuest = Boolean(quota.isGuest)

  return (
    <section className="quota-banner" role="alert" aria-live="polite">
      <div className="quota-banner__icon" aria-hidden="true">
        <WarningIcon />
      </div>

      <div className="quota-banner__content">
        <div className="quota-banner__eyebrow">
          {isGuest ? 'Limite do modo convidado atingido' : 'Cota diária atingida'}
        </div>
        <div className="quota-banner__title">
          {isGuest
            ? `Você já usou ${quota.used}/${quota.limit} solicitações de IA no modo convidado hoje.`
            : `Você já usou ${quota.used}/${quota.limit} solicitações de IA hoje.`}
        </div>
        <div className="quota-banner__text">
          {isGuest
            ? 'Crie uma conta nova para continuar usando a IA com cota separada, sincronização na nuvem e menos risco de abuso.'
            : 'Atualize para o Premium para aumentar sua cota diária e continuar usando a IA sem interrupções.'}
        </div>
      </div>

      <div className="quota-banner__actions">
        <NavLink to={isGuest ? '/cadastro' : '/planos'} className="quota-banner__cta">
          {isGuest ? 'Criar conta nova' : 'Atualizar para Premium'}
        </NavLink>
        <button
          type="button"
          className="quota-banner__close"
          onClick={handleClose}
          aria-label="Fechar aviso de cota diaria"
          title="Fechar"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </section>
  )
}
