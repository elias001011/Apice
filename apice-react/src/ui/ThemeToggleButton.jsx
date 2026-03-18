import { useTheme } from '../theme/ThemeProvider.jsx'

export function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      className="nav-icon-btn"
      type="button"
      aria-label="Alternar tema"
      title="Alternar tema"
      onClick={toggleTheme}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return
        e.preventDefault()
        toggleTheme()
      }}
    >
      <span className="icon-moon" style={{ display: isDark ? 'none' : 'inline-flex' }}>
        <svg viewBox="0 0 24 24">
          <path d="M21 12.8A8.5 8.5 0 1111.2 3a6.5 6.5 0 009.8 9.8z" />
        </svg>
      </span>
      <span className="icon-sun" style={{ display: isDark ? 'inline-flex' : 'none' }}>
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      </span>
    </button>
  )
}

