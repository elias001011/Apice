/**
 * Authenticated fetch wrapper for Netlify Functions.
 *
 * AUTENTICAÇÃO (em ordem de prioridade):
 * 1. Authorization: Bearer <JWT> — método principal (seguro, não-forjável)
 * 2. X-User-Id header — fallback se JWT não disponível (forjável, período de transição)
 *
 * O JWT é obtido via GoTrue .jwt() que faz refresh automático se expirado.
 * O backend (auth.js) prioriza JWT e faz fallback para X-User-Id com warning.
 *
 * HISTÓRICO: Antes usávamos apenas X-User-Id porque o user_metadata legado
 * inflava o JWT e causava 500 no API Gateway. Após migração para Blobs,
 * o JWT ficou leve (~300 chars) e pode ser usado normalmente.
 */

import { isGuestSessionActive } from '../auth/sessionMode.js'

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
 * Returns JWT string or '__userid__<id>' prefix for fallback.
 * Called once from AuthProvider during initialization.
 *
 * @param {() => Promise<string>} tokenGetter - async function returning JWT or prefixed userId
 */
export function registerAuthTokenGetter(tokenGetter) {
  _getAuthToken = typeof tokenGetter === 'function' ? tokenGetter : null
}

/**
 * Get auth credentials from the registered getter, or from localStorage as fallback.
 * Returns { jwt, userId } — at least one will be non-empty if authenticated.
 */
async function getAuthCredentials() {
  let token = ''

  if (_getAuthToken) {
    try {
      token = await _getAuthToken()
    } catch {
      // ignore, fallback to localStorage
    }
  }

  // If getter returned a JWT (not a __userid__ prefix)
  if (token && !token.startsWith('__userid__')) {
    return { jwt: token, userId: '' }
  }

  // If getter returned a __userid__ prefix fallback
  if (token && token.startsWith('__userid__')) {
    return { jwt: '', userId: token.replace('__userid__', '') }
  }

  // Last resort: read userId directly from localStorage
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('gotrue.user') : null
    if (raw) {
      const data = JSON.parse(raw)
      return { jwt: '', userId: data?.id || '' }
    }
  } catch {
    // ignore
  }

  return { jwt: '', userId: '' }
}

/**
 * Perform an authenticated fetch to a Netlify Function endpoint.
 *
 * Sends Authorization: Bearer <JWT> as primary auth.
 * Falls back to X-User-Id header if JWT is unavailable.
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

  const { jwt, userId } = guestSessionActive
    ? { jwt: '', userId: 'guest' }
    : await getAuthCredentials()

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  if (guestCanAccess) {
    headers['X-User-Id'] = 'guest'
    delete headers.Authorization
  } else if (jwt) {
    headers['Authorization'] = `Bearer ${jwt}`
  } else if (userId) {
    // Fallback: X-User-Id (forjável — será removido em versão futura)
    headers['X-User-Id'] = userId
    console.warn(`[authFetch] Usando X-User-Id fallback para ${url} (JWT indisponível)`)
  } else {
    console.warn(`[authFetch] Nenhuma credencial disponível para ${url}`)
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  // Log auth/server errors for debugging
  if (response.status === 401) {
    console.error(
      `[authFetch] 401 em ${url}. ` +
      `Auth: ${jwt ? 'JWT' : userId ? 'X-User-Id' : '(nenhum)'}. ` +
      `Storage: ${Boolean(typeof window !== 'undefined' && localStorage?.getItem('gotrue.user'))}`
    )
  } else if (response.status === 500 || response.status === 502) {
    console.warn(`[authFetch] ${response.status} em ${url}. Server error.`)
  }

  return response
}
