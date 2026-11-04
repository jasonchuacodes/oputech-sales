const CACHE_NAME = 'oputech-sales-shell-v1'
const STATIC_ASSETS = ['/login', '/assets/brand/mark.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    url.pathname === '/graphql' ||
    url.pathname.startsWith('/_next/webpack-hmr')
  ) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (
          response.ok &&
          (url.pathname.startsWith('/_next/static/') ||
            event.request.mode === 'navigate' ||
            url.searchParams.has('_rsc'))
        ) {
          const copy = response.clone()
          void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
        }
        return response
      })
      .catch(async () => {
        const cached = await caches.match(event.request)
        if (cached) return cached
        if (event.request.mode === 'navigate') return caches.match('/login')
        return new Response('Offline', { status: 503, statusText: 'Offline' })
      })
  )
})
