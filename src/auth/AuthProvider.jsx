import { useCallback, useEffect, useRef, useState } from 'react'
import GoTrue from 'gotrue-js'
import { AuthContext } from './authContext.js'
import {
  applyAccountSnapshot,
  buildAccountSnapshot,
  extractAccountSnapshot,
} from '../services/accountSnapshot.js'
import { refreshUserSummaryFromHistory } from '../services/userSummary.js'

// Configure GoTrue instance
// The 'url' should be your Netlify site URL (e.g., https://your-site.netlify.app/.netlify/identity)
// For local development, it will still work if you have a linked site.
const authConfig = {
  APIUrl: import.meta.env.VITE_NETLIFY_IDENTITY_URL || '/.netlify/identity',
  setCookie: true,
}

const auth = new GoTrue(authConfig)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => auth.currentUser() || null)
  const syncLockRef = useRef(false)
  const lastSyncedSnapshotRef = useRef('')
  const loading = false

  const syncLocalStateToCloud = useCallback(async () => {
    if (!user || syncLockRef.current) return null

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
          ...(currentUser.user_metadata || {}),
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
      return undefined
    }

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
    window.addEventListener('apice:notificacoes-updated', handleAccountStateChange)

    void refreshUserSummaryFromHistory()

    return () => {
      window.removeEventListener('apice:historico-updated', handleAccountStateChange)
      window.removeEventListener('apice:free-plan-usage-updated', handleAccountStateChange)
      window.removeEventListener('apice:radar-favorites-updated', handleAccountStateChange)
      window.removeEventListener('apice:radar-state-updated', handleAccountStateChange)
      window.removeEventListener('apice:theme-updated', handleAccountStateChange)
      window.removeEventListener('apice:user-summary-updated', handleAccountStateChange)
      window.removeEventListener('apice:notificacoes-updated', handleAccountStateChange)
    }
  }, [user, syncLocalStateToCloud])

  const signup = async (email, password, data) => {
    return await auth.signup(email, password, data)
  }

  const confirmAccount = async (token) => {
    const response = await auth.confirm(token, true)
    // Após confirmar, o GoTrue retorna o usuário logado
    if (response) setUser(response)
    return response
  }

  const resendConfirmation = async (email) => {
    // O GoTrue/Netlify Identity reenvía o e-mail de confirmação quando um usuário
    // não confirmado tenta fazer signup novamente com o mesmo email + senha.
    // Lemos a senha salva temporariamente no sessionStorage durante o cadastro.
    const apiRoot = import.meta.env.VITE_NETLIFY_IDENTITY_URL || '/.netlify/identity'
    const password = sessionStorage.getItem('_apice_verif_pw') || ''
    
    const res = await fetch(`${apiRoot}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    
    // Limpamos a senha do sessionStorage após o uso
    sessionStorage.removeItem('_apice_verif_pw')
    
    if (!res.ok) {
      let errMsg = 'Erro ao reenviar'
      try {
        const json = await res.json()
        // Netlify Identity retorna 422 com msg "User already registered" quando
        // o usuário já foi confirmado — neste caso o reenvio não faz sentido
        errMsg = json.msg || json.error_description || json.error || errMsg
        if (errMsg.toLowerCase().includes('already registered')) {
          errMsg = 'Este e-mail já foi confirmado. Tente fazer login.'
        }
      } catch (error) {
        void error
      }
      throw new Error(errMsg)
    }
    return res.json().catch(() => null)
  }

  const login = async (email, password, remember = true) => {
    const response = await auth.login(email, password, remember)
    setUser(response)
    return response
  }

  const confirmRecovery = async (token) => {
    const response = await auth.recover(token, true)
    setUser(response)
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
    setUser(null)
  }

  const updateAccount = async (attributes) => {
    const currentUser = auth.currentUser()
    if (currentUser) {
      const nextAttributes = { ...attributes }
      if (nextAttributes.data && typeof nextAttributes.data === 'object') {
        nextAttributes.data = {
          ...(currentUser.user_metadata || {}),
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
