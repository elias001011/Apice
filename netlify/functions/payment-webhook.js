import process from 'node:process'
import crypto from 'node:crypto'

/**
 * Webhook para eventos de pagamento da AbacatePay API v2.
 *
 * Eventos principais v2:
 * - checkout.completed
 * - subscription.completed
 * - subscription.trial_started
 * - subscription.renewed
 * - subscription.cancelled
 *
 * Autenticação do webhook:
 * - WEBHOOK_SECRET valida a query webhookSecret da URL cadastrada na AbacatePay.
 */

const BLOB_STORE_NAME = 'user-state'
const MAX_WEBHOOK_BODY_BYTES = 1024 * 1024
const MAX_BLOB_WRITE_ATTEMPTS = 5
const DEFAULT_ABACATEPAY_PUBLIC_KEY = 't9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9'

const SUCCESS_EVENTS = new Set([
  'checkout.completed',
  'subscription.completed',
  'subscription.renewed',
])

const TRIAL_EVENTS = new Set([
  'subscription.trial_started',
])

const CANCEL_EVENTS = new Set([
  'subscription.cancelled',
  'checkout.refunded',
  'checkout.disputed',
  'checkout.lost',
])

function safeText(value) {
  return String(value ?? '').trim()
}

function normalizeIsoDate(value) {
  const text = safeText(value)
  if (!text) return ''
  const date = new Date(text)
  if (!Number.isFinite(date.getTime())) return ''
  return date.toISOString()
}

function getTrialDays(metadata) {
  const days = Math.round(Number(metadata?.trialDays || metadata?.trial_days || 7))
  return Number.isFinite(days) && days > 0 ? Math.min(days, 60) : 7
}

function normalizeBillingMode(value) {
  const normalized = safeText(value).toLowerCase().replace(/[\s-]+/g, '_')
  if (['one_time', 'payment', 'checkout', 'single', 'single_payment'].includes(normalized)) {
    return 'one_time'
  }
  if (['subscription', 'recurring', 'recorrente'].includes(normalized)) {
    return 'subscription'
  }
  return ''
}

function getAccessMonths(metadata) {
  const months = Math.round(Number(metadata?.accessMonths || metadata?.access_months || 1))
  return Number.isFinite(months) && months > 0 ? Math.min(months, 36) : 1
}

function buildAccessEndsAt(metadata, paidAt) {
  const startDate = new Date(normalizeIsoDate(paidAt) || new Date().toISOString())
  if (!Number.isFinite(startDate.getTime())) return ''
  const endDate = new Date(startDate.getTime())
  endDate.setMonth(endDate.getMonth() + getAccessMonths(metadata))
  return endDate.toISOString()
}

function parseExternalId(externalId) {
  const text = safeText(externalId)
  const parts = text.split(':')
  if (parts.length >= 4 && parts[0] === 'apice') {
    return {
      userId: parts[1] || '',
      planKey: parts[2] || '',
      timestamp: parts[3] || '',
    }
  }

  const safeParts = text.split('_')
  if (safeParts.length >= 4 && safeParts[0] === 'apice') {
    return {
      userId: safeParts.slice(3).join('_') || '',
      planKey: safeParts[1] || '',
      timestamp: safeParts[2] || '',
    }
  }

  return { userId: '', planKey: '', timestamp: '' }
}

function parsePayload(rawBody) {
  try {
    return JSON.parse(rawBody || '{}')
  } catch {
    return {}
  }
}

function getWebhookSecret() {
  return safeText(process.env.WEBHOOK_SECRET)
}

function constantTimeTextEqual(received, expected) {
  const receivedBuffer = Buffer.from(safeText(received), 'utf8')
  const expectedBuffer = Buffer.from(safeText(expected), 'utf8')
  return receivedBuffer.length === expectedBuffer.length
    && crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
}

