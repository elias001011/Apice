import { generateRadarSuggestions } from '../ai/ai.js'

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
    const responsePreference = body?.responsePreference ?? null
    const result = await generateRadarSuggestions({ responsePreference })
    return new Response(JSON.stringify(result), { status: 200, headers })
  } catch (error) {
    console.error('[gerar-radar] erro:', error)
    return new Response(
      JSON.stringify({
        error: 'Falha ao gerar radar',
        details: error?.message || 'Erro desconhecido',
      }),
      { status: 502, headers },
    )
  }
}
