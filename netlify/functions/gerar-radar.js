import { generateRadarSuggestions } from '../ai/ai.js'
import { requireAuth } from './utils/auth.js'
import { buildCorsHeaders } from './utils/cors.js'
import { enforceAiQuota } from './utils/aiQuota.js'
import { enforceRateLimit } from './utils/rateLimit.js'
import {
  INPUT_LIMITS,
  validateStringLength,
  validationErrorResponse,
} from './utils/validate.js'

export default async function handler(req, context) {
  const headers = buildCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
  }

  // ── Authentication ──────────────────────────────────────────────────────
  const auth = await requireAuth(req, context, headers, { allowGuest: true })
  if (auth instanceof Response) return auth

  const rateLimited = await enforceRateLimit(req, auth, headers, {
    namespace: 'ai:radar',
    limit: auth.user?.guest ? 4 : 15,
    windowSeconds: 600,
  })
  if (rateLimited) return rateLimited

  try {
    const body = await req.json().catch(() => ({}))
    const responsePreference = body?.responsePreference ?? null

    // ── Input Validation ────────────────────────────────────────────────
    if (responsePreference) {
      const check = validateStringLength('responsePreference', responsePreference, INPUT_LIMITS.responsePreference)
      if (!check.valid) return validationErrorResponse(check.error, headers)
    }

    const quotaBlocked = await enforceAiQuota(req, auth, headers, {
      featureKey: 'radarSearch',
      route: 'gerar-radar',
    })
    if (quotaBlocked) return quotaBlocked

    const result = await generateRadarSuggestions({ responsePreference })
    return new Response(JSON.stringify(result), { status: 200, headers })
  } catch (error) {
    console.error('[gerar-radar] erro:', error)
    return new Response(
      JSON.stringify({
        error: 'Falha ao gerar radar',
      }),
      { status: 502, headers },
    )
  }
}
