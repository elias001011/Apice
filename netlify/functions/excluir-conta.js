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
  } catch (error) {
    console.error('[excluir-conta] falha ao decodificar clientContext:', error)
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

    console.log(`[excluir-conta] Blob deletado para userId: ${userId}`)
    return true
  } catch (error) {
    console.error('[excluir-conta] Erro ao deletar blob:', error.message)
    return false
  }
}

async function deleteIdentityUser(identity, userIds) {
  let lastStatus = 500
  let lastDetails = ''

  for (const userID of userIds) {
    if (!userID) continue

    const response = await fetch(`${String(identity.url).replace(/\/$/, '')}/admin/users/${encodeURIComponent(userID)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${identity.token}`,
      },
    })

    if (response.ok) {
      return { ok: true, userID }
    }

    lastStatus = response.status
    lastDetails = await response.text().catch(() => '')

    if (response.status === 401 || response.status === 403) {
      break
    }
  }

  return { ok: false, status: lastStatus, details: lastDetails }
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
  const jwtAuth = authenticateRequest(req)

  // ── Fallback: Netlify clientContext (legacy path) ───────────────────
  const clientContext = decodeNetlifyClientContext(context)
  const identity = clientContext?.identity
  const user = clientContext?.user

  // Build user IDs from both sources
  const userIDs = [...new Set([
    jwtAuth?.user?.id || '',
    getUserId(user),
    String(user?.id ?? '').trim(),
    String(user?.sub ?? '').trim(),
  ])].filter(Boolean)

  if (!identity?.url || !identity?.token || userIDs.length === 0) {
    return errorResponse('Usuário não autenticado.', 401, headers)
  }

  try {
    // 1. CRÍTICO: Deleta blob ANTES de deletar a conta no Identity
    for (const userID of userIDs) {
      if (userID) {
        await deleteBlob(userID)
      }
    }

    // 2. Deleta conta no Netlify Identity
    const result = await deleteIdentityUser(identity, userIDs)

    if (!result.ok) {
      return errorResponse('Falha ao excluir a conta.', result.status, headers)
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers })
  } catch (error) {
    console.error('[excluir-conta] erro:', error)
    return errorResponse('Falha ao excluir a conta.', 502, headers)
  }
}
