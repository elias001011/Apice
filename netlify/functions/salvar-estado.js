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
import { sanitizeState } from './utils/billingGuard.js'

const MAX_ACCOUNT_STATE_BYTES = 1024 * 1024
const MAX_BLOB_WRITE_ATTEMPTS = 5

function byteLength(value) {
  return new TextEncoder().encode(value).byteLength
}

function isLocalDevelopment() {
  return String(process.env.NETLIFY_DEV ?? '').toLowerCase() === 'true'
    || String(process.env.NODE_ENV ?? '').toLowerCase() === 'development'
}

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

export default async function handler(req, context) {
  const headers = buildCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
  }

  // ── Authentication ──────────────────────────────────────────────────────
  const auth = await requireAuth(req, context, headers)
  if (auth instanceof Response) return auth

  try {
    const declaredLength = Number(req.headers.get('content-length') || 0)
    if (Number.isFinite(declaredLength) && declaredLength > MAX_ACCOUNT_STATE_BYTES) {
      return new Response(JSON.stringify({ error: 'Estado excede o limite de 1 MB' }), { status: 413, headers })
    }

    const body = await req.json().catch(() => ({}))
    const state = body.state

    if (!state || typeof state !== 'object') {
      return new Response(JSON.stringify({ error: 'Estado é obrigatório' }), { status: 400, headers })
    }

    const store = await getStore()
    if (!store) {
      console.warn('[salvar-estado] Blob store não disponível')
      if (!isLocalDevelopment()) {
        return new Response(
          JSON.stringify({ error: 'Armazenamento da conta indisponível' }),
          { status: 503, headers },
        )
      }
      return new Response(
        JSON.stringify({
          ok: true,
          warning: 'Blob store não disponível. Use "netlify dev" para testar local.',
        }),
        { status: 200, headers }
      )
    }

    const blobKey = `user-state:${auth.user.id}`
    let sizeBytes = 0
    let saved = false

    for (let attempt = 0; attempt < MAX_BLOB_WRITE_ATTEMPTS; attempt += 1) {
      const existing = await store.getWithMetadata(blobKey, { type: 'json' })
      const secureState = sanitizeState(state, existing?.data, auth.user)
      const serializedState = JSON.stringify(secureState)
      sizeBytes = byteLength(serializedState)

      if (sizeBytes > MAX_ACCOUNT_STATE_BYTES) {
        return new Response(JSON.stringify({ error: 'Estado excede o limite de 1 MB' }), { status: 413, headers })
      }

      const condition = existing?.etag
        ? { onlyIfMatch: existing.etag }
        : { onlyIfNew: true }
      const result = await store.setJSON(blobKey, secureState, condition)
      if (result.modified) {
        saved = true
        break
      }
    }

    if (!saved) {
      return new Response(
        JSON.stringify({ error: 'Estado mudou durante a sincronização; tente novamente' }),
        { status: 409, headers },
      )
    }

    console.log(`[salvar-estado] Estado salvo (${sizeBytes} bytes)`)

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
      JSON.stringify({ error: 'Falha ao salvar estado' }),
      { status: 500, headers }
    )
  }
}
