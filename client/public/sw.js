/**
 * Service Worker for jack — Progressive Web App
 * 
 * Caching strategy:
 * - App shell (HTML, CSS, JS): cache-first (update on reload)
 * - API responses (/api/notes*): network-first with fallback to IndexedDB
 * - Images: network-first with fallback to IndexedDB
 * - Static assets: cache-first
 * 
 * Offline: Users see cached notes and images. Writes blocked until online.
 */

const CACHE_VERSION = 'v1';
const SHELL_CACHE = `jack-shell-${CACHE_VERSION}`;
const ASSET_CACHE = `jack-assets-${CACHE_VERSION}`;

// Critical app shell files to cache on install
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/src/main.jsx',
  '/src/App.jsx',
  '/src/api.js',
  '/src/db.js',
  '/src/styles.css',
  '/src/tokens.css',
];

// Install: cache app shell
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(SHELL_ASSETS).catch((err) => {
          // Graceful: some assets may 404 in dev, don't fail
          console.warn('[SW] Some shell assets failed to cache:', err.message);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.map((name) => {
          if (
            name !== SHELL_CACHE &&
            name !== ASSET_CACHE &&
            (name.startsWith('jack-') || name.startsWith('jack-shell-') || name.startsWith('jack-assets-'))
          ) {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Handle requests with network-first strategy for API, cache-first for shell
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests
  if (request.method !== 'GET') {
    return;
  }

  // API requests: network-first, fallback to IndexedDB for notes
  if (url.pathname.startsWith('/api/notes')) {
    return event.respondWith(networkFirstAPI(request));
  }

  // Image files: network-first with fallback
  if (
    url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i) ||
    url.pathname.startsWith('/api/notes/') ||
    url.pathname.startsWith('/uploads/')
  ) {
    return event.respondWith(networkFirstImage(request));
  }

  // App shell & static assets: cache-first
  if (url.pathname === '/' || url.pathname === '/index.html') {
    return event.respondWith(cacheFirst(request, SHELL_CACHE));
  }

  // Everything else: network-first with cache fallback
  return event.respondWith(networkFirst(request, ASSET_CACHE));
});

/**
 * Cache-first: return from cache, fall back to network
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    console.log('[SW] Cache hit:', request.url);
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    console.warn('[SW] Fetch failed for', request.url, err.message);
    return new Response('Offline – resource not cached', { status: 503 });
  }
}

/**
 * Network-first: try network, fall back to cache
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    console.warn('[SW] Offline, using cache for', request.url);
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    return new Response('Offline – resource not cached', { status: 503 });
  }
}

/**
 * API network-first: fetch notes from network, fall back to IndexedDB.
 * This is the critical path for /api/notes/* endpoints.
 */
async function networkFirstAPI(request) {
  const url = new URL(request.url);

  // Try network first
  try {
    const response = await fetch(request);
    if (response.ok) {
      return response;
    }
    // Network failed with error status; fall through to cache/IndexedDB
  } catch (err) {
    console.log('[SW] API offline, falling back to IndexedDB:', url.pathname);
  }

  // Fall back: try to serve from IndexedDB
  if (url.pathname === '/api/notes' || url.pathname === '/api/notes/') {
    // GET /api/notes — return cached notes
    return handleNotesListOffline(request);
  }

  if (url.pathname.match(/^\/api\/notes\/\d+$/)) {
    // GET /api/notes/:id — return single note
    return handleNotesDetailOffline(request);
  }

  // For POST/PUT/DELETE on notes: offline writes not supported yet
  // Return 503 indicating sync needed
  return new Response(
    JSON.stringify({
      error: 'Offline: writes not supported. Please reconnect.',
    }),
    {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Network-first for images: serve from network, fall back to cached response
 */
async function networkFirstImage(request) {
  const cache = await caches.open(ASSET_CACHE);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    console.log('[SW] Image offline, using cache:', request.url);
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    // Return a blank image placeholder
    return new Response(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      {
        headers: { 'Content-Type': 'image/png' },
      }
    );
  }
}

/**
 * Offline handler for GET /api/notes — return cached notes from IndexedDB
 */
async function handleNotesListOffline(request) {
  try {
    // Import db module dynamically
    const { getAllNotes, searchNotes } = await import('./db.js');
    const url = new URL(request.url);

    // Parse query params
    const search = url.searchParams.get('search') || '';
    const subject = url.searchParams.get('subject') || '';
    const tag = url.searchParams.get('tag') || '';

    // Use IndexedDB search
    const notes = tag || subject || search ? await searchNotes(search, subject, tag) : await getAllNotes();

    return new Response(JSON.stringify({ notes }), {
      headers: { 'Content-Type': 'application/json', 'X-Source': 'IndexedDB' },
    });
  } catch (err) {
    console.error('[SW] Error serving notes from IndexedDB:', err);
    return new Response(
      JSON.stringify({
        error: 'Offline: no cached notes available',
        notes: [],
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Offline handler for GET /api/notes/:id — return single note from IndexedDB
 */
async function handleNotesDetailOffline(request) {
  try {
    const { getNote } = await import('./db.js');
    const url = new URL(request.url);
    const noteId = Number(url.pathname.split('/').pop());

    const note = await getNote(noteId);
    if (!note) {
      return new Response(JSON.stringify({ error: 'Note not found in cache' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ note }), {
      headers: { 'Content-Type': 'application/json', 'X-Source': 'IndexedDB' },
    });
  } catch (err) {
    console.error('[SW] Error serving note from IndexedDB:', err);
    return new Response(
      JSON.stringify({ error: 'Offline: failed to load note from cache' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Detect when connection returns: notify clients to refresh.
 * Clients listen for 'online' event and can re-fetch fresh data.
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_ONLINE') {
    event.ports[0].postMessage({ online: navigator.onLine });
  }
});
