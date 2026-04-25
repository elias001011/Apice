import process from 'node:process'

/**
 * Webhook para eventos de pagamento do AbacatePay
 *
 * COMO FUNCIONA:
 * 1. AbacatePay envia POST para /.netlify/functions/payment-webhook quando há evento de pagamento
 * 2. Webhook verifica se é evento de sucesso (subscription.paid, billing.paid, subscription.created)
 * 3. Se for sucesso, atualiza o blob do usuário no Netlify Blobs com o status de billing
 * 4. NÃO atualiza mais user_metadata (isso causava JWT inchado e erros 500)
 *
 * VARIÁVEIS DE AMBIENTE NECESSÁRIAS:
 * - ABACATE_PAY: Chave de API do AbacatePay
 *
 * EVENTOS SUPORTADOS:
 * - subscription.paid: Assinatura paga
 * - billing.paid: Pagamento confirmado
 * - subscription.created: Assinatura criada
 */

const BLOB_STORE_NAME = 'user-state'

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

    console.log('[payment-webhook] Billing atualizado no blob.')
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
    const body = await req.json().catch(() => ({}))
    const event = body?.event || ''
    const metadata = body?.metadata || body?.data?.metadata || {}
    const userId = safeText(metadata.userId)
    const planKey = safeText(metadata.planKey) || 'monthly'

    console.log(`[payment-webhook] Evento recebido: ${event}`, { planKey })

    if (!userId) {
      console.warn('[payment-webhook] userId não encontrado no metadata.')
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

    console.log(`[payment-webhook] Usuário marcado como PRO. Blob atualizado: ${blobUpdated}`)

    return new Response(JSON.stringify({
      success: true,
      message: 'Usuário atualizado para PRO',
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
