/**
 * Secure JWT authentication utility for Netlify Functions V2.
 *
 * AUTH FLOW:
 * 1. Primary: Bearer JWT validated via Netlify Identity's built-in context
 *    (clientContext.user) — cryptographically verified by Netlify itself.
 * 2. Development fallback: structural JWT decode ONLY when the
 *    NETLIFY_ALLOW_STRUCTURAL_JWT environment variable is explicitly set.
 *    This is meant for local development WITHOUT Netlify Identity running.
 *    NEVER enable this in production.
 *
 * X-User-Id header support has been REMOVED. It was a forgable auth mechanism
 * that allowed any client to impersonate any user.
 */

import process from 'node:process'

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
  if (!payload?.exp) return false
  return Date.now() >= payload.exp * 1000
}

/**
 * Extract user info from a Netlify-verified clientContext.
 */
function extractUserFromClientContext(context) {
  const userContext = context?.clientContext?.user
  if (!userContext) return null

  const userId = String(userContext.sub ?? userContext.id ?? '').trim()
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
    payload: userContext,
  }
}

/**
 * Authenticate a request by extracting and validating the JWT.
 *
 * Returns { user, token } on success, or null if unauthenticated.
 * NEVER throws — callers get null and can decide to return 401.
 */
export function authenticateRequest(req, context = {}) {
  try {
    // ── Layer 1: Netlify Identity verified (Production) ─────────────────
    // When running under `netlify dev` or production, Netlify verifies the JWT
    // cryptographically and populates clientContext.user.
    const verified = extractUserFromClientContext(context)
    if (verified) {
      const token = extractBearerToken(req)
      console.log(`[auth] Auth via Netlify Identity (cripográfico). userId: ${verified.user.id}, email: ${verified.user.email}`)
      return { ...verified, token }
    }

    // ── Layer 2: Structural JWT decode (Dev only, opt-in) ──────────────
    // Only allowed when NETLIFY_ALLOW_STRUCTURAL_JWT=true (local dev without
    // Netlify Identity). This NEVER runs in production unless someone explicitly
    // sets the env var — which they shouldn't.
    const allowStructural = process.env.NETLIFY_ALLOW_STRUCTURAL_JWT === 'true'

    if (!allowStructural) {
      console.warn('[auth] Netlify Identity context ausente e structural JWT desabilitado. Envie um Bearer token válido.')
      return null
    }

    console.warn('[auth] Netlify Identity context ausente. Usando validação estrutural do JWT (DEV ONLY).')

    const token = extractBearerToken(req)
    if (!token) {
      console.warn('[auth] Token JWT não fornecido na requisição')
      return null
    }

    const payload = decodeJwtPayload(token)
    if (!payload) {
      console.error('[auth] Token JWT malformado ou inválido.')
      return null
    }

    if (isTokenExpired(payload)) {
      const expiredAt = new Date(payload.exp * 1000).toISOString()
      console.error(`[auth] Token JWT expirado em ${expiredAt}.`)
      return null
    }

    const userId = String(payload.sub ?? payload.id ?? '').trim()
    if (!userId) {
      console.error('[auth] Token JWT sem userId (sub/id).')
      return null
    }

    console.log(`[auth] Auth estrutural (DEV). userId: ${userId}, email: ${payload.email}`)

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
    console.error('[auth] Erro inesperado ao autenticar:', error.message)
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
 * Require authentication — convenience wrapper.
 * Returns the auth context or a 401 Response.
 *
 * Only auth method: Bearer JWT (verified by Netlify Identity or structurally in dev).
 * X-User-Id header support has been REMOVED — it was a forgeable auth mechanism.
 *
 * Usage:
 *   const auth = requireAuth(req, context, headers)
 *   if (auth instanceof Response) return auth  // 401
 *   // auth.user.id is the authenticated user
 */
export function requireAuth(req, context = {}, corsHeaders = {}) {
  const auth = authenticateRequest(req, context)
  if (auth) return auth

  return unauthorizedResponse(corsHeaders)
}
