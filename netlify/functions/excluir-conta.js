import { authenticateRequest } from './utils/auth.js'
import { buildCorsHeaders } from './utils/cors.js'

/**
 * Exclui conta do usuário no Netlify Identity
 *
 * CRÍTICO: Deleta o blob `user-state:{userId}` ANTES de deletar a conta no Identity
 * Isso evita dados órfãos no Netlify Blobs
 */

const BLOB_STORE_NAME = 'user-state'

function errorResponse(message, status = 400, corsHeaders = {}) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function decodeBase64Json(rawValue) {
  if (!rawValue) return null

  try {
    if (typeof globalThis.Buffer === 'undefined') {
      return null
    }

    const decoded = globalThis.Buffer.from(String(rawValue), 'base64').toString('utf-8')
    const parsed = JSON.parse(decoded)
    if (parsed && typeof parsed === 'object') {
      return parsed
    }
  } catch {
    console.warn('[excluir-conta] Falha ao decodificar clientContext.')
  }

  return null
}

function mergeIdentityContexts(...contexts) {
  const merged = {}

  for (const context of contexts) {
    if (!context || typeof context !== 'object') {
      continue
    }

    if (context.identity && typeof context.identity === 'object') {
      merged.identity = { ...(merged.identity || {}), ...context.identity }
    }

    if (context.user && typeof context.user === 'object') {
      merged.user = { ...(merged.user || {}), ...context.user }
    }
  }

  if (!merged.identity || !merged.user) {
    return null
  }

  return merged
}

function decodeNetlifyClientContext(context = {}) {
  const directContext = context.clientContext
  const globalContext = typeof globalThis.netlifyIdentityContext === 'object' && globalThis.netlifyIdentityContext
    ? globalThis.netlifyIdentityContext
    : null
  const decodedContext = decodeBase64Json(directContext?.custom?.netlify)
  const mergedContext = mergeIdentityContexts(directContext, globalContext, decodedContext)

  if (mergedContext) {
    return mergedContext
  }

  if (decodedContext?.identity && decodedContext?.user) {
    return decodedContext
  }

  if (globalContext?.identity && globalContext?.user) {
    return globalContext
  }

  if (directContext?.identity && directContext?.user) {
    return directContext
  }

  return null
}

function getUserId(user) {
  return String(user?.sub ?? user?.id ?? '').trim()
}

async function deleteBlob(userId) {
  /**
   * Deleta o blob do usuário ANTES de deletar a conta no Identity
   */
  try {
    const { getStore } = await import('@netlify/blobs')
    const store = await getStore({ name: BLOB_STORE_NAME, consistency: 'strong' })

    if (!store) {
      console.warn('[excluir-conta] Blob store não disponível. Blob não será deletado.')
      return false
    }

    const blobKey = `user-state:${userId}`
    await store.delete(blobKey)

    console.log('[excluir-conta] Blob deletado.')
    return true
  } catch (error) {
    console.error('[excluir-conta] Erro ao deletar blob:', error.message)
    return false
  }
}

async function deleteIdentityUser(identity, userID) {
  if (!userID) {
    return { ok: false, status: 401 }
  }

  const response = await fetch(`${String(identity.url).replace(/\/$/, '')}/admin/users/${encodeURIComponent(userID)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${identity.token}`,
    },
  })

  if (response.ok) {
    return { ok: true }
  }

  await response.text().catch(() => '')
  return { ok: false, status: response.status }
}

export default async function handler(req, context = {}) {
  const headers = buildCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers })
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, headers)
  }

  // ── Primary auth: JWT from Authorization header ─────────────────────
  const jwtAuth = await authenticateRequest(req, context)
  if (!jwtAuth?.user?.id) {
    return errorResponse('Usuário não autenticado.', 401, headers)
  }

  // ── Netlify clientContext: apenas para token admin do Identity ───────
  const clientContext = decodeNetlifyClientContext(context)
  const identity = clientContext?.identity
  const user = clientContext?.user
  const authenticatedUserId = jwtAuth.user.id
  const contextUserId = getUserId(user)

  if (contextUserId && contextUserId !== authenticatedUserId) {
    return errorResponse('Contexto de autenticação inconsistente.', 401, headers)
  }

  if (!identity?.url || !identity?.token) {
    return errorResponse('Serviço de identidade indisponível.', 502, headers)
  }

  try {
    // 1. CRÍTICO: Deleta blob ANTES de deletar a conta no Identity
    await deleteBlob(authenticatedUserId)

    // 2. Deleta conta no Netlify Identity
    const result = await deleteIdentityUser(identity, authenticatedUserId)

    if (!result.ok) {
      return errorResponse('Falha ao excluir a conta.', result.status, headers)
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers })
  } catch (error) {
    console.error('[excluir-conta] erro:', error?.message || error)
    return errorResponse('Falha ao excluir a conta.', 502, headers)
  }
}
