/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY_THEME = 'apice:theme'
const STORAGE_KEY_ACCENT = 'apice:accent'
const STORAGE_KEY_FONT = 'apice:font'
const STORAGE_KEY_FONT_FAMILY = 'apice:fontFamily'
const STORAGE_KEY_LAYOUT = 'apice:layoutMode'
const STORAGE_KEY_CONTAINER_SIZE = 'apice:containerSize'
const STORAGE_KEY_ANIMATIONS = 'apice:animationsEnabled'
const STORAGE_KEY_CARD_HOVER = 'apice:cardHoverEffects'
const STORAGE_KEY_VISUAL_EFFECTS = 'apice:visualEffects'
const STORAGE_KEY_CARD_GRADIENTS = 'apice:cardGradients'
const MOBILE_LAYOUT_QUERY = '(max-width: 767px)'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

const VALID_CONTAINER_SIZES = new Set(['sm', 'md', 'lg'])

function readSaved(key, defaultVal) {
  try {
    const v = localStorage.getItem(key)
    if (v) return v
  } catch {
    // ignore
  }
  return defaultVal
}

function readSavedBoolean(key, defaultVal) {
  try {
    const v = localStorage.getItem(key)
    if (v === null) return defaultVal
    return v === 'true'
  } catch {
    return defaultVal
  }
}

function getSystemTheme() {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light'
}

function getSystemAnimationsEnabled() {
  if (typeof window === 'undefined') return true
  return !(window.matchMedia?.(REDUCED_MOTION_QUERY)?.matches ?? false)
}

function getIsMobileLayout() {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.(MOBILE_LAYOUT_QUERY)?.matches ?? false
}

