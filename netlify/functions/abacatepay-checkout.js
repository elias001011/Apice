import process from 'node:process'
import { PRICING_PLANS, getPricingPlanByKey } from '../../src/services/upgradeTrigger.js'
import { requireAuth } from './utils/auth.js'
import { buildCheckoutCorsHeaders } from './utils/cors.js'

/**
 * Integracao com AbacatePay API v2.
 *
 * Fluxo:
 * 1. Frontend chama POST /.netlify/functions/abacatepay-checkout
 * 2. Backend cria/recupera um customer v2 quando houver e-mail
 * 3. Backend cria um checkout de assinatura em /v2/subscriptions/create
 *    ou pagamento unico em /v2/checkouts/create
 * 4. Cliente paga na URL retornada pela AbacatePay
 * 5. Frontend verifica o status via GET nesta funcao
 * 6. Webhook v2 reforca a sincronizacao em nuvem
 *
 * O fluxo e pago. Cupons podem ser liberados no checkout via
 * ABACATE_CHECKOUT_COUPONS/ABACATE_ALLOWED_COUPONS, sem teste grátis automático.
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
const ABACATE_COUPON_LIST_PATH = '/v2/coupons/list'
const ABACATE_PRODUCT_GET_PATH = '/v2/products/get'

const PAID_STATUSES = new Set(['PAID', 'ACTIVE', 'COMPLETED'])
const SUBSCRIPTION_PRODUCT_CYCLES = new Set(['WEEKLY', 'MONTHLY', 'SEMIANNUALLY', 'ANNUALLY', 'YEARLY'])

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
  return ['apice', safeUserId || 'account', safePlanKey || 'plan', safeTimestamp || Date.now()].join(':')
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

function getAllowedCheckoutCoupons() {
  const raw = safeText(process.env.ABACATE_CHECKOUT_COUPONS || process.env.ABACATE_ALLOWED_COUPONS)
  if (!raw) return []

  return raw
    .split(/[,\n;]/)
    .map((coupon) => coupon.trim())
    .filter(Boolean)
    .slice(0, 50)
}

function shouldAutoListCoupons() {
  const raw = safeText(process.env.ABACATE_AUTO_LIST_COUPONS).toLowerCase()
  return raw !== '0' && raw !== 'false' && raw !== 'off'
}

function shouldValidateProducts() {
  const raw = safeText(process.env.ABACATE_VALIDATE_PRODUCTS).toLowerCase()
  return raw !== '0' && raw !== 'false' && raw !== 'off'
}

function normalizeCycle(value) {
  const cycle = safeText(value).toUpperCase()
  if (cycle === 'YEARLY') return 'ANNUALLY'
  if (cycle === 'SEMIANNUAL' || cycle === 'SEMI_ANNUALLY') return 'SEMIANNUALLY'
  return cycle
}

function isOneTimePlan(plan) {
  const checkoutMode = safeText(plan?.checkoutMode).toLowerCase()
  const frequency = safeText(plan?.paymentFrequency).toUpperCase()
  return checkoutMode === 'payment' || checkoutMode === 'checkout' || frequency === 'ONE_TIME'
}

function getBillingMode(plan) {
  return isOneTimePlan(plan) ? 'one_time' : 'subscription'
}

function getCheckoutMode(plan) {
  return isOneTimePlan(plan) ? 'checkout' : 'subscription'
}

function getPaymentMethods(plan, isSubscription) {
  if (Array.isArray(plan?.paymentMethods) && plan.paymentMethods.length > 0) {
    return plan.paymentMethods.map((method) => safeText(method).toUpperCase()).filter(Boolean)
  }

  return isSubscription ? ['CARD'] : ['PIX', 'CARD']
}

function getPlanAccessEndsAt(plan, paidAt = new Date().toISOString()) {
  const months = Math.max(1, Math.round(Number(plan?.accessMonths || 1)))
  const startDate = new Date(paidAt)
  if (!Number.isFinite(startDate.getTime())) return ''
  const endDate = new Date(startDate.getTime())
  endDate.setMonth(endDate.getMonth() + months)
  return endDate.toISOString()
}

function isCouponRedeemable(coupon) {
  const status = safeText(coupon?.status).toUpperCase()
  const maxRedeems = Number(coupon?.maxRedeems)
  const redeemsCount = Number(coupon?.redeemsCount)

  if (status && status !== 'ACTIVE') return false
  if (Number.isFinite(maxRedeems) && maxRedeems >= 0) {
    return !Number.isFinite(redeemsCount) || redeemsCount < maxRedeems
  }

  return true
}

async function listActiveCouponIds() {
  if (!shouldAutoListCoupons()) return []

  try {
    const result = await abacateFetch(`${ABACATE_COUPON_LIST_PATH}?limit=100&status=ACTIVE`, { method: 'GET' })
    const coupons = Array.isArray(result?.data) ? result.data : []

    return coupons
      .filter(isCouponRedeemable)
      .map((coupon) => safeText(coupon?.id || coupon?.code))
      .filter(Boolean)
      .slice(0, 50)
  } catch (error) {
    console.warn('[abacatepay] Não foi possível listar cupons ativos; checkout seguirá sem lista automática:', error.message)
    return []
  }
}

async function resolveCheckoutCoupons() {
  const configuredCoupons = getAllowedCheckoutCoupons()
  if (configuredCoupons.length > 0) {
    return {
      coupons: configuredCoupons,
      source: 'env',
    }
  }

  const listedCoupons = await listActiveCouponIds()
  return {
    coupons: listedCoupons,
    source: listedCoupons.length > 0 ? 'abacatepay-list' : 'none',
  }
}

async function resolvePlanCoupons(plan) {
  if (plan?.allowCoupons === false) {
    return { coupons: [], source: 'disabled-for-plan' }
  }

  return resolveCheckoutCoupons()
}

async function getProductSnapshot(productId) {
  if (!shouldValidateProducts()) return null

  try {
    const query = new URLSearchParams()
    query.set('id', productId)
    const result = await abacateFetch(`${ABACATE_PRODUCT_GET_PATH}?${query.toString()}`, { method: 'GET' })
    return result?.data && typeof result.data === 'object' ? result.data : null
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      console.warn('[abacatepay] Chave sem PRODUCT:READ; pulando validação do produto:', error.message)
      return null
    }

    throw error
  }
}

async function validateSubscriptionProduct(plan) {
  const product = await getProductSnapshot(plan.productId)
  if (!product) {
    return {
      product: null,
      validationWarning: 'Produto não validado. Adicione PRODUCT:READ à chave da AbacatePay para detectar ciclo/status antes do checkout.',
    }
  }

  const status = safeText(product.status).toUpperCase()
  const cycle = normalizeCycle(product.cycle)
  const expectedCycle = normalizeCycle(plan.abacateCycle)

  if (status && status !== 'ACTIVE') {
    throw new Error(`Produto AbacatePay ${plan.productId} está com status ${status}. Ative o produto antes de vender este plano.`)
  }

  if (!SUBSCRIPTION_PRODUCT_CYCLES.has(cycle)) {
    throw new Error(`Produto AbacatePay ${plan.productId} não tem ciclo de assinatura. Crie/aponte para um produto com cycle MONTHLY, SEMIANNUALLY ou ANNUALLY.`)
  }

  if (expectedCycle && cycle !== expectedCycle) {
    throw new Error(`Produto AbacatePay ${plan.productId} está com cycle ${cycle}, mas o plano ${plan.key} espera ${expectedCycle}.`)
  }

  return {
    product,
    validationWarning: '',
  }
}

async function validateCheckoutProduct(plan) {
  const product = await getProductSnapshot(plan.productId)
  if (!product) {
    return {
      product: null,
      validationWarning: 'Produto não validado. Adicione PRODUCT:READ à chave da AbacatePay para detectar status antes do checkout.',
    }
  }

  const status = safeText(product.status).toUpperCase()
  const cycle = normalizeCycle(product.cycle)
  if (status && status !== 'ACTIVE') {
    throw new Error(`Produto AbacatePay ${plan.productId} está com status ${status}. Ative o produto antes de vender este plano.`)
  }

  if (cycle) {
    throw new Error(`Produto AbacatePay ${plan.productId} está com cycle ${cycle}, mas o pagamento único precisa usar um produto avulso sem cycle.`)
  }

  return {
    product,
    validationWarning: '',
  }
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

function isDevModeCheckout(checkout, product = null) {
  return Boolean(checkout?.devMode || checkout?.checkout?.devMode || checkout?.data?.devMode || product?.devMode)
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

function buildLegacyCustomerPayload(payload) {
  return {
    data: {
      email: payload.email,
      ...(payload.name ? { name: payload.name } : {}),
      ...(payload.cellphone ? { cellphone: payload.cellphone } : {}),
      ...(payload.taxId ? { taxId: payload.taxId } : {}),
    },
    metadata: payload.metadata,
  }
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
      const retryPayload = buildLegacyCustomerPayload(payload)
      const retry = await abacateFetch(ABACATE_CUSTOMER_CREATE_PATH, {
        method: 'POST',
        body: retryPayload,
      })
      return safeText(retry?.data?.id)
    } catch (retryError) {
      console.warn('[abacatepay] Customer v2 não foi criado após retry. Checkout seguirá sem customerId:', error.message, retryError.message)
      return ''
    }
  }
}

function buildCheckoutPayload({
  plan,
  externalId,
  returnUrl,
  completionUrl,
  userId,
  timestamp,
  customerId,
  mode = 'subscription',
  allowedCoupons = [],
  couponsSource = 'none',
}) {
  const isSubscription = mode === 'subscription'
  const methods = getPaymentMethods(plan, isSubscription)
  const payload = {
    items: [
      {
        id: plan.productId,
        quantity: 1,
      },
    ],
    methods,
    returnUrl: returnUrl.toString(),
    completionUrl: completionUrl.toString(),
    externalId,
    metadata: {
      app: 'apice',
      gateway: 'abacatepay-v2',
      checkoutMode: mode,
      billingMode: getBillingMode(plan),
      planKey: plan.key,
      planLabel: plan.label,
      userId,
      createdAt: timestamp,
      accessMonths: Number(plan.accessMonths || 0) || undefined,
      couponsEnabled: allowedCoupons.length > 0,
      couponsSource,
    },
  }

  if (customerId) {
    payload.customerId = customerId
  }

  if (allowedCoupons.length > 0) {
    payload.coupons = allowedCoupons
  }

  console.log('[abacatepay] Payload v2 COMPLETO:', JSON.stringify({
    items: payload.items,
    methods: payload.methods,
    returnUrl: payload.returnUrl,
    completionUrl: payload.completionUrl,
    externalId: payload.externalId,
    customerId: payload.customerId || '(sem customer)',
    couponsCount: allowedCoupons.length,
    couponsSource,
    planKey: payload.metadata.planKey,
    mode,
    frequency: payload.frequency || '(subscription)',
    productId: plan.productId,
    expectedCycle: normalizeCycle(plan.abacateCycle),
  }))

  return payload
}

async function createCheckout(req, authUser, headers) {
  let body = {}
  try {
    body = await req.json()
    console.log('[abacatepay] Body recebido (resumido):', JSON.stringify({
      planKey: body?.planKey || '',
      hasCustomerName: Boolean(safeText(body?.customerName || body?.fullName)),
      hasCustomerCellphone: Boolean(safeText(body?.customerCellphone || body?.phone || body?.cellphone)),
      hasCustomerTaxId: Boolean(safeText(body?.customerTaxId || body?.taxId || body?.cpf || body?.cnpj)),
    }))
  } catch (error) {
    console.error('[abacatepay] Erro ao parsear body:', error.message)
  }

  const planKey = safeText(body?.planKey)
  const plan = getPricingPlanByKey(planKey)
  const knownPlanKeys = PRICING_PLANS.map((item) => item.key)

  if (!plan || !plan.productId || !knownPlanKeys.includes(planKey)) {
    console.error('[abacatepay] Plan não encontrado para planKey:', planKey)
    return new Response(JSON.stringify({ error: `planKey inválido. Use: ${knownPlanKeys.join(', ')}.` }), { status: 400, headers })
  }

  const userId = safeText(authUser?.id)
  const userEmail = safeText(authUser?.email || body?.userEmail || body?.email)
  const customerName = safeText(authUser?.fullName || body?.customerName || body?.fullName)
  const customerCellphone = safeText(body?.customerCellphone ?? body?.phone ?? body?.cellphone)
  const customerTaxId = safeText(body?.customerTaxId ?? body?.taxId ?? body?.cpf ?? body?.cnpj)

  const origin = getRequestOrigin(req)
  const timestamp = new Date().toISOString()
  const externalId = buildExternalId({ userId, planKey: plan.key, timestamp })
  const oneTimeCheckout = isOneTimePlan(plan)
  const checkoutMode = getCheckoutMode(plan)
  const billingMode = getBillingMode(plan)

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

    const { product, validationWarning } = oneTimeCheckout
      ? await validateCheckoutProduct(plan)
      : await validateSubscriptionProduct(plan)
    console.log(`[abacatepay] Produto validado para ${oneTimeCheckout ? 'pagamento unico' : 'assinatura'}:`, JSON.stringify({
      planKey: plan.key,
      productId: plan.productId,
      status: safeText(product?.status) || '(sem PRODUCT:READ)',
      cycle: safeText(product?.cycle) || '(sem PRODUCT:READ)',
      expectedCycle: normalizeCycle(plan.abacateCycle),
      devMode: Boolean(product?.devMode),
      customerId: customerId || '(checkout vai coletar dados)',
    }))

    const { coupons: allowedCoupons, source: couponsSource } = await resolvePlanCoupons(plan)

    const createPath = oneTimeCheckout ? ABACATE_CHECKOUT_CREATE_PATH : ABACATE_SUBSCRIPTION_CREATE_PATH
    const result = await abacateFetch(createPath, {
      method: 'POST',
      body: buildCheckoutPayload({
        plan,
        externalId,
        returnUrl,
        completionUrl,
        userId,
        timestamp,
        customerId,
        mode: checkoutMode,
        allowedCoupons,
        couponsSource,
      }),
    })

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
      billingMode,
      subscriptionFallback: false,
      checkoutId: checkout.id || checkout.checkout?.id || '',
      subscriptionId: oneTimeCheckout ? '' : getSubscriptionId(checkout),
      checkoutUrl,
      externalId,
      customerId,
      devMode: isDevModeCheckout(checkout, product),
      couponsEnabled: allowedCoupons.length > 0,
      couponsSource,
      planKey: plan.key,
      productId: plan.productId,
      product: product ? {
        id: safeText(product.id),
        status: safeText(product.status),
        cycle: safeText(product.cycle),
        devMode: Boolean(product.devMode),
        price: Number.isFinite(Number(product.price)) ? Number(product.price) : null,
      } : null,
      productValidationWarning: validationWarning,
      accessEndsAt: oneTimeCheckout ? getPlanAccessEndsAt(plan) : '',
      checkoutHint: oneTimeCheckout
        ? 'Checkout de pagamento único criado com PIX e cartão. O campo de cupom segue disponível quando houver cupons autorizados.'
        : isDevModeCheckout(checkout, product)
          ? 'Checkout em Dev mode: cartões reais podem falhar no charge/create/card. Use 4242 4242 4242 4242, validade futura e CVV 123 para simular aprovação.'
          : 'Checkout de assinatura criado. O cycle fica no produto da AbacatePay e não é enviado no payload do checkout.',
      totalPrice: plan.totalPrice,
      billingLabel: plan.billingLabel,
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
  const planKey = getCheckoutPlanKey(checkout, resolvedExternalId)
  const plan = getPricingPlanByKey(planKey)
  const billingMode = checkoutMode === 'checkout' || isOneTimePlan(plan) ? 'one_time' : 'subscription'

  return new Response(JSON.stringify({
    success: true,
    gateway: 'abacatepay-v2',
    checkoutMode,
    billingMode,
    checkout,
    paid: PAID_STATUSES.has(getCheckoutStatus(checkout)),
    planKey,
    externalId: resolvedExternalId,
    subscriptionId: billingMode === 'one_time' ? '' : getSubscriptionId(checkout),
    accessEndsAt: billingMode === 'one_time' ? getPlanAccessEndsAt(plan) : '',
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
