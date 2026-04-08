/**
 * Authenticated fetch wrapper for Netlify Functions.
 *
 * Automatically attaches the user's JWT to the Authorization header
 * so the backend can validate the request. Falls back gracefully if
 * no user is logged in (the backend will return 401).
 */

let _getAuthToken = null
let _tokenErrorLogged = false
let _jwtSizeLogged = false

/**
 * Register a function that returns the current user's JWT string.
 * This should be called once from AuthProvider during initialization.
 *
 * @param {() => Promise<string>} tokenGetter - async function returning the JWT
 */
export function registerAuthTokenGetter(tokenGetter) {
  _getAuthToken = typeof tokenGetter === 'function' ? tokenGetter : null
}

/**
 * Get the current auth token, or empty string if unavailable.
 */
async function getToken() {
  if (!_getAuthToken) return ''
  try {
    const token = await _getAuthToken()
    return typeof token === 'string' ? token : ''
  } catch (err) {
    // JWT refresh falhou — token expirado/inválido
    if (!_tokenErrorLogged) {
      _tokenErrorLogged = true
      console.error('[authFetch] Falha ao obter JWT (token expirado ou refresh falhou):', err?.message || err)
    }
    return ''
  }
}

/**
 * Perform an authenticated fetch to a Netlify Function endpoint.
 *
 * @param {string} url - The function URL (e.g. '/.netlify/functions/corrigir-redacao')
 * @param {object} options - Standard fetch options. `headers` and `body` are common.
 * @returns {Promise<Response>}
 */
export async function authFetch(url, options = {}) {
  const token = await getToken()

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  } else {
    console.warn(`[authFetch] Nenhum token JWT disponível para ${url}`)
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  // Log 401/403/500 errors early for debugging
  if (response.status === 401 || response.status === 403) {
    const hasToken = Boolean(token)
    const hasStoredUser = typeof window !== 'undefined' && Boolean(window.localStorage?.getItem('gotrue.user'))
    console.error(
      `[authFetch] ${response.status} ${response.statusText} em ${url}. ` +
      `Token presente: ${hasToken}. ` +
      `Usuário em storage: ${hasStoredUser}`
    )
  } else if (response.status === 500 || response.status === 502) {
    console.warn(
      `[authFetch] ${response.status} em ${url}. ` +
      `Isso pode indicar JWT grande demais, server error, ou API gateway timeout.`
    )
  }

  // Reset token error flag on successful auth so future errors are logged again
  if (response.ok && _tokenErrorLogged) {
    _tokenErrorLogged = false
  }

  return response
}
