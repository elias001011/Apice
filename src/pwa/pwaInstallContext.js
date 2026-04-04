import { createContext } from 'react'

async function unavailableInstall() {
  const error = new Error('A instalação do PWA ainda não está disponível neste navegador.')
  error.code = 'pwa-install-unavailable'
  throw error
}

export const PwaInstallContext = createContext({
  canInstall: false,
  isInstalled: false,
  installPwa: unavailableInstall,
})
