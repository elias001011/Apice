import { useCallback, useEffect, useMemo, useState } from 'react'
import { PwaInstallContext } from './pwaInstallContext.js'
import {
  getPwaInstallSnapshot,
  promptPwaInstall,
  subscribePwaInstallState,
} from './pwaInstallState.js'

export function PwaInstallProvider({ children }) {
  const [{ canInstall, isInstalled }, setInstallState] = useState(() => getPwaInstallSnapshot())

  useEffect(() => {
    return subscribePwaInstallState(() => {
      setInstallState(getPwaInstallSnapshot())
    })
  }, [])

  const installPwa = useCallback(async () => {
    return promptPwaInstall()
  }, [])

  const value = useMemo(() => ({
    canInstall,
    isInstalled,
    installPwa,
  }), [canInstall, isInstalled, installPwa])

  return <PwaInstallContext.Provider value={value}>{children}</PwaInstallContext.Provider>
}
