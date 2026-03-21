import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY_THEME = 'apice:theme'
const STORAGE_KEY_ACCENT = 'apice:accent'
const STORAGE_KEY_FONT = 'apice:font'

function readSaved(key, defaultVal) {
  try {
    const v = localStorage.getItem(key)
    if (v) return v
  } catch {
    // ignore
  }
  return defaultVal
}

const ACCENT_COLORS = {
  lime: {
    light: { base: '#b8e84f', hover: '#9ed634', dim: 'rgba(184, 232, 79, 0.14)', dim2: 'rgba(184, 232, 79, 0.22)' },
    dark: { base: '#c8f060', hover: '#a8d040', dim: 'rgba(200, 240, 96, 0.08)', dim2: 'rgba(200, 240, 96, 0.15)' }
  },
  blue: {
    light: { base: '#4faaf0', hover: '#3488d6', dim: 'rgba(79, 170, 240, 0.14)', dim2: 'rgba(79, 170, 240, 0.22)' },
    dark: { base: '#60c8f0', hover: '#40a8d0', dim: 'rgba(96, 200, 240, 0.08)', dim2: 'rgba(96, 200, 240, 0.15)' }
  },
  purple: {
    light: { base: '#a84ff0', hover: '#8a34d6', dim: 'rgba(168, 79, 240, 0.14)', dim2: 'rgba(168, 79, 240, 0.22)' },
    dark: { base: '#c060f0', hover: '#a040d0', dim: 'rgba(192, 96, 240, 0.08)', dim2: 'rgba(192, 96, 240, 0.15)' }
  },
  orange: {
    light: { base: '#f09a4f', hover: '#d67a34', dim: 'rgba(240, 154, 79, 0.14)', dim2: 'rgba(240, 154, 79, 0.22)' },
    dark: { base: '#f0b860', hover: '#d09840', dim: 'rgba(240, 184, 96, 0.08)', dim2: 'rgba(240, 184, 96, 0.15)' }
  },
  red: {
    light: { base: '#f04f4f', hover: '#d63434', dim: 'rgba(240, 79, 79, 0.14)', dim2: 'rgba(240, 79, 79, 0.22)' },
    dark: { base: '#f06060', hover: '#d04040', dim: 'rgba(240, 96, 96, 0.08)', dim2: 'rgba(240, 96, 96, 0.15)' }
  },
  cyan: {
    light: { base: '#4ff0d6', hover: '#34d6bc', dim: 'rgba(79, 240, 214, 0.14)', dim2: 'rgba(79, 240, 214, 0.22)' },
    dark: { base: '#60f0d8', hover: '#40d0b8', dim: 'rgba(96, 240, 216, 0.08)', dim2: 'rgba(96, 240, 216, 0.15)' }
  },
  pink: {
    light: { base: '#f04fbc', hover: '#d634a0', dim: 'rgba(240, 79, 188, 0.14)', dim2: 'rgba(240, 79, 188, 0.22)' },
    dark: { base: '#f060d8', hover: '#d040b8', dim: 'rgba(240, 96, 216, 0.08)', dim2: 'rgba(240, 96, 216, 0.15)' }
  }
}

function applyThemeToDom(theme, accent, fontSize) {
  const html = document.documentElement
  if (theme === 'dark') html.setAttribute('data-theme', 'dark')
  else html.removeAttribute('data-theme')
  
  html.setAttribute('data-font', fontSize || 'md')

  const safeAccent = ACCENT_COLORS[accent] ? accent : 'lime'
  const colors = ACCENT_COLORS[safeAccent][theme === 'dark' ? 'dark' : 'light']

  if (safeAccent === 'lime') {
    html.style.removeProperty('--accent')
    html.style.removeProperty('--accent2')
    html.style.removeProperty('--accent-dim')
    html.style.removeProperty('--accent-dim2')
  } else {
    html.style.setProperty('--accent', colors.base)
    html.style.setProperty('--accent2', colors.hover)
    html.style.setProperty('--accent-dim', colors.dim)
    html.style.setProperty('--accent-dim2', colors.dim2)
  }
}

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => readSaved(STORAGE_KEY_THEME, 'light'))
  const [accent, setAccent] = useState(() => readSaved(STORAGE_KEY_ACCENT, 'lime'))
  const [fontSize, setFontSize] = useState(() => readSaved(STORAGE_KEY_FONT, 'md'))

  useEffect(() => {
    applyThemeToDom(theme, accent, fontSize)
    try {
      localStorage.setItem(STORAGE_KEY_THEME, theme)
      localStorage.setItem(STORAGE_KEY_ACCENT, accent)
      localStorage.setItem(STORAGE_KEY_FONT, fontSize)
    } catch {
      // ignore
    }
  }, [theme, accent])

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  const value = useMemo(() => ({ theme, setTheme, toggleTheme, accent, setAccent, fontSize, setFontSize }), [theme, toggleTheme, accent, fontSize])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme deve ser usado dentro de ThemeProvider')
  return ctx
}