function normalizeContainerSize(size) {
  return VALID_CONTAINER_SIZES.has(size) ? size : 'sm'
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

const ACCENT_COLORS = {
  lime: {
    light: { base: '#b8e84f', rgb: '184, 232, 79', hover: '#9ed634', dim: 'rgba(184, 232, 79, 0.14)', dim2: 'rgba(184, 232, 79, 0.22)' },
    dark: { base: '#c8f060', rgb: '200, 240, 96', hover: '#a8d040', dim: 'rgba(200, 240, 96, 0.08)', dim2: 'rgba(200, 240, 96, 0.15)' }
  },
  blue: {
    light: { base: '#4faaf0', rgb: '79, 170, 240', hover: '#3488d6', dim: 'rgba(79, 170, 240, 0.14)', dim2: 'rgba(79, 170, 240, 0.22)' },
    dark: { base: '#60c8f0', rgb: '96, 200, 240', hover: '#40a8d0', dim: 'rgba(96, 200, 240, 0.08)', dim2: 'rgba(96, 200, 240, 0.15)' }
  },
  purple: {
    light: { base: '#a84ff0', rgb: '168, 79, 240', hover: '#8a34d6', dim: 'rgba(168, 79, 240, 0.14)', dim2: 'rgba(168, 79, 240, 0.22)' },
    dark: { base: '#c060f0', rgb: '192, 96, 240', hover: '#a040d0', dim: 'rgba(192, 96, 240, 0.08)', dim2: 'rgba(192, 96, 240, 0.15)' }
  },
  orange: {
    light: { base: '#f09a4f', rgb: '240, 154, 79', hover: '#d67a34', dim: 'rgba(240, 154, 79, 0.14)', dim2: 'rgba(240, 154, 79, 0.22)' },
    dark: { base: '#f0b860', rgb: '240, 184, 96', hover: '#d09840', dim: 'rgba(240, 184, 96, 0.08)', dim2: 'rgba(240, 184, 96, 0.15)' }
  },
  red: {
    light: { base: '#f04f4f', rgb: '240, 79, 79', hover: '#d63434', dim: 'rgba(240, 79, 79, 0.14)', dim2: 'rgba(240, 79, 79, 0.22)' },
    dark: { base: '#f06060', rgb: '240, 96, 96', hover: '#d04040', dim: 'rgba(240, 96, 96, 0.08)', dim2: 'rgba(240, 96, 96, 0.15)' }
  },
  cyan: {
    light: { base: '#4ff0d6', rgb: '79, 240, 214', hover: '#34d6bc', dim: 'rgba(79, 240, 214, 0.14)', dim2: 'rgba(79, 240, 214, 0.22)' },
    dark: { base: '#60f0d8', rgb: '96, 240, 216', hover: '#40d0b8', dim: 'rgba(96, 240, 216, 0.08)', dim2: 'rgba(96, 240, 216, 0.15)' }
  },
  pink: {
    light: { base: '#f04fbc', rgb: '240, 79, 188', hover: '#d634a0', dim: 'rgba(240, 79, 188, 0.14)', dim2: 'rgba(240, 79, 188, 0.22)' },
    dark: { base: '#f060d8', rgb: '240, 96, 216', hover: '#d040b8', dim: 'rgba(240, 96, 216, 0.08)', dim2: 'rgba(240, 96, 216, 0.15)' }
  }
}

export const FONT_FAMILIES = {
  'dm-sans': { label: 'DM Sans', value: "'DM Sans', sans-serif", google: null },
  'inter': { label: 'Inter', value: "'Inter', sans-serif", google: 'Inter:wght@300;400;500;600' },
  'roboto': { label: 'Roboto', value: "'Roboto', sans-serif", google: 'Roboto:wght@300;400;500;700' },
}

function applyFontFamily(fontFamily) {
  const ff = FONT_FAMILIES[fontFamily] || FONT_FAMILIES['dm-sans']
  document.body.style.fontFamily = ff.value

  // Load Google Font if needed
  if (ff.google) {
    const id = `gfont-${fontFamily}`
    if (!document.getElementById(id)) {
      const link = document.createElement('link')
      link.id = id
      link.rel = 'stylesheet'
      link.href = `https://fonts.googleapis.com/css2?family=${ff.google}&display=swap`
      document.head.appendChild(link)
    }
  }
}

function buildFaviconDataUri(theme, accent) {
  const safeAccent = ACCENT_COLORS[accent] ? accent : 'lime'
  const colors = ACCENT_COLORS[safeAccent][theme === 'dark' ? 'dark' : 'light']
  const stroke = colors.base
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <polyline points="3 17 9 11 13 15 21 7" stroke="${stroke}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
      <polyline points="14 7 21 7 21 14" stroke="${stroke}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `.trim()

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function updateBrandAssets(theme, accent) {
  if (typeof document === 'undefined') return

  const safeAccent = ACCENT_COLORS[accent] ? accent : 'lime'
  const faviconHref = buildFaviconDataUri(theme, safeAccent)

  const iconLinks = document.querySelectorAll('link[rel~="icon"]')
  if (iconLinks.length > 0) {
    iconLinks.forEach((link) => {
      link.href = faviconHref
    })
  } else {
    const link = document.createElement('link')
    link.rel = 'icon'
    link.type = 'image/svg+xml'
    link.href = faviconHref
    document.head.appendChild(link)
  }

  let themeMeta = document.querySelector('meta[name="theme-color"]')
  if (!themeMeta) {
    themeMeta = document.createElement('meta')
    themeMeta.name = 'theme-color'
    document.head.appendChild(themeMeta)
  }
  themeMeta.setAttribute('content', '#000000')
}

function applyLayoutToDom(layoutMode) {
  const html = document.documentElement
  if (layoutMode === 'compact') {
    html.classList.add('layout-compact')
  } else {
    html.classList.remove('layout-compact')
  }
}

function applyUiPreferencesToDom(animationsEnabled, cardHoverEffects, visualEffects, cardGradientsEnabled) {
  const html = document.documentElement
  html.setAttribute('data-animations', animationsEnabled ? 'on' : 'off')
  html.setAttribute('data-card-hover', cardHoverEffects ? 'on' : 'off')
  html.setAttribute('data-fx', visualEffects || 'gradients')
  html.setAttribute('data-card-gradients', cardGradientsEnabled ? 'on' : 'off')
}

function applyThemeToDom(theme, accent, fontSize, fontFamily, containerSize) {
  const html = document.documentElement
  if (theme === 'dark') html.setAttribute('data-theme', 'dark')
  else html.removeAttribute('data-theme')
  html.style.colorScheme = theme === 'dark' ? 'dark' : 'light'
  
  html.setAttribute('data-font', fontSize || 'md')
  html.setAttribute('data-layout-size', normalizeContainerSize(containerSize))

  const safeAccent = ACCENT_COLORS[accent] ? accent : 'lime'
  const colors = ACCENT_COLORS[safeAccent][theme === 'dark' ? 'dark' : 'light']

  html.style.setProperty('--accent', colors.base)
  html.style.setProperty('--accent-rgb', colors.rgb)
  html.style.setProperty('--accent2', colors.hover)
  html.style.setProperty('--accent-dim', colors.dim)
  html.style.setProperty('--accent-dim2', colors.dim2)

  applyFontFamily(fontFamily || 'dm-sans')
  updateBrandAssets(theme, safeAccent)
}

function syncThemeFromStorage(
  setTheme,
  setAccent,
  setFontSize,
  setFontFamily,
  setLayoutMode,
  setContainerSize,
  setAnimationsEnabled,
  setCardHoverEffects,
  setVisualEffects,
  setCardGradientsEnabled,
) {
  setTheme(readSaved(STORAGE_KEY_THEME, getSystemTheme()))
  setAccent(readSaved(STORAGE_KEY_ACCENT, 'lime'))
  setFontSize(readSaved(STORAGE_KEY_FONT, 'md'))
  setFontFamily(readSaved(STORAGE_KEY_FONT_FAMILY, 'dm-sans'))
  setLayoutMode(readSaved(STORAGE_KEY_LAYOUT, 'comfortable'))
  setContainerSize(readSaved(STORAGE_KEY_CONTAINER_SIZE, 'sm'))
  setAnimationsEnabled(readSavedBoolean(STORAGE_KEY_ANIMATIONS, getSystemAnimationsEnabled()))
  setCardHoverEffects(readSavedBoolean(STORAGE_KEY_CARD_HOVER, !getIsMobileLayout()))
  setVisualEffects(readSaved(STORAGE_KEY_VISUAL_EFFECTS, 'gradients'))
  setCardGradientsEnabled(readSavedBoolean(STORAGE_KEY_CARD_GRADIENTS, false))
}

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => getSystemTheme())
  const [accent, setAccent] = useState(() => readSaved(STORAGE_KEY_ACCENT, 'lime'))
  const [fontSize, setFontSize] = useState(() => readSaved(STORAGE_KEY_FONT, 'md'))
  const [fontFamily, setFontFamily] = useState(() => readSaved(STORAGE_KEY_FONT_FAMILY, 'dm-sans'))
  const [layoutMode, setLayoutMode] = useState(() => readSaved(STORAGE_KEY_LAYOUT, 'comfortable'))
  const [containerSize, setContainerSize] = useState(() => readSaved(STORAGE_KEY_CONTAINER_SIZE, 'sm'))
  const [animationsEnabled, setAnimationsEnabled] = useState(() => readSavedBoolean(STORAGE_KEY_ANIMATIONS, getSystemAnimationsEnabled()))
  const [cardHoverEffects, setCardHoverEffects] = useState(() => readSavedBoolean(STORAGE_KEY_CARD_HOVER, !getIsMobileLayout()))
  const [visualEffects, setVisualEffects] = useState(() => readSaved(STORAGE_KEY_VISUAL_EFFECTS, 'gradients'))
  const [cardGradientsEnabled, setCardGradientsEnabled] = useState(() => readSavedBoolean(STORAGE_KEY_CARD_GRADIENTS, false))
  const [isMobileLayout, setIsMobileLayout] = useState(() => getIsMobileLayout())
  const resolvedContainerSize = isMobileLayout ? 'sm' : normalizeContainerSize(containerSize)

  useEffect(() => {
    applyThemeToDom(theme, accent, fontSize, fontFamily, resolvedContainerSize)
    applyUiPreferencesToDom(animationsEnabled, cardHoverEffects, visualEffects, cardGradientsEnabled)
    applyLayoutToDom(layoutMode)
    try {
      localStorage.setItem(STORAGE_KEY_THEME, theme)
      localStorage.setItem(STORAGE_KEY_ACCENT, accent)
      localStorage.setItem(STORAGE_KEY_FONT, fontSize)
      localStorage.setItem(STORAGE_KEY_FONT_FAMILY, fontFamily)
      localStorage.setItem(STORAGE_KEY_LAYOUT, layoutMode)
      localStorage.setItem(STORAGE_KEY_CONTAINER_SIZE, containerSize)
      localStorage.setItem(STORAGE_KEY_ANIMATIONS, String(animationsEnabled))
      localStorage.setItem(STORAGE_KEY_CARD_HOVER, String(cardHoverEffects))
      localStorage.setItem(STORAGE_KEY_VISUAL_EFFECTS, visualEffects)
      localStorage.setItem(STORAGE_KEY_CARD_GRADIENTS, String(cardGradientsEnabled))
      window.dispatchEvent(new CustomEvent('apice:theme-updated'))
    } catch {
      // ignore
    }
  }, [theme, accent, fontSize, fontFamily, layoutMode, resolvedContainerSize, containerSize, animationsEnabled, cardHoverEffects, visualEffects, cardGradientsEnabled])

  useEffect(() => {
    const refresh = () => syncThemeFromStorage(
      setTheme,
      setAccent,
      setFontSize,
      setFontFamily,
      setLayoutMode,
      setContainerSize,
      setAnimationsEnabled,
      setCardHoverEffects,
      setVisualEffects,
      setCardGradientsEnabled,
    )

    window.addEventListener('apice:theme-updated', refresh)
    window.addEventListener('apice:account-state-updated', refresh)

    return () => {
      window.removeEventListener('apice:theme-updated', refresh)
      window.removeEventListener('apice:account-state-updated', refresh)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const mediaQuery = window.matchMedia?.(MOBILE_LAYOUT_QUERY) || null
    const refreshMobileLayout = () => setIsMobileLayout(Boolean(mediaQuery?.matches))

    refreshMobileLayout()
    const detachMediaQuery = attachMediaQueryListener(mediaQuery, refreshMobileLayout)

    return detachMediaQuery
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return

    document.documentElement.setAttribute('data-mobile-layout', isMobileLayout ? 'true' : 'false')
  }, [isMobileLayout])

  useEffect(() => {
    const html = document.documentElement
    const readyFrame = window.requestAnimationFrame(() => {
      html.setAttribute('data-layout-ready', 'true')
    })

    return () => window.cancelAnimationFrame(readyFrame)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  const value = useMemo(() => ({
    theme, setTheme, toggleTheme,
    accent, setAccent,
    fontSize, setFontSize,
    fontFamily, setFontFamily,
    layoutMode, setLayoutMode,
    containerSize, setContainerSize,
    animationsEnabled, setAnimationsEnabled,
    cardHoverEffects, setCardHoverEffects,
    visualEffects, setVisualEffects,
    cardGradientsEnabled, setCardGradientsEnabled,
    isMobileLayout,
    resolvedContainerSize,
  }), [theme, toggleTheme, accent, fontSize, fontFamily, layoutMode, containerSize, animationsEnabled, cardHoverEffects, visualEffects, cardGradientsEnabled, isMobileLayout, resolvedContainerSize])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme deve ser usado dentro de ThemeProvider')
  return ctx
}
