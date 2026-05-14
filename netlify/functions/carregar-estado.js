/**
 * Carrega o estado da conta do usuário do Netlify Blobs (KV store na nuvem).
 *
 * Par do salvar-estado. Usado no login para restaurar preferências, cota, etc.
 *
 * GET /.netlify/functions/carregar-estado
 */

import { requireAuth } from './utils/auth.js'
import { buildCorsHeaders } from './utils/cors.js'
import { sanitizeState } from './utils/billingGuard.js'

const getStore = async () => {
  try {
    const { getStore: getStoreFn } = await import('@netlify/blobs')
    return getStoreFn({ name: 'user-state', consistency: 'strong' })
  } catch {
    return null
  }
}

export default async function handler(req, context) {
  const headers = buildCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers })
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
  }

  // ── Authentication ──────────────────────────────────────────────────────
  const auth = requireAuth(req, context, headers)
  if (auth instanceof Response) return auth

  try {
    const store = await getStore()
    if (!store) {
      console.warn('[carregar-estado] Blob store não disponível')
      return new Response(
        JSON.stringify({
          ok: true,
          warning: 'Blob store não disponível',
          state: null,
        }),
        { status: 200, headers }
      )
    }

    const blobKey = `user-state:${auth.user.id}`
    const rawData = await store.get(blobKey, { type: 'json' })

    if (!rawData) {
      // Primeiro acesso — sem estado na nuvem ainda
      return new Response(
        JSON.stringify({ ok: true, state: null, reason: 'no_state_found' }),
        { status: 200, headers }
      )
    }

    const secureState = sanitizeState(rawData, rawData, auth.user)

    console.log('[carregar-estado] Estado carregado.')

    return new Response(
      JSON.stringify({
        ok: true,
        state: secureState,
        loadedAt: new Date().toISOString(),
      }),
      { status: 200, headers }
    )
  } catch (error) {
    console.error('[carregar-estado] Erro:', error.message)
    return new Response(
      JSON.stringify({ error: 'Falha ao carregar estado', detail: error.message }),
      { status: 500, headers }
    )
  }
}
