import { correctEssay } from '../ai/ai.js'
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
    namespace: 'ai:essay-correction',
    limit: auth.user?.guest ? 4 : 12,
    windowSeconds: 600,
  })
  if (rateLimited) return rateLimited

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

    // ── Input Validation ────────────────────────────────────────────────
    const checks = [
      validateStringLength('redacao', redacao, INPUT_LIMITS.redacao),
      validateStringLength('tema', tema, INPUT_LIMITS.tema),
      ...(responsePreference ? [validateStringLength('responsePreference', responsePreference, INPUT_LIMITS.responsePreference)] : []),
    ]

    if (material) {
      const serialized = typeof material === 'string' ? material : JSON.stringify(material)
      checks.push(validateStringLength('material', serialized, INPUT_LIMITS.material))
    }

    for (const check of checks) {
      if (!check.valid) return validationErrorResponse(check.error, headers)
    }

    const quotaBlocked = await enforceAiQuota(req, auth, headers, {
      featureKey: 'essayCorrection',
      route: 'corrigir-redacao',
    })
    if (quotaBlocked) return quotaBlocked

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
      }),
      { status: 502, headers },
    )
  }
}
