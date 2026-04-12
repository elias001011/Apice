import { generateRadarThemeDetails } from '../ai/ai.js'
import { requireAuth } from './utils/auth.js'
import { requireAiQuota } from './utils/serverQuota.js'
import { buildCorsHeaders } from './utils/cors.js'
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
  const auth = requireAuth(req, context, headers)
  if (auth instanceof Response) return auth

  // ── Server-side AI Quota Check ──────────────────────────────────────────
  const quota = await requireAiQuota(auth.user.id, headers)
  if (quota instanceof Response) return quota

  try {
    const body = await req.json().catch(() => ({}))
    const tema = body?.tema ?? null
    const responsePreference = body?.responsePreference ?? null

    // ── Input Validation ────────────────────────────────────────────────
    if (responsePreference) {
      const check = validateStringLength('responsePreference', responsePreference, INPUT_LIMITS.responsePreference)
      if (!check.valid) return validationErrorResponse(check.error, headers)
    }

    if (tema?.titulo) {
      const check = validateStringLength('tema.titulo', tema.titulo, INPUT_LIMITS.tema)
      if (!check.valid) return validationErrorResponse(check.error, headers)
    }

    const result = await generateRadarThemeDetails({ tema, responsePreference })
    return new Response(JSON.stringify(result), { status: 200, headers })
  } catch (error) {
    console.error('[gerar-radar-detalhe] erro:', error)
    return new Response(
      JSON.stringify({
        error: 'Falha ao gerar detalhes do radar',
      }),
      { status: 502, headers },
    )
  }
}
