const PERFORMANCE_AI_SETTINGS_KEY = 'apice:performance-ai-analysis:v1'
const PERFORMANCE_AI_SETTINGS_UPDATED_EVENT = 'apice:performance-ai-analysis-updated'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function nowIso() {
  return new Date().toISOString()
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true
    if (['false', '0', 'no', 'off'].includes(normalized)) return false
  }
  return fallback
}

export function normalizePerformanceAiAnalysisSettings(rawSettings) {
  if (!rawSettings || typeof rawSettings !== 'object') {
    return {
      enabled: false,
      updatedAt: '',
    }
  }

  return {
    enabled: normalizeBoolean(rawSettings.enabled, false),
    updatedAt: String(rawSettings.updatedAt ?? '').trim(),
  }
}

export function loadPerformanceAiAnalysisSettings() {
  if (!canUseStorage()) return normalizePerformanceAiAnalysisSettings(null)

  try {
    const raw = localStorage.getItem(PERFORMANCE_AI_SETTINGS_KEY)
    return normalizePerformanceAiAnalysisSettings(raw ? JSON.parse(raw) : null)
  } catch {
    return normalizePerformanceAiAnalysisSettings(null)
  }
}

export function isPerformanceAiAnalysisEnabled() {
  return loadPerformanceAiAnalysisSettings().enabled
}

export function savePerformanceAiAnalysisSettings(settings) {
  if (!canUseStorage()) return normalizePerformanceAiAnalysisSettings(settings)

  const normalized = normalizePerformanceAiAnalysisSettings(settings)
  normalized.updatedAt = normalized.updatedAt || nowIso()
  localStorage.setItem(PERFORMANCE_AI_SETTINGS_KEY, JSON.stringify(normalized))
  window.dispatchEvent(new CustomEvent(PERFORMANCE_AI_SETTINGS_UPDATED_EVENT))
  return normalized
}

export function setPerformanceAiAnalysisEnabled(enabled) {
  return savePerformanceAiAnalysisSettings({
    enabled,
    updatedAt: nowIso(),
  })
}

export function subscribePerformanceAiAnalysisSettings(handler) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(PERFORMANCE_AI_SETTINGS_UPDATED_EVENT, handler)
  return () => window.removeEventListener(PERFORMANCE_AI_SETTINGS_UPDATED_EVENT, handler)
}

export function emitPerformanceAiAnalysisSettingsUpdated() {
  if (!canUseStorage()) return
  window.dispatchEvent(new CustomEvent(PERFORMANCE_AI_SETTINGS_UPDATED_EVENT))
}

export { PERFORMANCE_AI_SETTINGS_KEY, PERFORMANCE_AI_SETTINGS_UPDATED_EVENT }
