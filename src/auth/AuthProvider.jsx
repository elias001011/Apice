import { useCallback, useEffect, useRef, useState } from 'react'
import GoTrue from 'gotrue-js'
import { AuthContext } from './authContext.js'
import {
  clearGuestSession,
  createGuestUser,
  isGuestSessionActive,
  loadGuestProfile,
  markGuestSession,
  saveGuestProfile,
} from './sessionMode.js'
import {
  clearVerificationPassword,
  resendVerificationEmail,
  requestAccountDeletion,
} from '../services/identityAuth.js'
import { registerAuthTokenGetter } from '../services/authFetch.js'
import {
  pullStateFromCloud,
  pushStateToCloud,
  clearLocalCloudSync,
} from '../services/cloudSync.js'

import { refreshUserSummaryFromHistory } from '../services/userSummary.js'

// Configure GoTrue instance
// The 'url' should be your Netlify site URL (e.g., https://your-site.netlify.app/.netlify/identity)
// For local development, it will still work if you have a linked site.
const authConfig = {
  APIUrl: import.meta.env.VITE_NETLIFY_IDENTITY_URL || '/.netlify/identity',
  setCookie: false,
}

const auth = new GoTrue(authConfig)
const CLOUD_PULL_SESSION_PREFIX = 'apice:cloud-session:has-pulled'
const LAST_AUTH_ACCOUNT_KEY = 'apice:auth:last-account:v1'
const ACCOUNT_STATE_OWNER_KEY = 'apice:account-state-owner:v1'
const ACCOUNT_LOCAL_STATE_KEYS = [
  'apice:billing-state:v1',
  'apice:plan:tier',
  'apice:free-plan-usage:v1',
  'apice:historico',
  'apice:historico:total',
  'apice:historico:total:v1',
  'apice:simulado:historico:v1',
  'apice:simulado:historico:total:v1',
  'apice:simulado_progresso:v2',
  'apice:user-summary',
  'apice:user-summary:v1',
  'apice:radar-favorites',
  'apice:radar-favorites:v1',
  'apice:radar-state',
  'apice:radar-state:v1',
  'apice:radar-state:v2',
  'apice:enem-manual-date',
  'apice:enem-date',
  'apice:ai-response-preference',
  'apice:ai-response-preference:v1',
  'apice:avatar-settings',
  'apice:avatar-settings:v1',
  'apice:notificacoes',
  'apice:notificacoes:v1',
  'apice:conquistas',
  'apice:conquistas:v1',
  'apice:weather:location:v1',
  'apice:corretor:draft:v3',
  'apice:professor-chats:v1',
  'apice:professor:conversations',
  'apice:professor:handoff:v1',
]

function pickSafeUserMetadata(metadata) {
  return {
    full_name: String(metadata?.full_name ?? '').trim(),
    first_name: String(metadata?.first_name ?? '').trim(),
    school: String(metadata?.school ?? '').trim(),
  }
}

function clearLegacyIdentityStorage() {
  if (typeof window === 'undefined' || !window.localStorage) return

  try {
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key && (key === 'gotrue.user' || key.startsWith('gotrue.'))) {
        keysToRemove.push(key)
      }
    }

    keysToRemove.forEach((key) => {
      try {
        localStorage.removeItem(key)
      } catch {
        // ignore
      }
    })
  } catch {
    // ignore
  }
}

function hasStoredIdentitySession(authClient) {
  if (typeof window === 'undefined' || !window.localStorage) return false

  try {
    return Boolean(authClient.currentUser() || localStorage.getItem('gotrue.user'))
  } catch {
    return false
  }
}

function getAuthAccountKey(account) {
  return String(account?.id || account?.sub || account?.email || '').trim().toLowerCase()
}

function getLastAuthAccountKey() {
  if (typeof window === 'undefined' || !window.localStorage) return ''

  try {
    return String(window.localStorage.getItem(LAST_AUTH_ACCOUNT_KEY) || '').trim().toLowerCase()
  } catch {
    return ''
  }
}

function getLocalAccountStateOwner() {
  if (typeof window === 'undefined' || !window.localStorage) return ''

  try {
    return String(window.localStorage.getItem(ACCOUNT_STATE_OWNER_KEY) || '').trim().toLowerCase()
  } catch {
    return ''
  }
}

