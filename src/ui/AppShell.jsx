import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { ThemeToggleButton } from './ThemeToggleButton.jsx'
import { useAuth } from '../auth/useAuth.js'
import { useAppBusy } from './AppBusyContext.jsx'
import { useTheme } from '../theme/ThemeProvider.jsx'
import { AvatarVisual } from './AvatarVisual.jsx'
import {
  loadAvatarSettings,
  resolveAvatarAppearance,
  subscribeAvatarSettings,
} from '../services/avatarSettings.js'
import { Footer } from './Footer.jsx'

export function AppShell() {
  const { user } = useAuth()
  const { busy } = useAppBusy()
  const { theme, accent } = useTheme()
  const [avatarSettings, setAvatarSettings] = useState(() => loadAvatarSettings())

  useEffect(() => {
    const refresh = () => setAvatarSettings(loadAvatarSettings())
    refresh()
    const unsubscribe = subscribeAvatarSettings(refresh)
    return unsubscribe
  }, [])

  const name = user?.user_metadata?.full_name || user?.email || 'User'
  const avatarAppearance = resolveAvatarAppearance({
    name,
    settings: avatarSettings,
    theme,
    accent,
  })

  return (
    <>
      <nav className="nav">
        <NavLink to="/home" className="nav-logo">
          Áp<em>i</em>ce
        </NavLink>
        <div className="nav-center">
          <NavLink to="/home" className={({ isActive }) => `nav-link-desktop${isActive ? ' active' : ''}`}>Início</NavLink>
          <NavLink to="/corretor" className={({ isActive }) => `nav-link-desktop${isActive ? ' active' : ''}`}>Corretor</NavLink>
          <NavLink to="/radar" className={({ isActive }) => `nav-link-desktop${isActive ? ' active' : ''}`}>Radar</NavLink>
          <NavLink to="/conquistas" className={({ isActive }) => `nav-link-desktop${isActive ? ' active' : ''}`}>Conquistas</NavLink>
        </div>
        <div className="nav-right">
          <ThemeToggleButton />
          <NavLink
            to="/perfil"
            className="nav-avatar"
            aria-label={`Perfil · ${avatarAppearance.summary}`}
            title={avatarAppearance.summary}
            style={avatarAppearance.palette}
          >
            <AvatarVisual
              key={`${avatarAppearance.mode}|${avatarAppearance.accent}|${avatarAppearance.imageUrl}|${avatarAppearance.updatedAt}`}
              appearance={avatarAppearance}
            />
          </NavLink>
        </div>
      </nav>

      <main className="main">
        <Outlet />
      </main>
      <Footer />

      {busy && (
        <div className="app-busy-overlay" role="status" aria-live="polite" aria-busy="true">
          <div className="app-busy-card">
            <div className="app-busy-spinner" aria-hidden="true" />
            <strong>Processando IA</strong>
            <span>Não troque de tela até a resposta terminar.</span>
          </div>
        </div>
      )}

      <nav className="bottom-tab" aria-label="Navegação principal">
        <TabLink to="/home" label="Início" icon="home" />
        <TabLink to="/corretor" label="Corretor" icon="edit" />
        <TabLink to="/radar" label="Radar" icon="radar" />
        <TabLink to="/conquistas" label="Conquistas" icon="trophy" />
        <TabLink to="/perfil" label="Perfil" icon="user" />
      </nav>
    </>
  )
}

function TabLink({ to, label, icon }) {
  return (
    <NavLink to={to} className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}>
      <div className="tab-icon">{iconSvg(icon)}</div>
      <div className="tab-label">{label}</div>
    </NavLink>
  )
}

function iconSvg(kind) {
  switch (kind) {
    case 'home':
      return (
        <svg viewBox="0 0 24 24">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      )
    case 'edit':
      return (
        <svg viewBox="0 0 24 24">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      )
    case 'radar':
      return (
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="2" />
          <path d="M16.24 7.76a6 6 0 010 8.49m-8.48-.01a6 6 0 010-8.49m11.31-2.82a10 10 0 010 14.14m-14.14 0a10 10 0 010-14.14" />
        </svg>
      )
    case 'trophy':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
      )
    case 'user':
      return (
        <svg viewBox="0 0 24 24">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )
    default:
      return <svg viewBox="0 0 24 24" />
  }
}
