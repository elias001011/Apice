import process from 'node:process'

/**
 * Webhook para eventos de pagamento do AbacatePay
 * 
 * COMO FUNCIONA:
 * 1. AbacatePay envia POST para /.netlify/functions/payment-webhook quando há evento de pagamento
 * 2. Webhook verifica se é evento de sucesso (subscription.paid, billing.paid, subscription.created)
 * 3. Se for sucesso, atualiza metadata do usuário no Netlify Identity via Admin API
 * 4. Metadata atualizada: planTier='pro', subscriptionActive=true, planStatus='paid'
 * 
 * VARIÁVEIS DE AMBIENTE NECESSÁRIAS:
 * - ABACATE_PAY: Chave de API do AbacatePay (já usada no checkout)
 * - NETLIFY_AUTH_TOKEN: Token admin do Netlify (para atualizar usuários)
 * - SITE_ID: ID do site no Netlify
 * 
 * EVENTOS SUPORTADOS:
 * - subscription.paid: Assinatura paga (V2 subscriptions - se ativar no futuro)
 * - billing.paid: Pagamento confirmado (V1 billing one-time - atual)
 * - subscription.created: Assinatura criada (V2 - se ativar no futuro)
 * 
 * IMPORTANTE:
 * - O webhook roda em background, independente do frontend
 * - O frontend também verifica status via GET quando usuário retorna do pagamento
 * - Os dois sistemas se complementam: webhook garante atualização mesmo se usuário fechar navegador
 */

function safeText(value) {
  return String(value ?? '').trim()
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

    console.log(`[payment-webhook] Evento recebido: ${event}`, { userId, planKey })

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

    // Verifica variáveis de ambiente necessárias
    // SITE_ID é reservado pelo Netlify (já existe)
    // NETLIFY_AUTH_TOKEN precisa ser configurada manualmente
    const netlifyToken = process.env.NETLIFY_AUTH_TOKEN
    const siteId = process.env.SITE_ID

    if (!netlifyToken || !siteId) {
      console.warn('[payment-webhook] NETLIFY_AUTH_TOKEN não configurada. Webhook não pode atualizar Netlify Identity.')
      console.warn('[payment-webhook] O frontend ainda verificará pagamento via GET checkout.')
      return new Response(JSON.stringify({
        success: true,
        message: 'Webhook recebido, mas cloud sync desabilitado (NETLIFY_AUTH_TOKEN não configurada)',
      }), { status: 200 })
    }

    // Atualiza metadata do usuário via Netlify Admin API
    // Endpoint: PUT /api/v1/sites/{site_id}/identity/users/{user_id}
    const updateUrl = `https://api.netlify.com/api/v1/sites/${siteId}/identity/users/${userId}`

    const updateResponse = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${netlifyToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_metadata: {
          planTier: 'pro',
          planKey,
          subscriptionActive: true,
        },
        user_metadata: {
          hasUsedTrial: true,
          planStatus: 'paid',
        },
      }),
    })

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text()
      console.error(`[payment-webhook] Falha ao atualizar usuário ${userId}:`, errorText)
      throw new Error(`Netlify API error: ${updateResponse.status}`)
    }

    console.log(`[payment-webhook] Usuário ${userId} atualizado para PRO com sucesso.`)

    return new Response(JSON.stringify({
      success: true,
      message: `Usuário ${userId} atualizado para PRO`,
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
