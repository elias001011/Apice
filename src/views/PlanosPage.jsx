import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import { authFetch } from '../services/authFetch.js'
import {
  getBillingState,
  getBillingStatusDescription,
  getBillingStatusLabel,
  hasUsedTrial,
  markPlanPaid,
  isTrialActive,

  saveBillingState,
  subscribeBillingState,
  TRIAL_DAYS,
} from '../services/billingState.js'
import {
  getFreePlanUsageRows,
  subscribeFreePlanUsage,
} from '../services/freePlanUsage.js'
import {
  PRICING_PLANS,
  getPricingPlanByKey,
  getQuotaInfo,
} from '../services/upgradeTrigger.js'

function getAbacatePayErrorMessage(data, fallback) {
  const primaryError = String(data?.error ?? '').trim()
  if (primaryError) return primaryError

  const details = data?.details
  if (typeof details === 'string' && details.trim()) {
    return details.trim()
  }

  if (details && typeof details === 'object') {
    const nestedMessage = String(details.message ?? details.error ?? details.details ?? '').trim()
    if (nestedMessage) return nestedMessage
  }

  return fallback
}

export function PlanosPage() {
  const { user, isGuest } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const verificationKeyRef = useRef('')

  const [billingState, setBillingState] = useState(() => getBillingState())
  const [quotaInfo, setQuotaInfo] = useState(() => getQuotaInfo())
  const [flash, setFlash] = useState(null)
  const [busyPlanKey, setBusyPlanKey] = useState('')
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    const refresh = () => {
      setBillingState(getBillingState())
      setQuotaInfo(getQuotaInfo())
    }

    refresh()
    const unlistenUsage = subscribeFreePlanUsage(refresh)
    const unlistenBilling = subscribeBillingState(refresh)

    return () => {
      unlistenUsage()
      unlistenBilling()
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const billingAction = params.get('billing')
    if (!['return', 'complete'].includes(billingAction)) {
      return
    }

    const checkoutId = params.get('checkoutId') || billingState.checkoutId || ''
    const externalId = params.get('externalId') || billingState.externalId || ''
    const verificationKey = `${billingAction}:${checkoutId || externalId}:${location.search}`
    if (verificationKeyRef.current === verificationKey) return
    verificationKeyRef.current = verificationKey

    let cancelled = false

    const verify = async () => {
      if (!checkoutId && !externalId) {
        setFlash({
          tone: 'warning',
          text: 'Não encontramos um checkout pendente para verificar. Se você acabou de pagar, volte para a tela de planos e tente abrir o fluxo novamente.',
        })
        return
      }

      setVerifying(true)
      try {
        const url = new URL('/.netlify/functions/abacatepay-checkout', window.location.origin)
        if (checkoutId) {
          url.searchParams.set('checkoutId', checkoutId)
        } else {
          url.searchParams.set('externalId', externalId)
        }

        const response = await fetch(url)
        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(getAbacatePayErrorMessage(data, 'Não foi possível verificar o checkout.'))
        }

        if (cancelled) return

        if (data.paid) {
          const planKey = data.planKey || params.get('plan') || billingState.planKey || 'monthly'
          markPlanPaid({
            planKey,
            checkoutId: data.checkout?.id || checkoutId,
            externalId: data.externalId || externalId,
            subscriptionId: data.checkout?.id || '',
            paidAt: new Date().toISOString(),
          })
          setFlash({
            tone: 'success',
            text: `Pagamento confirmado. O plano ${getPricingPlanByKey(planKey).label.toLowerCase()} está ativo agora.`,
          })
        } else {
          setFlash({
            tone: 'info',
            text: 'O pagamento ainda está pendente. Seu acesso temporário continua valendo até a confirmação da assinatura.',
          })
        }
      } catch (error) {
        if (!cancelled) {
          setFlash({
            tone: 'error',
            text: error?.message || 'Falha ao verificar o checkout.',
          })
        }
      } finally {
        if (!cancelled) {
          setVerifying(false)
          navigate('/planos', { replace: true })
        }
      }
    }

    void verify()

    return () => {
      cancelled = true
    }
  }, [billingState.checkoutId, billingState.externalId, billingState.planKey, location.search, navigate])

  const activePlan = billingState.planKey ? getPricingPlanByKey(billingState.planKey) : null
  const trialAlreadyUsed = hasUsedTrial()
  const trialCurrentlyActive = isTrialActive()

  const activeAccessLabel = false ? 'x' : 'Teste grátis'
  const activeAccessLabelLower = activeAccessLabel.toLowerCase()
  const trialEnded = trialAlreadyUsed && !trialCurrentlyActive && billingState.status !== 'paid'
  const quotaRow = quotaInfo || getQuotaInfo()
  const activeLimit = quotaRow.limit || getFreePlanUsageRows()[0]?.limit || 5
  const trialEndDate = billingState.trialEndsAt ? new Date(billingState.trialEndsAt) : null
  const trialEndLabel = trialEndDate && Number.isFinite(trialEndDate.getTime())
    ? trialEndDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
    : ''
  const statusLabel = isGuest ? 'Convidado' : getBillingStatusLabel(billingState.status)
  const statusDescription = isGuest
    ? `Modo convidado ativo. A IA aqui fica limitada a ${quotaRow.limit} solicitações por dia e os dados ficam só neste navegador até criar uma conta nova.`
    : trialEnded && trialEndLabel
      ? `${billingState.trialKind === 'welcome' ? 'Premium temporário' : 'Teste grátis'} encerrado em ${trialEndLabel}`
      : getBillingStatusDescription(billingState.status)

  const currentStateText = (() => {
    if (isGuest) {
      return `Modo convidado ativo. A IA fica limitada a ${quotaRow.limit} solicitações por dia neste navegador e os dados não sincronizam na nuvem até você criar uma conta nova.`
    }

    if (trialCurrentlyActive) {
      if (false) {
        return activePlan
          ? `Premium temporário ativo no plano ${activePlan.label}.`
          : 'Teste grátis ativo por 7 dias.'
      }

      return activePlan
        ? `Teste grátis ativo no plano ${activePlan.label}.`
        : `Teste grátis ativo por ${TRIAL_DAYS} dias.`
    }

    if (trialEnded) {
      const endedLabel = billingState.trialKind === 'welcome' ? 'premium temporário' : 'teste grátis'
      return trialEndLabel
        ? `Seu ${endedLabel} terminou em ${trialEndLabel}. Agora você pode assinar qualquer plano para continuar.`
        : `Seu ${endedLabel} terminou. Agora você pode assinar qualquer plano para continuar.`
    }

    if (billingState.status === 'paid') {
      return activePlan
        ? `Plano pago ativo no período ${activePlan.label}.`
        : 'Plano pago ativo.'
    }

    if (trialAlreadyUsed) {
      return billingState.trialKind === 'welcome'
        ? 'O premium temporário já foi usado nesta conta. A próxima ativação paga começa após o checkout.'
        : 'O teste grátis já foi usado nesta conta. A próxima ativação paga começa após o checkout.'
    }

    return `Conta gratuita com ${activeLimit} usos de IA por dia.`
  })()

  const guestNotice = isGuest
    ? `Você está no modo convidado. Seus dados ficam só neste navegador até criar uma conta nova, e a IA aqui fica limitada a ${quotaRow.limit} solicitações por dia.`
    : ''

  const handleCheckout = async (plan) => {
    if (!user) {
      navigate('/login')
      return
    }

    if (isGuest) {
      navigate('/cadastro', { state: { from: '/planos' } })
      return
    }

    setBusyPlanKey(plan.key)
    setFlash(null)

    try {
      const trialAvailable = billingState.status === 'free' && !trialAlreadyUsed
      const trialActive = trialCurrentlyActive

      if (trialActive) {
        const activeTrialPlan = billingState.planKey ? getPricingPlanByKey(billingState.planKey) : null
        setFlash({
          tone: 'warning',
          text: activeTrialPlan && activeTrialPlan.key !== plan.key
            ? `Você já está no ${activeAccessLabelLower} do plano ${activeTrialPlan.label}. Troque de plano só depois do fim do período ativo${trialEndLabel ? `, em ${trialEndLabel}` : ''}.`
            : `Seu ${activeAccessLabelLower} do plano ${plan.label} já está ativo${trialEndLabel ? ` até ${trialEndLabel}` : ''}.`,
        })
        return
      }

      // We call the real checkout even for trials now
      const trialRequested = trialAvailable

      console.log('[planos] trialAvailable:', trialAvailable, '| trialAlreadyUsed:', trialAlreadyUsed, '| billingState.status:', billingState.status, '| isTrial:', trialRequested)

      const response = await authFetch('/.netlify/functions/abacatepay-checkout', {
        method: 'POST',
        body: JSON.stringify({
          planKey: plan.key,
          isTrial: trialRequested,
          // userId is derived from JWT on the backend
          userEmail: user.email || '',
          customerName: user?.user_metadata?.full_name || '',
          customerCellphone: user?.phone || user?.user_metadata?.phone || user?.user_metadata?.cellphone || '',
          customerTaxId: user?.user_metadata?.taxId || user?.user_metadata?.cpf || user?.user_metadata?.cnpj || '',
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(getAbacatePayErrorMessage(data, 'Não foi possível criar o checkout.'))
      }

      const checkoutUrl = data.checkoutUrl || data.checkout?.url || data.url || ''
      const checkoutId = data.checkoutId || data.checkout?.id || data.id || ''
      if (!checkoutUrl) {
        throw new Error(getAbacatePayErrorMessage(data, 'A AbacatePay não retornou a URL de checkout.'))
      }

      saveBillingState({
        checkoutId,
        externalId: data.externalId,
      })

      setFlash({
        tone: 'info',
        text: `Checkout do plano ${plan.label} aberto. A AbacatePay continua cuidando da confirmação do período de acesso.`,
      })

      await new Promise((resolve) => window.setTimeout(resolve, 120))
      window.location.assign(checkoutUrl)
    } catch (error) {
      setFlash({
        tone: 'error',
        text: error?.message || 'Não foi possível abrir o checkout agora.',
      })
    } finally {
      setBusyPlanKey('')
    }
  }

  const handleCancelSubscription = async () => {
    if (!user) {
      navigate('/login')
      return
    }

    if (isGuest) {
      setFlash({
        tone: 'warning',
        text: 'O modo convidado não tem assinatura para cancelar. Crie uma conta nova para contratar um plano.',
      })
      return
    }

    const cancelPrompt = billingState.status === 'paid'
      ? 'Tem certeza que deseja cancelar sua assinatura? Seu acesso ao plano pago continuará até o fim do período já pago. Após isso, sua conta voltará para o plano gratuito.'
      : false
        ? 'Tem certeza que deseja encerrar seu premium temporário? Sua conta voltará para o plano gratuito imediatamente.'
        : 'Tem certeza que deseja encerrar seu teste grátis? Sua conta voltará para o plano gratuito imediatamente.'

    if (!confirm(cancelPrompt)) {
      return
    }

    setBusyPlanKey('cancel')
    setFlash(null)

    try {
      const response = await authFetch('/.netlify/functions/cancel-subscription', {
        method: 'POST',
        body: JSON.stringify({
          checkoutId: billingState.checkoutId || '',
          externalId: billingState.externalId || '',
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data?.error || 'Não foi possível cancelar a assinatura.')
      }

      // Atualiza estado local
      if (data.userDowngraded) {
        // Limpa billing state para free
        localStorage.removeItem('apice:billing-state:v1')
        localStorage.removeItem('apice:plan:tier')
        window.dispatchEvent(new CustomEvent('apice:billing-state-updated'))
        window.dispatchEvent(new CustomEvent('apice:account-state-updated'))
        window.dispatchEvent(new CustomEvent('apice:free-plan-usage-updated'))

        setFlash({
          tone: data.requiresManualRefund ? 'warning' : 'success',
          text: data.requiresManualRefund
            ? 'Assinatura cancelada. Como o pagamento já foi processado, solicite reembolso pelo email suporte@apice.com. Seu acesso continua até o fim do período.'
            : billingState.status === 'paid'
              ? 'Assinatura cancelada com sucesso. Sua conta voltará ao plano gratuito.'
              : false
                ? 'Premium temporário encerrado com sucesso. Sua conta voltou ao plano gratuito.'
                : 'Teste grátis encerrado com sucesso. Sua conta voltou ao plano gratuito.',
        })
      } else {
        setFlash({
          tone: 'warning',
          text: data?.message || 'Não foi possível processar o cancelamento.',
        })
      }
    } catch (error) {
      setFlash({
        tone: 'error',
        text: error?.message || 'Não foi possível cancelar a assinatura.',
      })
    } finally {
      setBusyPlanKey('')
    }
  }

  const getPlanActionLabel = (plan) => {
    if (isGuest) {
      return 'Criar conta nova'
    }

    const isCurrentPlan = billingState.planKey === plan.key

    if (billingState.status === 'paid' && isCurrentPlan) {
      return 'Plano ativo'
    }

    if (trialCurrentlyActive && isCurrentPlan) {
      return 'Teste grátis ativo'
    }

    if (trialCurrentlyActive) {
      return isCurrentPlan
        ? ('Teste grátis ativo')
        : 'Aguardar fim do teste'
    }

    if (billingState.status === 'paid') {
      return 'Trocar de plano'
    }

    if (!trialAlreadyUsed) {
      return 'Começar teste grátis'
    }

    return 'Assinar agora'
  }

  const getPlanHint = (plan) => {
    if (isGuest) {
      return 'O modo convidado usa só dados locais. Crie uma conta nova para contratar este plano.'
    }

    if (billingState.status === 'paid' && billingState.planKey === plan.key) {
      return 'Sua assinatura já está ativa neste plano.'
    }

    if (trialCurrentlyActive && billingState.planKey === plan.key) {
      return trialEndLabel
        ? `Seu ${activeAccessLabelLower} termina em ${trialEndLabel}.`
        : `Seu ${activeAccessLabelLower} está ativo nesta conta.`
    }

    if (trialCurrentlyActive) {
      return trialEndLabel
        ? `Você já está no ${activeAccessLabelLower} do plano ${billingState.planKey ? getPricingPlanByKey(billingState.planKey).label : 'atual'}. Troque só depois de ${trialEndLabel}.`
        : `Você já está no ${activeAccessLabelLower} nesta conta. Troque de plano só depois do período ativo.`
    }

    if (trialEnded) {
      const endedLabel = billingState.trialKind === 'welcome' ? 'premium temporário' : 'teste grátis'
      return trialEndLabel
        ? `O ${endedLabel} terminou em ${trialEndLabel}. Agora a próxima ativação começa paga.`
        : `O ${endedLabel} terminou. Agora a próxima ativação começa paga.`
    }

    if (trialAlreadyUsed) {
      return billingState.trialKind === 'welcome'
        ? 'O premium temporário já foi usado nesta conta. Os próximos checkouts começam pagos.'
        : 'O teste grátis já foi usado nesta conta. Os próximos checkouts começam pagos.'
    }

    return `A primeira ativação manual desta conta libera ${TRIAL_DAYS} dias de teste grátis.`
  }

  return (
    <>
      <style>{planosCss}</style>
      <div className="view-container planos-page">
        <Link to="/perfil" className="back-link">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Voltar ao perfil
        </Link>

        <section className="planos-hero anim anim-d1">
          <div className="planos-kicker">Planos e cobrança</div>
          <h1 className="planos-title">Mais folga para a IA, com premium temporário nas contas novas</h1>
          <p className="planos-subtitle">
            A conta gratuita continua com 5 usos de IA por dia. Ao pagar, a cota sobe para 10 usos diários.
            Contas criadas nesta atualização recebem premium temporário por 30 dias.
            O teste grátis manual continua com 7 dias e só pode ser ativado uma vez por conta.
            No checkout, o cupom <strong>FREE TEST</strong> libera esses 7 dias de premium.
          </p>

          {isGuest && (
            <div className="planos-guest-banner">
              <div>
                <div className="planos-guest-title">Modo convidado ativo</div>
                <div className="planos-guest-copy">
                  Seus dados estão só neste navegador. Crie uma conta nova para levar tudo para a nuvem antes de contratar um plano.
                </div>
              </div>
              <Link to="/cadastro" className="planos-guest-btn">
                Criar conta nova
              </Link>
            </div>
          )}

          {guestNotice && (
            <div className="planos-flash info">
              {guestNotice}
            </div>
          )}

          <div className="planos-status-strip">
            <div className="planos-status-chip">
              <div className="planos-status-label">Status da conta</div>
              <div className="planos-status-value">{statusLabel}</div>
              <div className="planos-status-copy">{statusDescription}</div>
            </div>
            <div className="planos-status-chip">
              <div className="planos-status-label">IA hoje</div>
              <div className="planos-status-value">{quotaRow.used}/{quotaRow.limit}</div>
              <div className="planos-status-copy">
                {quotaRow.blocked ? 'Limite de hoje atingido.' : `${quotaRow.remaining} usos restantes hoje.`}
              </div>
            </div>
            <div className="planos-status-chip">
              <div className="planos-status-label">Acesso temporário</div>
              <div className="planos-status-value">
                {trialCurrentlyActive
                  ? `Teste grátis ${TRIAL_DAYS} dias`
                  : trialAlreadyUsed
                    ? 'Já usado'
                    : 'Disponível'}
              </div>
              <div className="planos-status-copy">
                {currentStateText}
              </div>
            </div>
          </div>

          {flash && (
            <div className={`planos-flash ${flash.tone}`}>
              {flash.text}
            </div>
          )}

          {verifying && (
            <div className="planos-flash info">
              Verificando o status do checkout da AbacatePay...
            </div>
          )}

          {/* Seção de gerenciamento de assinatura ativa */}
          {!isGuest && (billingState.status === 'paid' || trialCurrentlyActive) && (
            <div className="planos-management-strip">
              <div className="management-card">
                <div className="management-label">
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  Gerenciar assinatura
                </div>
                <div className="management-details">
                  <div className="management-row">
                    <span className="management-key">Plano:</span>
                    <span className="management-value">{activePlan?.label || billingState.planKey || 'N/A'}</span>
                  </div>
                  <div className="management-row">
                    <span className="management-key">Status:</span>
                    <span className="management-value" data-status={billingState.status}>
                      {billingState.status === 'paid'
                        ? 'Pago'
                        : false
                          ? 'Premium temporário ativo'
                          : 'Teste grátis ativo'}
                    </span>
                  </div>
                  {trialCurrentlyActive && trialEndLabel && (
                    <div className="management-row">
                      <span className="management-key">{'Teste até:'}</span>
                      <span className="management-value">{trialEndLabel}</span>
                    </div>
                  )}
                  {billingState.checkoutId && (
                    <div className="management-row">
                      <span className="management-key">Checkout ID:</span>
                      <span className="management-value mono">{billingState.checkoutId}</span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={handleCancelSubscription}
                  disabled={busyPlanKey === 'cancel'}
                >
                  {busyPlanKey === 'cancel' ? 'Cancelando...' : billingState.status === 'paid' ? 'Cancelar assinatura' : 'Encerrar período'}
                </button>
                <div className="management-hint">
                  {billingState.status === 'paid'
                    ? 'O cancelamento impede renovações futuras. Seu acesso continua ativo até o fim do período já pago.'
                    : false
                      ? `Encerrar o teste grátis agora volta a conta para gratuito imediatamente.`
                      : `Este teste grátis dura ${TRIAL_DAYS} dias. Encerrar agora volta a conta para gratuito imediatamente.`}
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="planos-section anim anim-d2">
          <div className="planos-section-head">
            <div>
              <div className="section-label">O que muda ao pagar</div>
              <p className="planos-section-copy">
                Não é uma lista de recursos secretos. O pagamento muda a cota diária e o status da conta,
                mantendo o mesmo histórico, a mesma aparência e os mesmos fluxos de IA.
              </p>
            </div>
          </div>

          <div className="planos-change-grid">
            <div className="planos-change-card">
              <div className="planos-change-number">5 → 10</div>
              <div className="planos-change-text">Usos de IA por dia. Cada ação nova continua contando como 1 uso.</div>
            </div>
            <div className="planos-change-card">
              <div className="planos-change-number">{TRIAL_DAYS} dias</div>
              <div className="planos-change-text">Premium automático para contas criadas nesta atualização.</div>
            </div>
            <div className="planos-change-card">
              <div className="planos-change-number">{TRIAL_DAYS} dias</div>
              <div className="planos-change-text">Teste grátis manual continua disponível na primeira ativação.</div>
            </div>
            <div className="planos-change-card">
              <div className="planos-change-number">1 uso</div>
              <div className="planos-change-text">Tema, corretor, Radar, detalhes e resumo automático contam igual.</div>
            </div>
            <div className="planos-change-card">
              <div className="planos-change-number">{activePlan?.label || 'Conta'}</div>
              <div className="planos-change-text">Seu histórico e preferências continuam sincronizados por conta.</div>
            </div>
          </div>
        </section>

        <section className="planos-pricing anim anim-d3">
          <div className="planos-section-head">
            <div>
              <div className="section-label">Escolha o período</div>
              <p className="planos-section-copy">
                Todos os períodos liberam o mesmo uso: 10 solicitações de IA por dia após o período temporário.
                Contas novas recebem 30 dias de premium temporário e o teste grátis manual continua com 7 dias.
                A diferença está só no período de cobrança e no valor total.
              </p>
            </div>
          </div>

          <div className="planos-pricing-grid">
            {PRICING_PLANS.map((plan) => {
              const isCurrentPlan = billingState.planKey === plan.key && billingState.status !== 'free'
              const buttonLabel = getPlanActionLabel(plan)
              const buttonHint = getPlanHint(plan)

              return (
                <article key={plan.key} className={`pricing-card${plan.recommended ? ' recommended' : ''}${isCurrentPlan ? ' active' : ''}`}>
                  {plan.recommended && <div className="pricing-badge">Mais vantajoso</div>}

                  <div className="plan-tier">{plan.label}</div>
                  <div className="plan-price">
                    <span className="plan-price-value">{plan.totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    <span className="plan-price-period">/{plan.billingPeriodLabel}</span>
                  </div>
                  <div className="plan-price-note">
                    {plan.pricePerMonth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} por mês em média
                  </div>

                  <div className="plan-card-note">
                    {plan.billingLabel}. Depois do período temporário, o checkout usa o produto da AbacatePay já cadastrado.
                    Para ativar o teste grátis de 7 dias, use o cupom <strong>FREE TEST</strong> no checkout.
                  </div>

                  <div className="plan-card-list">
                    <div className="plan-card-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>10 usos de IA por dia após o período temporário</span>
                    </div>
                    <div className="plan-card-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Contas novas ganham 30 dias de premium temporário</span>
                    </div>
                    <div className="plan-card-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Teste grátis manual continua com 7 dias na primeira ativação</span>
                    </div>
                    <div className="plan-card-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Mesmas ferramentas do app, com mais folga de uso</span>
                    </div>
                  </div>

                  <div className="plan-cta">
                    <button
                      type="button"
                      className="plan-cta-btn"
                      onClick={() => handleCheckout(plan)}
                      disabled={
                        !isGuest && (
                          busyPlanKey === plan.key
                          || (billingState.status === 'paid' && billingState.planKey === plan.key)
                          || trialCurrentlyActive
                        )
                      }
                    >
                      {isGuest
                        ? 'Criar conta nova'
                        : busyPlanKey === plan.key
                          ? 'Abrindo checkout...'
                          : buttonLabel}
                    </button>
                    <div className="plan-cta-hint">
                      {buttonHint}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <section className="planos-faq anim anim-d4">
          <div className="planos-section-head">
            <div>
              <div className="section-label">Perguntas frequentes</div>
              <p className="planos-section-copy">
                Tudo que dispara IA conta como chamada. O restante das telas permanece igual.
              </p>
            </div>
          </div>

          <div className="faq-list">
            <div className="faq-item">
              <div className="faq-q">O que conta como uso de IA?</div>
              <div className="faq-a">
                Cada resultado novo conta como 1 uso: tema dinâmico, correção de redação, chamada direta de IA,
                busca do Radar, ver detalhes do Radar e resumo automático.
              </div>
            </div>
            <div className="faq-item">
              <div className="faq-q">Posso repetir o teste grátis em outro plano?</div>
              <div className="faq-a">
                Não. O teste grátis manual de 7 dias é único por conta. Contas novas criadas nesta atualização recebem premium temporário de 30 dias automaticamente.
                Enquanto qualquer período temporário estiver ativo, a troca de plano fica bloqueada.
                Quando o período termina, a conta volta para gratuito e o próximo checkout já começa pago.
              </div>
            </div>
            <div className="faq-item">
              <div className="faq-q">O que acontece quando eu troco de conta?</div>
              <div className="faq-a">
                O consumo, o acesso temporário e o status do plano acompanham a conta. Se mudar de login, o outro usuário volta
                para o histórico e para o consumo dele.
              </div>
            </div>
            <div className="faq-item">
              <div className="faq-q">O que muda entre os períodos mensal, semestral e anual?</div>
              <div className="faq-a">
                Muda apenas a forma de cobrança e o valor total. A cota diária continua em 10 usos de IA por dia após o período temporário.
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}

const planosCss = `
  .planos-page {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .planos-hero,
  .pricing-card,
  .planos-change-card,
  .planos-status-chip,
  .faq-item {
    background: var(--bg2);
    border: 1.5px solid var(--border);
    transition: background 0.35s ease, border-color 0.2s ease, transform 0.25s ease, box-shadow 0.25s ease;
  }

  .planos-hero {
    border-radius: 30px;
    padding: 1.6rem 1.6rem 1.35rem;
    position: relative;
    overflow: hidden;
  }

  html[data-fx="gradients"] .planos-hero {
    background: linear-gradient(145deg, rgba(var(--accent-rgb), 0.05), transparent 58%), var(--bg2);
  }

  html[data-fx="blur"] .planos-hero {
    background: var(--bg2-glass);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
  }

  .planos-kicker {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--accent);
    background: var(--accent-dim);
    padding: 0.4rem 0.8rem;
    border-radius: 999px;
    margin-bottom: 1rem;
  }

  .planos-title {
    margin: 0;
    font-family: 'DM Serif Display', serif;
    font-size: clamp(2rem, 4vw, 2.8rem);
    line-height: 1.05;
    color: var(--text);
    max-width: 16ch;
  }

  .planos-subtitle,
  .planos-section-copy,
  .planos-status-copy,
  .plan-card-note,
  .plan-price-note,
  .plan-cta-hint,
  .faq-a {
    color: var(--text2);
    line-height: 1.65;
  }

  .planos-subtitle {
    margin: 0.8rem 0 0;
    font-size: 1rem;
    max-width: 66ch;
  }

  .planos-guest-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 1.1rem;
    border-radius: 18px;
    border: 1px solid rgba(var(--accent-rgb), 0.18);
    background: rgba(var(--accent-rgb), 0.06);
    margin-top: 1rem;
  }

  .planos-guest-title {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text);
  }

  .planos-guest-copy {
    margin-top: 3px;
    font-size: 0.82rem;
    line-height: 1.5;
    color: var(--text2);
    max-width: 50ch;
  }

  .planos-guest-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 40px;
    padding: 0 16px;
    border-radius: 12px;
    background: var(--accent);
    color: #0f0f0f;
    font-size: 0.84rem;
    font-weight: 700;
    text-decoration: none;
    white-space: nowrap;
    transition: transform 0.2s ease, background 0.2s ease;
  }

  .planos-guest-btn:hover {
    background: var(--accent2);
    transform: translateY(-1px);
  }

  .planos-status-strip {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.85rem;
    margin-top: 1.35rem;
  }

  .planos-status-chip {
    border-radius: 22px;
    padding: 1rem;
    min-width: 0;
  }

  .planos-status-label,
  .section-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text3);
  }

  .planos-status-value {
    margin-top: 0.4rem;
    font-size: 1rem;
    font-weight: 700;
    color: var(--text);
  }

  .planos-status-copy {
    margin-top: 0.3rem;
    font-size: 0.84rem;
  }

  .planos-flash {
    margin-top: 1rem;
    padding: 0.9rem 1rem;
    border-radius: 18px;
    font-size: 0.9rem;
    border: 1px solid transparent;
  }

  .planos-flash.success {
    background: rgba(var(--accent-rgb), 0.12);
    border-color: var(--accent-dim2);
    color: var(--accent);
  }

  .planos-flash.info {
    background: var(--bg3);
    border-color: var(--border);
    color: var(--text2);
  }

  .planos-flash.warning {
    background: rgba(255, 176, 32, 0.1);
    border-color: rgba(255, 176, 32, 0.28);
    color: var(--amber);
  }

  .planos-flash.error {
    background: rgba(225, 68, 68, 0.09);
    border-color: rgba(225, 68, 68, 0.22);
    color: var(--red);
  }

  /* Seção de gerenciamento de assinatura */
  .planos-management-strip {
    margin-top: 1rem;
  }

  .management-card {
    background: rgba(var(--accent-rgb), 0.04);
    border: 1.5px solid var(--border);
    border-radius: 22px;
    padding: 1.2rem;
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }

  .management-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text);
  }

  .management-details {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .management-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.88rem;
  }

  .management-key {
    color: var(--text3);
    font-weight: 500;
  }

  .management-value {
    color: var(--text);
    font-weight: 600;
  }

  .management-value.mono {
    font-family: 'Fira Code', monospace;
    font-size: 0.78rem;
    color: var(--text2);
  }

  .management-value.badge-paid,
  .management-value[data-status="paid"] {
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 0.78rem;
  }

  .management-value.badge-trial,
  .management-value[data-status="trial"] {
    background: rgba(255, 176, 32, 0.15);
    color: var(--amber);
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 0.78rem;
  }

  .btn-cancel {
    margin-top: 0.4rem;
    padding: 0.7rem 1.2rem;
    background: transparent;
    border: 1.5px solid rgba(225, 68, 68, 0.3);
    color: var(--red);
    border-radius: 14px;
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    align-self: flex-start;
  }

  .btn-cancel:hover:not(:disabled) {
    background: rgba(225, 68, 68, 0.08);
    border-color: rgba(225, 68, 68, 0.5);
  }

  .btn-cancel:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .management-hint {
    font-size: 0.8rem;
    color: var(--text3);
    line-height: 1.5;
  }

  .planos-section,
  .planos-pricing,
  .planos-faq {
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
  }

  .planos-section-head {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 1rem;
  }

  .planos-section-copy {
    margin: 0.45rem 0 0;
    max-width: 72ch;
    font-size: 0.95rem;
  }

  .planos-change-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.85rem;
  }

  .planos-change-card {
    border-radius: 22px;
    padding: 1rem;
  }

  html[data-fx="gradients"] .planos-change-card {
    background: linear-gradient(145deg, rgba(var(--accent-rgb), 0.03), transparent 58%), var(--bg2);
  }

  .planos-change-number {
    font-family: 'DM Serif Display', serif;
    font-size: 1.65rem;
    line-height: 1;
    color: var(--accent);
    margin-bottom: 0.4rem;
  }

  .planos-change-text {
    font-size: 0.88rem;
    color: var(--text2);
    line-height: 1.5;
  }

  .planos-pricing-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
  }

  .pricing-card {
    border-radius: 28px;
    padding: 1.35rem;
    display: flex;
    flex-direction: column;
    gap: 0.95rem;
    position: relative;
    overflow: hidden;
  }

  .pricing-card.recommended {
    border-color: var(--accent);
    box-shadow: 0 14px 32px rgba(var(--accent-rgb), 0.12);
  }

  .pricing-card.active {
    border-color: var(--accent2);
  }

  html[data-fx="gradients"] .pricing-card {
    background: linear-gradient(160deg, rgba(var(--accent-rgb), 0.01), transparent 72%), var(--bg2);
  }

  .pricing-badge {
    position: absolute;
    top: 14px;
    right: 14px;
    background: var(--accent);
    color: #0f0f0f;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0.35rem 0.7rem;
    border-radius: 999px;
  }

  .plan-tier {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text3);
  }

  .plan-price {
    display: flex;
    align-items: baseline;
    gap: 0.35rem;
    flex-wrap: wrap;
  }

  .plan-price-value {
    font-family: 'DM Serif Display', serif;
    font-size: 2.4rem;
    line-height: 1;
    color: var(--text);
  }

  .pricing-card.recommended .plan-price-value {
    color: var(--accent);
  }

  .plan-price-period {
    font-size: 0.92rem;
    color: var(--text3);
    font-weight: 600;
  }

  .plan-price-note {
    font-size: 0.8rem;
  }

  .plan-card-note {
    font-size: 0.86rem;
  }

  .plan-card-list {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    margin-top: 0.2rem;
  }

  .plan-card-item {
    display: flex;
    align-items: flex-start;
    gap: 0.65rem;
    font-size: 0.84rem;
    color: var(--text);
    line-height: 1.5;
  }

  .plan-card-item svg {
    color: var(--accent);
    flex-shrink: 0;
    margin-top: 0.1rem;
  }

  .plan-cta {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }

  .plan-cta-btn {
    width: 100%;
    border: none;
    border-radius: 16px;
    background: var(--accent);
    color: #0f0f0f;
    padding: 0.95rem 1rem;
    font: inherit;
    font-size: 0.95rem;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 8px 22px rgba(var(--accent-rgb), 0.24);
    transition: transform 0.18s ease, background 0.2s ease, box-shadow 0.2s ease;
  }

  .plan-cta-btn:hover:not(:disabled) {
    background: var(--accent2);
    transform: translateY(-1px);
    box-shadow: 0 10px 26px rgba(var(--accent-rgb), 0.32);
  }

  .plan-cta-btn:disabled {
    cursor: default;
    opacity: 0.75;
    box-shadow: none;
    transform: none;
  }

  html[data-fx="none"] .pricing-badge {
    background: var(--bg3);
    color: var(--text);
    border: 1px solid var(--border);
  }

  html[data-fx="none"] .plan-card-item svg {
    color: var(--text2);
  }

  html[data-fx="none"] .plan-cta-btn {
    background: var(--bg3);
    color: var(--text);
    border: 1px solid var(--border);
    box-shadow: none;
  }

  html[data-fx="none"] .plan-cta-btn:hover:not(:disabled) {
    background: var(--bg2);
    transform: none;
    box-shadow: none;
  }

  html[data-fx="none"] .plan-cta-btn:disabled {
    box-shadow: none;
  }

  .plan-cta-hint {
    font-size: 0.78rem;
    text-align: center;
  }

  .faq-list {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }

  .faq-item {
    border-radius: 22px;
    padding: 1rem 1.1rem;
  }

  html[data-fx="gradients"] .faq-item {
    background: linear-gradient(145deg, rgba(var(--accent-rgb), 0.015), transparent 60%), var(--bg2);
  }

  .faq-q {
    font-size: 0.92rem;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 0.35rem;
  }

  .faq-a {
    font-size: 0.86rem;
  }

  .planos-hero,
  .pricing-card,
  .planos-change-card,
  .planos-status-chip,
  .faq-item {
    box-shadow: 0 0 0 rgba(0, 0, 0, 0);
  }

  .planos-hero:hover,
  .pricing-card:hover,
  .planos-change-card:hover,
  .planos-status-chip:hover,
  .faq-item:hover {
    transform: translateY(-2px);
    border-color: var(--border2);
  }

  html.layout-compact .planos-hero,
  html.layout-compact .pricing-card,
  html.layout-compact .planos-change-card,
  html.layout-compact .planos-status-chip,
  html.layout-compact .faq-item {
    border-radius: 20px;
  }

  html.layout-compact .planos-hero {
    padding: 1.2rem;
  }

  html.layout-compact .pricing-card {
    padding: 1.15rem;
  }

  html.layout-compact .planos-change-card,
  html.layout-compact .planos-status-chip,
  html.layout-compact .faq-item {
    padding: 0.9rem 1rem;
  }

  @media (max-width: 980px) {
    .planos-status-strip,
    .planos-change-grid,
    .planos-pricing-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 767px) {
    .planos-title {
      max-width: none;
    }

    .planos-guest-banner {
      align-items: flex-start;
      flex-direction: column;
    }

    .planos-guest-btn {
      width: 100%;
    }

    .planos-subtitle {
      font-size: 0.95rem;
    }

    .planos-section-head {
      align-items: start;
      flex-direction: column;
    }

    .planos-hero {
      padding: 1.2rem;
    }

    .planos-change-number {
      font-size: 1.45rem;
    }

    .plan-price-value {
      font-size: 2rem;
    }
  }

  @media (max-width: 480px) {
    .planos-status-strip {
      gap: 0.7rem;
    }

    .pricing-card {
      padding: 1rem;
    }

    .plan-cta-btn {
      font-size: 0.9rem;
    }
  }
`
