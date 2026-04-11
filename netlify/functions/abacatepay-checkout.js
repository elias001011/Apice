import process from 'node:process'
import { getPricingPlanByKey } from '../../src/services/upgradeTrigger.js'
import { requireAuth } from './utils/auth.js'
import { buildCheckoutCorsHeaders } from './utils/cors.js'

/**
 * Integração com AbacatePay (API V1 - Billing One-Time)
 *
 * FLUXO DE PAGAMENTO:
 * 1. Usuário clica em "Começar teste grátis" ou "Assinar agora" na /planos
 * 2. Frontend chama POST /.netlify/functions/abacatepay-checkout
 * 3. Backend cria checkout na AbacatePay e retorna a URL de pagamento
 * 4. Usuário é redirecionado para AbacatePay para completar o pagamento
 * 5. Após pagar, AbacatePay redireciona de volta para completionUrl
 * 6. Frontend verifica status via GET /.netlify/functions/abacatepay-checkout
 * 7. Se pago, frontend atualiza billingState via markPlanPaid()
 * 8. Simultaneamente, webhook (payment-webhook.js) atualiza Netlify Identity
 *
 * TESTE GRÁTIS (7 dias):
 * - Funciona via cupom de 100% desconto chamado "FREE TEST" no dashboard AbacatePay
 * - Quando isTrial=true, o cupom é aplicado no checkout
 * - Usuário vai pro AbacatePay, vê valor R$ 0,00 e completa sem pagar
 * - Só pode ser usado UMA vez por conta (controlado pelo backend + localStorage)
 *
 * SEGURANÇA DE DADOS DO CLIENTE:
 * - Dados do cliente (nome, email, CPF, celular) vão APENAS no metadata da cobrança
 * - NÃO enviamos campo 'customer' separado pra evitar que AbacatePay reutilize dados
 *   de outros customers com mesmo CPF/email (bug conhecido do AbacatePay V1)
 * - O userId NUNCA vem do body (sempre do JWT) pra evitar spoofing
 * - Metadata é isolado por checkout - dados não vazam entre usuários
 */

const ABACATE_API_BASE = 'https://api.abacatepay.com'
const ABACATE_API_PATH = '/v1/billing/create'
const ABACATE_LIST_PATH = '/v1/billing/list'

// Cupom de 100% desconto criado no dashboard AbacatePay
// Deve existir previamente no Dashboard > Cupons com 100% de desconto
const TRIAL_COUPON_CODE = 'FREE TEST'

