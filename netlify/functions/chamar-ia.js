import { generateTextDirect } from '../ai/ai.js'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

export default async function handler(req) {
  // Endpoint genérico para chamar um provider/modelo específico sem search.
  // Ele já fica pronto para quando você quiser forçar "Groq modelo X", "Grok modelo Y", etc.
  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const provider = String(body?.provider ?? '').trim()
    const modelVariant = String(body?.modelVariant ?? 'primary').trim() || 'primary'
    const modelOverride = String(body?.modelOverride ?? '').trim()
    const systemPrompt = String(body?.systemPrompt ?? '').trim()
    const userMessages = Array.isArray(body?.userMessages) ? body.userMessages : []
    const responsePreference = body?.responsePreference ?? null

    if (!provider) {
      return new Response(JSON.stringify({ error: 'provider é obrigatório' }), { status: 400, headers })
    }

    if (!systemPrompt) {
      return new Response(JSON.stringify({ error: 'systemPrompt é obrigatório' }), { status: 400, headers })
    }

    const result = await generateTextDirect({
      provider,
      systemPrompt,
      userMessages,
      modelVariant,
      modelOverride,
      responsePreference,
    })

    return new Response(JSON.stringify(result), { status: 200, headers })
  } catch (error) {
    console.error('[chamar-ia] erro:', error)
    return new Response(
      JSON.stringify({
        error: 'Falha ao chamar IA direta',
        details: error?.message || 'Erro desconhecido',
      }),
      { status: 502, headers },
    )
  }
}
