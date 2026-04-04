import { searchContext } from '../ai/ai.js'
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
    const query = String(body?.query ?? '').trim()

    // ── Input Validation ────────────────────────────────────────────────
    const check = validateStringLength('query', query, INPUT_LIMITS.query)
    if (!check.valid) return validationErrorResponse(check.error, headers)

    const result = await searchContext(query)
    return new Response(JSON.stringify(result), { status: 200, headers })
  } catch (error) {
    console.error('[buscar-contexto] erro:', error)
    return new Response(
      JSON.stringify({
        error: 'Falha ao buscar contexto',
      }),
      { status: 502, headers },
    )
  }
}
