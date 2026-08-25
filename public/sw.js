const CACHE_NAME = 'apice-pwa-v2.6'
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/favicon-arrow.svg',
  '/favicon.svg',
  '/Icon-192.png',
  '/Icon-512.png',
  '/apple-touch-icon.png',
]
const BYPASS_PATH_PREFIXES = [
  '/.netlify/functions/',
  '/.netlify/identity/',
  '/src/',
  '/@vite/',
  '/@react-refresh',
  '/@fs/',
  '/@id/',
  '/node_modules/',
]
const CACHEABLE_DESTINATIONS = new Set(['font', 'image', 'script', 'style'])

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

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CLEAR_APICE_CACHES') return

  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key.startsWith('apice-pwa-'))
        .map((key) => caches.delete(key)),
    )),
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const requestUrl = new URL(event.request.url)
  if (requestUrl.origin !== self.location.origin) return

  const pathname = requestUrl.pathname
  if (BYPASS_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return
  if (event.request.headers.has('authorization')) return
  if (pathname.endsWith('.map')) return

  if (pathname === '/manifest.webmanifest') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()))
          }
          return response
        })
        .catch(() => caches.match(event.request, { ignoreSearch: true })),
    )
    return
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html')),
    )
    return
  }

  if (!CACHEABLE_DESTINATIONS.has(event.request.destination)) return

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached

      return fetch(event.request).then((response) => {
        const cacheControl = response?.headers?.get('cache-control') || ''
        if (
          !response
          || response.status !== 200
          || response.type === 'opaque'
          || /(?:no-store|private)/i.test(cacheControl)
        ) {
          return response
        }

        const responseClone = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone))
        return response
      }).catch(() => cached)
    }),
  )
})
