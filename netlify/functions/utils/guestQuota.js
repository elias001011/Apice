const GUEST_QUOTA_STORE_NAME = 'guest-ai-quota'

export const GUEST_AI_DAILY_LIMIT = 2

const memoryGuestQuotaStore = globalThis.__apiceGuestQuotaMemoryStore || new Map()
globalThis.__apiceGuestQuotaMemoryStore = memoryGuestQuotaStore

function canUseStorage() {
  return true
}

function nowIso() {
  return new Date().toISOString()
}

function safeText(value) {
  return String(value ?? '').trim()
}

function normalizeKeyPart(value) {
  return safeText(value).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 120)
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

function getGuestSessionIdentifier(req) {
  const headerSessionId = normalizeKeyPart(getHeaderValue(req, 'x-guest-session-id'))
  if (headerSessionId) {
    return `sid:${headerSessionId}`
  }

  const forwardedFor = safeText(getHeaderValue(req, 'x-forwarded-for')).split(',')[0].trim()
  const ip = normalizeKeyPart(
    forwardedFor
    || getHeaderValue(req, 'x-nf-client-connection-ip')
    || getHeaderValue(req, 'cf-connecting-ip'),
  )
  const userAgent = safeText(getHeaderValue(req, 'user-agent'))
  const fingerprintSeed = [ip, userAgent].filter(Boolean).join('|')

  if (fingerprintSeed) {
    return `fp:${hashText(fingerprintSeed)}`
  }

  return 'fp:unknown'
}

export function getGuestAiUsageDayKey(referenceDate = new Date()) {
  const date = referenceDate instanceof Date ? referenceDate : new Date(referenceDate)
  if (!Number.isFinite(date.getTime())) {
    return getGuestAiUsageDayKey(new Date())
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildQuotaKey(req, dayKey = getGuestAiUsageDayKey()) {
  return `guest-ai:${dayKey}:${getGuestSessionIdentifier(req)}`
}

async function getGuestQuotaStore() {
  if (!canUseStorage()) return null

  try {
    const { getStore: getStoreFn } = await import('@netlify/blobs')
    return getStoreFn({ name: GUEST_QUOTA_STORE_NAME, consistency: 'strong' })
  } catch {
    return null
  }
}

function normalizeQuotaRecord(rawRecord, dayKey, key) {
  const used = Number(rawRecord?.used ?? rawRecord?.count ?? 0)
  const limit = Number(rawRecord?.limit ?? GUEST_AI_DAILY_LIMIT)

  return {
    key,
    dayKey,
    used: Number.isFinite(used) && used > 0 ? Math.min(used, limit) : 0,
    limit: Number.isFinite(limit) && limit > 0 ? limit : GUEST_AI_DAILY_LIMIT,
    updatedAt: safeText(rawRecord?.updatedAt ?? ''),
    lastFeature: safeText(rawRecord?.lastFeature ?? ''),
    lastRoute: safeText(rawRecord?.lastRoute ?? ''),
  }
}

async function readQuotaRecord(req) {
  const dayKey = getGuestAiUsageDayKey()
  const key = buildQuotaKey(req, dayKey)
  const store = await getGuestQuotaStore()

  if (store) {
    const raw = await store.get(key, { type: 'json' })
    return normalizeQuotaRecord(raw, dayKey, key)
  }

  const raw = memoryGuestQuotaStore.get(key)
  return normalizeQuotaRecord(raw, dayKey, key)
}

export async function checkGuestQuotaAllowance(req, amount = 1) {
  const quota = await readQuotaRecord(req)
  return {
    quota,
    allowed: quota.used + amount <= quota.limit,
  }
}

export async function recordGuestQuotaSuccess(req, { featureKey = '', route = '' } = {}) {
  const quota = await readQuotaRecord(req)
  const nextQuota = normalizeQuotaRecord({
    ...quota,
    used: quota.used + 1,
    updatedAt: nowIso(),
    lastFeature: featureKey,
    lastRoute: route,
  }, quota.dayKey, quota.key)

  const store = await getGuestQuotaStore()
  if (store) {
    try {
      await store.setJSON(quota.key, nextQuota)
    } catch (error) {
      console.warn('[guestQuota] Falha ao registrar consumo do convidado:', error.message)
    }
  } else {
    memoryGuestQuotaStore.set(quota.key, nextQuota)
  }

  return nextQuota
}

export function buildGuestQuotaBlockedResponse(corsHeaders, quota, message) {
  const used = Number(quota?.used ?? 0)
  const limit = Number(quota?.limit ?? GUEST_AI_DAILY_LIMIT)
  const remaining = Math.max(limit - used, 0)
  const responseMessage = String(message ?? 'Limite do modo convidado atingido.').trim()

  return new Response(
    JSON.stringify({
      error: responseMessage,
      code: 'quota_blocked',
      limit,
      used,
      remaining,
      scope: 'guest',
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    },
  )
}
