import { useEffect, useState } from 'react'
import GoTrue from 'gotrue-js'
import { AuthContext } from './authContext.js'

// Configure GoTrue instance
// The 'url' should be your Netlify site URL (e.g., https://your-site.netlify.app/.netlify/identity)
// For local development, it will still work if you have a linked site.
const authConfig = {
  APIRoot: import.meta.env.VITE_NETLIFY_IDENTITY_URL || '/.netlify/identity',
  setCookie: true,
}

const auth = new GoTrue(authConfig)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => auth.currentUser() || null)
  const loading = false

  useEffect(() => {
    // 1. Check for tokens in the hash (confirmation or recovery)
    const hash = window.location.hash
    if (hash && hash.startsWith('#')) {
      const tokenStr = hash.substring(1)
      const [key] = tokenStr.split('=')
      
      if (key === 'recovery_token') {
        // We'll let the ResetPassword page handle this via URL hash
        // but we can set a flag here if we want a global notification
        console.log('Recovery token detected!')
      } else if (key === 'confirmation_token') {
        // Confirmation is simpler, it usually lands here
        console.log('Confirmation token detected!')
      }
    }
  }, [])

  const signup = async (email, password, data) => {
    return await auth.signup(email, password, data)
  }

  const confirmAccount = async (token) => {
    const response = await auth.confirm(token)
    // Após confirmar, o GoTrue retorna o usuário logado
    if (response) setUser(response)
    return response
  }

  const resendConfirmation = async (email) => {
    // GoTrue não tem endpoint nativo de reenvio; fazemos um novo signup
    // O Netlify Identity reenvía o email se a conta ainda não foi confirmada
    return await auth.signup(email, undefined, {})
  }

  const login = async (email, password, remember = true) => {
    const response = await auth.login(email, password, remember)
    setUser(response)
    return response
  }

  const confirmRecovery = async (token) => {
    const response = await auth.confirmRecovery(token)
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

  const updateMetadata = async (data) => {
    const currentUser = auth.currentUser()
    if (currentUser) {
      const updatedUser = await currentUser.update({ data })
      setUser(updatedUser)
      return updatedUser
    }
    throw new Error('No user logged in')
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
    updateMetadata,
    auth,
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}
