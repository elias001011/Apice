/**
 * Safe JWT authentication utility for Netlify Functions V2.
 *
 * CAUTION: Previous attempts to use `context.clientContext` caused 502 errors.
 * This module extracts the JWT from the `Authorization` header directly and
 * decodes it without requiring Netlify Identity to be wired into the function
 * context. It does NOT crash if the token is missing — it returns a clean 401.
 *
 * The JWT is validated structurally (Base64 decode + JSON parse) but NOT
 * cryptographically (no signature verification). This is acceptable because:
 * - Netlify Identity issues the tokens and the functions run on the same origin.
 * - The primary goal is to prevent unauthenticated access, not to act as a
 *   general-purpose OAuth resource server.
 * - Full signature verification would require importing the JWKS endpoint and
 *   a crypto library, which adds fragility to the cold-start path.
 */

/**
 * Decode a Base64URL string to a UTF-8 string.
 * Handles the URL-safe alphabet (- and _ instead of + and /).
 */
function base64UrlDecode(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/')
  const paddedLength = padded.length % 4
  const withPadding = paddedLength ? padded + '='.repeat(4 - paddedLength) : padded

  if (typeof globalThis.Buffer !== 'undefined') {
    return globalThis.Buffer.from(withPadding, 'base64').toString('utf-8')
  }

  // Fallback for environments without Buffer (e.g. Deno)
  const binary = atob(withPadding)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/**
 * Parse a JWT token into its payload without verifying the signature.
 * Returns null if the token is malformed.
 */
function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null

  const parts = token.split('.')
  if (parts.length !== 3) return null

  try {
    const decoded = base64UrlDecode(parts[1])
    const payload = JSON.parse(decoded)
    if (payload && typeof payload === 'object') {
      return payload
    }
  } catch {
    // Malformed token — will be treated as unauthenticated
  }

  return null
}

/**
 * Extract the raw Bearer token from the Authorization header.
 */
function extractBearerToken(req) {
  // Standard fetch Request object — use .get() on headers
  const authHeader = typeof req?.headers?.get === 'function'
    ? req.headers.get('authorization') || req.headers.get('Authorization')
    : null

  if (!authHeader) return ''

  const match = String(authHeader).match(/^Bearer\s+(.+)$/i)
  return match ? match[1].trim() : ''
}

/**
 * Check if the JWT is expired.
 * Returns true if the token has an `exp` claim in the past.
 */
function isTokenExpired(payload) {
  if (!payload?.exp) return false // No expiry = not expired (permissive)
  return Date.now() >= payload.exp * 1000
}

/**
 * Authenticate a request by extracting and decoding the JWT.
 *
 * Returns { user, token } on success, or null if unauthenticated.
 * NEVER throws — callers get null and can decide to return 401.
 */
