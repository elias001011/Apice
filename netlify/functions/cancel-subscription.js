import process from 'node:process'
import { getPricingPlanByKey } from '../../src/services/upgradeTrigger.js'
import { requireAuth } from './utils/auth.js'
import { buildCheckoutCorsHeaders } from './utils/cors.js'

/**
 * Cancela uma assinatura recorrente na AbacatePay API v2.
 *
 * Requer no Netlify:
 * - ABACATE_V2: chave de API v2 da AbacatePay
 */

const ABACATE_API_BASE = 'https://api.abacatepay.com'
const ABACATE_SUBSCRIPTION_LIST_PATH = '/v2/subscriptions/list'
const ABACATE_SUBSCRIPTION_CANCEL_PATH = '/v2/subscriptions/cancel'
const BLOB_STORE_NAME = 'user-state'
const ACTIVE_STATUSES = new Set(['PAID', 'ACTIVE'])
const INACTIVE_STATUSES = new Set(['CANCELLED', 'REFUNDED', 'EXPIRED'])
const PLAN_PERIOD_MONTHS = {
  monthly: 1,
  semiannual: 6,
  annual: 12,
}

function getApiKey() {
  const key = String(process.env.ABACATE_V2 ?? process.env.ABACATE_PAY ?? '').trim()
  if (!key) {
    console.error('[cancel-subscription] ABACATE_V2 não está configurada')
  }
  return key
}

function safeText(value) {
  return String(value ?? '').trim()
}

function parseExternalId(externalId) {
  const text = safeText(externalId)
  const parts = text.split(':')
  if (parts.length >= 4 && parts[0] === 'apice') {
    return {
      userId: parts[1] || '',
      planKey: parts[2] || '',
      timestamp: parts[3] || '',
    }
  }

  const safeParts = text.split('_')
  if (safeParts.length >= 4 && safeParts[0] === 'apice') {
    return {
      userId: safeParts.slice(3).join('_') || '',
      planKey: safeParts[1] || '',
      timestamp: safeParts[2] || '',
    }
  }

  return { userId: '', planKey: '', timestamp: '' }
}

function normalizeIsoDate(value) {
  const text = safeText(value)
  if (!text) return ''
  const date = new Date(text)
  if (!Number.isFinite(date.getTime())) return ''
  return date.toISOString()
}

function addMonthsIso(value, months) {
  const start = new Date(normalizeIsoDate(value) || new Date().toISOString())
  if (!Number.isFinite(start.getTime())) return ''
  const end = new Date(start.getTime())
  end.setMonth(end.getMonth() + months)
  return end.toISOString()
}

function getPlanPeriodMonths(planKey) {
  const resolvedPlan = getPricingPlanByKey(planKey)
  return PLAN_PERIOD_MONTHS[resolvedPlan?.key] || 1
}

function formatAbacateError(payload) {
  if (typeof payload === 'string') return payload
  if (!payload || typeof payload !== 'object') return ''
  const nested = safeText(payload.error?.message || payload.data?.error || payload.data?.message)
  if (nested) return nested
  return safeText(typeof payload.error === 'string' ? payload.error : payload.message || payload.details)
}