function markLocalAccountStateOwner(account) {
  if (typeof window === 'undefined' || !window.localStorage) return

  const accountKey = getAuthAccountKey(account)
  try {
    if (accountKey) {
      window.localStorage.setItem(ACCOUNT_STATE_OWNER_KEY, accountKey)
    } else {
      window.localStorage.removeItem(ACCOUNT_STATE_OWNER_KEY)
    }
  } catch {
    // ignore
  }
}

function localAccountStateHasData() {
  if (typeof window === 'undefined' || !window.localStorage) return false

  return ACCOUNT_LOCAL_STATE_KEYS.some((key) => {
    try {
      return window.localStorage.getItem(key) !== null
    } catch {
      return false
    }
  })
}

function getCloudPullSessionKey(account) {
  const accountKey = getAuthAccountKey(account) || 'unknown'
  return `${CLOUD_PULL_SESSION_PREFIX}:${accountKey}`
}

function clearCloudPullSessionFlags() {
  if (typeof window === 'undefined' || !window.sessionStorage) return

  try {
    const keysToRemove = []
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const key = window.sessionStorage.key(i)
      if (key && (key === CLOUD_PULL_SESSION_PREFIX || key.startsWith(`${CLOUD_PULL_SESSION_PREFIX}:`))) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => window.sessionStorage.removeItem(key))
  } catch (storageError) {
    console.warn('[AuthProvider] Não foi possível limpar flags de cloud pull:', storageError?.message || storageError)
  }
}

function markLastAuthAccount(account) {
  if (typeof window === 'undefined' || !window.localStorage) return

  const accountKey = getAuthAccountKey(account)
  try {
    if (accountKey) {
      window.localStorage.setItem(LAST_AUTH_ACCOUNT_KEY, accountKey)
    } else {
      window.localStorage.removeItem(LAST_AUTH_ACCOUNT_KEY)
    }
  } catch {
    // ignore
  }
}

function shouldResetLocalAccountStateFor(account) {
  if (typeof window === 'undefined' || !window.localStorage) return false

  const accountKey = getAuthAccountKey(account)
  if (!accountKey) return false

  const previousAccountKey = getLastAuthAccountKey()
  const ownerAccountKey = getLocalAccountStateOwner()
  return Boolean(
    (previousAccountKey && previousAccountKey !== accountKey)
    || (ownerAccountKey && ownerAccountKey !== accountKey)
  )
}

function clearLocalAccountState() {
  if (typeof window === 'undefined' || !window.localStorage) return

  ACCOUNT_LOCAL_STATE_KEYS.forEach((key) => {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // ignore
    }
  })
  try {
    window.localStorage.removeItem(ACCOUNT_STATE_OWNER_KEY)
  } catch {
    // ignore
  }

  const updateEvents = [
    'apice:billing-state-updated',
    'apice:free-plan-usage-updated',
    'apice:historico-updated',
    'apice:simulado-historico-updated',
    'apice:radar-favorites-updated',
    'apice:radar-state-updated',
    'apice:enem-date-updated',
    'apice:ai-response-preferences-updated',
    'apice:avatar-settings-updated',
    'apice:user-summary-updated',
    'apice:notificacoes-updated',
    'apice:conquistas-updated',
    'apice:professor-chats-updated',
    'apice:account-state-updated',
    'apice:weather-preferences-updated',
  ]

  updateEvents.forEach((eventName) => {
    try {
      window.dispatchEvent(new CustomEvent(eventName))
    } catch {
      // ignore
    }
  })
}

function prepareExplicitLoginState(account) {
  clearLocalAccountState()
  clearCloudPullSessionFlags()
  clearLocalCloudSync()
  markLastAuthAccount(account)
  markLocalAccountStateOwner(account)
}

