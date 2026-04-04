const AVATAR_SETTINGS_KEY = 'apice:avatar-settings:v1'
const AVATAR_SETTINGS_UPDATED_EVENT = 'apice:avatar-settings-updated'
const MAX_IMAGE_URL_LENGTH = 512

export const AVATAR_ACCENT_OPTIONS = [
  { key: 'theme', label: 'Cor do tema' },
  { key: 'lime', label: 'Lima' },
  { key: 'blue', label: 'Azul' },
  { key: 'purple', label: 'Roxo' },
  { key: 'orange', label: 'Laranja' },
  { key: 'red', label: 'Vermelho' },
  { key: 'cyan', label: 'Ciano' },
  { key: 'pink', label: 'Rosa' },
]

const AVATAR_ACCENT_PALETTES = {
  lime: { light: '#b8e84f', dark: '#c8f060' },
  blue: { light: '#4faaf0', dark: '#60c8f0' },
  purple: { light: '#a84ff0', dark: '#c060f0' },
  orange: { light: '#f09a4f', dark: '#f0b860' },
  red: { light: '#f04f4f', dark: '#f06060' },
  cyan: { light: '#4ff0d6', dark: '#60f0d8' },
  pink: { light: '#f04fbc', dark: '#f060d8' },
}

export const DEFAULT_AVATAR_SETTINGS = {
  mode: 'initials',
  accent: 'theme',
  imageUrl: '',
  updatedAt: '',
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function normalizeAvatarMode(mode) {
  return mode === 'image' ? 'image' : 'initials'
}

function normalizeAvatarAccent(accent) {
  return AVATAR_ACCENT_OPTIONS.some((option) => option.key === accent) ? accent : 'theme'
}

function sanitizeImageUrl(rawUrl) {
  const value = String(rawUrl ?? '').replace(/\s+/g, ' ').trim()
  if (!value) return ''

  const candidate = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value) ? value : `https://${value}`

  try {
    const parsed = new URL(candidate)
    if (!['http:', 'https:'].includes(parsed.protocol)) return ''
    return parsed.toString().slice(0, MAX_IMAGE_URL_LENGTH)
  } catch {
    return ''
  }
}

function readAvatarSettingsRaw() {
  if (!canUseStorage()) return null

  try {
    const raw = localStorage.getItem(AVATAR_SETTINGS_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (typeof parsed === 'string') {
      return {
        mode: 'image',
        accent: 'theme',
        imageUrl: parsed,
        updatedAt: new Date().toISOString(),
      }
    }

    if (parsed && typeof parsed === 'object') {
      return parsed
    }
  } catch {
    return null
  }

  return null
}

export function normalizeAvatarSettings(rawSettings) {
  if (typeof rawSettings === 'string') {
    return normalizeAvatarSettings({
      mode: 'image',
      accent: 'theme',
      imageUrl: rawSettings,
    })
  }

  if (!rawSettings || typeof rawSettings !== 'object') {
    return { ...DEFAULT_AVATAR_SETTINGS }
  }

  const mode = normalizeAvatarMode(rawSettings.mode)
  const accent = normalizeAvatarAccent(rawSettings.accent)
  const imageUrl = sanitizeImageUrl(rawSettings.imageUrl ?? rawSettings.url ?? '')
  const updatedAt = String(rawSettings.updatedAt ?? '').trim() || new Date().toISOString()

  if (mode === 'image' && !imageUrl) {
    return {
      ...DEFAULT_AVATAR_SETTINGS,
      updatedAt,
    }
  }

  return {
    mode,
    accent,
    imageUrl: mode === 'image' ? imageUrl : '',
    updatedAt,
  }
}

function hexToRgb(hex) {
  const normalized = String(hex ?? '').trim().replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function toRgba(hex, alpha) {
  const rgb = hexToRgb(hex)
  if (!rgb) return 'rgba(0, 0, 0, 0)'
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}

function resolvePalette(accent, theme) {
  if (accent === 'theme') {
    return {
      background: 'var(--accent-dim2)',
      borderColor: 'rgba(var(--accent-rgb), 0.35)',
      color: 'var(--accent)',
    }
  }

  const palette = AVATAR_ACCENT_PALETTES[accent] || AVATAR_ACCENT_PALETTES.lime
  const tone = theme === 'dark' ? palette.dark : palette.light

  return {
    background: toRgba(tone, theme === 'dark' ? 0.14 : 0.18),
    borderColor: toRgba(tone, 0.34),
    color: tone,
  }
}

export function getAvatarInitials(name) {
  const raw = String(name ?? '').replace(/[@._-]+/g, ' ').trim()
  if (!raw) return '?'

  const parts = raw
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 1) {
    const chunk = parts[0].replace(/[^a-zA-ZÀ-ÿ0-9]/g, '')
    return (chunk.slice(0, 2) || '?').toUpperCase()
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase() || '?'
}

export function describeAvatarSettings(rawSettings) {
  const settings = normalizeAvatarSettings(rawSettings)

  if (settings.mode === 'image') {
    return 'Avatar por imagem externa'
  }

  if (settings.accent === 'theme') {
    return 'Avatar com iniciais seguindo a cor do tema'
  }

  const accentLabel = AVATAR_ACCENT_OPTIONS.find((option) => option.key === settings.accent)?.label || 'Lima'
  return `Avatar com iniciais na cor ${accentLabel.toLowerCase()}`
}

export function resolveAvatarAppearance({ name, settings, theme = 'light' } = {}) {
  const normalized = normalizeAvatarSettings(settings)
  const palette = resolvePalette(normalized.accent, theme)

  return {
    mode: normalized.mode,
    imageUrl: normalized.imageUrl,
    initials: getAvatarInitials(name),
    palette,
    summary: describeAvatarSettings(normalized),
    updatedAt: normalized.updatedAt,
    accent: normalized.accent,
  }
}

export function loadAvatarSettings() {
  const raw = readAvatarSettingsRaw()
  return raw ? normalizeAvatarSettings(raw) : { ...DEFAULT_AVATAR_SETTINGS }
}

export function saveAvatarSettings(settings) {
  if (!canUseStorage()) return null

  const normalized = normalizeAvatarSettings(settings)
  localStorage.setItem(AVATAR_SETTINGS_KEY, JSON.stringify(normalized))
  window.dispatchEvent(new CustomEvent(AVATAR_SETTINGS_UPDATED_EVENT))
  return normalized
}

export function clearAvatarSettings() {
  if (!canUseStorage()) return
  localStorage.removeItem(AVATAR_SETTINGS_KEY)
  window.dispatchEvent(new CustomEvent(AVATAR_SETTINGS_UPDATED_EVENT))
}

export function subscribeAvatarSettings(handler) {
  if (typeof window === 'undefined') return () => {}

  window.addEventListener(AVATAR_SETTINGS_UPDATED_EVENT, handler)
  return () => window.removeEventListener(AVATAR_SETTINGS_UPDATED_EVENT, handler)
}

export function emitAvatarSettingsUpdated() {
  if (!canUseStorage()) return
  window.dispatchEvent(new CustomEvent(AVATAR_SETTINGS_UPDATED_EVENT))
}
