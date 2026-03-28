import { useContext } from 'react'
import { PwaInstallContext } from './pwaInstallContext.js'

export function usePwaInstall() {
  return useContext(PwaInstallContext)
}