async function clearExistingIdentitySession(authClient) {
  let hadSession = false
  try {
    const currentUser = authClient.currentUser()
    if (currentUser) {
      hadSession = true
      try {
        await currentUser.logout()
      } catch (err) {
        console.warn('[AuthProvider] Não foi possível encerrar sessão anterior antes do login:', err?.message || err)
      }
    }
  } catch {
    // ignore
  }

  clearLegacyIdentityStorage()
  return hadSession
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const currentUser = auth.currentUser()
    if (currentUser) return currentUser
    if (isGuestSessionActive()) return createGuestUser(loadGuestProfile())
    return null
  })
  const [loading, setLoading] = useState(true)
  const [pendingOnboardingLogin, setPendingOnboardingLogin] = useState(false)
  const syncLockRef = useRef(false)
  const isGuest = Boolean(user?.guest)

  const armOnboardingAfterLogin = useCallback(() => {
    setPendingOnboardingLogin(true)
  }, [])

  const clearOnboardingAfterLogin = useCallback(() => {
    setPendingOnboardingLogin(false)
  }, [])

  // Register the JWT getter so authFetch can send Authorization: Bearer header.
  // Previously we sent X-User-Id (forjável) because user_metadata inflated JWTs.
  // Now that apice_state was moved to Blobs, JWTs are light again (~300 chars).
  useEffect(() => {
    registerAuthTokenGetter(async () => {
      const currentUser = auth.currentUser()
      if (!currentUser) return ''
      try {
        // GoTrue .jwt() refreshes the token if expired and returns the JWT string
        const token = await currentUser.jwt()
        return token || ''
      } catch (err) {
        console.warn('[AuthProvider] Falha ao obter JWT:', err.message)
        // Se o refresh token está inválido, a sessão está corrompida
        // Limpar tudo para evitar dados de conta anterior
        if (err.message && /invalid.*(grant|refresh|token)/i.test(err.message)) {
          console.warn('[AuthProvider] Refresh token inválido. Limpando sessão corrompida.')
          clearLegacyIdentityStorage()
          clearLocalAccountState()
          clearCloudPullSessionFlags()
          clearLocalCloudSync()
        }
        return ''
      }
    })
    return () => registerAuthTokenGetter(null)
  }, [])

  useEffect(() => {
    let cancelled = false

    const hydrateSession = async () => {
      try {
        const guestSession = isGuestSessionActive()
        const storedIdentitySession = hasStoredIdentitySession(auth)

        if (!storedIdentitySession) {
          if (!cancelled) {
            setUser(guestSession ? createGuestUser(loadGuestProfile()) : null)
          }
          return
        }

        const validatedUser = await auth.validateCurrentSession()
        if (cancelled) return

        if (!validatedUser) {
          console.warn('[AuthProvider] Sessão inválida ou expirada. Limpando dados de identidade e conta.')
          clearLegacyIdentityStorage()
          // Limpar dados de conta para evitar que a conta anterior persista
          clearLocalAccountState()
          clearCloudPullSessionFlags()
          clearLocalCloudSync()
          if (!cancelled) {
            setUser(guestSession ? createGuestUser(loadGuestProfile()) : null)
          }
        } else {
          clearGuestSession()
          setUser(validatedUser)
        }
      } catch (error) {
        console.error('[AuthProvider] Erro ao validar sessão:', error.message)
        if (!cancelled) {
          clearLegacyIdentityStorage()
          // Limpar dados de conta para evitar que a conta anterior persista
          clearLocalAccountState()
          clearCloudPullSessionFlags()
          clearLocalCloudSync()
          setUser(isGuestSessionActive() ? createGuestUser(loadGuestProfile()) : null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void hydrateSession()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!user) {
      setPendingOnboardingLogin(false)
    }
  }, [user])

  // ── Cloud Sync via Netlify Blobs (NÃO via user_metadata/JWT) ────────────

  // No login, restaura estado da nuvem e aplica no localStorage
  // IMPORTANTE: Só fazer pull da nuvem no primeiro login, não a cada reload
  // para não destruir dados do localStorage que ainda não foram syncados
  useEffect(() => {
    if (!user) return

    void refreshUserSummaryFromHistory()

    if (isGuest) {
      return
    }

    const accountKey = getAuthAccountKey(user)
    const previousAccountKey = getLastAuthAccountKey()
    const ownerAccountKey = getLocalAccountStateOwner()
    const trustedLocalState = ownerAccountKey === accountKey || previousAccountKey === accountKey

    if (shouldResetLocalAccountStateFor(user)) {
      console.log('[AuthProvider] Conta autenticada mudou. Limpando dados locais da conta anterior antes do cloud pull.')
      clearLocalAccountState()
      clearCloudPullSessionFlags()
      clearLocalCloudSync()
    }
    markLastAuthAccount(user)

    // Verifica se já fizemos cloud pull nesta sessão (previne duplicação em reloads)
    const cloudPullKey = getCloudPullSessionKey(user)
    const hasPulled = typeof window !== 'undefined'
      && window.sessionStorage
      && window.sessionStorage.getItem(cloudPullKey) === '1'

    if (hasPulled) {
      markLocalAccountStateOwner(user)
      console.log('[AuthProvider] Cloud pull já feito nesta sessão, pulando (dados locais preservados)')
      return
    }

    let cancelled = false

    const restoreCloudState = async () => {
      try {
        // Puxa estado da nuvem e aplica no localStorage
        const pulled = await pullStateFromCloud()

        if (!cancelled && pulled === true) {
          markLocalAccountStateOwner(user)
          console.log('[AuthProvider] Estado restaurado da nuvem com sucesso')
        } else if (!cancelled && pulled === null) {
          if (!trustedLocalState && localAccountStateHasData()) {
            console.log('[AuthProvider] Conta sem estado na nuvem e dados locais sem dono confiável. Iniciando estado limpo para evitar mistura entre contas.')
            clearLocalAccountState()
            clearLocalCloudSync()
          }
          markLocalAccountStateOwner(user)
          console.log('[AuthProvider] Conta ainda sem estado na nuvem. Um estado inicial será salvo automaticamente.')
        } else if (!cancelled && pulled === false) {
          console.warn('[AuthProvider] Falha ao restaurar estado da nuvem. Dados locais preservados.')
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[AuthProvider] Erro inesperado no cloud restore:', err.message)
        }
      } finally {
        // Marca que já fizemos pull nesta sessão (mesmo se falhou)
        if (typeof window !== 'undefined' && window.sessionStorage && !cancelled) {
          try {
            window.sessionStorage.setItem(cloudPullKey, '1')
          } catch (storageError) {
            console.warn('[AuthProvider] Não foi possível marcar o cloud pull:', storageError?.message || storageError)
          }
        }
      }
    }

    void restoreCloudState()

    return () => { cancelled = true }
  }, [user, isGuest])

  // Sync de mudanças do localStorage → nuvem (debounced)
  useEffect(() => {
    if (!user || isGuest) return
    let cancelled = false
    let syncTimeout = null

    const scheduleSync = () => {
      if (syncTimeout) clearTimeout(syncTimeout)
      // Debounce de 2s para não chamar a API a cada tecla
      syncTimeout = setTimeout(async () => {
        if (!cancelled && !syncLockRef.current) {
          syncLockRef.current = true
          try {
            await pushStateToCloud(user)
          } catch (err) {
            console.error('[AuthProvider] Erro no cloud sync:', err.message)
            // Se falhou, pode ser auth expirada — reset lock para próxima tentativa
            syncLockRef.current = false
            return
          }
          syncLockRef.current = false
        }
      }, 2000)
    }

    const events = [
      'apice:historico-updated',
      'apice:simulado-historico-updated',
      'apice:free-plan-usage-updated',
      'apice:enem-date-updated',
      'apice:radar-favorites-updated',
      'apice:radar-state-updated',
      'apice:theme-updated',
      'apice:user-summary-updated',
      'apice:ai-response-preferences-updated',
      'apice:avatar-settings-updated',
      'apice:notificacoes-updated',
      'apice:conquistas-updated',
      'apice:professor-chats-updated',
    ]

    events.forEach(event => {
      window.addEventListener(event, scheduleSync)
    })

    // Primeira sync ao montar
    void refreshUserSummaryFromHistory()
    scheduleSync()

    return () => {
      cancelled = true
      if (syncTimeout) clearTimeout(syncTimeout)
      events.forEach(event => {
        window.removeEventListener(event, scheduleSync)
      })
    }
  }, [user, isGuest])


  const signup = async (email, password, data) => {
    return await auth.signup(email, password, data)
  }

  const confirmAccount = async (token) => {
    const response = await auth.confirm(token, true)
    clearVerificationPassword()
    clearGuestSession()
    // Após confirmar, o GoTrue retorna o usuário logado
    if (response) {
      prepareExplicitLoginState(response)
      setUser(response)
      armOnboardingAfterLogin()
    }
    return response
  }

  const resendConfirmation = async (email) => {
    return await resendVerificationEmail(auth, email)
  }

  const login = async (email, password, remember = true) => {
    const clearedPreviousIdentity = await clearExistingIdentitySession(auth)
    if (clearedPreviousIdentity) {
      clearOnboardingAfterLogin()
      setUser(null)
    }

    const response = await auth.login(email, password, remember)
    clearVerificationPassword()
    clearGuestSession()
    prepareExplicitLoginState(response)
    syncLockRef.current = false
    setUser(response)
    armOnboardingAfterLogin()
    return response
  }

  const confirmRecovery = async (token) => {
    const response = await auth.recover(token, true)
    clearVerificationPassword()
    clearGuestSession()
    prepareExplicitLoginState(response)
    syncLockRef.current = false
    setUser(response)
    armOnboardingAfterLogin()
    return response
  }

  const loginAsGuest = async () => {
    clearVerificationPassword()
    await clearExistingIdentitySession(auth)
    clearLocalAccountState()
    clearCloudPullSessionFlags()
    clearLocalCloudSync()
    const guestProfile = markGuestSession(loadGuestProfile())
    const guestUser = createGuestUser(guestProfile)
    setUser(guestUser)
    clearOnboardingAfterLogin()
    return guestUser
  }

  const logout = async () => {
    const currentUser = auth.currentUser()
    if (currentUser) {
      if (!isGuest) {
        syncLockRef.current = true
        try {
          await pushStateToCloud(currentUser)
        } catch (err) {
          console.warn('[AuthProvider] Não foi possível salvar estado na nuvem antes do logout:', err?.message || err)
        } finally {
          syncLockRef.current = false
        }
      }

      try {
        await currentUser.logout()
      } catch (err) {
        console.error('Logout error:', err)
      }
    }
    clearVerificationPassword()
    clearOnboardingAfterLogin()
    // Limpeza total do localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      Object.keys(localStorage).forEach(key => localStorage.removeItem(key))
    }
    // Limpa flags de cloud pull para permitir pull limpo no próximo login
    clearCloudPullSessionFlags()
    clearLocalCloudSync()
    syncLockRef.current = false
    setUser(null)
    
    // Força recarregamento total para limpar qualquer estado mantido na memória do React
    // Isso garante que a conta 2 não herde dados da conta 1 através de componentes não desmontados
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  }

  const deleteAccount = async () => {
    if (isGuest) {
      throw new Error('Modo convidado não possui conta para excluir.')
    }

    try {
      const result = await requestAccountDeletion(auth)
      clearVerificationPassword()
      clearOnboardingAfterLogin()
      // Limpeza agressiva antes do logout
      if (typeof window !== 'undefined' && window.localStorage) {
        Object.keys(localStorage).forEach(key => localStorage.removeItem(key))
      }
      clearLocalCloudSync()
      await logout()
      return result
    } finally {
      syncLockRef.current = false
    }
  }

  const updateAccount = async (attributes) => {
    if (isGuest) {
      const nextAttributes = { ...attributes }
      const nextData = nextAttributes.data && typeof nextAttributes.data === 'object'
        ? nextAttributes.data
        : {}

      const nextProfile = saveGuestProfile({
        ...loadGuestProfile(),
        full_name: String(nextData.full_name ?? user?.user_metadata?.full_name ?? '').trim() || 'Convidado',
        first_name: String(nextData.first_name ?? user?.user_metadata?.first_name ?? '').trim() || 'Convidado',
        school: String(nextData.school ?? user?.user_metadata?.school ?? '').trim(),
      })

      const updatedGuest = createGuestUser(nextProfile)
      setUser(updatedGuest)
      return updatedGuest
    }

    const currentUser = auth.currentUser()
    if (currentUser) {
      const nextAttributes = { ...attributes }
      if (nextAttributes.data && typeof nextAttributes.data === 'object') {
        // M-04 FIX: Apply pickSafeUserMetadata AFTER user-supplied data
        // so that only the allowed fields survive. This prevents callers
        // from injecting arbitrary keys like 'roles' or 'app_metadata'.
        const safeBase = pickSafeUserMetadata(currentUser.user_metadata)
        const userSupplied = nextAttributes.data
        nextAttributes.data = {
          ...safeBase,
          full_name: String(userSupplied.full_name ?? safeBase.full_name).trim(),
          first_name: String(userSupplied.first_name ?? safeBase.first_name).trim(),
          school: String(userSupplied.school ?? safeBase.school).trim(),
          // NO apice_state — all app state goes to Netlify Blobs via cloudSync
        }
      }

      const updatedUser = await currentUser.update(nextAttributes)
      setUser(updatedUser)
      return updatedUser
    }
    throw new Error('No user logged in')
  }

  const updateMetadata = async (data) => {
    return await updateAccount({ data })
  }

  const value = {
    user,
    loading,
    isGuest,
    signup,
    confirmAccount,
    resendConfirmation,
    login,
    loginAsGuest,
    confirmRecovery,
    logout,
    deleteAccount,
    updateAccount,
    updateMetadata,
    auth,
    onboardingLoginPending: pendingOnboardingLogin,
    clearOnboardingLoginPrompt: clearOnboardingAfterLogin,
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}
