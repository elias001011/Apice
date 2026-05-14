import process from 'node:process'
import { getPricingPlanByKey } from '../../src/services/upgradeTrigger.js'
import { requireAuth } from './utils/auth.js'
import { buildCheckoutCorsHeaders } from './utils/cors.js'

/**
 * Integracao com AbacatePay API v2.
 *
 * Fluxo:
 * 1. Frontend chama POST /.netlify/functions/abacatepay-checkout
 * 2. Backend cria/recupera um customer v2 quando houver e-mail
 * 3. Backend cria um checkout de assinatura em /v2/subscriptions/create
 * 4. Cliente paga na URL retornada pela AbacatePay
 * 5. Frontend verifica o status via GET nesta funcao
 * 6. Webhook v2 reforca a sincronizacao em nuvem
 *
 * Requer no Netlify:
 * - ABACATE_V2: chave de API v2 da AbacatePay
 */

const ABACATE_API_BASE = 'https://api.abacatepay.com'
const ABACATE_CUSTOMER_CREATE_PATH = '/v2/customers/create'
const ABACATE_SUBSCRIPTION_CREATE_PATH = '/v2/subscriptions/create'
const ABACATE_SUBSCRIPTION_LIST_PATH = '/v2/subscriptions/list'
const ABACATE_CHECKOUT_CREATE_PATH = '/v2/checkouts/create'
const ABACATE_CHECKOUT_LIST_PATH = '/v2/checkouts/list'

const TRIAL_COUPON_CODE = 'FREE TEST'
const PAID_STATUSES = new Set(['PAID', 'ACTIVE', 'COMPLETED'])

function getApiKey() {
  const key = String(process.env.ABACATE_V2 ?? process.env.ABACATE_PAY ?? '').trim()
  if (!key) {
    console.error('[abacatepay] ABACATE_V2 não está configurada nas variáveis de ambiente')
  }
  return key
}

function getRequestOrigin(req) {
  try {
    return new URL(req.url).origin
  } catch {
    return String(process.env.SITE_URL ?? process.env.URL ?? 'http://localhost:5173').trim() || 'http://localhost:5173'
  }
}

function safeText(value) {
  return String(value ?? '').trim()
}

