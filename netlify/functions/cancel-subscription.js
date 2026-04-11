import process from 'node:process'
import { requireAuth } from './utils/auth.js'
import { buildCheckoutCorsHeaders } from './utils/cors.js'

/**
 * Endpoint para cancelar assinatura/cobrança no AbacatePay
 * 
 * COMO FUNCIONA:
 * - Usuário autenticado pode solicitar cancelamento
 * - Backend tenta cancelar no AbacatePay via API
 * - Atualiza metadata do usuário no Netlify Identity para 'free'
 * 
 * IMPORTANTE:
 * - AbacatePay V1 é 'billing one-time' (pagamento único por período)
 * - Não tem 'cancelar' no sentido tradicional, mas podemos:
 *   1. Invalidar checkout pendente (se não pago ainda)
 *   2. Marcar usuário como 'free' no Netlify Identity
 *   3. Registrar solicitação de cancelamento/reembolso
 * - Para V2 (subscriptions), usar endpoint de cancelamento de assinatura
 */

const ABACATE_API_BASE = 'https://api.abacatepay.com'

function getApiKey() {
  const key = String(process.env.ABACATE_PAY ?? '').trim()
  if (!key) {
    console.error('[cancel-subscription] ABACATE_PAY não está configurada')
  }
  return key
}

function safeText(value) {
  return String(value ?? '').trim()
}

async function cancelAbacateBilling(checkoutId, externalId) {
  /**
   * Tenta cancelar cobrança no AbacatePay
   * V1 não tem endpoint de cancelamento direto, mas podemos:
   * 1. Verificar status do checkout
   * 2. Se não pago, marcar como expirado/inválido
   * 3. Se pago, registrar solicitação de cancelamento
   */
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error('ABACATE_PAY não configurada')
  }

  // Verifica status atual do checkout
  const query = new URLSearchParams()
  if (checkoutId) query.set('id', checkoutId)
  if (externalId) query.set('externalId', externalId)

  const checkResponse = await fetch(
    `${ABACATE_API_BASE}/v1/billing/list?${query.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    },
  )

  if (!checkResponse.ok) {
    throw new Error('Falha ao verificar cobrança no AbacatePay')
  }

  const result = await checkResponse.json()
  const billing = Array.isArray(result?.data) ? result.data[0] : null

  if (!billing) {
    throw new Error('Cobrança não encontrada no AbacatePay')
  }

  const status = String(billing?.status ?? '').toUpperCase()

  // Se já está pago, não podemos cancelar via API V1
  // Apenas registrar solicitação
  if (['PAID', 'ACTIVE', 'CONFIRMED'].includes(status)) {
    console.warn('[cancel-subscription] Cobrança já está paga. Status:', status)
    return {
      success: true,
      cancelled: false,
      message: 'Cobrança já está paga. Cancelamento requer solicitação manual de reembolso.',
      billingStatus: status,
      billingId: billing.id,
    }
  }

  // Se está pendente, podemos tentar cancelar
  // V1 não tem endpoint de cancelamento, então apenas logamos
  // O ideal é migrar pra V2 que tem endpoint de cancelamento
  console.warn('[cancel-subscription] AbacatePay V1 não suporta cancelamento via API.')
  console.warn('[cancel-subscription] Billing ID:', billing.id, 'Status:', status)

  return {
    success: true,
    cancelled: false,
    message: 'AbacatePay V1 não suporta cancelamento via API. Usuário marcado como free.',
    billingStatus: status,
    billingId: billing.id,
    requiresManualRefund: status === 'PAID',
  }
}

async function downgradeUserToFree(userId) {
  /**
   * Atualiza metadata do usuário no Netlify Identity para 'free'
   * REQUER: NETLIFY_AUTH_TOKEN
   * Sem essa var, loga warning mas não falha (frontend ainda atualiza localStorage)
   */
  const netlifyToken = process.env.NETLIFY_AUTH_TOKEN
  const siteId = process.env.SITE_ID // SITE_ID é reservado pelo Netlify

  if (!netlifyToken || !siteId) {
    console.warn('[cancel-subscription] NETLIFY_AUTH_TOKEN não configurada. Downgrade cloud desabilitado.')
    return false
  }

  try {
    const updateUrl = `https://api.netlify.com/api/v1/sites/${siteId}/identity/users/${userId}`

    const updateResponse = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${netlifyToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_metadata: {
          planTier: 'free',
          planKey: '',
          subscriptionActive: false,
        },
        user_metadata: {
          planStatus: 'free',
          subscriptionCancelledAt: new Date().toISOString(),
        },
      }),
    })

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text()
      console.error('[cancel-subscription] Falha ao atualizar usuário:', errorText)
      return false
    }

    console.log(`[cancel-subscription] Usuário ${userId} downgraded para FREE.`)
    return true
  } catch (error) {
    console.error('[cancel-subscription] Erro ao downgradar usuário:', error.message)
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

  if (!checkoutId && !externalId) {
    return new Response(JSON.stringify({ error: 'checkoutId ou externalId é obrigatório' }), { status: 400, headers })
  }

  try {
    // 1. Tenta cancelar no AbacatePay
    const abacateResult = await cancelAbacateBilling(checkoutId, externalId)

    // 2. Downgrade do usuário para free (pode falhar graceful se não tiver NETLIFY_AUTH_TOKEN)
    const userDowngraded = await downgradeUserToFree(userId)

    return new Response(JSON.stringify({
      success: true,
      cancelled: abacateResult.cancelled,
      message: abacateResult.message,
      requiresManualRefund: abacateResult.requiresManualRefund || false,
      billingStatus: abacateResult.billingStatus,
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
    }), {
      status: error?.status || 500,
      headers,
    })
  }
}

export default async function handler(req) {
  const headers = buildCheckoutCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
  }

  // Requer autenticação
  const auth = requireAuth(req, headers)
  if (auth instanceof Response) return auth

  return await handleCancel(req, auth.user, headers)
}