async function abacateFetch(path, { method = 'GET', body } = {}) {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error('ABACATE_V2 não configurada')
  }

  const response = await fetch(`${ABACATE_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => ({}))
    : await response.text().catch(() => '')

  if (!response.ok) {
    const error = new Error(formatAbacateError(payload) || 'Falha ao comunicar com a AbacatePay.')
    error.status = response.status
    throw error
  }

  return payload
}

async function getStore() {
  try {
    const { getStore: getStoreFn } = await import('@netlify/blobs')
    return getStoreFn({ name: BLOB_STORE_NAME, consistency: 'strong' })
  } catch {
    return null
  }
}

async function getStoredBillingState(userId) {
  const store = await getStore()
  if (!store || !userId) return null

  try {
    const raw = await store.get(`user-state:${userId}`, { type: 'json' })
    const billing = raw && typeof raw === 'object' && raw.billing && typeof raw.billing === 'object'
      ? raw.billing
      : null
    return billing
  } catch (error) {
    console.warn('[cancel-subscription] Falha ao ler billing atual da nuvem:', error.message)
    return null
  }
}

function extractSubscriptionId(record) {
  return safeText(
    record?.subscriptionId
    || record?.subscription_id
    || record?.subscription?.id
    || record?.data?.subscription?.id
    || '',
  )
}

function getRecordExternalId(record, fallbackExternalId = '') {
  return safeText(
    record?.externalId
    || record?.external_id
    || record?.checkout?.externalId
    || record?.data?.externalId
    || fallbackExternalId
    || '',
  )
}

function getRecordMetadata(record) {
  const candidates = [
    record?.metadata,
    record?.checkout?.metadata,
    record?.subscription?.metadata,
    record?.data?.metadata,
    record?.data?.subscription?.metadata,
  ]

  return candidates.find((candidate) => candidate && typeof candidate === 'object') || {}
}

function recordBelongsToUser(record, userId, fallbackExternalId = '') {
  const metadata = getRecordMetadata(record)
  const ownerId = safeText(metadata.userId || parseExternalId(getRecordExternalId(record, fallbackExternalId)).userId)
  return Boolean(ownerId && userId && ownerId === userId)
}

function extractAccessEndsAt(...records) {
  for (const record of records) {
    const value = safeText(
      record?.accessEndsAt
      || record?.currentPeriodEnd
      || record?.current_period_end
      || record?.periodEndsAt
      || record?.period_ends_at
      || record?.nextBillingAt
      || record?.next_billing_at
      || record?.billingCycleEndsAt
      || record?.subscription?.currentPeriodEnd
      || record?.subscription?.current_period_end
      || record?.data?.currentPeriodEnd
      || '',
    )
    const iso = normalizeIsoDate(value)
    if (iso) return iso
  }
  return ''
}

async function findSubscriptionCheckout({ checkoutId, externalId }) {
  const query = new URLSearchParams()
  query.set('limit', '100')
  if (checkoutId) query.set('id', checkoutId)
  if (!checkoutId && externalId) query.set('externalId', externalId)

  const result = await abacateFetch(`${ABACATE_SUBSCRIPTION_LIST_PATH}?${query.toString()}`)
  const records = Array.isArray(result?.data) ? result.data : []

  if (checkoutId) {
    return records.find((item) => safeText(item?.id) === checkoutId) || records[0] || null
  }

  if (externalId) {
    return records.find((item) => safeText(item?.externalId) === externalId) || records[0] || null
  }

  return records[0] || null
}

async function resolveSubscriptionId({
  subscriptionId,
  checkoutId,
  externalId,
  allowCheckoutIdAsSubscriptionId = false,
}) {
  if (subscriptionId) {
    if (checkoutId || externalId) {
      try {
        const checkout = await findSubscriptionCheckout({ checkoutId, externalId })
        return { subscriptionId, checkout, source: checkout ? 'local-state-with-lookup' : 'local-state' }
      } catch (error) {
        console.warn('[cancel-subscription] Não foi possível validar checkout antes do cancelamento direto:', error.message)
      }
    }
    return { subscriptionId, checkout: null, source: 'local-state' }
  }

  if (allowCheckoutIdAsSubscriptionId && checkoutId.startsWith('subs_')) {
    return { subscriptionId: checkoutId, checkout: null, source: 'checkoutId-as-subscriptionId' }
  }

  const checkout = await findSubscriptionCheckout({ checkoutId, externalId })
  const resolvedSubscriptionId = extractSubscriptionId(checkout)
  if (resolvedSubscriptionId) {
    return { subscriptionId: resolvedSubscriptionId, checkout, source: 'subscription-list' }
  }

  return { subscriptionId: '', checkout, source: checkout ? 'subscription-list-without-subscription-id' : 'not-found' }
}

async function cancelAbacateSubscription({
  subscriptionId,
  checkoutId,
  externalId,
  userId,
  allowCheckoutIdAsSubscriptionId = false,
}) {
  const resolved = await resolveSubscriptionId({
    subscriptionId,
    checkoutId,
    externalId,
    allowCheckoutIdAsSubscriptionId,
  })
  const checkoutStatus = String(resolved.checkout?.status ?? '').toUpperCase()

  if (resolved.checkout && !recordBelongsToUser(resolved.checkout, userId, externalId)) {
    console.warn('[cancel-subscription] Cancelamento bloqueado por ownership inválido.')
    const error = new Error('Assinatura não encontrada para esta conta.')
    error.status = 404
    throw error
  }

  if (!resolved.subscriptionId) {
    if (checkoutStatus && INACTIVE_STATUSES.has(checkoutStatus)) {
      return {
        success: true,
        cancelled: true,
        message: 'Assinatura já estava encerrada na AbacatePay.',
        billingStatus: checkoutStatus,
        billingId: safeText(resolved.checkout?.id),
        subscriptionId: '',
      }
    }

    if (checkoutStatus && !ACTIVE_STATUSES.has(checkoutStatus)) {
      return {
        success: true,
        cancelled: false,
        message: 'Checkout de assinatura ainda não está ativo. A conta será encerrada localmente.',
        billingStatus: checkoutStatus,
        billingId: safeText(resolved.checkout?.id),
        subscriptionId: '',
      }
    }

    throw new Error('Não foi possível localizar o ID da assinatura v2. Aguarde o webhook de confirmação ou tente novamente em alguns instantes.')
  }

  const result = await abacateFetch(ABACATE_SUBSCRIPTION_CANCEL_PATH, {
    method: 'POST',
    body: { id: resolved.subscriptionId },
  })

  const data = result?.data || {}
  const status = String(data?.status ?? checkoutStatus ?? '').toUpperCase()

  return {
    success: true,
    cancelled: true,
    message: 'Assinatura cancelada na AbacatePay.',
    billingStatus: status || 'CANCELLED',
    billingId: safeText(data?.id || resolved.checkout?.id),
    subscriptionId: resolved.subscriptionId,
    accessEndsAt: extractAccessEndsAt(data, resolved.checkout),
  }
}

async function updateCancelledBillingInBlob(userId, extraBilling = {}, { keepPaidUntilPeriodEnd = false } = {}) {
  const store = await getStore()
  if (!store) {
    console.warn('[cancel-subscription] Blob store não disponível. Atualização cloud desabilitada.')
    return false
  }

  try {
    const blobKey = `user-state:${userId}`
    const existingData = await store.get(blobKey, { type: 'json' })
    const currentState = existingData && typeof existingData === 'object' ? existingData : {}
    const currentBilling = currentState.billing && typeof currentState.billing === 'object'
      ? currentState.billing
      : {}
    const nowIso = new Date().toISOString()

    if (keepPaidUntilPeriodEnd) {
      const planKey = safeText(extraBilling.planKey || currentBilling.planKey || currentState.planKey || 'monthly')
      const paidAt = normalizeIsoDate(currentBilling.paidAt || extraBilling.paidAt) || nowIso
      const accessEndsAt = normalizeIsoDate(extraBilling.accessEndsAt)
        || extractAccessEndsAt(extraBilling, currentBilling)
        || addMonthsIso(paidAt, getPlanPeriodMonths(planKey))

      const updatedState = {
        ...currentState,
        accountOwnerId: userId,
        billing: {
          ...currentBilling,
          ...extraBilling,
          status: 'paid',
          planKey,
          paidAt,
          subscriptionActive: false,
          cancelAtPeriodEnd: true,
          cancellationRequestedAt: nowIso,
          cancelledAt: nowIso,
          accessEndsAt,
          updatedAt: nowIso,
        },
        planStatus: 'paid',
        planTier: 'paid',
        planKey,
        savedAt: nowIso,
      }

      await store.set(blobKey, JSON.stringify(updatedState), {
        contentType: 'application/json',
      })

      console.log('[cancel-subscription] Assinatura marcada como cancelada no fim do período no blob.')
      return true
    }

    const trialUsedAt = currentBilling.trialUsedAt
      || currentBilling.trialStartedAt
      || extraBilling.trialUsedAt
      || extraBilling.trialStartedAt
      || extraBilling.trialEndedAt
      || ''

    const updatedState = {
      ...currentState,
      accountOwnerId: userId,
      billing: {
        ...currentBilling,
        ...extraBilling,
        status: 'free',
        planKey: '',
        paidAt: '',
        checkoutId: '',
        externalId: '',
        subscriptionId: '',
        subscriptionActive: false,
        cancelAtPeriodEnd: false,
        ...(trialUsedAt ? { trialUsedAt } : {}),
        cancelledAt: nowIso,
        updatedAt: nowIso,
      },
      planStatus: 'free',
      planTier: 'free',
      planKey: '',
      savedAt: nowIso,
    }

    await store.set(blobKey, JSON.stringify(updatedState), {
      contentType: 'application/json',
    })

    console.log('[cancel-subscription] Usuário atualizado para FREE no blob.')
    return true
  } catch (error) {
    console.error('[cancel-subscription] Erro ao downgradar usuário no blob:', error.message)
    return false
  }
}

async function handleCancel(req, authUser, headers) {
  const body = await req.json().catch(() => ({}))
  const userId = safeText(authUser?.id)

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Usuário não autenticado' }), { status: 401, headers })
  }

  const storedBilling = await getStoredBillingState(userId)
  const requestCheckoutId = safeText(body?.checkoutId)
  const requestExternalId = safeText(body?.externalId)
  const requestSubscriptionId = safeText(body?.subscriptionId)
  const trustedCheckoutId = safeText(storedBilling?.checkoutId)
  const trustedExternalId = safeText(storedBilling?.externalId)
  const trustedSubscriptionId = safeText(storedBilling?.subscriptionId)
  const hasTrustedRemoteReference = Boolean(trustedCheckoutId || trustedExternalId || trustedSubscriptionId)
  const canUseClientLookupReference = !hasTrustedRemoteReference && Boolean(requestCheckoutId || requestExternalId)

  if (requestSubscriptionId && !hasTrustedRemoteReference) {
    console.warn('[cancel-subscription] subscriptionId enviado pelo cliente ignorado: sem confirmação no billing da nuvem.')
  }

  const checkoutId = hasTrustedRemoteReference ? trustedCheckoutId : (canUseClientLookupReference ? requestCheckoutId : '')
  const externalId = hasTrustedRemoteReference ? trustedExternalId : (canUseClientLookupReference ? requestExternalId : '')
  const subscriptionId = hasTrustedRemoteReference ? trustedSubscriptionId : ''
  const storedBillingStatus = safeText(storedBilling?.status).toLowerCase()
  const requestedBillingStatus = safeText(body?.status || body?.billingStatus).toLowerCase()
  const localBillingStatus = storedBillingStatus
    || (requestedBillingStatus === 'paid' && canUseClientLookupReference ? 'paid' : '')
    || (requestedBillingStatus === 'paid' ? 'free' : requestedBillingStatus)
  const localTrialKind = safeText(storedBilling?.trialKind || body?.trialKind)
  const planKey = safeText(storedBilling?.planKey || body?.planKey)
  const paidAt = safeText(storedBilling?.paidAt || body?.paidAt)
  const keepPaidUntilPeriodEnd = localBillingStatus === 'paid'

  if (!storedBillingStatus && requestedBillingStatus === 'paid' && !canUseClientLookupReference) {
    console.warn('[cancel-subscription] Status paid enviado pelo cliente ignorado: sem confirmação no billing da nuvem.')
  }

  if (!checkoutId && !externalId && !subscriptionId) {
    const nowIso = new Date().toISOString()
    const accessEndsAt = keepPaidUntilPeriodEnd
      ? addMonthsIso(paidAt || nowIso, getPlanPeriodMonths(planKey))
      : ''
    const localOnlyBilling = {
      checkoutId: '',
      externalId: '',
      subscriptionId: '',
      remoteStatus: 'LOCAL_ONLY',
      planKey,
      paidAt,
      ...(accessEndsAt ? { accessEndsAt } : {}),
    }
    if (localBillingStatus !== 'paid') {
      localOnlyBilling.trialEndedAt = nowIso
    }
    if (localTrialKind) {
      localOnlyBilling.trialKind = localTrialKind
    }

    const userUpdated = await updateCancelledBillingInBlob(userId, localOnlyBilling, { keepPaidUntilPeriodEnd })

    return new Response(JSON.stringify({
      success: true,
      cancelled: false,
      localOnly: true,
      requiresManualCancellation: localBillingStatus === 'paid',
      message: localBillingStatus === 'paid'
        ? 'Acesso premium local encerrado nesta conta. Nenhuma assinatura remota foi localizada para cancelar na AbacatePay.'
        : 'Período temporário encerrado nesta conta.',
      billingStatus: 'LOCAL_ONLY',
      billingId: '',
      subscriptionId: '',
      cancelAtPeriodEnd: keepPaidUntilPeriodEnd,
      accessEndsAt,
      userDowngraded: !keepPaidUntilPeriodEnd && userUpdated,
      userUpdated,
      cloudSyncEnabled: userUpdated,
    }), {
      status: 200,
      headers,
    })
  }

  try {
    const abacateResult = await cancelAbacateSubscription({
      subscriptionId,
      checkoutId,
      externalId,
      userId,
      allowCheckoutIdAsSubscriptionId: hasTrustedRemoteReference,
    })
    const accessEndsAt = keepPaidUntilPeriodEnd
      ? (
        normalizeIsoDate(abacateResult.accessEndsAt)
        || addMonthsIso(paidAt || new Date().toISOString(), getPlanPeriodMonths(planKey))
      )
      : ''
    const userUpdated = await updateCancelledBillingInBlob(userId, {
      checkoutId,
      externalId,
      subscriptionId: abacateResult.subscriptionId || subscriptionId,
      remoteStatus: abacateResult.billingStatus,
      planKey,
      paidAt,
      ...(accessEndsAt ? { accessEndsAt } : {}),
    }, { keepPaidUntilPeriodEnd })

    return new Response(JSON.stringify({
      success: true,
      cancelled: abacateResult.cancelled,
      message: abacateResult.message,
      billingStatus: abacateResult.billingStatus,
      billingId: abacateResult.billingId,
      subscriptionId: abacateResult.subscriptionId || subscriptionId,
      cancelAtPeriodEnd: keepPaidUntilPeriodEnd,
      accessEndsAt,
      userDowngraded: !keepPaidUntilPeriodEnd && userUpdated,
      userUpdated,
      cloudSyncEnabled: userUpdated,
    }), {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error('[cancel-subscription] Erro:', error?.message || error, '| Status:', error?.status || '(sem status)')
    return new Response(JSON.stringify({
      error: error?.message || 'Falha ao cancelar assinatura',
    }), {
      status: error?.status || 500,
      headers,
    })
  }
}

export default async function handler(req, context) {
  const headers = buildCheckoutCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
  }

  const auth = await requireAuth(req, context, headers)
  if (auth instanceof Response) return auth

  return await handleCancel(req, auth.user, headers)
}
