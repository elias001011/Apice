import process from 'node:process'
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
    error.details = payload
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

function extractSubscriptionId(record) {
  return safeText(
    record?.subscriptionId
    || record?.subscription_id
    || record?.subscription?.id
    || record?.data?.subscription?.id
    || '',
  )
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

async function resolveSubscriptionId({ subscriptionId, checkoutId, externalId }) {
  if (subscriptionId) {
    return { subscriptionId, checkout: null, source: 'local-state' }
  }

  if (checkoutId.startsWith('subs_')) {
    return { subscriptionId: checkoutId, checkout: null, source: 'checkoutId-as-subscriptionId' }
  }

  const checkout = await findSubscriptionCheckout({ checkoutId, externalId })
  const resolvedSubscriptionId = extractSubscriptionId(checkout)
  if (resolvedSubscriptionId) {
    return { subscriptionId: resolvedSubscriptionId, checkout, source: 'subscription-list' }
  }

  return { subscriptionId: '', checkout, source: checkout ? 'subscription-list-without-subscription-id' : 'not-found' }
}

async function cancelAbacateSubscription({ subscriptionId, checkoutId, externalId }) {
  const resolved = await resolveSubscriptionId({ subscriptionId, checkoutId, externalId })
  const checkoutStatus = String(resolved.checkout?.status ?? '').toUpperCase()

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
  }
}

async function downgradeUserToFreeInBlob(userId, extraBilling = {}) {
  const store = await getStore()
  if (!store) {
    console.warn('[cancel-subscription] Blob store não disponível. Downgrade cloud desabilitado.')
    return false
  }

  try {
    const blobKey = `user-state:${userId}`
    const existingData = await store.get(blobKey, { type: 'json' })
    const currentState = existingData && typeof existingData === 'object' ? existingData : {}
    const currentBilling = currentState.billing && typeof currentState.billing === 'object'
      ? currentState.billing
      : {}
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
        ...(trialUsedAt ? { trialUsedAt } : {}),
        cancelledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      planStatus: 'free',
      planTier: 'free',
      planKey: '',
      savedAt: new Date().toISOString(),
    }

    await store.set(blobKey, JSON.stringify(updatedState), {
      contentType: 'application/json',
    })

    console.log('[cancel-subscription] Usuário downgraded para FREE no blob.')
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

  const checkoutId = safeText(body?.checkoutId)
  const externalId = safeText(body?.externalId)
  const subscriptionId = safeText(body?.subscriptionId)
  const localBillingStatus = safeText(body?.status || body?.billingStatus).toLowerCase()
  const localTrialKind = safeText(body?.trialKind)

  if (!checkoutId && !externalId && !subscriptionId) {
    const trialEndedAt = new Date().toISOString()
    const localOnlyBilling = {
      checkoutId: '',
      externalId: '',
      subscriptionId: '',
      remoteStatus: 'LOCAL_ONLY',
    }
    if (localBillingStatus !== 'paid') {
      localOnlyBilling.trialEndedAt = trialEndedAt
    }
    if (localTrialKind) {
      localOnlyBilling.trialKind = localTrialKind
    }

    const userDowngraded = await downgradeUserToFreeInBlob(userId, localOnlyBilling)

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
      userDowngraded,
      cloudSyncEnabled: userDowngraded,
    }), {
      status: 200,
      headers,
    })
  }

  try {
    const abacateResult = await cancelAbacateSubscription({ subscriptionId, checkoutId, externalId })
    const userDowngraded = await downgradeUserToFreeInBlob(userId, {
      checkoutId,
      externalId,
      subscriptionId: abacateResult.subscriptionId || subscriptionId,
      remoteStatus: abacateResult.billingStatus,
    })

    return new Response(JSON.stringify({
      success: true,
      cancelled: abacateResult.cancelled,
      message: abacateResult.message,
      billingStatus: abacateResult.billingStatus,
      billingId: abacateResult.billingId,
      subscriptionId: abacateResult.subscriptionId || subscriptionId,
      userDowngraded,
      cloudSyncEnabled: userDowngraded,
    }), {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error('[cancel-subscription] Erro:', error)
    return new Response(JSON.stringify({
      error: error?.message || 'Falha ao cancelar assinatura',
      details: error?.details || null,
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

  const auth = requireAuth(req, context, headers)
  if (auth instanceof Response) return auth

  return await handleCancel(req, auth.user, headers)
}
