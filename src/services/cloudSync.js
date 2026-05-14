/**
 * Cloud Sync — sincroniza o estado da conta via Netlify Blobs (KV store).
 *
 * Substitui o apice_state no user_metadata (que inflava o JWT e causava 500).
 * Agora o estado fica num store separado, acessível via endpoints dedicados.
 *
 * REGRAS DE SINCRONIZAÇÃO:
 * - Pull: nuvem complementa local (não sobrescreve)
 * - Push: envia snapshot completo da conta (sem aparência)
 * - Aparência NUNCA é sincronizada (sempre local)
 *
 * Uso:
 *   - No login: cloudSync.pull() → aplica dados da nuvem no localStorage
 *   - No logout: cloudSync.clearLocal() → limpa localStorage
 *   - Em mudanças: cloudSync.push() → salva estado atual na nuvem
 */

import { authFetch } from './authFetch.js'
import { buildAccountSnapshot, applyAccountSnapshot } from './accountSnapshot.js'
import { getBillingState, normalizeBillingState, saveBillingState } from './billingState.js'

const CLOUD_SYNC_KEY = 'apice:cloud-sync:last-pull:v1'

function hasMeaningfulBilling(state) {
  return Boolean(
    state
    && typeof state === 'object'
    && (
      state.status !== 'free'
      || state.planKey
      || state.trialUsedAt
      || state.trialStartedAt
      || state.trialEndsAt
      || state.paidAt
      || state.checkoutId
      || state.externalId
      || state.subscriptionId
      || state.cancelAtPeriodEnd
      || state.cancellationRequestedAt
      || state.cancelledAt
      || state.accessEndsAt
    ),
  )
}

function billingStatesMatch(localState, cloudState) {
  const relevantKeys = [
    'status',
    'planKey',
    'trialKind',
    'trialUsedAt',
    'trialStartedAt',
    'trialEndsAt',
    'paidAt',
    'checkoutId',
    'externalId',
    'subscriptionId',
    'subscriptionActive',
    'cancelAtPeriodEnd',
    'cancellationRequestedAt',
    'cancelledAt',
    'accessEndsAt',
    'remoteStatus',
  ]

  return relevantKeys.every((key) => (
    String(localState?.[key] ?? '') === String(cloudState?.[key] ?? '')
  ))
}

function applyServerBillingAfterPush(serverState) {
  if (!serverState || typeof serverState !== 'object' || !serverState.billing) return

  try {
    const cloudBilling = normalizeBillingState(serverState.billing)
    const localBilling = getBillingState()

    if (!hasMeaningfulBilling(cloudBilling) && !hasMeaningfulBilling(localBilling)) {
      return
    }

    if (billingStatesMatch(localBilling, cloudBilling)) {
      return
    }

    // O backend é autoridade para billing. Aplicamos só esse recorte para evitar
    // o loop de eventos causado por reaplicar o snapshot inteiro após cada push.
    saveBillingState(cloudBilling)
    console.log('[cloudSync] Billing sincronizado com estado autorizado da nuvem')
  } catch (error) {
    console.warn('[cloudSync] Não foi possível aplicar billing autorizado:', error?.message || error)
  }
}

/**
 * Retorna o user atual (para checar se está logado).
 * Usa o token JWT como indicador de sessão ativa.
 */
async function _getCurrentUser() {
  try {
    const GoTrue = (await import('gotrue-js')).default
    const auth = new GoTrue({
      APIUrl: import.meta.env.VITE_NETLIFY_IDENTITY_URL || '/.netlify/identity',
      setCookie: false,
    })
    return auth.currentUser()
  } catch {
    return null
  }
}

/**
 * Busca o estado salvo na nuvem e aplica no localStorage.
 * MERGE INTELIGENTE: nuvem complementa local, não sobrescreve.
 * Aparência NUNCA é restaurada da nuvem.
 */
export async function pullStateFromCloud() {
  try {
    const res = await authFetch('/.netlify/functions/carregar-estado')

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.warn('[cloudSync] Falha ao carregar estado da nuvem:', err.error)
      return false
    }

    const data = await res.json()

    if (!data.state) {
      // Sem estado na nuvem — primeiro uso ou conta zerada
      console.log('[cloudSync] Nenhum estado na nuvem')
      return null
    }

    // Aplica o estado da nuvem com MERGE INTELIGENTE
    // applyAccountSnapshot agora preserva dados locais
    applyAccountSnapshot(data.state)

    // Marca timestamp do último pull
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(CLOUD_SYNC_KEY, new Date().toISOString())
    }

    console.log('[cloudSync] Estado restaurado da nuvem (merge inteligente)')
    return true
  } catch (error) {
    console.error('[cloudSync] Erro ao carregar estado:', error.message)
    return false
  }
}

/**
 * Salva o estado atual do localStorage na nuvem.
 * Snapshot inclui: conquistas, perfil, histórico (índices), cota, billing,
 * radar, clima, etc. NÃO inclui aparência (tema, fonte, efeitos).
 */
export async function pushStateToCloud(user) {
  try {
    // Monta o snapshot com dados mínimos do user + tudo do localStorage
    // buildAccountSnapshot já exclui aparência automaticamente
    const snapshot = buildAccountSnapshot(user || { user_metadata: {}, email: '' })

    const res = await authFetch('/.netlify/functions/salvar-estado', {
      method: 'POST',
      body: JSON.stringify({ state: snapshot }),
    })

    if (!res.ok) {
      let errorDetail = ''
      try {
        const errBody = await res.json()
        errorDetail = errBody.error || errBody.detail || JSON.stringify(errBody)
      } catch {
        errorDetail = res.statusText || `HTTP ${res.status}`
      }
      console.error(
        `[cloudSync] Falha ao salvar estado: HTTP ${res.status} — ${errorDetail}. ` +
        `Usuário logado: ${Boolean(user)}. ` +
        `UserId: ${user?.id || '(sem id)'}. ` +
        `Snapshot version: ${snapshot?.version || '(sem versão)'}`
      )
      return false
    }

    const data = await res.json()
    applyServerBillingAfterPush(data?.state)
    console.log(`[cloudSync] Estado salvo na nuvem (${data.sizeBytes || 'unknown'} bytes)`)
    return true
  } catch (error) {
    console.error('[cloudSync] Erro ao salvar estado:', error.message, error.stack?.split('\n').slice(0, 3).join(' | '))
    return false
  }
}

/**
 * Limpa dados locais do cloud sync (logout).
 */
export function clearLocalCloudSync() {
  if (typeof window === 'undefined' || !window.localStorage) return
  localStorage.removeItem(CLOUD_SYNC_KEY)
}

/**
 * Retorna a data do último pull da nuvem.
 */
export function getLastCloudPull() {
  if (typeof window === 'undefined' || !window.localStorage) return null
  try {
    const raw = localStorage.getItem(CLOUD_SYNC_KEY)
    return raw ? new Date(raw) : null
  } catch {
    return null
  }
}