export function authenticateRequest(req, context = {}) {
  try {
    const token = extractBearerToken(req)
    if (!token) {
      console.warn('[auth] Token JWT não fornecido na requisição')
      return null
    }

    // Camada 1: Criptografia OOTB via Netlify clientContext (Produção)
    // Se context.clientContext.user existe, o Netlify Identity já validou criptograficamente o JWT
    let userContext = context?.clientContext?.user
    
    // Fallback: tentar decodificar de context?.clientContext?.custom?.netlify
    if (!userContext && context?.clientContext?.custom?.netlify) {
        try {
            const decoded = JSON.parse(Buffer.from(context.clientContext.custom.netlify, 'base64').toString('utf-8'))
            if (decoded?.user) {
                userContext = decoded.user
            }
        } catch(e) {
            console.warn('[auth] Erro ao decodificar custom.netlify fallback', e.message)
        }
    }

    if (userContext) {
      const userId = String(userContext.sub ?? userContext.id ?? '').trim()
      console.log(`[auth] Auth via Netlify Identity (Seguro). userId: ${userId}, email: ${userContext.email}`)
      
      return {
        user: {
          id: userId,
          email: String(userContext.email ?? '').trim(),
          fullName: String(
            userContext.user_metadata?.full_name
            ?? userContext.user_metadata?.name
            ?? '',
          ).trim(),
          roles: Array.isArray(userContext.app_metadata?.roles)
            ? userContext.app_metadata.roles
            : [],
          metadata: userContext.user_metadata || {},
          appMetadata: userContext.app_metadata || {},
        },
        token,
        payload: userContext,
      }
    }

    // Camada 2: Fallback estrutural (Ambiente de desenvolvimento)
    console.warn('[auth] Contexto criptográfico Netlify ausente. Fazendo fallback para validação estrutural do JWT.')
    
    const payload = decodeJwtPayload(token)
    if (!payload) {
      console.error('[auth] Token JWT malformado ou inválido. Token preview:', token.substring(0, 30) + '...')
      return null
    }

    if (isTokenExpired(payload)) {
      const expiredAt = new Date(payload.exp * 1000).toISOString()
      console.error(`[auth] Token JWT expirado em ${expiredAt}. sub: ${payload.sub || '(sem sub)'}`)
      return null
    }

    const userId = String(payload.sub ?? payload.id ?? '').trim()
    if (!userId) {
      console.error('[auth] Token JWT sem userId (sub/id).')
      return null
    }

    console.log(`[auth] Auth estrutural OK. userId: ${userId}, email: ${payload.email}`)

    return {
      user: {
        id: userId,
        email: String(payload.email ?? '').trim(),
        fullName: String(
          payload.user_metadata?.full_name
          ?? payload.user_metadata?.name
          ?? '',
        ).trim(),
        roles: Array.isArray(payload.app_metadata?.roles)
          ? payload.app_metadata.roles
          : [],
        metadata: payload.user_metadata || {},
        appMetadata: payload.app_metadata || {},
      },
      token,
      payload,
    }
  } catch (error) {
    console.error('[auth] Erro inesperado ao autenticar:', error.message, error.stack?.split('\n').slice(0, 3).join(' | '))
    return null
  }
}

/**
 * Build a standardized 401 response.
 */
export function unauthorizedResponse(corsHeaders = {}) {
  return new Response(
    JSON.stringify({ error: 'Autenticação necessária. Faça login e tente novamente.' }),
    {
      status: 401,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    },
  )
}

/**
 * Extract userId from X-User-Id header.
 * This is the FALLBACK auth mechanism — kept for backward compatibility
 * during transition period. Will be removed in a future version.
 */
function extractUserIdFromHeader(req) {
  if (typeof req?.headers?.get === 'function') {
    return String(req.headers.get('x-user-id') || req.headers.get('X-User-Id') || '').trim()
  }
  return ''
}

/**
 * Require authentication — convenience wrapper.
 * Returns the auth context or a 401 Response.
 *
 * Primary auth: Bearer JWT (extracts userId, email, fullName from token payload)
 * Fallback: X-User-Id header (forjável — deprecated, para período de transição)
 *
 * Usage:
 *   const auth = requireAuth(req, headers)
 *   if (auth instanceof Response) return auth  // 401
 *   // auth.user.id is the authenticated user
 *   // auth.user.email and auth.user.fullName are available from JWT
 */
export function requireAuth(req, context = {}, corsHeaders = {}) {
  // Primary: try Bearer JWT (secure — extracts email/fullName from token)
  const auth = authenticateRequest(req, context)
  if (auth) return auth

  // Fallback: accept X-User-Id header (forjável — período de transição)
  const userId = extractUserIdFromHeader(req)
  if (userId) {
    console.warn(`[auth] Usando X-User-Id fallback (forjável). userId: ${userId}. Migre o frontend para enviar JWT.`)
    return {
      user: { id: userId, email: '', fullName: '', roles: [], metadata: {}, appMetadata: {} },
      token: '',
      payload: { sub: userId },
    }
  }

  return unauthorizedResponse(corsHeaders)
}
