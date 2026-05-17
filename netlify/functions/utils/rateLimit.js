const RATE_LIMIT_STORE_NAME = 'apice-rate-limits'

const memoryRateLimitStore = globalThis.__apiceRateLimitMemoryStore || new Map()
globalThis.__apiceRateLimitMemoryStore = memoryRateLimitStore

function safeText(value) {
  return String(value ?? '').trim()
}

function normalizeKeyPart(value) {
  const normalized = safeText(value)
    .replace(/[^a-zA-Z0-9_.:@-]/g, '_')
    .slice(0, 160)

  return normalized || 'unknown'
}

function hashText(text) {
  let hash = 0

  for (let index = 0; index < text.length; index += 1) {
    hash = Math.imul(31, hash) + text.charCodeAt(index)
    hash >>>= 0
  }

  return hash.toString(36)
}

function getHeaderValue(req, headerName) {
  if (typeof req?.headers?.get === 'function') {
    return safeText(req.headers.get(headerName))
  }

  return ''
}

function getClientIp(req) {
  const forwardedFor = safeText(getHeaderValue(req, 'x-forwarded-for')).split(',')[0].trim()
  return safeText(
    forwardedFor
    || getHeaderValue(req, 'x-nf-client-connection-ip')
    || getHeaderValue(req, 'cf-connecting-ip')
    || getHeaderValue(req, 'x-real-ip'),
  ) || 'unknown'
}

function getGuestActor(req) {
  const sessionId = normalizeKeyPart(getHeaderValue(req, 'x-guest-session-id'))
  if (sessionId && sessionId !== 'unknown') {
    return `guest:${sessionId}`
  }

  const fingerprintSeed = [getClientIp(req), getHeaderValue(req, 'user-agent')]
    .filter(Boolean)
    .join('|')

  return `guest-fp:${hashText(fingerprintSeed || 'unknown')}`
}

function getActorKey(req, auth) {
  if (auth?.user?.guest) {
    return getGuestActor(req)
  }

  const userId = normalizeKeyPart(auth?.user?.id || auth?.user?.email || '')
  if (userId && userId !== 'unknown') {
    return `user:${userId}`
  }

  return `ip:${hashText([getClientIp(req), getHeaderValue(req, 'user-agent')].join('|'))}`
}

async function getRateLimitStore() {
  try {
    const { getStore } = await import('@netlify/blobs')
    return getStore({ name: RATE_LIMIT_STORE_NAME, consistency: 'strong' })
  } catch {
    return null
  }
}

function normalizeRecord(rawRecord, limit, windowStart, windowSeconds) {
  const count = Number(rawRecord?.count ?? rawRecord?.used ?? 0)

  return {
    count: Number.isFinite(count) && count > 0 ? count : 0,
    limit,
    windowStart,
    windowSeconds,
    updatedAt: safeText(rawRecord?.updatedAt ?? ''),
  }
}

export async function checkRateLimit(req, auth, {
  namespace,
  limit,
  windowSeconds = 600,
} = {}) {
  const safeLimit = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Number(limit) : 60
  const safeWindowSeconds = Number.isFinite(Number(windowSeconds)) && Number(windowSeconds) > 0
    ? Number(windowSeconds)
    : 600
  const nowSeconds = Math.floor(Date.now() / 1000)
  const windowStart = Math.floor(nowSeconds / safeWindowSeconds) * safeWindowSeconds
  const retryAfter = Math.max(1, safeWindowSeconds - (nowSeconds - windowStart))
  const actor = normalizeKeyPart(getActorKey(req, auth))
  const safeNamespace = normalizeKeyPart(namespace || 'default')
  const key = `${safeNamespace}:${actor}:${windowStart}`

  try {
    const store = await getRateLimitStore()
    const rawRecord = store
      ? await store.get(key, { type: 'json' })
      : memoryRateLimitStore.get(key)
    const record = normalizeRecord(rawRecord, safeLimit, windowStart, safeWindowSeconds)

    if (record.count >= safeLimit) {
      return {
        allowed: false,
        limit: safeLimit,
        remaining: 0,
        retryAfter,
        actor,
      }
    }

    const nextRecord = {
      ...record,
      count: record.count + 1,
      updatedAt: new Date().toISOString(),
    }

    if (store) {
      await store.setJSON(key, nextRecord, { ttl: safeWindowSeconds + 120 })
    } else {
      memoryRateLimitStore.set(key, nextRecord)
    }

    return {
      allowed: true,
      limit: safeLimit,
      remaining: Math.max(0, safeLimit - nextRecord.count),
      retryAfter,
      actor,
    }
  } catch (error) {
    // Fail-open: se o Blob Store falhar, não derruba o app inteiro.
    console.warn('[rateLimit] Rate limit indisponível:', error?.message || error)
    return {
      allowed: true,
      limit: safeLimit,
      remaining: safeLimit,
      retryAfter,
      actor,
      degraded: true,
    }
  }
}

export function buildRateLimitResponse(corsHeaders = {}, result = {}) {
  return new Response(
    JSON.stringify({
      error: 'Muitas requisições. Tente novamente em alguns minutos.',
      code: 'rate_limited',
      limit: result.limit ?? 0,
      remaining: result.remaining ?? 0,
      retryAfter: result.retryAfter ?? 60,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': String(result.retryAfter ?? 60),
      },
    },
  )
}

export async function enforceRateLimit(req, auth, corsHeaders, options) {
  const result = await checkRateLimit(req, auth, options)
  if (!result.allowed) {
    return buildRateLimitResponse(corsHeaders, result)
  }
  return null
}
