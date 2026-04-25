import { generateUserSummary } from '../ai/ai.js'
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
  validateArrayLength,
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
    const historyIndex = Array.isArray(body?.historyIndex) ? body.historyIndex : []
    const historyCount = Number.isFinite(Number(body?.historyCount)) ? Number(body.historyCount) : historyIndex.length
    const responsePreference = body?.responsePreference ?? null

    if (historyIndex.length === 0) {
      return new Response(JSON.stringify({ error: 'historyIndex é obrigatório' }), { status: 400, headers })
    }

    // ── Input Validation ────────────────────────────────────────────────
    const checks = [
      validateArrayLength('historyIndex', historyIndex, INPUT_LIMITS.maxHistoryEntries),
      ...(responsePreference ? [validateStringLength('responsePreference', responsePreference, INPUT_LIMITS.responsePreference)] : []),
    ]

    const serializedHistory = JSON.stringify(historyIndex)
    checks.push(validateStringLength('historyIndex (total)', serializedHistory, INPUT_LIMITS.historyTotal))

    for (const check of checks) {
      if (!check.valid) return validationErrorResponse(check.error, headers)
    }

    if (auth.user?.guest) {
      const quota = await checkGuestQuotaAllowance(req)
      if (!quota.allowed) {
        return buildGuestQuotaBlockedResponse(
          headers,
          quota.quota,
          'Limite do modo convidado atingido para resumo automático. Crie uma conta nova para continuar.',
        )
      }
    }

    const result = await generateUserSummary({
      historyIndex,
      historyCount,
      responsePreference,
    })

    if (auth.user?.guest) {
      await recordGuestQuotaSuccess(req, { featureKey: 'userSummary', route: 'resumir-usuario' })
    }

    return new Response(JSON.stringify(result), { status: 200, headers })
  } catch (error) {
    console.error('[resumir-usuario] erro:', error)
    return new Response(
      JSON.stringify({
        error: 'Falha ao resumir usuário',
      }),
      { status: 502, headers },
    )
  }
}
