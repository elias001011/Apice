import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PwaInstallContext } from './pwaInstallContext.js'

const PWA_DISPLAY_MODE_QUERY = '(display-mode: standalone)'

function canUseWindow() {
  return typeof window !== 'undefined'
}

function isStandaloneApp() {
  if (!canUseWindow()) return false

  const standaloneDisplay = window.matchMedia?.(PWA_DISPLAY_MODE_QUERY)?.matches
  const iOSStandalone = Boolean(window.navigator?.standalone)
  return Boolean(standaloneDisplay || iOSStandalone)
}

function attachMediaQueryListener(mediaQuery, handler) {
  if (!mediaQuery) return () => {}

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }

  if (typeof mediaQuery.addListener === 'function') {
    mediaQuery.addListener(handler)
    return () => mediaQuery.removeListener(handler)
  }

  return () => {}
}

export function PwaInstallProvider({ children }) {
  const promptEventRef = useRef(null)
  const [promptReady, setPromptReady] = useState(false)
  const [installed, setInstalled] = useState(() => isStandaloneApp())

  useEffect(() => {
    if (!canUseWindow()) return undefined

    const mediaQuery = window.matchMedia?.(PWA_DISPLAY_MODE_QUERY) || null
    const refreshInstalledState = () => setInstalled(Boolean(mediaQuery?.matches || window.navigator?.standalone))

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault()
      promptEventRef.current = event
      setPromptReady(true)
    }

    const handleAppInstalled = () => {
      promptEventRef.current = null
      setPromptReady(false)
      setInstalled(true)
    }

    refreshInstalledState()
    const detachMediaQuery = attachMediaQueryListener(mediaQuery, refreshInstalledState)

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      detachMediaQuery()
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const installPwa = useCallback(async () => {
    if (installed) {
      return { outcome: 'accepted', alreadyInstalled: true }
    }

    const promptEvent = promptEventRef.current
    if (!promptEvent) {
      const error = new Error('A instalação do PWA ainda não está disponível neste navegador.')
      error.code = 'pwa-install-unavailable'
      throw error
    }

    promptEventRef.current = null
    setPromptReady(false)

    promptEvent.prompt()
    const choice = await promptEvent.userChoice

    if (choice?.outcome === 'accepted') {
      setInstalled(true)
    }

    return choice
  }, [installed])

  const value = useMemo(() => ({
    canInstall: promptReady && !installed,
    isInstalled: installed,
    installPwa,
  }), [promptReady, installed, installPwa])

  return <PwaInstallContext.Provider value={value}>{children}</PwaInstallContext.Provider>
}
