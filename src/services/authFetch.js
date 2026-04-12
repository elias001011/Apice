/**
 * Authenticated fetch wrapper for Netlify Functions.
 *
 * AUTENTICAÇÃO: Authorization: Bearer <JWT> — método único (seguro, não-forjável).
 * O JWT é obtido via GoTrue .jwt() que faz refresh automático se expirado.
 *
 * O backend (auth.js) exige JWT verificado pelo Netlify Identity (produção)
 * ou validação estrutural opt-in (desenvolvimento local).
 *
 * X-User-Id foi REMOVIDO por ser forjável — qualquer cliente podia se passar por outro.
 */

let _getAuthToken = null

/**
 * Register a function that returns the current JWT.
 * Called once from AuthProvider during initialization.
 *
 * @param {() => Promise<string>} tokenGetter - async function returning JWT string
 */
export function registerAuthTokenGetter(tokenGetter) {
  _getAuthToken = typeof tokenGetter === 'function' ? tokenGetter : null
}

/**
 * Get the JWT from the registered getter.
 * Returns empty string if unavailable.
 */
async function getJwtToken() {
  if (_getAuthToken) {
    try {
      const token = await _getAuthToken()
      if (token && !token.startsWith('__userid__')) {
        return token
      }
    } catch {
      // ignore
    }
  }
  return ''
}

/**
 * Perform an authenticated fetch to a Netlify Function endpoint.
 *
 * Sends Authorization: Bearer <JWT> as the only auth mechanism.
 *
 * @param {string} url - The function URL (e.g. '/.netlify/functions/corrigir-redacao')
 * @param {object} options - Standard fetch options.
 * @returns {Promise<Response>}
 */
export async function authFetch(url, options = {}) {
  const jwt = await getJwtToken()

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  if (jwt) {
    headers['Authorization'] = `Bearer ${jwt}`
  } else {
    console.warn(`[authFetch] JWT indisponível para ${url}. O backend rejeitará a requisição.`)
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    console.error(
      `[authFetch] 401 em ${url}. ` +
      `Auth: ${jwt ? 'JWT' : '(nenhum)'}. ` +
      `Faça logout e login novamente para renovar o token.`
    )
  } else if (response.status === 500 || response.status === 502) {
    console.warn(`[authFetch] ${response.status} em ${url}. Server error.`)
  }

  return response
}
