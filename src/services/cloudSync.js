/**
 * Cloud Sync — sincroniza o estado da conta via Netlify Blobs (KV store).
 *
 * Substitui o apice_state no user_metadata (que inflava o JWT e causava 500).
 * Agora o estado fica num store separado, acessível via endpoints dedicados.
 *
 * Uso:
 *   - No login: cloudSync.pull() → aplica dados da nuvem no localStorage
 *   - No logout: cloudSync.clearLocal() → limpa localStorage
 *   - Em mudanças: cloudSync.push() → salva estado atual na nuvem
 */

import { authFetch } from './authFetch.js'
import { buildAccountSnapshot, applyAccountSnapshot } from './accountSnapshot.js'

const CLOUD_SYNC_KEY = 'apice:cloud-sync:last-pull:v1'

/**
 * Retorna o user atual (para checar se está logado).
 * Usa o token JWT como indicador de sessão ativa.
 */
async function _getCurrentUser() {
  // Import dinâmico para evitar circular dependency
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
 * Chama no login para restaurar preferências, cota, etc.
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
      return false
    }

    // Aplica o estado da nuvem no localStorage
    applyAccountSnapshot(data.state)

    // Marca timestamp do último pull
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(CLOUD_SYNC_KEY, new Date().toISOString())
    }

    console.log('[cloudSync] Estado restaurado da nuvem')
    return true
  } catch (error) {
    console.error('[cloudSync] Erro ao carregar estado:', error.message)
    return false
  }
}

/**
 * Salva o estado atual do localStorage na nuvem.
 * Usa o user_metadata mínimo (sem apice_state) para montar o snapshot.
 */
export async function pushStateToCloud(user) {
  try {
    // Monta o snapshot com dados mínimos do user + tudo do localStorage
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
