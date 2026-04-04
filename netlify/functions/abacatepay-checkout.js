import { getPricingPlanByKey } from '../../src/services/upgradeTrigger.js'

const ABACATE_API_BASE = 'https://api.abacatepay.com/v2'
const env = globalThis.process?.env || {}

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
}

function getApiKey() {
  return String(env.ABACATE_PAY ?? '').trim()
}

function getRequestOrigin(req) {
  try {
    return new URL(req.url).origin
  } catch {
    return String(env.SITE_URL ?? env.URL ?? 'http://localhost:5173').trim() || 'http://localhost:5173'
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

async function abacateFetch(path, { method = 'GET', body } = {}) {
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
      : payload?.error || payload?.message || 'Falha na integração com a AbacatePay.'
    throw new Error(message)
  }

  return payload
}

async function createCheckout(req) {
  const body = await req.json().catch(() => ({}))
  const planKey = safeText(body?.planKey)
  const plan = getPricingPlanByKey(planKey)
  const userId = safeText(body?.userId ?? body?.accountId ?? body?.sub)
  const userEmail = safeText(body?.userEmail ?? body?.email)
  const customerName = safeText(body?.customerName ?? body?.fullName)

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

  const payload = {
    items: [
      {
        id: plan.productId,
        quantity: 1,
      },
    ],
    externalId,
    returnUrl: returnUrl.toString(),
    completionUrl: completionUrl.toString(),
    methods: ['PIX', 'CARD'],
    frequency: 'SUBSCRIPTION',
    metadata: {
      app: 'apice',
      planKey: plan.key,
      planLabel: plan.label,
      trialDays: plan.trialDays,
      userId,
      userEmail,
      customerName,
      createdAt: timestamp,
    },
  }

  const result = await abacateFetch('/checkouts/create', {
    method: 'POST',
    body: payload,
  })

  const checkout = result?.data || {}
  return new Response(JSON.stringify({
    success: true,
    checkoutId: checkout.id || '',
    checkoutUrl: checkout.url || '',
    externalId,
    planKey: plan.key,
    productId: plan.productId,
    totalPrice: plan.totalPrice,
    billingLabel: plan.billingLabel,
    trialDays: plan.trialDays,
    checkout,
  }), {
    status: 200,
    headers,
  })
}

async function verifyCheckout(req) {
  const url = new URL(req.url)
  const checkoutId = safeText(url.searchParams.get('checkoutId'))
  const externalId = safeText(url.searchParams.get('externalId'))

  if (!checkoutId && !externalId) {
    return new Response(JSON.stringify({ error: 'checkoutId ou externalId é obrigatório' }), { status: 400, headers })
  }

  const query = new URLSearchParams()
  if (checkoutId) query.set('id', checkoutId)
  if (!checkoutId && externalId) query.set('externalId', externalId)

  const result = await abacateFetch(`/checkouts/list?${query.toString()}`, { method: 'GET' })
  const checkout = Array.isArray(result?.data) ? result.data[0] : null

  if (!checkout) {
    return new Response(JSON.stringify({ error: 'Checkout não encontrado' }), { status: 404, headers })
  }

  return new Response(JSON.stringify({
    success: true,
    checkout,
    paid: ['PAID', 'ACTIVE'].includes(String(checkout.status ?? '').toUpperCase()),
    planKey: checkout?.metadata?.planKey || '',
    productId: checkout?.items?.[0]?.id || '',
    externalId: checkout.externalId || externalId || '',
  }), {
    status: 200,
    headers,
  })
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers })
  }

  if (req.method === 'POST') {
    try {
      return await createCheckout(req)
    } catch (error) {
      console.error('[abacatepay-checkout] create error:', error)
      return new Response(JSON.stringify({
        error: error?.message || 'Falha ao criar checkout',
      }), { status: 502, headers })
    }
  }

  if (req.method === 'GET') {
    try {
      return await verifyCheckout(req)
    } catch (error) {
      console.error('[abacatepay-checkout] verify error:', error)
      return new Response(JSON.stringify({
        error: error?.message || 'Falha ao verificar checkout',
      }), { status: 502, headers })
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
}
