import { searchContext } from '../ai/ai.js'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

export default async function handler(req) {
  // Endpoint separado de busca factual.
  // Ele existe para que o tema dinâmico possa pedir contexto sem misturar isso com a correção.
  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const query = String(body?.query ?? '').trim()

    const result = await searchContext(query)
    return new Response(JSON.stringify(result), { status: 200, headers })
  } catch (error) {
    console.error('[buscar-contexto] erro:', error)
    return new Response(
      JSON.stringify({
        error: 'Falha ao buscar contexto',
        details: error?.message || 'Erro desconhecido',
      }),
      { status: 502, headers },
    )
  }
}
