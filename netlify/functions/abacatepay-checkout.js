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

function buildCheckoutPayload({ plan, externalId, returnUrl, completionUrl, userId, userEmail, customerName, customerCellphone, customerTaxId, timestamp, isTrial }) {
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
      createdAt: timestamp,
    },
  }

  // Aplica cupom de 100% desconto para teste grátis
  // O cupom "FREE TEST" deve existir no Dashboard AbacatePay com 100% off
  if (isTrial) {
    payload.coupons = [TRIAL_COUPON_CODE]
  }

  // IMPORTANTE: NÃO enviamos campo 'customer' separado.
  // O AbacatePay V1 tem um bug onde reutiliza dados de customers existentes
  // com mesmo CPF/email, mostrando dados de OUTROS usuários no checkout.
  // Dados do cliente ficam apenas no metadata (isolado por checkout).
  // Se precisar de customer separado no futuro, usar API v2 (subscriptions).

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
   * Isso previne que usuários burlem o trial limpando o localStorage
   */
  const netlifyToken = process.env.NETLIFY_AUTH_TOKEN
  const siteId = process.env.SITE_ID

  if (!netlifyToken || !siteId || !userId) {
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

async function createCheckout(req, authUser, headers) {
  const body = await req.json().catch(() => ({}))
  const planKey = safeText(body?.planKey)
  const isTrial = Boolean(body?.isTrial)
  const plan = getPricingPlanByKey(planKey)

  // userId é SEMPRE derivado do JWT (nunca do body) - prevenção de spoofing
  const userId = safeText(authUser?.id)
  const userEmail = safeText(authUser?.email || body?.userEmail || body?.email)
  const customerName = safeText(authUser?.fullName || body?.customerName || body?.fullName)
  const customerCellphone = safeText(body?.customerCellphone ?? body?.phone ?? body?.cellphone)
  const customerTaxId = safeText(body?.customerTaxId ?? body?.taxId ?? body?.cpf ?? body?.cnpj)

  if (!plan || !plan.productId) {
    return new Response(JSON.stringify({ error: 'planKey inválido. Use: monthly, semiannual ou annual.' }), { status: 400, headers })
  }

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
