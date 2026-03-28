const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

function errorResponse(message, status = 400) {
  return new Response(JSON.stringify({ error: message }), { status, headers })
}

export default async function handler(req, context = {}) {
  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers })
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  const identity = context.clientContext?.identity
  const user = context.clientContext?.user

  if (!identity?.url || !identity?.token || !user?.sub) {
    return errorResponse('Usuário não autenticado.', 401)
  }

  try {
    const response = await fetch(`${identity.url}/admin/users/${user.sub}`, {
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
