/**
 * Server-side quota enforcement for Netlify Functions.
 *
 * Reads the user's state from Netlify Blobs and checks whether they have
 * remaining AI usage for the current day. This prevents clients from bypassing
 * the frontend quota by calling functions directly.
 *
 * FREE plan: 5 AI requests/day
 * PAID plan: 10 AI requests/day
 */

const FREE_DAILY_LIMIT = 5
const PAID_DAILY_LIMIT = 10

/**
 * Get the blob store for user state.
 */
async function getStore() {
  try {
    const { getStore } = await import('@netlify/blobs')
    return getStore({ name: 'user-state', consistency: 'strong' })
  } catch {
    return null
  }
}

/**
 * Get the current day key (YYYY-MM-DD) in UTC.
 */
function getDayKey() {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const day = String(now.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Read the user's state from Netlify Blobs.
 * Returns null if the store is unavailable or the user has no state.
 */
async function readUserState(userId) {
  const store = await getStore()
  if (!store) return null

  try {
    const blobKey = `user-state:${userId}`
    const data = await store.get(blobKey, { type: 'json' })
    return data && typeof data === 'object' ? data : null
  } catch {
    return null
  }
}

/**
 * Determine the user's daily AI limit based on their billing state.
 */
function resolveDailyLimit(userState) {
  // Paid: planStatus === 'paid' or planTier === 'paid' or billing.status === 'paid'
  const billing = userState?.billing
  const planStatus = userState?.planStatus
  const planTier = userState?.planTier

  if (planStatus === 'paid' || planTier === 'paid' || billing?.status === 'paid') {
    return PAID_DAILY_LIMIT
  }

  return FREE_DAILY_LIMIT
}

/**
 * Check if the user can consume AI quota.
 * Returns { allowed: boolean, used: number, limit: number, remaining: number }.
 */
export function checkAiQuota(userState) {
  const dayKey = getDayKey()
  const limit = resolveDailyLimit(userState)

  const usage = userState?.aiUsage || {}
  const dayUsage = usage[dayKey] || { count: 0 }
  const used = Number(dayUsage.count) || 0

  return {
    allowed: used < limit,
    used,
    limit,
    remaining: Math.max(limit - used, 0),
  }
}

/**
 * Consume one unit of AI quota for the user.
 * Returns true if consumed, false if quota was already exhausted.
 */
export async function consumeAiQuota(userId) {
  const store = await getStore()
  if (!store) {
    // No blob store — allow but log warning
    console.warn('[serverQuota] Blob store indisponível. Permitindo sem controle de quota.')
    return true
  }

  try {
    const blobKey = `user-state:${userId}`
    const existingData = await store.get(blobKey, { type: 'json' })
    const userState = existingData && typeof existingData === 'object' ? existingData : {}

    const quota = checkAiQuota(userState)
    if (!quota.allowed) {
      return false
    }

    // Increment usage
    const dayKey = getDayKey()
    const usage = userState.aiUsage || {}
    const dayUsage = usage[dayKey] || { count: 0 }

    const updatedState = {
      ...userState,
      aiUsage: {
        ...usage,
        [dayKey]: {
          count: (Number(dayUsage.count) || 0) + 1,
          lastUsedAt: new Date().toISOString(),
        },
      },
      savedAt: new Date().toISOString(),
    }

    await store.set(blobKey, JSON.stringify(updatedState), {
      contentType: 'application/json',
    })

    return true
  } catch (error) {
    console.error('[serverQuota] Erro ao consumir quota:', error.message)
    // On error, allow the request to avoid false negatives
    return true
  }
}

/**
 * Build a 429 (Too Many Requests) response for quota exceeded.
 */
export function quotaExceededResponse(corsHeaders = {}, used, limit) {
  return new Response(
    JSON.stringify({
      error: 'Limite diário de IA atingido',
      detail: `Você usou ${used} de ${limit} solicitações hoje. Tente amanhã ou troque de plano.`,
      code: 'quota_exceeded',
      used,
      limit,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': String(6 * 60 * 60), // 6 hours hint
      },
    },
  )
}

/**
 * Require AI quota — convenience wrapper.
 * Checks quota, consumes one unit, and returns the quota info or a 429 Response.
 *
 * Usage:
 *   const quota = requireAiQuota(auth.user.id, headers)
 *   if (quota instanceof Response) return quota  // 429
 *   // quota.allowed === true, proceed with AI call
 */
export async function requireAiQuota(userId, corsHeaders = {}) {
  const userState = await readUserState(userId)
  const quota = checkAiQuota(userState)

  if (!quota.allowed) {
    console.warn(`[serverQuota] Quota exaurida para ${userId}: ${quota.used}/${quota.limit}`)
    return quotaExceededResponse(corsHeaders, quota.used, quota.limit)
  }

  const consumed = await consumeAiQuota(userId)
  if (!consumed) {
    // Race condition: another request consumed the last unit
    const refreshedState = await readUserState(userId)
    const refreshedQuota = checkAiQuota(refreshedState)
    if (!refreshedQuota.allowed) {
      return quotaExceededResponse(corsHeaders, refreshedQuota.used, refreshedQuota.limit)
    }
  }

  console.log(`[serverQuota] Quota OK para ${userId}: ${quota.used + 1}/${quota.limit}`)
  return { allowed: true, used: quota.used + 1, limit: quota.limit }
}
