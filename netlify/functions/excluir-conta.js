const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

function errorResponse(message, status = 400) {
  return new Response(JSON.stringify({ error: message }), { status, headers })
}

function decodeNetlifyClientContext(context = {}) {
  const directContext = context.clientContext
  if (directContext?.identity && directContext?.user) {
    return directContext
  }

  const rawNetlifyContext = context.clientContext?.custom?.netlify
  if (!rawNetlifyContext) return null

  try {
    if (typeof globalThis.Buffer === 'undefined') {
      return null
    }

    const decoded = globalThis.Buffer.from(String(rawNetlifyContext), 'base64').toString('utf-8')
    const parsed = JSON.parse(decoded)
    if (parsed && typeof parsed === 'object') {
      return parsed
    }
  } catch (error) {
    console.error('[excluir-conta] falha ao decodificar clientContext:', error)
  }

  return null
}

function getUserId(user) {
  return String(user?.id ?? user?.sub ?? '').trim()
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
  const userID = getUserId(user)

  if (!identity?.url || !identity?.token || !userID) {
    return errorResponse('Usuário não autenticado.', 401)
  }

  try {
    const response = await fetch(`${identity.url}/admin/users/${encodeURIComponent(userID)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${identity.token}`,
      },
    })

    if (!response.ok) {
      const details = await response.text().catch(() => '')
      return errorResponse(details || 'Falha ao excluir a conta.', response.status)
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers })
  } catch (error) {
    console.error('[excluir-conta] erro:', error)
    return errorResponse(error?.message || 'Falha ao excluir a conta.', 502)
  }
}
