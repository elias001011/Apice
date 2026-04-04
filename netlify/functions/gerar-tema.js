import { generateDynamicTheme } from '../ai/ai.js'
import { requireAuth } from './utils/auth.js'
import { buildCorsHeaders } from './utils/cors.js'
import {
  INPUT_LIMITS,
  validateStringLength,
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
  if (auth instanceof Response) return auth

  try {
    const body = await req.json().catch(() => ({}))
    const responsePreference = body?.responsePreference ?? null

    // ── Input Validation ────────────────────────────────────────────────
    if (responsePreference) {
      const check = validateStringLength('responsePreference', responsePreference, INPUT_LIMITS.responsePreference)
      if (!check.valid) return validationErrorResponse(check.error, headers)
    }

    const result = await generateDynamicTheme({ responsePreference })
    return new Response(JSON.stringify(result), { status: 200, headers })
  } catch (error) {
    console.error('[gerar-tema] erro:', error)
    return new Response(
      JSON.stringify({
        error: 'Falha ao gerar tema',
      }),
      { status: 502, headers },
    )
  }
}
