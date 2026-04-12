import { generateUserSummary } from '../ai/ai.js'
import { requireAuth } from './utils/auth.js'
import { requireAiQuota } from './utils/serverQuota.js'
import { buildCorsHeaders } from './utils/cors.js'
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
  const auth = requireAuth(req, context, headers)
  if (auth instanceof Response) return auth

  // ── Server-side AI Quota Check ──────────────────────────────────────────
  const quota = await requireAiQuota(auth.user.id, headers)
  if (quota instanceof Response) return quota

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

    const result = await generateUserSummary({
      historyIndex,
      historyCount,
      responsePreference,
    })

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
