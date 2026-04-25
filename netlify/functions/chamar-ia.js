import { generateTextDirect } from '../ai/ai.js'
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

function isMeaninglessResponseText(value) {
  const normalized = String(value ?? '').trim().toLowerCase()
  return (
    !normalized
    || normalized === '[object object]'
    || normalized === 'object object'
    || normalized === '{}'
    || normalized === '[]'
  )
}

function extractMeaningfulText(response, seen = new Set()) {
  if (response == null) return ''

  if (typeof response === 'string') {
    const trimmed = response.trim()
    if (isMeaninglessResponseText(trimmed)) return ''

    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmed)
        const nested = extractMeaningfulText(parsed, seen)
        if (nested) return nested
      } catch {
        // Ignora e segue como texto bruto.
      }
    }

    return trimmed
  }

  if (typeof response === 'number' || typeof response === 'boolean') {
    return String(response).trim()
  }

  if (Array.isArray(response)) {
    return response
      .map((item) => extractMeaningfulText(item, seen))
      .filter(Boolean)
      .join('\n')
      .trim()
  }

  if (typeof response !== 'object') return ''
  if (seen.has(response)) return ''
  seen.add(response)

  const keys = [
    'response',
    'text',
    'texto',
    'content',
    'message',
    'answer',
    'reply',
    'resposta',
    'mensagem',
    'output',
    'result',
    'data',
  ]

  for (const key of keys) {
    const nested = extractMeaningfulText(response[key], seen)
    if (nested) return nested
  }

  return ''
}

function normalizeProfessorResult(result) {
  const text = extractMeaningfulText(result)
  if (!text) {
    throw new Error('Resposta vazia da IA')
  }

  if (result && typeof result === 'object' && !Array.isArray(result)) {
    return {
      ...result,
      response: text,
    }
  }

  return { response: text }
}

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
  if (auth instanceof Response) {
    console.warn('[chamar-ia] Requisição não autenticada (401). Verifique se o usuário está logado e o JWT está válido.')
    return auth
  }

  console.log('[chamar-ia] Auth OK.')

  try {
    const body = await req.json().catch(() => ({}))
    const provider = String(body?.provider ?? '').trim()
    const modelVariant = String(body?.modelVariant ?? 'primary').trim() || 'primary'
    const modelOverride = String(body?.modelOverride ?? '').trim()
    const systemPrompt = String(body?.systemPrompt ?? '').trim()
    const userMessages = Array.isArray(body?.userMessages) ? body.userMessages : []
    const responsePreference = body?.responsePreference ?? null

    console.log(`[chamar-ia] Provider: ${provider}, modelVariant: ${modelVariant}, systemPrompt length: ${systemPrompt.length}, userMessages: ${userMessages.length}`)

    if (!provider) {
      return new Response(JSON.stringify({ error: 'provider é obrigatório' }), { status: 400, headers })
    }

    if (!systemPrompt) {
      return new Response(JSON.stringify({ error: 'systemPrompt é obrigatório' }), { status: 400, headers })
    }

    // ── Input Validation ────────────────────────────────────────────────
    const checks = [
      validateStringLength('systemPrompt', systemPrompt, INPUT_LIMITS.systemPrompt),
      validateArrayLength('userMessages', userMessages, INPUT_LIMITS.maxUserMessages),
      ...(responsePreference ? [validateStringLength('responsePreference', responsePreference, INPUT_LIMITS.responsePreference)] : []),
    ]

    for (const msg of userMessages) {
      checks.push(validateStringLength('userMessage', msg?.content, INPUT_LIMITS.userMessage))
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
          'Limite do modo convidado atingido para chamada direta de IA. Crie uma conta nova para continuar.',
        )
      }
    }

    const result = await generateTextDirect({
      provider,
      systemPrompt,
      userMessages,
      modelVariant,
      modelOverride,
      responsePreference,
    })

    const normalizedResult = normalizeProfessorResult(result)

    if (auth.user?.guest) {
      await recordGuestQuotaSuccess(req, { featureKey: 'directModelCall', route: 'chamar-ia' })
    }

    console.log(`[chamar-ia] Sucesso. Provider: ${provider}, result keys: ${Object.keys(normalizedResult || {}).join(', ')}`)
    return new Response(JSON.stringify(normalizedResult), { status: 200, headers })
  } catch (error) {
    console.error('[chamar-ia] erro:', error.message, error.stack?.split('\n').slice(0, 4).join(' | '))
    return new Response(
      JSON.stringify({
        error: 'Falha ao chamar IA direta',
        detail: error.message,
      }),
      { status: 502, headers },
    )
  }
}
