/**
 * Backup Service for Ápice.
 * Handles local search, export and import of all user data.
 */

const APICE_PREFIX = 'apice:'
const BACKUP_VERSION = 1
const BACKUP_FILENAME_PREFIX = 'apice-backup-'

const CATEGORIES = {
  ESSAYS: {
    label: 'Redações e Histórico',
    keys: ['apice:historico', 'apice:historico:total:v1'],
  },
  RADAR: {
    label: 'Radar e Temas Salvos',
    keys: ['apice:radar-favorites:v1', 'apice:radar-state:v2'],
  },
  PREFERENCES: {
    label: 'Aparência e Interface',
    keys: [
      'apice:theme',
      'apice:accent',
      'apice:font',
      'apice:fontFamily',
      'apice:layoutMode',
      'apice:containerSize',
      'apice:animationsEnabled',
      'apice:cardHoverEffects',
    ],
  },
  ACCOUNT: {
    label: 'Perfil e Instruções da IA',
    keys: ['apice:avatar-settings:v1', 'apice:ai-response-preferences:v1', 'apice:notificacoes:v1', 'apice:user-policy:v1'],
  },
  PROGRESS: {
    label: 'Conquistas e Desempenho',
    keys: ['apice:conquistas:v1', 'apice:user-summary:v1'],
  },
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

/**
 * Trigger all necessary events to update the UI and sync to cloud.
 */
function emitUpdateEvents() {
  if (typeof window === 'undefined') return

  const events = [
    'apice:theme-updated',
    'apice:historico-updated',
    'apice:free-plan-usage-updated',
    'apice:radar-favorites-updated',
    'apice:radar-state-updated',
    'apice:user-summary-updated',
    'apice:notificacoes-updated',
    'apice:conquistas-updated',
    'apice:account-state-updated', // This triggers the cloud sync
  ]

  events.forEach((name) => {
    window.dispatchEvent(new CustomEvent(name))
  })
}

/**
 * Export all localStorage data starting with 'apice:' to a JSON file.
 */
export function exportBackup() {
  if (!canUseStorage()) return null

  const data = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(APICE_PREFIX)) {
      data[key] = localStorage.getItem(key)
    }
  }

  const backupBlob = {
    version: BACKUP_VERSION,
    timestamp: new Date().toISOString(),
    data,
  }

  const blob = new Blob([JSON.stringify(backupBlob, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const dateStr = new Date().toISOString().split('T')[0]
  const link = document.createElement('a')
  link.href = url
  link.download = `${BACKUP_FILENAME_PREFIX}${dateStr}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  return backupBlob
}

/**
 * Parse a backup file and return its stats.
 */
export function parseBackupFile(jsonString) {
  try {
    const backup = JSON.parse(jsonString)
    if (!backup || typeof backup !== 'object' || backup.version > BACKUP_VERSION) {
      throw new Error('Versão de backup incompatível.')
    }
    
    if (!backup.data || typeof backup.data !== 'object') {
      throw new Error('Dados do backup malformatados.')
    }

    const availableCategories = []
    Object.entries(CATEGORIES).forEach(([id, cat]) => {
      const hasAny = cat.keys.some(key => Object.prototype.hasOwnProperty.call(backup.data, key))
      if (hasAny) {
        // Find stats for essays if possible
        let detail = ''
        if (id === 'ESSAYS') {
          const history = JSON.parse(backup.data['apice:historico'] || '[]')
          detail = `${history.length} redações encontradas.`
        }
        
        availableCategories.push({
          id,
          label: cat.label,
          detail,
          keys: cat.keys
        })
      }
    })

    return {
      version: backup.version,
      timestamp: backup.timestamp,
      categories: availableCategories,
      rawData: backup.data
    }
  } catch (err) {
    console.error('[BackupService] Erro ao ler arquivo:', err)
    return null
  }
}

/**
 * Restore internal data from a backup.
 */
export function restoreFromBackup(backupData, selectedCategoryIds = []) {
  if (!canUseStorage() || !backupData || typeof backupData !== 'object') return false

  try {
    const keysToRestore = []
    
    if (selectedCategoryIds.length === 0) {
      // Restore ALL keys in the backup
      keysToRestore.push(...Object.keys(backupData))
    } else {
      // Only restore keys from selected categories
      selectedCategoryIds.forEach(catId => {
        const cat = CATEGORIES[catId]
        if (cat) {
          keysToRestore.push(...cat.keys)
        }
      })
    }

    keysToRestore.forEach(key => {
      if (Object.prototype.hasOwnProperty.call(backupData, key)) {
        localStorage.setItem(key, backupData[key])
      }
    })

    // Notify the app about the changes
    emitUpdateEvents()
    return true
  } catch (err) {
    console.error('[BackupService] Erro na restauração:', err)
    return false
  }
}

export { CATEGORIES }
