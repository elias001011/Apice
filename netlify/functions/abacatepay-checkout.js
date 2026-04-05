import process from 'node:process'
import { getPricingPlanByKey } from '../../src/services/upgradeTrigger.js'
import { requireAuth } from './utils/auth.js'
import { buildCheckoutCorsHeaders } from './utils/cors.js'

const ABACATE_API_BASE = 'https://api.abacatepay.com'
const API_VERSIONS = ['v1', 'v2']
const API_ENDPOINTS = {
  v1: {
    create: '/v1/billing/create',
    list: '/v1/billing/list',
  },
  v2: {
    create: '/v2/subscriptions/create',
    list: '/v2/subscriptions/list',
  },
}

function getApiKey() {
  return String(process.env.ABACATE_PAY ?? '').trim()
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
  return ['apice', safeUserId || 'account', safePlanKey || 'plan', safeTimestamp || Date.now()].join(':')
}

function getCheckoutUrl(checkout) {
  return safeText(checkout?.url || checkout?.checkoutUrl || '')
}

function getCheckoutProductId(checkout) {
  return safeText(
    checkout?.items?.[0]?.id
    || checkout?.products?.[0]?.id
    || checkout?.products?.[0]?.externalId
    || '',
  )
}

function getCheckoutPlanKey(checkout) {
  return safeText(checkout?.metadata?.planKey || '')
}

function getCheckoutStatus(checkout) {
  return String(checkout?.status ?? '').toUpperCase()
}

function buildV2CheckoutPayload({ plan, externalId, returnUrl, completionUrl, userId, userEmail, customerName, timestamp }) {
  return {
    items: [
      {
        id: plan.productId,
        quantity: 1,
      },
    ],
    externalId,
    returnUrl: returnUrl.toString(),
    completionUrl: completionUrl.toString(),
    methods: ['CARD'],
    metadata: {
      app: 'apice',
      apiVersion: 'v2',
      planKey: plan.key,
      planLabel: plan.label,
      trialDays: plan.trialDays,
      userId,
      userEmail,
      customerName,
      createdAt: timestamp,
    },
  }
}

function buildV1CheckoutPayload({ plan, externalId, returnUrl, completionUrl, userId, userEmail, customerName, customerCellphone, customerTaxId, timestamp }) {
  const price = Math.max(0, Math.round(Number(plan.totalPrice) * 100))
  const payload = {
    frequency: 'ONE_TIME',
    methods: ['PIX', 'CARD'],
    products: [
      {
        externalId: plan.productId,
        name: plan.label,
        description: plan.billingLabel,
        quantity: 1,
        price,
      },
    ],
    returnUrl: returnUrl.toString(),
    completionUrl: completionUrl.toString(),
    externalId,
    metadata: {
      app: 'apice',
      apiVersion: 'v1',
      planKey: plan.key,
      planLabel: plan.label,
      trialDays: plan.trialDays,
      userId,
      userEmail,
      customerName,
      createdAt: timestamp,
    },
  }

  if (customerName || userEmail || customerCellphone || customerTaxId) {
    payload.customer = {
      name: customerName || userEmail || 'Cliente Ápice',
      cellphone: safeText(customerCellphone),
      taxId: safeText(customerTaxId),
      email: userEmail || '',
    }
  }

  return payload
}

function buildCheckoutPayload(apiVersion, context) {
  if (apiVersion === 'v1') {
    return buildV1CheckoutPayload(context)
  }

  return buildV2CheckoutPayload(context)
}

async function abacateFetch(apiVersion, path, { method = 'GET', body } = {}) {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error('ABACATE_PAY não foi configurada no ambiente.')
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
    const message = typeof payload === 'string'
      ? payload
      : payload?.error || payload?.message || (response.status === 401
        ? `Chave de API incompatível com a versão ${apiVersion.toUpperCase()} da AbacatePay.`
        : 'Falha na integração com a AbacatePay.')
    const error = new Error(message)
    error.status = response.status
    error.details = payload
    error.apiVersion = apiVersion
    throw error
  }

  return payload
}