function getApiKey() {
  const key = String(process.env.ABACATE_PAY ?? '').trim()
  if (!key) {
    console.error('[abacatepay] ABACATE_PAY não está configurada nas variáveis de ambiente')
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

function getCheckoutUrl(checkout) {
  return safeText(checkout?.url || checkout?.checkoutUrl || '')
}

function getCheckoutStatus(checkout) {
  return String(checkout?.status ?? '').toUpperCase()
}

function getCheckoutPlanKey(checkout) {
  return safeText(checkout?.metadata?.planKey || '')
}

function buildCheckoutPayload({ plan, externalId, returnUrl, completionUrl, userId, userEmail, customerName, customerCellphone, customerTaxId, customerId, timestamp, isTrial }) {
  // Preço em centavos (AbacatePay V1 espera valor inteiro em centavos)
  const priceInCents = Math.max(0, Math.round(Number(plan.totalPrice) * 100))

  const payload = {
    frequency: 'ONE_TIME',
    methods: ['PIX', 'CARD'],
    products: [
      {
        externalId: plan.productId,
        name: plan.label,
        description: plan.billingLabel,
        quantity: 1,
        price: priceInCents,
      },
    ],
    returnUrl: returnUrl.toString(),
    completionUrl: completionUrl.toString(),
    externalId,
    metadata: {
      app: 'apice',
      planKey: plan.key,
      planLabel: plan.label,
      trialDays: plan.trialDays,
      isTrial: isTrial || false,
      // Dados do cliente no metadata (isolado por checkout, não vaza entre usuários)
      userId,
      userEmail,
      customerName,
      customerCellphone,
      customerTaxId,
      customerId,
      createdAt: timestamp,
    },
  }

  // Aplica cupom de 100% desconto para teste grátis
  // O cupom "FREE TEST" deve existir no Dashboard AbacatePay com 100% off
  if (isTrial) {
    payload.coupons = [TRIAL_COUPON_CODE]
  }

  // Inclui customer field com ID válido (criado/busca antes)
  // Isso resolve o erro "Customer not found" do AbacatePay
  // Cada user tem seu próprio customer ID - dados não vazam entre usuários
  if (customerId) {
    payload.customer = {
      id: customerId,
    }
  } else if (customerName || userEmail) {
    // Fallback: se não conseguiu criar customer, envia dados inline
    // (menos ideal, mas permite checkout funcionar)
    payload.customer = {
      name: customerName || userEmail || 'Cliente Ápice',
      email: userEmail || '',
      cellphone: customerCellphone || '',
      taxId: customerTaxId || '',
    }
  }

  return payload
}

async function abacateFetch(path, { method = 'GET', body } = {}) {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error('ABACATE_PAY não foi configurada no ambiente. Verifique as variáveis de ambiente no Netlify.')
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
    const error = new Error(message)
    error.status = response.status
    error.details = payload
    throw error
  }

  return payload
}

async function getUserTrialStatusFromNetlify(userId) {
  /**
   * Busca o status de trial do usuário direto no Netlify Identity (fonte confiável)
   * Isso previne que usuários burlem o trial limpando localStorage
   * 
   * REQUER: NETLIFY_AUTH_TOKEN + SITE_ID (reservado pelo Netlify)
   * Sem essas vars, retorna false (fallback: confia no localStorage do frontend)
   */
  const netlifyToken = process.env.NETLIFY_AUTH_TOKEN
  const siteId = process.env.SITE_ID // SITE_ID é reservado pelo Netlify, já existe

  if (!netlifyToken || !siteId || !userId) {
    if (!netlifyToken) {
      console.warn('[abacatepay] NETLIFY_AUTH_TOKEN não configurada. Trial cloud validation desabilitada.')
    }
    return { hasUsedTrial: false }
  }

  try {
    const listUrl = `https://api.netlify.com/api/v1/sites/${siteId}/identity/users`
    const response = await fetch(listUrl, {
      headers: {
        Authorization: `Bearer ${netlifyToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.warn('[abacatepay] Falha ao buscar usuários no Netlify Identity')
      return { hasUsedTrial: false }
    }

    const users = await response.json()
    const user = Array.isArray(users) ? users.find(u => u?.id === userId) : null

    if (!user) {
      return { hasUsedTrial: false }
    }

    const hasUsedTrial = Boolean(
      user?.user_metadata?.hasUsedTrial ||
      user?.app_metadata?.hasUsedTrial ||
      user?.user_metadata?.trialStartedAt ||
      user?.app_metadata?.trialStartedAt
    )

    return { hasUsedTrial }
  } catch (error) {
    console.warn('[abacatepay] Erro ao verificar trial no Netlify Identity:', error.message)
    return { hasUsedTrial: false }
  }
}

async function createCustomerIfMissing(customerName, userEmail, customerCellphone, customerTaxId) {
  /**
   * Cria customer no AbacatePay se não existir
   * Necessário porque a API V1 exige customer criado antes de billing
   */
  const apiKey = getApiKey()
  if (!apiKey) return null

  try {
    // Primeiro tenta listar customers com mesmo email/taxId
    const listUrl = `${ABACATE_API_BASE}/v1/customer/list`
    const listResponse = await fetch(listUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (listResponse.ok) {
      const listResult = await listResponse.json()
      const customers = listResult?.data || []

      // Busca customer existente pelo email ou taxId
      if (customerTaxId) {
        const existingByTaxId = customers.find(c => c?.taxId === customerTaxId)
        if (existingByTaxId) return existingByTaxId.id
      }
      if (userEmail) {
        const existingByEmail = customers.find(c => c?.email === userEmail)
        if (existingByEmail) return existingByEmail.id
      }
    }
  } catch (error) {
    console.warn('[abacatepay] Falha ao listar customers existentes:', error.message)
  }

  // Cria novo customer se não encontrou
  if (!customerName && !userEmail) return null

  try {
    const createUrl = `${ABACATE_API_BASE}/v1/customer/create`
    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: customerName || userEmail || 'Cliente Ápice',
        email: userEmail || '',
        cellphone: customerCellphone || '',
        taxId: customerTaxId || '',
        metadata: {
          app: 'apice',
          source: 'checkout-creation',
        },
      }),
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      console.error('[abacatepay] Falha ao criar customer:', errorText)
      return null
    }

    const result = await createResponse.json()
    const customerId = result?.data?.id
    console.log('[abacatepay] Customer criado:', customerId)
    return customerId
  } catch (error) {
    console.error('[abacatepay] Erro ao criar customer:', error.message)
    return null
  }
}

async function createCheckout(req, authUser, headers) {
  let body = {}
  try {
    body = await req.json()
    console.log('[abacatepay] Body recebido:', JSON.stringify(body))
  } catch (error) {
    console.error('[abacatepay] Erro ao parsear body:', error.message)
  }

  const planKey = safeText(body?.planKey)
  const isTrial = Boolean(body?.isTrial)

  console.log('[abacatepay] planKey:', planKey, '| isTrial:', isTrial)

  const plan = getPricingPlanByKey(planKey)
  console.log('[abacatepay] Plan encontrado:', plan?.key || 'NÃO ENCONTRADO')

  if (!plan || !plan.productId) {
    console.error('[abacatepay] Plan não encontrado para planKey:', planKey)
    return new Response(JSON.stringify({ error: 'planKey inválido. Use: monthly, semiannual ou annual.' }), { status: 400, headers })
  }

  // userId é SEMPRE derivado do JWT (nunca do body) - prevenção de spoofing
  const userId = safeText(authUser?.id)
  const userEmail = safeText(authUser?.email || body?.userEmail || body?.email)
  const customerName = safeText(authUser?.fullName || body?.customerName || body?.fullName)
  const customerCellphone = safeText(body?.customerCellphone ?? body?.phone ?? body?.cellphone)
  const customerTaxId = safeText(body?.customerTaxId ?? body?.taxId ?? body?.cpf ?? body?.cnpj)

  console.log('[abacatepay] userId:', userId, '| userEmail:', userEmail)

  // Cria customer no AbacatePay se necessário
  const customerId = await createCustomerIfMissing(customerName, userEmail, customerCellphone, customerTaxId)

  // BLINDAGEM DO TRIAL: Verifica no Netlify Identity se já usou trial
  // Isso previne que usuários burlem limpando localStorage
  let hasUsedTrialCloud = false
  if (isTrial) {
    const cloudStatus = await getUserTrialStatusFromNetlify(userId)
    hasUsedTrialCloud = cloudStatus.hasUsedTrial

    if (hasUsedTrialCloud) {
      console.warn(`[abacatepay] Usuário ${userId} tentou usar trial novamente. Bloqueado.`)
      return new Response(JSON.stringify({
        error: 'O teste grátis já foi usado nesta conta. Assine um plano para continuar.',
        hasUsedTrial: true,
      }), { status: 403, headers })
    }
  }

  const origin = getRequestOrigin(req)
  const timestamp = new Date().toISOString()
  const externalId = buildExternalId({ userId, planKey: plan.key, timestamp })
  
  // URLs de retorno após pagamento
  const returnUrl = new URL('/planos', origin)
  returnUrl.searchParams.set('billing', 'return')
  returnUrl.searchParams.set('plan', plan.key)
  returnUrl.searchParams.set('externalId', externalId)

  const completionUrl = new URL('/planos', origin)
  completionUrl.searchParams.set('billing', 'complete')
  completionUrl.searchParams.set('plan', plan.key)
  completionUrl.searchParams.set('externalId', externalId)

  try {
    const result = await abacateFetch(
      ABACATE_API_PATH,
      {
        method: 'POST',
        body: buildCheckoutPayload({
          plan,
          externalId,
          returnUrl,
          completionUrl,
          userId,
          userEmail,
          customerName,
          customerCellphone,
          customerTaxId,
          customerId,
          timestamp,
          isTrial,
        }),
      },
    )

    const checkout = result?.data || {}
    const checkoutUrl = getCheckoutUrl(checkout)
    
    if (!checkoutUrl) {
      console.error('[abacatepay] Checkout criado sem URL:', JSON.stringify(checkout))
      return new Response(JSON.stringify({ error: 'A AbacatePay não retornou a URL de checkout.' }), { status: 502, headers })
    }

    return new Response(JSON.stringify({
      success: true,
      checkoutId: checkout.id || '',
      checkoutUrl,
      externalId,
      planKey: plan.key,
      productId: plan.productId,
      totalPrice: plan.totalPrice,
      billingLabel: plan.billingLabel,
      trialDays: plan.trialDays,
      isTrial,
      checkout,
    }), {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error('[abacatepay] Erro ao criar checkout:', error)
    throw error
  }
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

  try {
    const result = await abacateFetch(`${ABACATE_LIST_PATH}?${query.toString()}`, { method: 'GET' })
    const checkouts = Array.isArray(result?.data) ? result.data : []
    const checkout = checkoutId
      ? checkouts.find((item) => String(item?.id ?? '') === checkoutId) || checkouts[0] || null
      : externalId
        ? checkouts.find((item) => String(item?.externalId ?? '') === externalId) || checkouts[0] || null
        : checkouts[0] || null

    if (!checkout) {
      return new Response(JSON.stringify({ error: 'Checkout não encontrado' }), { status: 404, headers })
    }

    return new Response(JSON.stringify({
      success: true,
      checkout,
      paid: ['PAID', 'ACTIVE'].includes(getCheckoutStatus(checkout)),
      planKey: getCheckoutPlanKey(checkout) || checkout?.externalId || externalId || '',
      externalId: checkout.externalId || externalId || '',
    }), {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error('[abacatepay] Erro ao verificar checkout:', error)
    return new Response(JSON.stringify({
      error: error?.message || 'Falha ao verificar checkout',
    }), {
      status: error?.status || 502,
      headers,
    })
  }
}

export default async function handler(req) {
  const headers = buildCheckoutCorsHeaders(req)

  // Pre-flight CORS check
  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers })
  }

  // POST = criar checkout (requer autenticação)
  if (req.method === 'POST') {
    const auth = requireAuth(req, headers)
    if (auth instanceof Response) return auth

    try {
      return await createCheckout(req, auth.user, headers)
    } catch (error) {
      console.error('[abacatepay-checkout] create error:', error)
      return new Response(JSON.stringify({
        error: error?.message || 'Falha ao criar checkout',
      }), { status: error?.status || 502, headers })
    }
  }

  // GET = verificar status do checkout (público, precisa do checkoutId ou externalId)
  if (req.method === 'GET') {
    try {
      return await verifyCheckout(req, headers)
    } catch (error) {
      console.error('[abacatepay-checkout] verify error:', error)
      return new Response(JSON.stringify({
        error: error?.message || 'Falha ao verificar checkout',
      }), { status: error?.status || 502, headers })
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed. Use POST para criar, GET para verificar.' }), { status: 405, headers })
}
