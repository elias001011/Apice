import { generateDynamicTheme } from '../ai/ai.js'
import { requireAuth } from './utils/auth.js'
import { buildCorsHeaders } from './utils/cors.js'
import {
  buildGuestQuotaBlockedResponse,
  checkGuestQuotaAllowance,
  recordGuestQuotaSuccess,
} from './utils/guestQuota.js'
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
  const auth = requireAuth(req, context, headers, { allowGuest: true })
  if (auth instanceof Response) return auth

  try {
    const body = await req.json().catch(() => ({}))
    const responsePreference = body?.responsePreference ?? null

    // ── Input Validation ────────────────────────────────────────────────
    if (responsePreference) {
      const check = validateStringLength('responsePreference', responsePreference, INPUT_LIMITS.responsePreference)
      if (!check.valid) return validationErrorResponse(check.error, headers)
    }

    if (auth.user?.guest) {
      const quota = await checkGuestQuotaAllowance(req)
      if (!quota.allowed) {
        return buildGuestQuotaBlockedResponse(
          headers,
          quota.quota,
          'Limite do modo convidado atingido para geração de tema. Crie uma conta nova para continuar.',
        )
      }
    }

    const result = await generateDynamicTheme({ responsePreference })
    if (auth.user?.guest) {
      await recordGuestQuotaSuccess(req, { featureKey: 'themeDynamic', route: 'gerar-tema' })
    }
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
