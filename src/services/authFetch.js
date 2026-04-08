/**
 * Authenticated fetch wrapper for Netlify Functions.
 *
 * For accounts with large legacy user_metadata (inflated JWT), falls back to
 * sending userId directly in a custom header (X-User-Id) instead of the Bearer
 * token. The backend functions accept this as an alternative auth mechanism.
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
 * Also returns userId from localStorage as fallback.
 */
async function getToken() {
  if (!_getAuthToken) return { token: '', userId: '' }
  try {
    const token = await _getAuthToken()
    if (typeof token === 'string' && token.length > 0) {
      // Extract userId from localStorage as backup auth
      let userId = ''
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('gotrue.user') : null
        if (raw) {
          const data = JSON.parse(raw)
          userId = data?.id || ''
        }
      } catch {}
      return { token, userId }
    }
    return { token: '', userId: '' }
  } catch (err) {
    // JWT refresh failed — token expired/invalid
    if (!_tokenErrorLogged) {
      _tokenErrorLogged = true
      console.error('[authFetch] Falha ao obter JWT (token expirado ou refresh falhou):', err?.message || err)
    }
    // Fallback: try to get userId from localStorage
    let userId = ''
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('gotrue.user') : null
      if (raw) {
        const data = JSON.parse(raw)
        userId = data?.id || ''
      }
    } catch {}
    return { token: '', userId }
  }
}

/**
 * Perform an authenticated fetch to a Netlify Function endpoint.
 *
 * If the JWT is too large (>4KB) or unavailable, falls back to sending
 * the userId in X-User-Id header. Backend functions accept this as valid auth.
 *
 * @param {string} url - The function URL (e.g. '/.netlify/functions/corrigir-redacao')
 * @param {object} options - Standard fetch options. `headers` and `body` are common.
 * @returns {Promise<Response>}
 */
export async function authFetch(url, options = {}) {
  const { token, userId } = await getToken()

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  // Check JWT size - if too large, don't send it (gateway will reject)
  const jwtSizeKB = token ? new Blob([token]).size / 1024 : 0
  const jwtTooLarge = jwtSizeKB > 4

  if (token && !jwtTooLarge) {
    headers['Authorization'] = `Bearer ${token}`
  } else if (userId) {
    // Fallback: send userId directly. Functions will accept this.
    headers['X-User-Id'] = userId
    if (jwtTooLarge && !_jwtSizeLogged) {
      _jwtSizeLogged = true
      console.warn(`[authFetch] JWT grande demais (${jwtSizeKB.toFixed(1)}KB), usando X-User-Id como fallback para ${url}`)
    }
  } else if (!token) {
    console.warn(`[authFetch] Nenhum token JWT disponível para ${url}`)
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  // Log 401/403/500 errors early for debugging
  if (response.status === 401 || response.status === 403) {
    const hasToken = Boolean(token) && !jwtTooLarge
    const hasFallback = Boolean(userId)
    const hasStoredUser = typeof window !== 'undefined' && Boolean(window.localStorage?.getItem('gotrue.user'))
    console.error(
      `[authFetch] ${response.status} ${response.statusText} em ${url}. ` +
      `Token enviado: ${hasToken}. ` +
      `UserId fallback: ${hasFallback}. ` +
      `Usuário em storage: ${hasStoredUser}`
    )
  } else if (response.status === 500 || response.status === 502) {
    console.warn(
      `[authFetch] ${response.status} em ${url}. ` +
      `Token size: ${jwtSizeKB.toFixed(1)}KB. ` +
      `Isso pode indicar JWT grande demais, server error, ou API gateway timeout.`
    )
  }

  // Reset token error flag on successful auth so future errors are logged again
  if (response.ok && _tokenErrorLogged) {
    _tokenErrorLogged = false
  }

  return response
}
