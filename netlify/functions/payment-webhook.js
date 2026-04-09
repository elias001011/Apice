import process from 'node:process'

/**
 * Webhook handler for AbacatePay.
 * Listens for payment and subscription events to update user plan status.
 */
export async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const event = body?.event // e.g., "subscription.paid", "billing.paid"
    const data = body?.metadata || body?.data?.metadata || {}
    const userId = data.userId
    const planKey = data.planKey

    console.log(`[payment-webhook] Received event: ${event}`, { userId, planKey })

    if (!userId) {
      console.warn('[payment-webhook] No userId found in metadata.')
      return new Response(JSON.stringify({ success: true, message: 'No action taken: missing userId' }), { status: 200 })
    }

    // Only process successful payment events
    const isSuccessEvent = ['subscription.paid', 'billing.paid', 'subscription.created'].includes(event)
    if (!isSuccessEvent) {
      return new Response(JSON.stringify({ success: true, message: 'Event ignored' }), { status: 200 })
    }

    // Logic to update Netlify Identity metadata
    // We need NETLIFY_AUTH_TOKEN to talk to the Admin API
    const netlifyToken = process.env.NETLIFY_AUTH_TOKEN
    const siteId = process.env.SITE_ID

    if (!netlifyToken || !siteId) {
      console.error('[payment-webhook] NETLIFY_AUTH_TOKEN or SITE_ID is not configured.')
      return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500 })
    }

    // Update user metadata via Netlify API
    // Endpoint: PATCH /sites/{site_id}/identity/users/{user_id}
    const updateUrl = `https://api.netlify.com/api/v1/sites/${siteId}/identity/users/${userId}`
    
    const updateResponse = await fetch(updateUrl, {
      method: 'PUT', // Netlify Identity API uses PUT for user updates
      headers: {
        Authorization: `Bearer ${netlifyToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_metadata: {
          planTier: 'pro',
          planKey: planKey || 'monthly',
          subscriptionActive: true,
        },
        user_metadata: {
          hasUsedTrial: true,
          planStatus: 'paid',
        }
      }),
    })

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text()
      console.error(`[payment-webhook] Failed to update user ${userId}:`, errorText)
      throw new Error(`Netlify API error: ${updateResponse.status}`)
    }

    console.log(`[payment-webhook] Successfully updated user ${userId} to PRO.`)

    return new Response(JSON.stringify({ 
      success: true, 
      message: `User ${userId} upgraded to PRO` 
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[payment-webhook] Error processing webhook:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }
}

export default handler