async function createCheckout(req, authUser, headers) {
  const body = await req.json().catch(() => ({}))
  const planKey = safeText(body?.planKey)
  const plan = getPricingPlanByKey(planKey)
  // C-02 FIX: userId is ALWAYS derived from the authenticated JWT, never from the body.
  // This prevents spoofing where an attacker could create checkouts attributed to other users.
  const userId = safeText(authUser?.id)
  const userEmail = safeText(authUser?.email || body?.userEmail || body?.email)
  const customerName = safeText(authUser?.fullName || body?.customerName || body?.fullName)
  const customerCellphone = safeText(body?.customerCellphone ?? body?.phone ?? body?.cellphone)
  const customerTaxId = safeText(body?.customerTaxId ?? body?.taxId ?? body?.cpf ?? body?.cnpj)

  if (!plan || !plan.productId) {
    return new Response(JSON.stringify({ error: 'planKey inválido' }), { status: 400, headers })
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

  const checkoutContext = {
    plan,
    externalId,
    returnUrl,
    completionUrl,
    userId,
    userEmail,
    customerName,
    customerCellphone,
    customerTaxId,
    timestamp,
  }

  let lastError = null

  for (const apiVersion of API_VERSIONS) {
    try {
      const result = await abacateFetch(
        apiVersion,
        API_ENDPOINTS[apiVersion].create,
        {
          method: 'POST',
          body: buildCheckoutPayload(apiVersion, checkoutContext),
        },
      )

      const checkout = result?.data || {}
      return new Response(JSON.stringify({
        success: true,
        checkoutId: checkout.id || '',
        checkoutUrl: getCheckoutUrl(checkout),
        externalId,
        planKey: plan.key,
        productId: plan.productId,
        totalPrice: plan.totalPrice,
        billingLabel: plan.billingLabel,
        trialDays: plan.trialDays,
        apiVersion,
        checkout,
      }), {
        status: 200,
        headers,
      })
    } catch (error) {
      lastError = error
      if (error?.status !== 401) {
        break
      }
    }
  }

  throw lastError || new Error('Falha ao criar checkout')
}

async function verifyCheckout(req, headers) {
  const url = new URL(req.url)
  const checkoutId = safeText(url.searchParams.get('checkoutId'))
  const externalId = safeText(url.searchParams.get('externalId'))

  if (!checkoutId && !externalId) {
    return new Response(JSON.stringify({ error: 'checkoutId ou externalId é obrigatório' }), { status: 400, headers })
  }

  const query = new URLSearchParams()
  if (checkoutId) query.set('id', checkoutId)
  if (!checkoutId && externalId) query.set('externalId', externalId)

  let lastError = null

  for (const apiVersion of API_VERSIONS) {
    try {
      const result = await abacateFetch(apiVersion, `${API_ENDPOINTS[apiVersion].list}?${query.toString()}`, { method: 'GET' })
      const checkouts = Array.isArray(result?.data) ? result.data : []
      const checkout = checkoutId
        ? checkouts.find((item) => String(item?.id ?? '') === checkoutId) || checkouts[0] || null
        : externalId
          ? checkouts.find((item) => String(item?.externalId ?? '') === externalId) || checkouts[0] || null
          : checkouts[0] || null

      if (!checkout) {
        lastError = new Error('Checkout não encontrado')
        lastError.status = 404
        continue
      }

      return new Response(JSON.stringify({
        success: true,
        checkout,
        paid: ['PAID', 'ACTIVE'].includes(getCheckoutStatus(checkout)),
        planKey: getCheckoutPlanKey(checkout) || checkout?.externalId || externalId || '',
        productId: getCheckoutProductId(checkout),
        externalId: checkout.externalId || externalId || '',
        apiVersion,
      }), {
        status: 200,
        headers,
      })
    } catch (error) {
      lastError = error
    }
  }

  return new Response(JSON.stringify({
    error: 'Checkout não encontrado',
  }), {
    status: Number.isInteger(lastError?.status) ? lastError.status : 404,
    headers,
  })
}

export default async function handler(req) {
  const headers = buildCheckoutCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers })
  }

  if (req.method === 'POST') {
    // ── Authentication required for creating checkouts ─────────────────
    const auth = requireAuth(req, headers)
    if (auth instanceof Response) return auth

    try {
      return await createCheckout(req, auth.user, headers)
    } catch (error) {
      console.error('[abacatepay-checkout] create error:', error)
      return new Response(JSON.stringify({
        error: 'Falha ao criar checkout',
      }), { status: Number.isInteger(error?.status) ? error.status : 502, headers })
    }
  }

  if (req.method === 'GET') {
    // GET (verify) remains public — the checkout status page needs it
    try {
      return await verifyCheckout(req, headers)
    } catch (error) {
      console.error('[abacatepay-checkout] verify error:', error)
      return new Response(JSON.stringify({
        error: 'Falha ao verificar checkout',
      }), { status: Number.isInteger(error?.status) ? error.status : 502, headers })
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
}
