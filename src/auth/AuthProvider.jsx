import { createContext, useContext, useEffect, useState } from 'react'
import GoTrue from 'gotrue-js'

const AuthContext = createContext(null)

// Configure GoTrue instance
// The 'url' should be your Netlify site URL (e.g., https://your-site.netlify.app/.netlify/identity)
// For local development, it will still work if you have a linked site.
const authConfig = {
  APIRoot: import.meta.env.VITE_NETLIFY_IDENTITY_URL || '/.netlify/identity',
  setCookie: true,
}

const auth = new GoTrue(authConfig)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Check for tokens in the hash (confirmation or recovery)
    const hash = window.location.hash
    if (hash && hash.startsWith('#')) {
      const tokenStr = hash.substring(1)
      const [key, value] = tokenStr.split('=')
      
      if (key === 'recovery_token') {
        // We'll let the ResetPassword page handle this via URL hash
        // but we can set a flag here if we want a global notification
        console.log('Recovery token detected!')
      } else if (key === 'confirmation_token') {
        // Confirmation is simpler, it usually lands here
        console.log('Confirmation token detected!')
      }
    }

    // 2. Check for Netlify Identity user first
    const currentUser = auth.currentUser()
    if (currentUser) {
      setUser(currentUser)
      setLoading(false)
    } else {
      // 3. Check for guest user in localStorage
      const guest = localStorage.getItem('guestUser')
      if (guest) {
        setUser(JSON.parse(guest))
      }
      setLoading(false)
    }
  }, [])

  const signup = async (email, password, data) => {
    return await auth.signup(email, password, data)
  }

  const confirmAccount = async (token) => {
    return await auth.confirm(token)
  }

  const login = async (email, password, remember = true) => {
    const response = await auth.login(email, password, remember)
    setUser(response)
    // Clear guest info if logging in with a real account
    localStorage.removeItem('guestUser')
    return response
  }

  const confirmRecovery = async (token) => {
    const response = await auth.confirmRecovery(token)
    setUser(response)
    return response
  }

  const guestLogin = (name) => {
    const guestUser = {
      id: 'guest-' + Date.now(),
      user_metadata: { full_name: name || 'Convidado' },
      email: 'convidado@local.test',
      isGuest: true
    }
    localStorage.setItem('guestUser', JSON.stringify(guestUser))
    setUser(guestUser)
    return guestUser
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
    localStorage.removeItem('guestUser')
    setUser(null)
  }

  const updateMetadata = async (data) => {
    if (user?.isGuest) {
      const updatedUser = { ...user, user_metadata: { ...user.user_metadata, ...data } }
      localStorage.setItem('guestUser', JSON.stringify(updatedUser))
      setUser(updatedUser)
      return updatedUser
    }
    
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
    login,
    confirmRecovery,
    guestLogin,
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

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
