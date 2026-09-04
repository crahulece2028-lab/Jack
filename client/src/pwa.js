/**
 * Service Worker registration and offline integration for jack PWA.
 * 
 * Responsibilities:
 * - Register the service worker
 * - Monitor online/offline status
 * - Auto-cache notes when online
 * - Show offline indicator to user
 */

let swRegistration = null;

/**
 * Register the service worker and set up offline/online handlers.
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('[PWA] Service Workers not supported');
    return null;
  }

  try {
    swRegistration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    console.log('[PWA] Service Worker registered:', swRegistration.scope);

    // Listen for updates
    swRegistration.addEventListener('updatefound', () => {
      console.log('[PWA] Service Worker update found');
      const newWorker = swRegistration.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'activated') {
          console.log('[PWA] New Service Worker activated');
          // Notify user of update via window event
          window.dispatchEvent(new CustomEvent('pwa-update'));
        }
      });
    });

    // Check for updates periodically
    setInterval(() => {
      swRegistration.update();
    }, 60000); // Every minute

    return swRegistration;
  } catch (err) {
    console.error('[PWA] Service Worker registration failed:', err);
    return null;
  }
}

/**
 * Set up online/offline status monitoring.
 * Emits 'online' and 'offline' events that the app can listen to.
 */
export function setupOfflineDetection(onOnline, onOffline) {
  const handleOnline = () => {
    console.log('[PWA] Online detected');
    if (onOnline) onOnline();
    window.dispatchEvent(new CustomEvent('pwa-online'));
  };

  const handleOffline = () => {
    console.log('[PWA] Offline detected');
    if (onOffline) onOffline();
    window.dispatchEvent(new CustomEvent('pwa-offline'));
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Check initial state
  if (navigator.onLine) {
    handleOnline();
  } else {
    handleOffline();
  }

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/**
 * Intercept API responses to auto-cache notes in IndexedDB.
 * Call this after fetching notes from /api/notes* endpoints.
 * 
 * @param {Object} data - Response data from API (e.g., { notes: [...] } or { note: {...} })
 * @param {string} endpoint - The endpoint path (e.g., '/api/notes', '/api/notes/42')
 */
export async function cacheAPIResponse(data, endpoint) {
  try {
    // Import db module
    const db = await import('./db.js');

    if (endpoint === '/api/notes' || endpoint === '/api/notes/') {
      // Cache multiple notes from list endpoint
      if (data && Array.isArray(data.notes)) {
        await db.saveNotes(data.notes);
        console.log(`[PWA] Cached ${data.notes.length} notes to IndexedDB`);
      }
    } else if (endpoint.match(/^\/api\/notes\/\d+$/)) {
      // Cache single note from detail endpoint
      if (data && data.note) {
        await db.saveNote(data.note);
        console.log(`[PWA] Cached note ${data.note.id} to IndexedDB`);
      }
    }
  } catch (err) {
    // Don't break the app if caching fails
    console.warn('[PWA] Failed to cache API response:', err.message);
  }
}

/**
 * Get the current online status.
 */
export function isOnline() {
  return navigator.onLine;
}

/**
 * Check if a note is available offline (in IndexedDB).
 */
export async function isNoteAvailableOffline(noteId) {
  try {
    const db = await import('./db.js');
    const note = await db.getNote(noteId);
    return !!note;
  } catch (err) {
    return false;
  }
}

/**
 * Get all available notes (online or offline).
 * If online, fetches fresh from server and caches.
 * If offline, returns cached notes.
 */
export async function getNotesWithFallback(options = {}) {
  const { search = '', subject = '', tag = '', forceOnline = false } = options;

  // If offline or not forcing online, try cache first
  if (!isOnline() || !forceOnline) {
    try {
      const db = await import('./db.js');
      const cached = await db.searchNotes(search, subject, tag);
      if (cached && cached.length > 0) {
        console.log('[PWA] Returning cached notes');
        return { notes: cached, source: 'cache' };
      }
    } catch (err) {
      console.warn('[PWA] Failed to fetch from cache:', err.message);
    }
  }

  // Try to fetch online
  if (isOnline()) {
    try {
      const { api } = await import('./api.js');
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (subject) params.append('subject', subject);
      if (tag) params.append('tag', tag);

      const endpoint = `/api/notes${params.toString() ? '?' + params.toString() : ''}`;
      const data = await api.get(endpoint);

      // Cache the response
      await cacheAPIResponse(data, '/api/notes');

      return { notes: data.notes || [], source: 'network' };
    } catch (err) {
      console.error('[PWA] Failed to fetch notes online:', err.message);

      // Fall back to cache if network fails
      try {
        const db = await import('./db.js');
        const cached = await db.searchNotes(search, subject, tag);
        return { notes: cached || [], source: 'cache-fallback' };
      } catch (cacheErr) {
        console.error('[PWA] Cache fallback also failed:', cacheErr.message);
        return { notes: [], source: 'error' };
      }
    }
  }

  // Offline with no cache
  return { notes: [], source: 'offline' };
}

/**
 * Get a single note with fallback (online or offline).
 */
export async function getNoteWithFallback(noteId) {
  // Try cache first (faster)
  try {
    const db = await import('./db.js');
    const cached = await db.getNote(noteId);
    if (cached) {
      console.log(`[PWA] Returning cached note ${noteId}`);
      return { note: cached, source: 'cache' };
    }
  } catch (err) {
    console.warn('[PWA] Failed to fetch note from cache:', err.message);
  }

  // Try network if online
  if (isOnline()) {
    try {
      const { api } = await import('./api.js');
      const data = await api.get(`/api/notes/${noteId}`);

      // Cache the response
      await cacheAPIResponse(data, `/api/notes/${noteId}`);

      return { note: data.note, source: 'network' };
    } catch (err) {
      console.error(`[PWA] Failed to fetch note ${noteId} online:`, err.message);

      // Fall back to cache
      try {
        const db = await import('./db.js');
        const cached = await db.getNote(noteId);
        if (cached) {
          return { note: cached, source: 'cache-fallback' };
        }
      } catch (cacheErr) {
        console.error('[PWA] Cache fallback failed:', cacheErr.message);
      }
    }
  }

  return { note: null, source: 'offline' };
}
