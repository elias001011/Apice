const CACHE_NAME = 'apice-pwa-v1.4'
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest?v=1.4',
  '/manifest.webmanifest',
  '/favicon-arrow.svg',
  '/favicon.svg',
  '/Icon.svg',
  '/Icon-192.png',
  '/Icon-512.png',
  '/apple-touch-icon.png',
]
const BYPASS_PATH_PREFIXES = ['/src/', '/@vite/', '/@react-refresh', '/@fs/', '/@id/', '/node_modules/']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key !== CACHE_NAME)
        .map((key) => caches.delete(key)),
    )).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const requestUrl = new URL(event.request.url)
  if (requestUrl.origin !== self.location.origin) return

  const pathname = requestUrl.pathname
  if (BYPASS_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return
  if (pathname.endsWith('.map')) return

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html')),
    )
    return
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached

      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response
        }

        const responseClone = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone))
        return response
      }).catch(() => cached)
    }),
  )
})
