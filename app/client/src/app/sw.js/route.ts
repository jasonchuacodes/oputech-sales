const buildVersion = process.env.APP_BUILD_VERSION ?? 'development'

const serviceWorkerSource = `
const CACHE_PREFIX = 'oputech-sales-'
const CACHE_VERSION = ${JSON.stringify(buildVersion)}
const SHELL_CACHE = \`\${CACHE_PREFIX}shell-\${CACHE_VERSION}\`
const RUNTIME_CACHE = \`\${CACHE_PREFIX}runtime-\${CACHE_VERSION}\`
const PRECACHE_ASSETS = ['/login', '/assets/brand/mark.svg']
const RUNTIME_DESTINATIONS = new Set(['font', 'image', 'script', 'style', 'worker'])

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE_ASSETS))
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith(CACHE_PREFIX) &&
                key !== SHELL_CACHE &&
                key !== RUNTIME_CACHE
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

const isCacheable = (response) => response.ok && response.type !== 'opaque'

const cacheFirst = async (request) => {
  const cached = await caches.match(request)
  if (cached) return cached

  const response = await fetch(request)
  if (isCacheable(response)) {
    const copy = response.clone()
    void caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy))
  }
  return response
}

const networkFirst = async (request, navigationFallback = false) => {
  try {
    const response = await fetch(request)
    if (isCacheable(response)) {
      const copy = response.clone()
      void caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy))
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    if (navigationFallback) {
      const login = await caches.match('/login')
      if (login) return login
    }
    return new Response('Offline', { status: 503, statusText: 'Offline' })
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)

  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    url.pathname === '/graphql' ||
    url.pathname.startsWith('/_next/webpack-hmr')
  ) return

  // RSC payloads depend on router state and build internals. Caching them by URL
  // can replay incompatible trees after a deployment, so let Next fetch them.
  if (url.searchParams.has('_rsc') || request.headers.get('RSC') === '1') return

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request))
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, true))
    return
  }

  if (RUNTIME_DESTINATIONS.has(request.destination)) {
    event.respondWith(networkFirst(request))
  }
})
`

export const dynamic = 'force-static'

export const GET = () =>
  new Response(serviceWorkerSource, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'",
      'Content-Type': 'application/javascript; charset=utf-8',
    },
  })
