import process from 'node:process'

/**
 * CORS utility for Netlify Functions.
 *
 * Uses SITE_URL or URL env vars (set automatically by Netlify) to restrict
 * Access-Control-Allow-Origin to the actual deployment domain.
 * Falls back to '*' only in local development.
 */

const DEV_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:8888',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8888',
]

function getAllowedOrigins() {
  const origins = new Set(DEV_ORIGINS)

  // Netlify sets SITE_URL and URL automatically in production
  const siteUrl = String(process.env.SITE_URL ?? '').trim()
  const netlifyUrl = String(process.env.URL ?? '').trim()
  const deployPrimeUrl = String(process.env.DEPLOY_PRIME_URL ?? '').trim()

  if (siteUrl) origins.add(siteUrl.replace(/\/$/, ''))
  if (netlifyUrl) origins.add(netlifyUrl.replace(/\/$/, ''))
  if (deployPrimeUrl) origins.add(deployPrimeUrl.replace(/\/$/, ''))

  return origins
}

/**
 * Build CORS headers for a given request.
 * If the request Origin matches an allowed origin, reflect it.
 * Otherwise, use the primary SITE_URL (or '*' as last resort in dev).
 */
export function buildCorsHeaders(req) {
  const allowedOrigins = getAllowedOrigins()
  const requestOrigin = typeof req?.headers?.get === 'function'
    ? (req.headers.get('origin') || req.headers.get('Origin') || '')
    : ''

  let origin
  if (requestOrigin && allowedOrigins.has(requestOrigin.replace(/\/$/, ''))) {
    origin = requestOrigin
  } else {
    // In production, use the known site URL. In dev, allow all.
    const siteUrl = String(process.env.SITE_URL ?? '').trim()
    origin = siteUrl || '*'
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  }
}

/**
 * Build CORS headers for checkout (allows GET too).
 */
export function buildCheckoutCorsHeaders(req) {
  const base = buildCorsHeaders(req)
  return {
    ...base,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  }
}
