/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const AppBusyContext = createContext(null)

export function AppBusyProvider({ children }) {
  const [busyCount, setBusyCount] = useState(0)

  const beginBusy = useCallback(() => {
    setBusyCount((count) => count + 1)
  }, [])

  const endBusy = useCallback(() => {
    setBusyCount((count) => Math.max(count - 1, 0))
  }, [])

  const value = useMemo(() => ({
    busy: busyCount > 0,
    busyCount,
    beginBusy,
    endBusy,
  }), [busyCount, beginBusy, endBusy])

  useEffect(() => {
    if (typeof document === 'undefined') return

    document.body.classList.toggle('app-busy', busyCount > 0)
    document.body.style.overflow = busyCount > 0 ? 'hidden' : ''

    return () => {
      document.body.classList.remove('app-busy')
      document.body.style.overflow = ''
    }
  }, [busyCount])

  return (
    <AppBusyContext.Provider value={value}>
      {children}
    </AppBusyContext.Provider>
  )
}

export function useAppBusy() {
  const context = useContext(AppBusyContext)
  if (!context) {
    throw new Error('useAppBusy deve ser usado dentro de AppBusyProvider')
  }
  return context
}
