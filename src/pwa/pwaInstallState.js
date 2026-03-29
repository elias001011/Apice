const PWA_DISPLAY_MODE_QUERY = '(display-mode: standalone)'

let promptEvent = null
let promptReady = false
let installed = false
const subscribers = new Set()
let listenersAttached = false

function canUseWindow() {
  return typeof window !== 'undefined'
}

function isStandaloneApp() {
  if (!canUseWindow()) return false

  const standaloneDisplay = window.matchMedia?.(PWA_DISPLAY_MODE_QUERY)?.matches
  const iOSStandalone = Boolean(window.navigator?.standalone)
  return Boolean(standaloneDisplay || iOSStandalone)
}

function notifySubscribers() {
  for (const subscriber of subscribers) {
    try {
      subscriber()
    } catch (error) {
      console.error('PWA install subscriber error:', error)
    }
  }
}

function refreshInstalledState() {
  installed = isStandaloneApp()
}

function attachListeners() {
  if (!canUseWindow() || listenersAttached) return
  listenersAttached = true

  refreshInstalledState()

  const mediaQuery = window.matchMedia?.(PWA_DISPLAY_MODE_QUERY) || null
  const handleDisplayModeChange = () => {
    refreshInstalledState()
    notifySubscribers()
  }

  const handleBeforeInstallPrompt = (event) => {
    event.preventDefault()
    promptEvent = event
    promptReady = true
    refreshInstalledState()
    notifySubscribers()
  }

  const handleAppInstalled = () => {
    promptEvent = null
    promptReady = false
    installed = true
    notifySubscribers()
  }

  if (mediaQuery) {
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleDisplayModeChange)
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(handleDisplayModeChange)
    }
  }

  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.addEventListener('appinstalled', handleAppInstalled)
}

export function getPwaInstallSnapshot() {
  attachListeners()
  refreshInstalledState()

  return {
    canInstall: promptReady && !installed,
    isInstalled: installed,
  }
}

export function subscribePwaInstallState(handler) {
  if (typeof handler !== 'function') return () => {}

  attachListeners()
  subscribers.add(handler)

  return () => {
    subscribers.delete(handler)
  }
}

export async function promptPwaInstall() {
  attachListeners()
  refreshInstalledState()

  if (installed) {
    return { outcome: 'accepted', alreadyInstalled: true }
  }

  const event = promptEvent
  if (!event) {
    const error = new Error('A instalação do PWA ainda não está disponível neste navegador.')
    error.code = 'pwa-install-unavailable'
    throw error
  }

  promptEvent = null
  promptReady = false
  notifySubscribers()

  event.prompt()
  const choice = await event.userChoice

  if (choice?.outcome === 'accepted') {
    installed = true
    notifySubscribers()
  }

  return choice
}

if (typeof window !== 'undefined') {
  getPwaInstallSnapshot()
}
