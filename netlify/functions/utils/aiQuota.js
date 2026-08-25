const ACCOUNT_QUOTA_STORE_NAME = 'account-ai-quota'
const GUEST_QUOTA_STORE_NAME = 'guest-ai-quota'
const USER_STATE_STORE_NAME = 'user-state'
const MAX_WRITE_ATTEMPTS = 5

export const FREE_AI_DAILY_LIMIT = 5
export const GUEST_AI_DAILY_LIMIT = 2
export const PAID_AI_DAILY_LIMIT = 20

const memoryQuotaStore = globalThis.__apiceAiQuotaMemoryStore || new Map()
globalThis.__apiceAiQuotaMemoryStore = memoryQuotaStore

function safeText(value) {
  return String(value ?? '').trim()
}

function hashText(text) {
  let hash = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

function getHeaderValue(req, name) {
  return typeof req?.headers?.get === 'function' ? safeText(req.headers.get(name)) : ''
}

function getClientIp(req) {
  const netlifyIp = getHeaderValue(req, 'x-nf-client-connection-ip')
  const cloudflareIp = getHeaderValue(req, 'cf-connecting-ip')
  const forwardedIp = getHeaderValue(req, 'x-forwarded-for').split(',')[0].trim()
  return netlifyIp || cloudflareIp || forwardedIp || getHeaderValue(req, 'x-real-ip') || 'unknown'
}

function getGuestActor(req) {
  // O id de sessão é controlado pelo cliente e pode ser rotacionado. A cota
  // precisa se apoiar em sinais atribuídos pela borda para não ser reiniciável.
  const fingerprint = [getClientIp(req), getHeaderValue(req, 'user-agent')].join('|')
  return `guest:${hashText(fingerprint)}`
}

function getDayKey(referenceDate = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(referenceDate)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function isLocalDevelopment() {
  const env = globalThis?.process?.env || {}
  return String(env.NETLIFY_DEV ?? '').toLowerCase() === 'true'
    || String(env.NODE_ENV ?? '').toLowerCase() === 'development'
}

async function getBlobStore(name) {
  const { getStore } = await import('@netlify/blobs')
  return getStore({ name, consistency: 'strong' })
}

function hasCurrentPaidAccess(billing) {
  const status = safeText(billing?.status || billing?.planStatus).toLowerCase()
  const now = Date.now()

  if (status === 'trial') {
    const trialEndsAt = Date.parse(safeText(billing?.trialEndsAt))
    return Number.isFinite(trialEndsAt) && trialEndsAt > now
  }

  if (!['paid', 'pro', 'premium'].includes(status)) return false

  const accessEndsAt = Date.parse(safeText(billing?.accessEndsAt))
  const finiteAccessEnd = Number.isFinite(accessEndsAt)
  const expiresAtPeriodEnd = Boolean(billing?.cancelAtPeriodEnd)
    || safeText(billing?.billingMode).toLowerCase() === 'one_time'

  return !(expiresAtPeriodEnd && finiteAccessEnd && accessEndsAt <= now)
}

async function resolveAccountLimit(userId) {
  const store = await getBlobStore(USER_STATE_STORE_NAME)
  const state = await store.get(`user-state:${userId}`, { type: 'json' })
  return hasCurrentPaidAccess(state?.billing) ? PAID_AI_DAILY_LIMIT : FREE_AI_DAILY_LIMIT
}

function normalizeRecord(raw, { dayKey, limit, featureKey, route }) {
  const used = Number(raw?.used ?? raw?.count ?? 0)
  return {
    dayKey,
    used: Number.isFinite(used) && used > 0 ? Math.min(Math.floor(used), limit) : 0,
    limit,
    updatedAt: safeText(raw?.updatedAt),
    lastFeature: safeText(raw?.lastFeature || featureKey),
    lastRoute: safeText(raw?.lastRoute || route),
  }
}

async function consumeWithCompareAndSwap(store, key, options) {
  for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt += 1) {
    const current = await store.getWithMetadata(key, { type: 'json' })
    const record = normalizeRecord(current?.data, options)

    if (record.used >= record.limit) {
      return { ...record, allowed: false, remaining: 0 }
    }

    const next = {
      ...record,
      used: record.used + 1,
      updatedAt: new Date().toISOString(),
      lastFeature: options.featureKey,
      lastRoute: options.route,
    }
    const condition = current?.etag
      ? { onlyIfMatch: current.etag }
      : { onlyIfNew: true }
    const result = await store.setJSON(key, next, condition)

    if (result.modified) {
      return {
        ...next,
        allowed: true,
        remaining: Math.max(next.limit - next.used, 0),
      }
    }
  }

  throw new Error('Não foi possível reservar a cota após tentativas concorrentes.')
}

function consumeFromMemory(key, options) {
  const record = normalizeRecord(memoryQuotaStore.get(key), options)
  if (record.used >= record.limit) {
    return { ...record, allowed: false, remaining: 0 }
  }

  const next = {
    ...record,
    used: record.used + 1,
    updatedAt: new Date().toISOString(),
    lastFeature: options.featureKey,
    lastRoute: options.route,
  }
  memoryQuotaStore.set(key, next)
  return { ...next, allowed: true, remaining: Math.max(next.limit - next.used, 0) }
}

async function consumeQuota(req, auth, { featureKey = 'otherAiRequest', route = '' } = {}) {
  const dayKey = getDayKey()
  const isGuest = Boolean(auth?.user?.guest)
  const userId = safeText(auth?.user?.id)
  if (!isGuest && !userId) throw new Error('Conta autenticada sem user id para controle de cota.')
  const actor = isGuest ? getGuestActor(req) : `user:${userId}`
  const storeName = isGuest ? GUEST_QUOTA_STORE_NAME : ACCOUNT_QUOTA_STORE_NAME
  const key = `ai:${dayKey}:${actor}`

  try {
    const limit = isGuest ? GUEST_AI_DAILY_LIMIT : await resolveAccountLimit(userId)
    const options = { dayKey, limit, featureKey: safeText(featureKey), route: safeText(route) }
    const store = await getBlobStore(storeName)
    return await consumeWithCompareAndSwap(store, key, options)
  } catch (error) {
    if (isLocalDevelopment()) {
      console.warn('[aiQuota] Blob indisponível em desenvolvimento; usando memória:', error?.message || error)
      const options = {
        dayKey,
        limit: isGuest ? GUEST_AI_DAILY_LIMIT : FREE_AI_DAILY_LIMIT,
        featureKey: safeText(featureKey),
        route: safeText(route),
      }
      return consumeFromMemory(key, options)
    }
    throw error
  }
}

function buildBlockedResponse(corsHeaders, quota, isGuest) {
  return new Response(
    JSON.stringify({
      error: isGuest
        ? 'Limite diário do modo convidado atingido. Crie uma conta para continuar.'
        : 'Limite diário de IA atingido para sua conta.',
      code: 'quota_blocked',
      limit: quota.limit,
      used: quota.used,
      remaining: quota.remaining,
      scope: isGuest ? 'guest' : 'account',
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

export async function enforceAiQuota(req, auth, corsHeaders, options = {}) {
  try {
    const quota = await consumeQuota(req, auth, options)
    if (!quota.allowed) return buildBlockedResponse(corsHeaders, quota, Boolean(auth?.user?.guest))

    corsHeaders['X-Apice-AI-Limit'] = String(quota.limit)
    corsHeaders['X-Apice-AI-Remaining'] = String(quota.remaining)
    return null
  } catch (error) {
    console.error('[aiQuota] Não foi possível validar a cota:', error?.message || error)
    return new Response(
      JSON.stringify({
        error: 'Não foi possível validar sua cota de IA agora. Tente novamente em instantes.',
        code: 'quota_unavailable',
      }),
      {
        status: 503,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': '30',
        },
      },
    )
  }
}
