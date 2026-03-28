import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/global.css'
import App from './App.jsx'
import { ThemeProvider } from './theme/ThemeProvider.jsx'
import { AuthProvider } from './auth/AuthProvider.jsx'
import { AppBusyProvider } from './ui/AppBusyContext.jsx'
import { PwaInstallProvider } from './pwa/PwaInstallProvider.jsx'

const isLocalDevHost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
const shouldRegisterServiceWorker = import.meta.env.PROD

if ('serviceWorker' in navigator && shouldRegisterServiceWorker) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Service worker registration failed:', error)
    })
  })
} else if ('serviceWorker' in navigator && isLocalDevHost) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        void registration.unregister()
      })
    }).catch((error) => {
      console.warn('Service worker cleanup failed:', error)
    })

    if ('caches' in window) {
      void caches.keys().then((keys) => Promise.all(
        keys.filter((key) => key.startsWith('apice-pwa-')).map((key) => caches.delete(key)),
      )).catch((error) => {
        console.warn('Cache cleanup failed:', error)
      })
    }
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <PwaInstallProvider>
          <AuthProvider>
            <AppBusyProvider>
              <App />
            </AppBusyProvider>
          </AuthProvider>
        </PwaInstallProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
