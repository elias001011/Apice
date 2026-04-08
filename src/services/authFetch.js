/**
 * Authenticated fetch wrapper for Netlify Functions.
 *
 * Usa X-User-Id header para identificar o usuário. O JWT do Netlify Identity
 * foi removido porque o user_metadata legado inflava o token e o API Gateway
 * rejeitava todas as requisições com 500.
 *
 * O userId é extraído do gotrue.user no localStorage, que só existe após
 * login válido. Isso previne acesso não autenticado.
 */

let _getUserId = null

/**
 * Register a function that returns the current user's ID string.
 * Called once from AuthProvider during initialization.
 *
 * @param {() => Promise<string>} idGetter - async function returning userId
 */
export function registerAuthTokenGetter(idGetter) {
  _getUserId = typeof idGetter === 'function' ? idGetter : null
}

/**
 * Get the current user ID from the registered getter, or from localStorage as fallback.
 */
async function getUserId() {
  if (_getUserId) {
    try {
      const id = await _getUserId()
      if (typeof id === 'string' && id.length > 0) return id
    } catch {
      // ignore, fallback to localStorage
    }
  }
  // Fallback: read directly from localStorage
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('gotrue.user') : null
    if (raw) {
      const data = JSON.parse(raw)
      return data?.id || ''
    }
  } catch {
    // ignore
  }
  return ''
}

/**
 * Perform an authenticated fetch to a Netlify Function endpoint.
 *
 * Sends the userId in X-User-Id header. No JWT involved.
 *
 * @param {string} url - The function URL (e.g. '/.netlify/functions/corrigir-redacao')
 * @param {object} options - Standard fetch options.
 * @returns {Promise<Response>}
 */
export async function authFetch(url, options = {}) {
  const userId = await getUserId()

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  if (userId) {
    headers['X-User-Id'] = userId
  } else {
    console.warn(`[authFetch] Nenhum userId disponível para ${url}`)
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  // Log 401/500 errors for debugging
  if (response.status === 401) {
    console.error(
      `[authFetch] 401 em ${url}. ` +
      `UserId: ${userId || '(vazio)'}. ` +
      `Storage: ${Boolean(typeof window !== 'undefined' && localStorage?.getItem('gotrue.user'))}`
    )
  } else if (response.status === 500 || response.status === 502) {
    console.warn(`[authFetch] ${response.status} em ${url}. Server error.`)
  }

  return response
}
