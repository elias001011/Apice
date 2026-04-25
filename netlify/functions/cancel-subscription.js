import process from 'node:process'
import { requireAuth } from './utils/auth.js'
import { buildCheckoutCorsHeaders } from './utils/cors.js'

/**
 * Endpoint para cancelar assinatura/cobrança no AbacatePay
 *
 * COMO FUNCIONA:
 * - Usuário autenticado pode solicitar cancelamento
 * - Backend tenta cancelar no AbacatePay via API
 * - Atualiza blob do usuário no Netlify Blobs para 'free'
 * - NÃO atualiza user_metadata (evita JWT inchado)
 *
 * IMPORTANTE:
 * - AbacatePay V1 é 'billing one-time' (pagamento único por período)
 * - Não tem 'cancelar' no sentido tradicional, mas podemos:
 *   1. Invalidar checkout pendente (se não pago ainda)
 *   2. Marcar usuário como 'free' no blob
 *   3. Registrar solicitação de cancelamento/reembolso
 */

const ABACATE_API_BASE = 'https://api.abacatepay.com'
const BLOB_STORE_NAME = 'user-state'

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

async function getStore() {
  try {
    const { getStore: getStoreFn } = await import('@netlify/blobs')
    return getStoreFn({ name: BLOB_STORE_NAME, consistency: 'strong' })
  } catch {
    return null
  }
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

  // Se está pendente, apenas logamos (V1 não tem cancelamento via API)
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

async function downgradeUserToFreeInBlob(userId) {
  /**
   * Atualiza blob do usuário para 'free' no Netlify Blobs
   * NÃO atualiza user_metadata (evita JWT inchado)
   */
  const store = await getStore()
  if (!store) {
    console.warn('[cancel-subscription] Blob store não disponível. Downgrade cloud desabilitado.')
    return false
  }

  try {
    const blobKey = `user-state:${userId}`
    const existingData = await store.get(blobKey, { type: 'json' })

    const currentState = existingData && typeof existingData === 'object' ? existingData : {}

    const updatedState = {
      ...currentState,
      billing: {
        ...(currentState.billing || {}),
        status: 'free',
        planKey: '',
        subscriptionActive: false,
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

  if (!checkoutId && !externalId) {
    return new Response(JSON.stringify({ error: 'checkoutId ou externalId é obrigatório' }), { status: 400, headers })
  }

  try {
    // 1. Tenta cancelar no AbacatePay
    const abacateResult = await cancelAbacateBilling(checkoutId, externalId)

    // 2. Downgrade do usuário para free no blob
    const userDowngraded = await downgradeUserToFreeInBlob(userId)

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

export default async function handler(req, context) {
  const headers = buildCheckoutCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
  }

  // Requer autenticação
  const auth = requireAuth(req, context, headers)
  if (auth instanceof Response) return auth

  return await handleCancel(req, auth.user, headers)
}
