import { generateUserSummary } from '../ai/ai.js'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const historyIndex = Array.isArray(body?.historyIndex) ? body.historyIndex : []
    const historyCount = Number.isFinite(Number(body?.historyCount)) ? Number(body.historyCount) : historyIndex.length
    const responsePreference = body?.responsePreference ?? null

    if (historyIndex.length === 0) {
      return new Response(JSON.stringify({ error: 'historyIndex é obrigatório' }), { status: 400, headers })
    }

    const result = await generateUserSummary({
      historyIndex,
      historyCount,
      responsePreference,
    })

    return new Response(JSON.stringify(result), { status: 200, headers })
  } catch (error) {
    console.error('[resumir-usuario] erro:', error)
    return new Response(
      JSON.stringify({
        error: 'Falha ao resumir usuário',
        details: error?.message || 'Erro desconhecido',
      }),
      { status: 502, headers },
    )
  }
}