function verifyWebhookSignature(rawBody, receivedSignature) {
  const publicKey = safeText(process.env.ABACATEPAY_WEBHOOK_PUBLIC_KEY) || DEFAULT_ABACATEPAY_PUBLIC_KEY
  const expectedSignature = crypto
    .createHmac('sha256', publicKey)
    .update(Buffer.from(rawBody, 'utf8'))
    .digest('base64')

  return constantTimeTextEqual(receivedSignature, expectedSignature)
}

function pickMetadata(body) {
  const data = body?.data || {}
  const candidates = [
    body?.metadata,
    data?.metadata,
    data?.checkout?.metadata,
    data?.subscription?.metadata,
    data?.payment?.metadata,
    data?.billing?.metadata,
    body?.checkout?.metadata,
    body?.subscription?.metadata,
  ]

  return candidates.find((candidate) => candidate && typeof candidate === 'object') || {}
}

function pickPaymentObjects(body) {
  const data = body?.data || {}
  return {
    data,
    checkout: data?.checkout || body?.checkout || data?.billing || body?.billing || {},
    subscription: data?.subscription || body?.subscription || {},
    payment: data?.payment || body?.payment || {},
  }
}

function pickExternalId(objects, metadata) {
  return safeText(
    metadata?.externalId
    || objects.checkout?.externalId
    || objects.payment?.externalId
    || objects.subscription?.externalId
    || objects.data?.externalId
    || '',
  )
}

function pickCheckoutId(objects) {
  return safeText(
    objects.checkout?.id
    || objects.payment?.checkoutId
    || objects.payment?.billingId
    || objects.data?.checkoutId
    || objects.data?.id
    || '',
  )
}

function pickSubscriptionId(objects) {
  return safeText(
    objects.subscription?.id
    || objects.checkout?.subscriptionId
    || objects.checkout?.subscription_id
    || objects.payment?.subscriptionId
    || objects.data?.subscriptionId
    || '',
  )
}

function pickAccessEndsAt(objects, metadata) {
  return normalizeIsoDate(
    metadata?.accessEndsAt
    || metadata?.currentPeriodEnd
    || metadata?.current_period_end
    || objects.subscription?.currentPeriodEnd
    || objects.subscription?.current_period_end
    || objects.checkout?.currentPeriodEnd
    || objects.data?.currentPeriodEnd
    || '',
  )
}

async function getStore() {
  try {
    const { getStore: getStoreFn } = await import('@netlify/blobs')
    return getStoreFn({ name: BLOB_STORE_NAME, consistency: 'strong' })
  } catch {
    return null
  }
}

async function updateBillingInBlob(userId, planKey, billingUpdate, eventId = '') {
  const store = await getStore()
  if (!store) {
    console.warn('[payment-webhook] Blob store não disponível. Billing não será atualizado na nuvem.')
    return false
  }

  try {
    const blobKey = `user-state:${userId}`

    for (let attempt = 0; attempt < MAX_BLOB_WRITE_ATTEMPTS; attempt += 1) {
      const existing = await store.getWithMetadata(blobKey, { type: 'json' })
      const currentState = existing?.data && typeof existing.data === 'object' ? existing.data : {}
      const billingStatus = safeText(billingUpdate.status) || 'paid'
      const planStatus = billingStatus === 'free' ? 'free' : billingStatus
      const previousEvents = Array.isArray(currentState.billing?.processedWebhookEventIds)
        ? currentState.billing.processedWebhookEventIds.filter(Boolean)
        : []

      if (eventId && previousEvents.includes(eventId)) {
        console.log('[payment-webhook] Evento duplicado ignorado.')
        return true
      }

      const processedWebhookEventIds = eventId
        ? [eventId, ...previousEvents].slice(0, 50)
        : previousEvents
      const updatedState = {
        ...currentState,
        accountOwnerId: userId,
        billing: {
          ...(currentState.billing || {}),
          ...billingUpdate,
          ...(billingUpdate.billingMode === 'one_time' && planKey
            ? {
                oneTimePlanKeys: Array.from(new Set([
                  ...(Array.isArray(currentState.billing?.oneTimePlanKeys) ? currentState.billing.oneTimePlanKeys : []),
                  planKey,
                ])),
              }
            : {}),
          processedWebhookEventIds,
          updatedAt: new Date().toISOString(),
        },
        planStatus,
        planTier: billingStatus === 'free' ? 'free' : 'paid',
        planKey: billingStatus === 'free' ? '' : (planKey || currentState.planKey || 'monthly'),
        savedAt: new Date().toISOString(),
      }
      const condition = existing?.etag
        ? { onlyIfMatch: existing.etag }
        : { onlyIfNew: true }
      const result = await store.setJSON(blobKey, updatedState, condition)

      if (result.modified) {
        console.log('[payment-webhook] Billing atualizado no blob.')
        return true
      }
    }

    console.error('[payment-webhook] Conflito persistente ao atualizar billing no blob.')
    return false
  } catch (error) {
    console.error('[payment-webhook] Erro ao atualizar blob:', error.message)
    return false
  }
}

