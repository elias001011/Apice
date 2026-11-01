import { useTheme } from '../theme/ThemeProvider.jsx'

export function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const label = isDark ? 'Mudar para o tema claro' : 'Mudar para o tema escuro'

  return (
    <button
      className="nav-icon-btn"
      type="button"
      aria-label={label}
      title={label}
      onClick={toggleTheme}
    >
      <span className="theme-icon" aria-hidden="true">
        <svg className="icon-moon" viewBox="0 0 24 24">
          <path d="M21 12.8A8.5 8.5 0 1111.2 3a6.5 6.5 0 009.8 9.8z" />
        </svg>
        <svg className="icon-sun" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      </span>
    </button>
  )
}
