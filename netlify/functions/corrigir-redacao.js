import { correctEssay } from '../ai/ai.js'

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
    const redacao = String(body?.redacao ?? '').trim()
    const tema = String(body?.tema ?? '').trim()
    const material = body?.material ?? null
    const isRigido = Boolean(body?.isRigido)
    const responsePreference = body?.responsePreference ?? null

    if (!redacao) {
      return new Response(JSON.stringify({ error: 'redacao é obrigatória' }), { status: 400, headers })
    }

    const result = await correctEssay({
      redacao,
      tema,
      material,
      isRigido,
      responsePreference,
    })

    return new Response(JSON.stringify(result), { status: 200, headers })
  } catch (error) {
    console.error('[corrigir-redacao] erro:', error)
    return new Response(
      JSON.stringify({
        error: 'Falha ao corrigir redação',
        details: error?.message || 'Erro desconhecido',
      }),
      { status: 502, headers },
    )
  }
}
