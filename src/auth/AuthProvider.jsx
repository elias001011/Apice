import { useCallback, useEffect, useRef, useState } from 'react'
import GoTrue from 'gotrue-js'
import { AuthContext } from './authContext.js'
import {
  applyAccountSnapshot,
  buildAccountSnapshot,
  extractAccountSnapshot,
} from '../services/accountSnapshot.js'
import {
  clearVerificationPassword,
  resendVerificationEmail,
  requestAccountDeletion,
} from '../services/identityAuth.js'
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
  const syncLockRef = useRef(false)
  const lastSyncedSnapshotRef = useRef('')
  const syncSuspendedRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    const hydrateSession = async () => {
      try {
        const validatedUser = await auth.validateCurrentSession()
        if (cancelled) return

        setUser(validatedUser)
        if (!validatedUser) {
          syncLockRef.current = false
          lastSyncedSnapshotRef.current = ''
        }
      } catch (error) {
        console.error('Auth session validation error:', error)
        if (!cancelled) {
          setUser(null)
          syncLockRef.current = false
          lastSyncedSnapshotRef.current = ''
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void hydrateSession()

    return () => {
      cancelled = true
    }
  }, [])

  const syncLocalStateToCloud = useCallback(async () => {
    if (!user || syncLockRef.current || syncSuspendedRef.current) return null

    const currentUser = auth.currentUser()
    if (!currentUser) return null

    const snapshot = buildAccountSnapshot(currentUser)
    const serialized = JSON.stringify(snapshot)
    if (serialized === lastSyncedSnapshotRef.current) {
      return snapshot
    }

    syncLockRef.current = true
    try {
      const updatedUser = await currentUser.update({
        data: {
          ...pickSafeUserMetadata(currentUser.user_metadata),
          full_name: snapshot.profile.full_name,
          first_name: snapshot.profile.first_name,
          school: snapshot.profile.school,
          apice_state: snapshot,
        },
      })
      setUser(updatedUser)
      lastSyncedSnapshotRef.current = serialized
      return snapshot
    } catch (error) {
      console.error('Account sync error:', error)
      return null
    } finally {
      window.setTimeout(() => {
        syncLockRef.current = false
      }, 0)
    }
  }, [user])

  useEffect(() => {
    if (!user) {
      syncLockRef.current = false
      lastSyncedSnapshotRef.current = ''
      syncSuspendedRef.current = false
      return undefined
    }

    let cancelled = false
    const remoteSnapshot = extractAccountSnapshot(user)

    if (remoteSnapshot) {
      const serialized = JSON.stringify(remoteSnapshot)
      if (serialized !== lastSyncedSnapshotRef.current) {
        syncLockRef.current = true
        applyAccountSnapshot(remoteSnapshot)
        lastSyncedSnapshotRef.current = serialized
        window.setTimeout(() => {
          syncLockRef.current = false
        }, 0)
      }
    }

    const handleAccountStateChange = () => {
      void syncLocalStateToCloud()
    }

    window.addEventListener('apice:historico-updated', handleAccountStateChange)
    window.addEventListener('apice:free-plan-usage-updated', handleAccountStateChange)
    window.addEventListener('apice:radar-favorites-updated', handleAccountStateChange)
    window.addEventListener('apice:radar-state-updated', handleAccountStateChange)
    window.addEventListener('apice:theme-updated', handleAccountStateChange)
    window.addEventListener('apice:user-summary-updated', handleAccountStateChange)
    window.addEventListener('apice:ai-response-preferences-updated', handleAccountStateChange)
    window.addEventListener('apice:avatar-settings-updated', handleAccountStateChange)
    window.addEventListener('apice:notificacoes-updated', handleAccountStateChange)
    window.addEventListener('apice:conquistas-updated', handleAccountStateChange)

    const initializeCloudState = async () => {
      await refreshUserSummaryFromHistory()
      if (!cancelled) {
        void syncLocalStateToCloud()
      }
    }

    void initializeCloudState()

    return () => {
      cancelled = true
      window.removeEventListener('apice:historico-updated', handleAccountStateChange)
      window.removeEventListener('apice:free-plan-usage-updated', handleAccountStateChange)
      window.removeEventListener('apice:radar-favorites-updated', handleAccountStateChange)
      window.removeEventListener('apice:radar-state-updated', handleAccountStateChange)
      window.removeEventListener('apice:theme-updated', handleAccountStateChange)
      window.removeEventListener('apice:user-summary-updated', handleAccountStateChange)
      window.removeEventListener('apice:ai-response-preferences-updated', handleAccountStateChange)
      window.removeEventListener('apice:avatar-settings-updated', handleAccountStateChange)
      window.removeEventListener('apice:notificacoes-updated', handleAccountStateChange)
      window.removeEventListener('apice:conquistas-updated', handleAccountStateChange)
    }
  }, [user, syncLocalStateToCloud])

  const signup = async (email, password, data) => {
    return await auth.signup(email, password, data)
  }

  const confirmAccount = async (token) => {
    const response = await auth.confirm(token, true)
    clearVerificationPassword()
    // Após confirmar, o GoTrue retorna o usuário logado
    if (response) setUser(response)
    return response
  }

  const resendConfirmation = async (email) => {
    return await resendVerificationEmail(auth, email)
  }

  const login = async (email, password, remember = true) => {
    const response = await auth.login(email, password, remember)
    clearVerificationPassword()
    setUser(response)
    return response
  }

  const confirmRecovery = async (token) => {
    const response = await auth.recover(token, true)
    clearVerificationPassword()
    setUser(response)
    return response
  }

  const logout = async () => {
    syncSuspendedRef.current = true
    const currentUser = auth.currentUser()
    if (currentUser) {
      try {
        await currentUser.logout()
      } catch (err) {
        console.error('Logout error:', err)
      }
    }
    clearVerificationPassword()
    // Limpeza total do localStorage para isolamento de contas
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.clear()
    }
    syncLockRef.current = false
    lastSyncedSnapshotRef.current = ''
    setUser(null)
  }

  const deleteAccount = async () => {
    syncSuspendedRef.current = true
    try {
      const result = await requestAccountDeletion(auth)
      clearVerificationPassword()
      await logout()
      return result
    } finally {
      if (auth.currentUser()) {
        syncSuspendedRef.current = false
      }
    }
  }

  const updateAccount = async (attributes) => {
    const currentUser = auth.currentUser()
    if (currentUser) {
      const nextAttributes = { ...attributes }
      if (nextAttributes.data && typeof nextAttributes.data === 'object') {
        nextAttributes.data = {
          ...pickSafeUserMetadata(currentUser.user_metadata),
          ...nextAttributes.data,
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
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}
