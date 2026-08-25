(() => {
  try {
    const savedContainerSize = localStorage.getItem('apice:containerSize')
    const savedLayoutMode = localStorage.getItem('apice:layoutMode')
    const savedAnimations = localStorage.getItem('apice:animationsEnabled')
    const savedCardHover = localStorage.getItem('apice:cardHoverEffects')
    const savedTheme = localStorage.getItem('apice:theme')
    const savedAccent = localStorage.getItem('apice:accent')
    const validContainerSize = savedContainerSize === 'md' || savedContainerSize === 'lg'
      ? savedContainerSize
      : 'sm'
    const layoutMode = savedLayoutMode === 'compact' ? 'compact' : 'comfortable'
    const mobileLayout = window.matchMedia('(max-width: 767px)').matches
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    const systemAnimationsEnabled = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const theme = savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : systemTheme
    const animationsEnabled = savedAnimations === null ? systemAnimationsEnabled : savedAnimations === 'true'
    const cardHoverEffects = savedCardHover === null ? !mobileLayout : savedCardHover === 'true'
    const accentColors = {
      lime: { light: '#b8e84f', dark: '#c8f060' },
      blue: { light: '#4faaf0', dark: '#60c8f0' },
      purple: { light: '#a84ff0', dark: '#c060f0' },
      orange: { light: '#f09a4f', dark: '#f0b860' },
      red: { light: '#f04f4f', dark: '#f06060' },
      cyan: { light: '#4ff0d6', dark: '#60f0d8' },
      pink: { light: '#f04fbc', dark: '#f060d8' },
    }
    const accentKey = Object.prototype.hasOwnProperty.call(accentColors, savedAccent) ? savedAccent : 'lime'
    const accentColor = accentColors[accentKey][theme]
    const buildFaviconHref = (accent) => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
          <polyline points="3 17 9 11 13 15 21 7" stroke="${accent}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
          <polyline points="14 7 21 7 21 14" stroke="${accent}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      `
      return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
    }
    const html = document.documentElement
    html.setAttribute('data-layout-size', mobileLayout ? 'sm' : validContainerSize)
    html.classList.toggle('layout-compact', layoutMode === 'compact')
    html.setAttribute('data-mobile-layout', mobileLayout ? 'true' : 'false')
    html.setAttribute('data-animations', animationsEnabled ? 'on' : 'off')
    html.setAttribute('data-card-hover', cardHoverEffects ? 'on' : 'off')
    html.setAttribute('data-layout-ready', 'false')
    if (theme === 'dark') html.setAttribute('data-theme', 'dark')
    else html.removeAttribute('data-theme')
    html.style.colorScheme = theme
    const themeMeta = document.querySelector('meta[name="theme-color"]')
    if (themeMeta) themeMeta.setAttribute('content', '#000000')
    const faviconLink = document.querySelector('link[rel="icon"]')
    if (faviconLink) {
      faviconLink.setAttribute('type', 'image/svg+xml')
      faviconLink.setAttribute('href', buildFaviconHref(accentColor))
    }
  } catch {
    // Preferências inválidas não devem impedir a inicialização do app.
  }
})()
