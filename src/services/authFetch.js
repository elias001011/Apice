/**
 * Authenticated fetch wrapper for Netlify Functions.
 *
 * AUTENTICAÇÃO (em ordem de prioridade):
 * 1. Authorization: Bearer <JWT> — método principal (seguro, não-forjável)
 * 2. `guest` marker + `X-Guest-Session-Id` só para rotas explicitamente liberadas ao modo convidado
 *
 * O JWT é obtido via GoTrue .jwt() que faz refresh automático se expirado.
 * O backend (auth.js) exige JWT válido para conta normal e só aceita guest
 * nas rotas que autorizam esse modo.
 *
 * HISTÓRICO: Antes usávamos apenas X-User-Id porque o user_metadata legado
 * inflava o JWT e causava 500 no API Gateway. Após migração para Blobs,
 * o JWT ficou leve (~300 chars) e pode ser usado normalmente.
 */

import { getOrCreateGuestSessionId, isGuestSessionActive } from '../auth/sessionMode.js'

let _getAuthToken = null

const GUEST_ALLOWED_PATHS = new Set([
  '/.netlify/functions/gerar-tema',
  '/.netlify/functions/corrigir-redacao',
  '/.netlify/functions/chamar-ia',
  '/.netlify/functions/buscar-contexto',
  '/.netlify/functions/gerar-radar',
  '/.netlify/functions/gerar-radar-detalhe',
  '/.netlify/functions/resumir-usuario',
  '/.netlify/functions/gerar-simulado',
])

function resolveRequestPath(url) {
  try {
    const baseUrl = typeof window !== 'undefined' && window.location
      ? window.location.origin
      : 'http://localhost'
    return new URL(url, baseUrl).pathname
  } catch {
    return String(url || '').split('?')[0]
  }
}

function canGuestAccessUrl(url) {
  return GUEST_ALLOWED_PATHS.has(resolveRequestPath(url))
}

/**
 * Register a function that returns the current auth token.
 * Returns the current JWT string.
 * Called once from AuthProvider during initialization.
 *
 * @param {() => Promise<string>} tokenGetter - async function returning JWT
 */
export function registerAuthTokenGetter(tokenGetter) {
  _getAuthToken = typeof tokenGetter === 'function' ? tokenGetter : null
}

/**
 * Get auth credentials from the registered getter.
 * Returns { jwt } for JWT-based auth.
 */
async function getAuthCredentials() {
  let token = ''

  if (_getAuthToken) {
    try {
      token = await _getAuthToken()
    } catch {
      // ignore
    }
  }

  return { jwt: token || '' }
}

/**
 * Perform an authenticated fetch to a Netlify Function endpoint.
 *
 * Sends Authorization: Bearer <JWT> as primary auth.
 * Guest requests use a dedicated marker only on explicitly allowed routes.
 *
 * @param {string} url - The function URL (e.g. '/.netlify/functions/corrigir-redacao')
 * @param {object} options - Standard fetch options.
 * @returns {Promise<Response>}
 */
export async function authFetch(url, options = {}) {
  const guestSessionActive = isGuestSessionActive()
  const guestCanAccess = guestSessionActive && canGuestAccessUrl(url)

  if (guestSessionActive && !guestCanAccess) {
    const message = 'Modo convidado não pode acessar este recurso online. Crie uma conta para sincronizar na nuvem, contratar planos ou usar integrações externas.'
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  }

  const { jwt } = guestSessionActive
    ? { jwt: '' }
    : await getAuthCredentials()

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  if (guestCanAccess) {
    headers['X-User-Id'] = 'guest'
    headers['X-Guest-Session-Id'] = getOrCreateGuestSessionId()
    delete headers.Authorization
  } else if (jwt) {
    headers['Authorization'] = `Bearer ${jwt}`
  } else {
    console.warn(`[authFetch] Nenhum JWT disponível para ${url}`)
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  // Log auth/server errors for debugging
  if (response.status === 401) {
    console.error(
      `[authFetch] 401 em ${url}. ` +
      `Auth: ${jwt ? 'JWT' : '(nenhum)'}. ` +
      `Storage: ${Boolean(typeof window !== 'undefined' && localStorage?.getItem('gotrue.user'))}`
    )
  } else if (response.status === 500 || response.status === 502) {
    console.warn(`[authFetch] ${response.status} em ${url}. Server error.`)
  }

  return response
}
