import { generateTextDirect } from '../ai/ai.js'
import { requireAuth } from './utils/auth.js'
import { buildCorsHeaders } from './utils/cors.js'
import {
  INPUT_LIMITS,
  validateStringLength,
  validateArrayLength,
  validationErrorResponse,
} from './utils/validate.js'

export default async function handler(req) {
  const headers = buildCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
  }

  // ── Authentication ──────────────────────────────────────────────────────
  const auth = requireAuth(req, headers)
  if (auth instanceof Response) {
    console.warn('[chamar-ia] Requisição não autenticada (401). Verifique se o usuário está logado e o JWT está válido.')
    return auth
  }

  try {
    const body = await req.json().catch(() => ({}))
    const provider = String(body?.provider ?? '').trim()
    const modelVariant = String(body?.modelVariant ?? 'primary').trim() || 'primary'
    const modelOverride = String(body?.modelOverride ?? '').trim()
    const systemPrompt = String(body?.systemPrompt ?? '').trim()
    const userMessages = Array.isArray(body?.userMessages) ? body.userMessages : []
    const responsePreference = body?.responsePreference ?? null

    console.log(`[chamar-ia] Provider: ${provider}, modelVariant: ${modelVariant}, systemPrompt length: ${systemPrompt.length}, userMessages: ${userMessages.length}`)

    if (!provider) {
      return new Response(JSON.stringify({ error: 'provider é obrigatório' }), { status: 400, headers })
    }

    if (!systemPrompt) {
      return new Response(JSON.stringify({ error: 'systemPrompt é obrigatório' }), { status: 400, headers })
    }

    // ── Input Validation ────────────────────────────────────────────────
    const checks = [
      validateStringLength('systemPrompt', systemPrompt, INPUT_LIMITS.systemPrompt),
      validateArrayLength('userMessages', userMessages, INPUT_LIMITS.maxUserMessages),
      ...(responsePreference ? [validateStringLength('responsePreference', responsePreference, INPUT_LIMITS.responsePreference)] : []),
    ]

    for (const msg of userMessages) {
      checks.push(validateStringLength('userMessage', msg?.content, INPUT_LIMITS.userMessage))
    }

    for (const check of checks) {
      if (!check.valid) return validationErrorResponse(check.error, headers)
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
      }),
      { status: 502, headers },
    )
  }
}
