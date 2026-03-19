import { createContext, useContext, useEffect, useState } from 'react'
import GoTrue from 'gotrue-js'

const AuthContext = createContext(null)

// Configure GoTrue instance
// The 'url' should be your Netlify site URL (e.g., https://your-site.netlify.app/.netlify/identity)
// For local development, it will still work if you have a linked site.
const auth = new GoTrue({
  APIRoot: '/.netlify/identity',
  setCookie: true,
})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const currentUser = auth.currentUser()
    if (currentUser) {
      setUser(currentUser)
    }
    setLoading(false)
  }, [])

  const signup = async (email, password, data) => {
    return await auth.signup(email, password, data)
  }

  const login = async (email, password, remember = true) => {
    const response = await auth.login(email, password, remember)
    setUser(response)
    return response
  }

  const logout = async () => {
    const currentUser = auth.currentUser()
    if (currentUser) {
      await currentUser.logout()
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
    login,
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
