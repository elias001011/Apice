import { generateProfessorReply } from '../ai/ai.js'
import { requireAuth } from './utils/auth.js'
import { buildCorsHeaders } from './utils/cors.js'
import {
  buildGuestQuotaBlockedResponse,
  checkGuestQuotaAllowance,
  recordGuestQuotaSuccess,
} from './utils/guestQuota.js'
import { enforceRateLimit } from './utils/rateLimit.js'
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

  const auth = requireAuth(req, context, headers, { allowGuest: true })
  if (auth instanceof Response) return auth

  const rateLimited = await enforceRateLimit(req, auth, headers, {
    namespace: 'ai:professor',
    limit: auth.user?.guest ? 6 : 40,
    windowSeconds: 600,
  })
  if (rateLimited) return rateLimited

  try {
    const body = await req.json().catch(() => ({}))
    const message = String(body?.message ?? '').trim()
    const history = Array.isArray(body?.history) ? body.history : []
    const chatTitle = String(body?.chatTitle ?? '').trim()
    const shouldGenerateTitle = Boolean(body?.shouldGenerateTitle)
    const retryOf = String(body?.retryOf ?? '').trim()
    const responsePreference = body?.responsePreference ?? null

    if (!message) {
      return new Response(JSON.stringify({ error: 'message é obrigatório' }), { status: 400, headers })
    }

    const checks = [
      validateStringLength('message', message, INPUT_LIMITS.userMessage),
      validateStringLength('chatTitle', chatTitle, 120),
      validateStringLength('retryOf', retryOf, 500),
      validateArrayLength('history', history, INPUT_LIMITS.maxUserMessages),
      ...(responsePreference ? [validateStringLength('responsePreference', responsePreference, INPUT_LIMITS.responsePreference)] : []),
    ]

    for (const item of history) {
      checks.push(validateStringLength('history.content', item?.content ?? item?.text ?? '', INPUT_LIMITS.userMessage))
    }

    for (const check of checks) {
      if (!check.valid) return validationErrorResponse(check.error, headers)
    }

    if (auth.user?.guest) {
      const quota = await checkGuestQuotaAllowance(req)
      if (!quota.allowed) {
        return buildGuestQuotaBlockedResponse(
          headers,
          quota.quota,
          'Limite do modo convidado atingido para Professor IA. Crie uma conta nova para continuar.',
        )
      }
    }

    const result = await generateProfessorReply({
      message,
      history,
      chatTitle,
      shouldGenerateTitle,
      retryOf,
      responsePreference,
    })

    if (auth.user?.guest) {
      await recordGuestQuotaSuccess(req, { featureKey: 'professorChat', route: 'professor-ia' })
    }

    return new Response(JSON.stringify(result), { status: 200, headers })
  } catch (error) {
    console.error('[professor-ia] erro:', error.message, error.stack?.split('\n').slice(0, 4).join(' | '))
    return new Response(
      JSON.stringify({
        error: 'Falha ao chamar Professor IA',
        detail: error.message,
      }),
      { status: 502, headers },
    )
  }
}