function buildExternalId({ userId, planKey, timestamp }) {
  const safeUserId = safeText(userId).replace(/[^a-zA-Z0-9_-]/g, '')
  const safePlanKey = safeText(planKey).replace(/[^a-zA-Z0-9_-]/g, '')
  const safeTimestamp = safeText(timestamp).replace(/[^0-9]/g, '')
  return ['apice', safePlanKey || 'plan', safeTimestamp || Date.now(), safeUserId || 'account'].join('_')
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

function getCheckoutUrl(checkout) {
  return safeText(
    checkout?.url
    || checkout?.checkoutUrl
    || checkout?.checkout?.url
    || checkout?.data?.url
    || '',
  )
}

function getCheckoutStatus(checkout) {
  return String(checkout?.status ?? '').toUpperCase()
}

function getCheckoutPlanKey(checkout, fallbackExternalId = '') {
  const metadataPlan = safeText(checkout?.metadata?.planKey || checkout?.metadata?.plan || '')
  if (metadataPlan) return metadataPlan

  return parseExternalId(checkout?.externalId || fallbackExternalId).planKey
}

function getSubscriptionId(checkout) {
  return safeText(
    checkout?.subscriptionId
    || checkout?.subscription_id
    || checkout?.subscription?.id
    || checkout?.checkout?.subscriptionId
    || checkout?.checkout?.subscription?.id
    || checkout?.data?.subscription?.id
    || '',
  )
}

function formatAbacateError(payload) {
  if (typeof payload === 'string') return payload
  if (!payload || typeof payload !== 'object') return ''

  const nested = safeText(payload.error?.message || payload.data?.error || payload.data?.message)
  if (nested) return nested

  const issueMessage = safeText(
    payload.error?.issues?.[0]?.message
    || payload.errors?.[0]?.message
    || payload.issues?.[0]?.message
    || payload.data?.errors?.[0]?.message,
  )
  if (issueMessage) return issueMessage

  const direct = safeText(
    typeof payload.error === 'string' ? payload.error : payload.message || payload.details,
  )
  if (direct) return direct

  return ''
}

function stringifyDetails(details) {
  if (!details) return ''
  if (typeof details === 'string') return details
  try {
    return JSON.stringify(details)
  } catch {
    return ''
  }
}

function shouldTryOneTimeCheckoutFallback(error) {
  if (![400, 422].includes(Number(error?.status))) return false

  const detailText = `${safeText(error?.message)} ${stringifyDetails(error?.details)}`.toLowerCase()
  if (!detailText) return true

  return /cycle|ciclo|assinatura|subscription|produto|product|method|m[eé]todo|card|cart[aã]o|checkout/.test(detailText)
}

async function abacateFetch(path, { method = 'GET', body } = {}) {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error('ABACATE_V2 não foi configurada no ambiente. Verifique as variáveis de ambiente no Netlify.')
  }

  const fullUrl = `${ABACATE_API_BASE}${path}`
  console.log(`[abacatepay] ${method} ${fullUrl}`, body ? JSON.stringify(body).slice(0, 800) : '(sem body)')

  const response = await fetch(fullUrl, {
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
    console.error(`[abacatepay] HTTP ${response.status} em ${path}. Resposta completa:`, JSON.stringify(payload).slice(0, 1500))
    const message = formatAbacateError(payload) || 'Falha na integração com a AbacatePay.'
    const error = new Error(message)
    error.status = response.status
    error.details = payload
    throw error
  }

  return payload
}

function buildCustomerPayload({ userId, userEmail, customerName, customerCellphone, customerTaxId }) {
  const email = safeText(userEmail) || `${safeText(userId) || 'usuario'}@apice.internal`
  const payload = {
    email,
    metadata: {
      app: 'apice',
      userId: safeText(userId),
    },
  }

  const name = safeText(customerName)
  if (name) payload.name = name

  const cellphone = safeText(customerCellphone)
  if (cellphone) payload.cellphone = cellphone

  const taxId = safeText(customerTaxId)
  if (taxId) payload.taxId = taxId

  return payload
}

async function createCustomerId(customerInput) {
  const payload = buildCustomerPayload(customerInput)

  try {
    const result = await abacateFetch(ABACATE_CUSTOMER_CREATE_PATH, {
      method: 'POST',
      body: payload,
    })
    return safeText(result?.data?.id)
  } catch (error) {
    try {
      const retryPayload = {
        email: payload.email,
        ...(payload.name ? { name: payload.name } : {}),
        metadata: payload.metadata,
      }
      const retry = await abacateFetch(ABACATE_CUSTOMER_CREATE_PATH, {
        method: 'POST',
        body: retryPayload,
      })
      return safeText(retry?.data?.id)
    } catch (retryError) {
      try {
        const wrappedRetry = await abacateFetch(ABACATE_CUSTOMER_CREATE_PATH, {
          method: 'POST',
          body: {
            data: {
              email: payload.email,
              ...(payload.name ? { name: payload.name } : {}),
            },
            metadata: payload.metadata,
          },
        })
        return safeText(wrappedRetry?.data?.id)
      } catch (wrappedError) {
        console.warn('[abacatepay] Customer v2 não foi criado após retry. Checkout seguirá sem customerId:', error.message, retryError.message, wrappedError.message)
      }
      return ''
    }
  }
}

function buildCheckoutPayload({ plan, externalId, returnUrl, completionUrl, userId, timestamp, isTrial, customerId, mode = 'subscription' }) {
  const isSubscription = mode === 'subscription'
  const payload = {
    items: [
      {
        id: plan.productId,
        quantity: 1,
      },
    ],
    methods: isSubscription ? ['CARD'] : ['PIX', 'CARD'],
    returnUrl: returnUrl.toString(),
    completionUrl: completionUrl.toString(),
    externalId,
    metadata: {
      app: 'apice',
      gateway: 'abacatepay-v2',
      checkoutMode: mode,
      planKey: plan.key,
      planLabel: plan.label,
      trialDays: plan.trialDays,
      isTrial: Boolean(isTrial),
      userId,
      createdAt: timestamp,
    },
  }

  if (customerId) {
    payload.customerId = customerId
  }

  if (isTrial) {
    // AbacatePay v2 espera array de strings com o código do cupom
    payload.coupons = [TRIAL_COUPON_CODE]
    console.log('[abacatepay] Cupom de trial aplicado:', TRIAL_COUPON_CODE)
  }

  console.log('[abacatepay] Payload v2 COMPLETO:', JSON.stringify({
    items: payload.items,
    methods: payload.methods,
    returnUrl: payload.returnUrl,
    completionUrl: payload.completionUrl,
    externalId: payload.externalId,
    customerId: payload.customerId || '(sem customer)',
    coupons: payload.coupons || [],
    planKey: payload.metadata.planKey,
    mode,
    productId: plan.productId,
    isTrial: Boolean(payload.metadata.isTrial),
  }))

  return payload
}

async function getUserTrialStatusFromCloud(userId) {
  if (!userId) return { hasUsedTrial: false, activeTrial: false, trialState: null }

  try {
    const { getStore } = await import('@netlify/blobs')
    const store = await getStore({ name: 'user-state', consistency: 'strong' })

    if (!store) {
      console.warn('[abacatepay] Blob store não disponível. Trial cloud validation desabilitada.')
      return { hasUsedTrial: false, activeTrial: false, trialState: null }
    }

    const blobKey = `user-state:${userId}`
    const userData = await store.get(blobKey, { type: 'json' })

    if (!userData || typeof userData !== 'object') {
      return { hasUsedTrial: false, activeTrial: false, trialState: null }
    }

    const billing = userData.billing || {}
    const trialStartedAt = safeText(userData.trialStartedAt || billing.trialStartedAt)
    const trialEndsAt = safeText(userData.trialEndsAt || billing.trialEndsAt)
    const trialKind = safeText(userData.trialKind || billing.trialKind) || 'standard'
    const trialEndsAtMs = Date.parse(trialEndsAt)
    const activeTrial = billing.status === 'trial'
      && Number.isFinite(trialEndsAtMs)
      && trialEndsAtMs > Date.now()
    const anyTrialRecord = Boolean(
      userData.trialUsedAt ||
      trialStartedAt ||
      trialEndsAt ||
      billing.trialUsedAt ||
      userData.planStatus === 'trial' ||
      billing.status === 'trial',
    )
    const hasUsedTrial = anyTrialRecord && !activeTrial

    return {
      hasUsedTrial,
      activeTrial,
      trialState: activeTrial
        ? {
          status: 'trial',
          planKey: safeText(billing.planKey || userData.planKey),
          trialKind,
          trialStartedAt,
          trialEndsAt,
        }
        : null,
    }
  } catch (error) {
    console.warn('[abacatepay] Erro ao verificar trial no blob:', error.message)
    return { hasUsedTrial: false, activeTrial: false, trialState: null }
  }
}

async function createCheckout(req, authUser, headers) {
  let body = {}
  try {
    body = await req.json()
    console.log('[abacatepay] Body recebido (resumido):', JSON.stringify({
      planKey: body?.planKey || '',
      isTrial: Boolean(body?.isTrial),
      hasCustomerName: Boolean(safeText(body?.customerName || body?.fullName)),
      hasCustomerCellphone: Boolean(safeText(body?.customerCellphone || body?.phone || body?.cellphone)),
      hasCustomerTaxId: Boolean(safeText(body?.customerTaxId || body?.taxId || body?.cpf || body?.cnpj)),
    }))
  } catch (error) {
    console.error('[abacatepay] Erro ao parsear body:', error.message)
  }

  const planKey = safeText(body?.planKey)
  const requestedTrial = Boolean(body?.isTrial)
  let shouldApplyTrial = requestedTrial
  let trialAlreadyUsedInCloud = false
  const plan = getPricingPlanByKey(planKey)

  if (!plan || !plan.productId) {
    console.error('[abacatepay] Plan não encontrado para planKey:', planKey)
    return new Response(JSON.stringify({ error: 'planKey inválido. Use: monthly, semiannual ou annual.' }), { status: 400, headers })
  }

  const userId = safeText(authUser?.id)
  const userEmail = safeText(authUser?.email || body?.userEmail || body?.email)
  const customerName = safeText(authUser?.fullName || body?.customerName || body?.fullName)
  const customerCellphone = safeText(body?.customerCellphone ?? body?.phone ?? body?.cellphone)
  const customerTaxId = safeText(body?.customerTaxId ?? body?.taxId ?? body?.cpf ?? body?.cnpj)

  if (requestedTrial) {
    const cloudStatus = await getUserTrialStatusFromCloud(userId)
    if (cloudStatus.activeTrial) {
      console.warn('[abacatepay] Checkout ignorado: usuário já tem trial ativo na nuvem.')
      return new Response(JSON.stringify({
        success: true,
        activeTrial: true,
        message: 'Você já tem um período temporário ativo nesta conta.',
        planKey: cloudStatus.trialState?.planKey || plan.key,
        trialState: cloudStatus.trialState,
      }), { status: 200, headers })
    }

    if (cloudStatus.hasUsedTrial) {
      console.warn('[abacatepay] Trial já usado. Checkout seguirá como pago.')
      trialAlreadyUsedInCloud = true
      shouldApplyTrial = false
    }
  }

  const origin = getRequestOrigin(req)
  const timestamp = new Date().toISOString()
  const externalId = buildExternalId({ userId, planKey: plan.key, timestamp })

  const returnUrl = new URL('/planos', origin)
  returnUrl.searchParams.set('billing', 'return')
  returnUrl.searchParams.set('plan', plan.key)
  returnUrl.searchParams.set('externalId', externalId)

  const completionUrl = new URL('/planos', origin)
  completionUrl.searchParams.set('billing', 'complete')
  completionUrl.searchParams.set('plan', plan.key)
  completionUrl.searchParams.set('externalId', externalId)

  try {
    const customerId = await createCustomerId({
      userId,
      userEmail,
      customerName,
      customerCellphone,
      customerTaxId,
    })

    const createPaymentCheckout = ({ path, mode, isTrial }) => abacateFetch(path, {
      method: 'POST',
      body: buildCheckoutPayload({
        plan,
        externalId,
        returnUrl,
        completionUrl,
        userId,
        timestamp,
        isTrial,
        customerId,
        mode,
      }),
    })

    const createWithCouponFallback = async ({ path, mode, applyTrial }) => {
      try {
        return {
          result: await createPaymentCheckout({ path, mode, isTrial: applyTrial }),
          trialApplied: applyTrial,
          trialCouponUnavailable: false,
        }
      } catch (error) {
        if (!applyTrial) {
          throw error
        }

        console.warn('[abacatepay] Falha ao criar checkout com cupom de trial. Tentando novamente sem cupom:', error.message)

        try {
          return {
            result: await createPaymentCheckout({ path, mode, isTrial: false }),
            trialApplied: false,
            trialCouponUnavailable: true,
          }
        } catch (retryError) {
          const retryMessage = retryError.message || 'Falha ao criar checkout sem cupom'
          const originalMessage = error.message || 'desconhecido'
          retryError.message = `${retryMessage} (também falhou após remover o cupom ${TRIAL_COUPON_CODE}; erro original: ${originalMessage})`
          retryError.details = retryError.details || error.details
          throw retryError
        }
      }
    }

    let checkoutMode = 'subscription'
    let subscriptionFallback = false
    let creation = null

    try {
      creation = await createWithCouponFallback({
        path: ABACATE_SUBSCRIPTION_CREATE_PATH,
        mode: 'subscription',
        applyTrial: shouldApplyTrial,
      })
    } catch (subscriptionError) {
      if (!shouldTryOneTimeCheckoutFallback(subscriptionError)) {
        throw subscriptionError
      }

      console.warn(
        '[abacatepay] Checkout de assinatura falhou. Tentando checkout comum para manter abertura de pagamento:',
        subscriptionError.message,
      )

      checkoutMode = 'checkout'
      subscriptionFallback = true
      creation = await createWithCouponFallback({
        path: ABACATE_CHECKOUT_CREATE_PATH,
        mode: 'checkout',
        applyTrial: shouldApplyTrial,
      })
    }

    const { result, trialApplied, trialCouponUnavailable } = creation
    shouldApplyTrial = trialApplied

    const checkout = result?.data || {}
    const checkoutUrl = getCheckoutUrl(checkout)

    if (!checkoutUrl) {
      console.error('[abacatepay] Checkout v2 criado sem URL:', JSON.stringify(checkout))
      return new Response(JSON.stringify({ error: 'A AbacatePay não retornou a URL de checkout.' }), { status: 502, headers })
    }

    return new Response(JSON.stringify({
      success: true,
      gateway: 'abacatepay-v2',
      checkoutMode,
      subscriptionFallback,
      checkoutId: checkout.id || checkout.checkout?.id || '',
      subscriptionId: checkoutMode === 'subscription' ? getSubscriptionId(checkout) : '',
      checkoutUrl,
      externalId,
      customerId,
      planKey: plan.key,
      productId: plan.productId,
      totalPrice: plan.totalPrice,
      billingLabel: plan.billingLabel,
      trialDays: plan.trialDays,
      isTrial: shouldApplyTrial,
      requestedTrial,
      trialAlreadyUsed: trialAlreadyUsedInCloud,
      trialCouponUnavailable,
      checkout,
    }), {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error('[abacatepay] Erro ao criar checkout v2:', error.message, '| Status:', error.status, '| Details:', JSON.stringify(error.details || {}).slice(0, 1000))
    throw error
  }
}

async function findCheckout(path, { checkoutId, externalId }) {
  const query = new URLSearchParams()
  query.set('limit', '100')
  if (checkoutId) query.set('id', checkoutId)
  if (!checkoutId && externalId) query.set('externalId', externalId)

  const result = await abacateFetch(`${path}?${query.toString()}`, { method: 'GET' })
  const checkouts = Array.isArray(result?.data) ? result.data : []

  if (checkoutId) {
    return checkouts.find((item) => safeText(item?.id) === checkoutId) || checkouts[0] || null
  }

  if (externalId) {
    return checkouts.find((item) => safeText(item?.externalId) === externalId) || checkouts[0] || null
  }

  return checkouts[0] || null
}

async function verifyCheckout(req, headers) {
  const url = new URL(req.url)
  const checkoutId = safeText(url.searchParams.get('checkoutId'))
  const externalId = safeText(url.searchParams.get('externalId'))

  if (!checkoutId && !externalId) {
    return new Response(JSON.stringify({ error: 'checkoutId ou externalId é obrigatório' }), { status: 400, headers })
  }

  let checkout = null
  let checkoutMode = 'subscription'

  try {
    checkout = await findCheckout(ABACATE_SUBSCRIPTION_LIST_PATH, { checkoutId, externalId })
  } catch (error) {
    console.warn('[abacatepay] Falha ao verificar em subscriptions/list, tentando checkouts/list:', error.message)
  }

  if (!checkout) {
    checkoutMode = 'checkout'
    checkout = await findCheckout(ABACATE_CHECKOUT_LIST_PATH, { checkoutId, externalId })
  }

  if (!checkout) {
    return new Response(JSON.stringify({ error: 'Checkout não encontrado' }), { status: 404, headers })
  }

  const resolvedExternalId = safeText(checkout.externalId || externalId)

  return new Response(JSON.stringify({
    success: true,
    gateway: 'abacatepay-v2',
    checkoutMode,
    checkout,
    paid: PAID_STATUSES.has(getCheckoutStatus(checkout)),
    planKey: getCheckoutPlanKey(checkout, resolvedExternalId),
    externalId: resolvedExternalId,
    subscriptionId: getSubscriptionId(checkout),
  }), {
    status: 200,
    headers,
  })
}

export default async function handler(req, context) {
  const headers = buildCheckoutCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers })
  }

  if (req.method === 'POST') {
    const auth = requireAuth(req, context, headers)
    if (auth instanceof Response) return auth

    try {
      return await createCheckout(req, auth.user, headers)
    } catch (error) {
      console.error('[abacatepay-checkout] create error:', error)
      return new Response(JSON.stringify({
        error: error?.message || 'Falha ao criar checkout',
        details: error?.details || null,
      }), { status: error?.status || 502, headers })
    }
  }

  if (req.method === 'GET') {
    try {
      return await verifyCheckout(req, headers)
    } catch (error) {
      console.error('[abacatepay-checkout] verify error:', error)
      return new Response(JSON.stringify({
        error: error?.message || 'Falha ao verificar checkout',
        details: error?.details || null,
      }), { status: error?.status || 502, headers })
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed. Use POST para criar, GET para verificar.' }), { status: 405, headers })
}
