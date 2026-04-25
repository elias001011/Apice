import { generateExam } from '../ai/ai.js'
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
    const area = String(body?.area ?? 'Linguagens').trim()
    const quantidade = Number(body?.quantidade ?? 5)
    const disciplinas = Array.isArray(body?.disciplinas) ? body.disciplinas : []
    const responsePreference = body?.responsePreference ?? null

    // ── Input Validation ────────────────────────────────────────────────
    const checks = [
      validateStringLength('area', area, 100),
      ...(disciplinas.map(d => validateStringLength('disciplina', d, 50))),
      ...(responsePreference ? [validateStringLength('responsePreference', responsePreference, INPUT_LIMITS.responsePreference)] : []),
    ]

    for (const check of checks) {
      if (!check.valid) return validationErrorResponse(check.error, headers)
    }

    if (auth.user?.guest) {
      const quota = await checkGuestQuotaAllowance(req)
      if (!quota.allowed) {
        return buildGuestQuotaBlockedResponse(
          headers,
          quota.quota,
          'Limite do modo convidado atingido para simulado. Crie uma conta nova para continuar.',
        )
      }
    }

    const result = await generateExam({
      area,
      quantidade,
      disciplinas,
      responsePreference,
    })

    if (auth.user?.guest) {
      await recordGuestQuotaSuccess(req, { featureKey: 'generateExam', route: 'gerar-simulado' })
    }

    return new Response(JSON.stringify(result), { status: 200, headers })
  } catch (error) {
    console.error('[gerar-simulado] erro:', error)
    return new Response(
      JSON.stringify({
        error: 'Falha ao gerar simulado',
      }),
      { status: 502, headers },
    )
  }
}