export async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  try {
    const url = new URL(req.url)
    const configuredSecret = getWebhookSecret()
    const receivedSecret = safeText(url.searchParams.get('webhookSecret'))
    const receivedSignature = safeText(req.headers.get('x-webhook-signature'))

    if (!configuredSecret) {
      console.error('[payment-webhook] WEBHOOK_SECRET não configurada.')
      return new Response(JSON.stringify({ error: 'Webhook secret não configurado' }), { status: 500 })
    }

    if (!constantTimeTextEqual(receivedSecret, configuredSecret)) {
      return new Response(JSON.stringify({ error: 'Webhook secret inválido' }), { status: 401 })
    }

    if (!receivedSignature) {
      return new Response(JSON.stringify({ error: 'Assinatura do webhook ausente' }), { status: 401 })
    }

    const declaredLength = Number(req.headers.get('content-length') || 0)
    if (Number.isFinite(declaredLength) && declaredLength > MAX_WEBHOOK_BODY_BYTES) {
      return new Response(JSON.stringify({ error: 'Payload do webhook muito grande' }), { status: 413 })
    }

    const rawBody = await req.text()
    if (Buffer.byteLength(rawBody, 'utf8') > MAX_WEBHOOK_BODY_BYTES) {
      return new Response(JSON.stringify({ error: 'Payload do webhook muito grande' }), { status: 413 })
    }

    if (!verifyWebhookSignature(rawBody, receivedSignature)) {
      return new Response(JSON.stringify({ error: 'Assinatura do webhook inválida' }), { status: 401 })
    }

    const body = parsePayload(rawBody)
    const event = safeText(body?.event)
    const eventId = safeText(body?.id)

    if (!event || !eventId) {
      return new Response(JSON.stringify({ error: 'Payload do webhook inválido' }), { status: 400 })
    }
    const metadata = pickMetadata(body)
    const objects = pickPaymentObjects(body)
    const externalId = pickExternalId(objects, metadata)
    const parsedExternalId = parseExternalId(externalId)
    const userId = safeText(metadata.userId) || parsedExternalId.userId
    const planKey = safeText(metadata.planKey) || parsedExternalId.planKey || 'monthly'
    const checkoutId = pickCheckoutId(objects)
    const subscriptionId = pickSubscriptionId(objects)
    const checkoutMode = safeText(metadata.checkoutMode || objects.checkout?.frequency)
    const billingMode = normalizeBillingMode(metadata.billingMode || checkoutMode || (subscriptionId ? 'subscription' : '')) || 'subscription'

    console.log('[payment-webhook] Evento recebido.', {
      event,
      hasUserId: Boolean(userId),
      hasCheckoutId: Boolean(checkoutId),
      hasSubscriptionId: Boolean(subscriptionId),
    })

    if (!userId) {
      console.warn('[payment-webhook] userId não encontrado no metadata/externalId.')
      return new Response(JSON.stringify({ success: true, message: 'Ignorado: userId não encontrado' }), { status: 200 })
    }

    if (TRIAL_EVENTS.has(event)) {
      const trialDays = getTrialDays(metadata)
      const nowIso = new Date().toISOString()
      const trialStartedAt = normalizeIsoDate(
        metadata.trialStartedAt
        || metadata.trial_started_at
        || objects.subscription?.trialStartedAt
        || objects.subscription?.trial_started_at
        || objects.data?.trialStartedAt
        || objects.data?.createdAt,
      ) || nowIso
      const trialEndsAt = normalizeIsoDate(
        metadata.trialEndsAt
        || metadata.trial_ends_at
        || objects.subscription?.trialEndsAt
        || objects.subscription?.trial_ends_at
        || objects.data?.trialEndsAt,
      ) || new Date(new Date(trialStartedAt).getTime() + (trialDays * 24 * 60 * 60 * 1000)).toISOString()

      const billingUpdate = {
        status: 'trial',
        planKey,
        trialKind: 'standard',
        trialUsedAt: trialStartedAt,
        trialStartedAt,
        trialEndsAt,
        gateway: 'abacatepay-v2',
        subscriptionActive: true,
        checkoutId,
        externalId,
        subscriptionId,
        lastWebhookEvent: event,
      }

      const blobUpdated = await updateBillingInBlob(userId, planKey, billingUpdate, eventId)

      if (!blobUpdated) {
        return new Response(JSON.stringify({ error: 'Falha ao persistir trial' }), { status: 500 })
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Trial da assinatura registrado',
        blobUpdated,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (SUCCESS_EVENTS.has(event)) {
      const paidAt = new Date().toISOString()
      const accessEndsAt = billingMode === 'one_time' ? buildAccessEndsAt(metadata, paidAt) : ''
      const billingUpdate = {
        status: 'paid',
        planKey,
        billingMode,
        gateway: 'abacatepay-v2',
        paidAt,
        subscriptionActive: billingMode !== 'one_time',
        ...(accessEndsAt ? { accessEndsAt } : {}),
        checkoutId,
        externalId,
        subscriptionId: billingMode === 'one_time' ? '' : subscriptionId,
        lastWebhookEvent: event,
      }

      const blobUpdated = await updateBillingInBlob(userId, planKey, billingUpdate, eventId)

      if (!blobUpdated) {
        return new Response(JSON.stringify({ error: 'Falha ao persistir pagamento' }), { status: 500 })
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Usuário atualizado para PRO',
        blobUpdated,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (CANCEL_EVENTS.has(event)) {
      const isPeriodEndCancellation = event === 'subscription.cancelled'
      const nowIso = new Date().toISOString()
      const accessEndsAt = pickAccessEndsAt(objects, metadata)
      const billingUpdate = isPeriodEndCancellation
        ? {
            status: 'paid',
            planKey,
            gateway: 'abacatepay-v2',
            subscriptionActive: false,
            cancelAtPeriodEnd: true,
            cancellationRequestedAt: nowIso,
            cancelledAt: nowIso,
            ...(accessEndsAt ? { accessEndsAt } : {}),
            checkoutId,
            externalId,
            subscriptionId,
            lastWebhookEvent: event,
          }
        : {
            status: 'free',
            planKey: '',
            gateway: 'abacatepay-v2',
            subscriptionActive: false,
            cancelAtPeriodEnd: false,
            checkoutId,
            externalId,
            subscriptionId,
            cancelledAt: nowIso,
            lastWebhookEvent: event,
          }

      const blobUpdated = await updateBillingInBlob(userId, planKey, billingUpdate, eventId)

      if (!blobUpdated) {
        return new Response(JSON.stringify({ error: 'Falha ao persistir cancelamento' }), { status: 500 })
      }

      return new Response(JSON.stringify({
        success: true,
        message: isPeriodEndCancellation
          ? 'Assinatura marcada para encerrar no fim do período'
          : 'Usuário atualizado para FREE',
        blobUpdated,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    console.log('[payment-webhook] Evento ignorado.', { event })
    return new Response(JSON.stringify({ success: true, message: `Evento '${event}' ignorado` }), { status: 200 })
  } catch (error) {
    console.error('[payment-webhook] Erro ao processar webhook:', error?.message || error)
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), { status: 500 })
  }
}

export default handler
