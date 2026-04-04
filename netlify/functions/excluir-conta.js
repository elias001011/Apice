const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

function errorResponse(message, status = 400) {
  return new Response(JSON.stringify({ error: message }), { status, headers })
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
  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers })
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  const clientContext = decodeNetlifyClientContext(context)
  const identity = clientContext?.identity
  const user = clientContext?.user
  const userIDs = [...new Set([
    getUserId(user),
    String(user?.id ?? '').trim(),
    String(user?.sub ?? '').trim(),
  ])].filter(Boolean)

  if (!identity?.url || !identity?.token || userIDs.length === 0) {
    return errorResponse('Usuário não autenticado.', 401)
  }

  try {
    const result = await deleteIdentityUser(identity, userIDs)

    if (!result.ok) {
      return errorResponse(result.details || 'Falha ao excluir a conta.', result.status)
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers })
  } catch (error) {
    console.error('[excluir-conta] erro:', error)
    return errorResponse(error?.message || 'Falha ao excluir a conta.', 502)
  }
}
