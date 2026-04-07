/**
 * Salva o estado da conta do usuário no Netlify Blobs (KV store na nuvem).
 *
 * Substituto do apice_state no user_metadata (que inflava o JWT e causava 500).
 * Netlify Blobs é gratuito no free tier.
 *
 * POST /.netlify/functions/salvar-estado
 * Body: { state: { ... } }
 */

import { requireAuth } from './utils/auth.js'
import { buildCorsHeaders } from './utils/cors.js'

// Netlify Blobs é automaticamente disponível em produção.
// Em dev local com 'netlify dev', também funciona.
const getStore = async () => {
  try {
    const { getStore: getStoreFn } = await import('@netlify/blobs')
    return getStoreFn({ name: 'user-state', consistency: 'strong' })
  } catch {
    return null
  }
}

export default async function handler(req) {
  const headers = buildCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
  }

  // ── Authentication ──────────────────────────────────────────────────────
  const auth = requireAuth(req, headers)
  if (auth instanceof Response) return auth

  try {
    const body = await req.json().catch(() => ({}))
    const state = body.state

    if (!state || typeof state !== 'object') {
      return new Response(JSON.stringify({ error: 'Estado é obrigatório' }), { status: 400, headers })
    }

    const store = await getStore()
    if (!store) {
      // Sem blob store disponível — dev local sem netlify dev
      console.warn('[salvar-estado] Blob store não disponível')
      return new Response(
        JSON.stringify({
          ok: true,
          warning: 'Blob store não disponível. Use "netlify dev" para testar local.',
          userId: auth.user.id,
        }),
        { status: 200, headers }
      )
    }

    const blobKey = `user-state:${auth.user.id}`
    await store.set(blobKey, JSON.stringify(state), {
      contentType: 'application/json',
    })

    const sizeBytes = JSON.stringify(state).length
    console.log(`[salvar-estado] Salvo para ${auth.user.id} (${sizeBytes} bytes)`)

    return new Response(
      JSON.stringify({
        ok: true,
        savedAt: new Date().toISOString(),
        sizeBytes,
      }),
      { status: 200, headers }
    )
  } catch (error) {
    console.error('[salvar-estado] Erro:', error.message)
    return new Response(
      JSON.stringify({ error: 'Falha ao salvar estado', detail: error.message }),
      { status: 500, headers }
    )
  }
}
