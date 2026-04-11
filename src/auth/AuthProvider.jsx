import { useCallback, useEffect, useRef, useState } from 'react'
import GoTrue from 'gotrue-js'
import { AuthContext } from './authContext.js'
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

function pickSafeUserMetadata(metadata) {
  return {
    full_name: String(metadata?.full_name ?? '').trim(),
    first_name: String(metadata?.first_name ?? '').trim(),
    school: String(metadata?.school ?? '').trim(),
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => auth.currentUser() || null)
  const [loading, setLoading] = useState(true)
  const [pendingOnboardingLogin, setPendingOnboardingLogin] = useState(false)
  const syncLockRef = useRef(false)

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
        // Fallback: return userId so authFetch can still send X-User-Id
        return currentUser.id ? `__userid__${currentUser.id}` : ''
      }
    })
    return () => registerAuthTokenGetter(null)
  }, [])

  useEffect(() => {
    let cancelled = false

    const hydrateSession = async () => {
      try {
        const validatedUser = await auth.validateCurrentSession()
        if (cancelled) return

        if (!validatedUser) {
          // Sessão inválida/expirada — limpar dados locais para evitar corrupção
          console.warn('[AuthProvider] Sessão inválida ou expirada. Limpando dados locais.')
          if (typeof window !== 'undefined' && window.localStorage) {
            // Remove apenas dados da app, mantém onboarding e preferências de UI
            const appKeys = []
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i)
              if (key && (key.startsWith('apice:') || key === 'gotrue.user')) {
                appKeys.push(key)
              }
            }
            appKeys.forEach(key => {
              try { localStorage.removeItem(key) } catch {
                // Falha silenciosa ao limpar chave individual
              }
            })
            console.log(`[AuthProvider] ${appKeys.length} chaves locais removidas (sessão inválida)`)
          }
          setUser(null)
        } else {
          setUser(validatedUser)
        }
      } catch (error) {
        console.error('[AuthProvider] Erro ao validar sessão:', error.message)
        if (!cancelled) {
          // Em caso de erro inesperado, também limpa para segurança
          if (typeof window !== 'undefined' && window.localStorage) {
            try {
              const gotrueUser = localStorage.getItem('gotrue.user')
              if (gotrueUser) localStorage.removeItem('gotrue.user')
            } catch {
              // Falha silenciosa ao limpar sessão
            }
          }
          setUser(null)
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

    // Verifica se já fizemos cloud pull nesta sessão (previne duplicação em reloads)
    const cloudPullKey = 'apice:cloud-session:has-pulled'
    const hasPulled = typeof window !== 'undefined'
      && window.sessionStorage
      && window.sessionStorage.getItem(cloudPullKey) === '1'

    if (hasPulled) {
      console.log('[AuthProvider] Cloud pull já feito nesta sessão, pulando (dados locais preservados)')
      return
    }

    let cancelled = false

    const restoreCloudState = async () => {
      try {
        // Puxa estado da nuvem e aplica no localStorage
        const pulled = await pullStateFromCloud()

        if (!cancelled && pulled) {
          console.log('[AuthProvider] Estado restaurado da nuvem com sucesso')
        } else if (!cancelled && !pulled) {
          console.warn('[AuthProvider] Falha ao restaurar estado da nuvem. Dados locais preservados.')
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[AuthProvider] Erro inesperado no cloud restore:', err.message)
        }
      } finally {
        // Marca que já fizemos pull nesta sessão (mesmo se falhou)
        if (typeof window !== 'undefined' && window.sessionStorage && !cancelled) {
          try { window.sessionStorage.setItem(cloudPullKey, '1') } catch {}
        }
      }
    }

    void restoreCloudState()

    return () => { cancelled = true }
  }, [user])

  // Sync de mudanças do localStorage → nuvem (debounced)
  useEffect(() => {
    if (!user) return
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
  }, [user])

  const signup = async (email, password, data) => {
    return await auth.signup(email, password, data)
  }

  const confirmAccount = async (token) => {
    const response = await auth.confirm(token, true)
    clearVerificationPassword()
    // Após confirmar, o GoTrue retorna o usuário logado
    if (response) {
      setUser(response)
      armOnboardingAfterLogin()
    }
    return response
  }

  const resendConfirmation = async (email) => {
    return await resendVerificationEmail(auth, email)
  }

  const login = async (email, password, remember = true) => {
    const response = await auth.login(email, password, remember)
    clearVerificationPassword()
    setUser(response)
    armOnboardingAfterLogin()
    return response
  }

  const confirmRecovery = async (token) => {
    const response = await auth.recover(token, true)
    clearVerificationPassword()
    setUser(response)
    armOnboardingAfterLogin()
    return response
  }

  const logout = async () => {
    const currentUser = auth.currentUser()
    if (currentUser) {
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
    // Limpa flag de cloud pull para permitir pull limpo no próximo login
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try { window.sessionStorage.removeItem('apice:cloud-session:has-pulled') } catch {}
    }
    clearLocalCloudSync()
    syncLockRef.current = false
    setUser(null)
  }

  const deleteAccount = async () => {
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
    signup,
    confirmAccount,
    resendConfirmation,
    login,
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
