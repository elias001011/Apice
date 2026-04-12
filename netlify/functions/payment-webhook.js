import process from 'node:process'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { Buffer } from 'node:buffer'

/**
 * Webhook para eventos de pagamento do AbacatePay
 *
 * COMO FUNCIONA:
 * 1. AbacatePay envia POST para /.netlify/functions/payment-webhook quando há evento de pagamento
 * 2. Webhook VERIFICA A ASSINATURA HMAC usando o webhook secret
 * 3. Se assinatura válida, processa evento de sucesso (subscription.paid, billing.paid, subscription.created)
 * 4. Atualiza o blob do usuário no Netlify Blobs com o status de billing
 *
 * VARIÁVEIS DE AMBIENTE NECESSÁRIAS:
 * - ABACATE_PAY: Chave de API do AbacatePay
 * - WEBHOOK_SECRET: Segredo compartilhado para verificar assinaturas HMAC
 *
 * EVENTOS SUPORTADOS:
 * - subscription.paid: Assinatura paga
 * - billing.paid: Pagamento confirmado
 * - subscription.created: Assinatura criada
 *
 * SEGURANÇA:
 * - Assinatura HMAC-SHA256 verificada em tempo constante (timingSafeEqual)
 * - Rejeição de payloads não autenticados com 401
 * - Idempotência: re-processar o mesmo evento é seguro (merge no blob existente)
 */

const BLOB_STORE_NAME = 'user-state'

/**
 * Get the webhook secret from environment.
 * Must be set to a strong random string (e.g. openssl rand -hex 32).
 */
function getWebhookSecret() {
  const secret = String(process.env.WEBHOOK_SECRET ?? '').trim()
  if (!secret) {
    console.error('[payment-webhook] WEBHOOK_SECRET não está configurada. Rejeitando webhook por segurança.')
  }
  return secret
}

/**
 * Verify the HMAC signature of the webhook payload.
 *
 * Expects the signature in the `x-abacatepay-signature` header (or fallback headers).
 * The signature is HMAC-SHA256 of the raw request body using the webhook secret.
 *
 * @param {string} rawBody - The raw request body
 * @param {string} signature - The signature from the request header
 * @param {string} secret - The shared webhook secret
 * @returns {boolean} - True if the signature is valid
 */
function verifyHmacSignature(rawBody, signature, secret) {
  if (!rawBody || !signature || !secret) return false

  const expectedSig = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')

  // Use timing-safe comparison to prevent timing attacks
  const sigBuf = Buffer.from(signature, 'utf8')
  const expectedBuf = Buffer.from(expectedSig, 'utf8')

  if (sigBuf.length !== expectedBuf.length) return false

  return timingSafeEqual(sigBuf, expectedBuf)
}

/**
 * Extract the signature from known header names.
 */
function extractSignature(req) {
  const headers = req.headers
  if (typeof headers?.get !== 'function') return ''

  // Common header names for webhook signatures
  const candidates = [
    'x-abacatepay-signature',
    'x-abacatepay-signature-256',
    'x-signature',
    'x-webhook-signature',
    'x-hub-signature-256',
  ]

  for (const name of candidates) {
    const val = headers.get(name)
    if (val) return String(val).trim()
  }
  return ''
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

async function updateBillingInBlob(userId, planKey, billingUpdate) {
  /**
   * Atualiza o status de billing no blob do usuário
   * Lê o blob atual → merge com billing update → salva
   */
  const store = await getStore()
  if (!store) {
    console.warn('[payment-webhook] Blob store não disponível. Billing não será atualizado na nuvem.')
    return false
  }

  try {
    const blobKey = `user-state:${userId}`
    const existingData = await store.get(blobKey, { type: 'json' })

    const currentState = existingData && typeof existingData === 'object' ? existingData : {}

    // Merge com atualização de billing
    const updatedState = {
      ...currentState,
      billing: {
        ...(currentState.billing || {}),
        ...billingUpdate,
        updatedAt: new Date().toISOString(),
      },
      planStatus: 'paid',
      planTier: 'paid',
      planKey: planKey || currentState.planKey || 'monthly',
      savedAt: new Date().toISOString(),
    }

    await store.set(blobKey, JSON.stringify(updatedState), {
      contentType: 'application/json',
    })

    console.log(`[payment-webhook] Billing atualizado no blob para userId: ${userId}`)
    return true
  } catch (error) {
    console.error('[payment-webhook] Erro ao atualizar blob:', error.message)
    return false
  }
}

export async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  try {
    // ── Signature Verification ──────────────────────────────────────────
    const webhookSecret = getWebhookSecret()
    if (!webhookSecret) {
      // No secret configured — reject to prevent unauthenticated writes
      return new Response(JSON.stringify({
        error: 'Webhook secret not configured. Rejeitando por segurança.',
      }), { status: 503 })
    }

    // Read raw body for signature verification
    const rawBody = await req.text()
    const signature = extractSignature(req)

    if (!signature) {
      console.warn('[payment-webhook] Assinatura ausente no header. Requisição rejeitada.')
      return new Response(JSON.stringify({
        error: 'Assinatura do webhook ausente. Rejeitando requisição não autenticada.',
      }), { status: 401 })
    }

    if (!verifyHmacSignature(rawBody, signature, webhookSecret)) {
      console.warn('[payment-webhook] Assinatura INVÁLIDA. Requisição rejeitada.')
      return new Response(JSON.stringify({
        error: 'Assinatura do webhook inválida. Requisição rejeitada.',
      }), { status: 401 })
    }

    // Signature valid — parse JSON from the verified raw body
    const body = JSON.parse(rawBody)
    const event = body?.event || ''
    const metadata = body?.metadata || body?.data?.metadata || {}
    const userId = safeText(metadata.userId)
    const planKey = safeText(metadata.planKey) || 'monthly'

    console.log(`[payment-webhook] Evento VERIFICADO: ${event}`, { userId, planKey })

    if (!userId) {
      console.warn('[payment-webhook] userId não encontrado no metadata. Dados:', JSON.stringify(metadata))
      return new Response(JSON.stringify({ success: true, message: 'Ignorado: userId não encontrado' }), { status: 200 })
    }

    // Só processa eventos de pagamento confirmado
    const isSuccessEvent = ['subscription.paid', 'billing.paid', 'subscription.created'].includes(event)
    if (!isSuccessEvent) {
      console.log(`[payment-webhook] Evento '${event}' ignorado (não é pagamento confirmado)`)
      return new Response(JSON.stringify({ success: true, message: `Evento '${event}' ignorado` }), { status: 200 })
    }

    // Atualiza billing no Netlify Blobs (NÃO atualiza user_metadata)
    const billingUpdate = {
      status: 'paid',
      planKey,
      paidAt: new Date().toISOString(),
      subscriptionActive: true,
    }

    const blobUpdated = await updateBillingInBlob(userId, planKey, billingUpdate)

    console.log(`[payment-webhook] Usuário ${userId} marcado como PRO. Blob atualizado: ${blobUpdated}`)

    return new Response(JSON.stringify({
      success: true,
      message: `Usuário ${userId} atualizado para PRO`,
      blobUpdated,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('[payment-webhook] Erro ao processar webhook:', error)
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), { status: 500 })
  }
}

export default handler
