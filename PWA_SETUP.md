# PWA Setup for jack — Student Note-Taking App

## ✅ What's Installed

Your app now has full **Progressive Web App (PWA)** support with offline functionality:

### Files Created

1. **`client/public/manifest.json`** — PWA manifest with app metadata, icons, and shortcuts
2. **`client/public/sw.js`** — Service Worker for caching & offline fallback
3. **`client/src/db.js`** — IndexedDB module for offline note & image storage
4. **`client/src/pwa.js`** — PWA integration layer (registration, offline detection)
5. **`client/index.html`** — Updated with manifest link & iOS meta tags
6. **`client/src/main.jsx`** — Initialized with PWA setup
7. **`client/vite.config.js`** — Updated for PWA file serving

---

## 🚀 How It Works

### Online Flow
1. User loads `/api/notes` → fetches fresh data from server
2. Response is **automatically cached** to IndexedDB (`client/src/db.js`)
3. App shell (HTML/CSS/JS) cached by Service Worker
4. Images cached on first view

### Offline Flow
1. Service Worker intercepts fetch requests
2. `/api/notes*` → falls back to IndexedDB (via `db.js`)
3. App shell & assets → served from browser cache
4. Images → served from cache or placeholder

### Coming Online
- When connection returns, app automatically refreshes data on next navigation
- Window fires `'app-online'` event for components to listen to

---

## 🔧 API Integration (Already Done)

The PWA layer automatically hooks into your existing `/api/notes` endpoints:

```javascript
// From server/src/routes/notes.js
GET  /api/notes                    // ← List all notes (cached)
GET  /api/notes/:id                // ← Single note detail (cached)
POST /api/notes                    // ← Create note (offline: blocked)
PUT  /api/notes/:id                // ← Edit note (offline: blocked)
DELETE /api/notes/:id              // ← Delete note (offline: blocked)
```

**Note:** Writes (POST/PUT/DELETE) are **blocked offline** with a 503 error—no silent failures or sync queue yet (keeps it simple).

---

## 📱 Installation

### On Chrome/Android
1. Open app at `https://jack-sxvj.vercel.app` (or your deployed URL)
2. Chrome shows **"Install app"** banner
3. App installs as standalone PWA
4. Appears in home screen with icon

### On iOS
1. Open in Safari
2. Tap **Share → Add to Home Screen**
3. App launches full-screen without browser chrome

### Local Development
1. Open `http://localhost:5173`
2. Service Worker registers automatically
3. Notes cache as you browse
4. Disconnect network to test offline mode

---

## 💾 IndexedDB Schema

```javascript
notes {
  id (primary key)
  title
  subject
  description
  tags (array)
  created_at
  updated_at
  images (assembled at query time)
}

images {
  id (primary key)
  noteId (index)
  url
  mime
  name
}
```

**Why separate?** Normalized schema handles image updates cleanly without duplicating note data.

---

## 🛠️ Using PWA Features in Components

### Check if Online
```javascript
import { isOnline } from './pwa.js';

if (isOnline()) {
  console.log('User is online');
} else {
  console.log('User is offline');
}
```

### Fetch Notes with Offline Fallback
```javascript
import { getNotesWithFallback } from './pwa.js';

const { notes, source } = await getNotesWithFallback({
  search: 'biology',
  subject: 'Science',
  forceOnline: false, // Use cache first if offline
});

console.log(`Notes from: ${source}`); // 'cache', 'network', 'cache-fallback'
```

### Listen for Online/Offline Events
```javascript
useEffect(() => {
  const handleOnline = () => setOffline(false);
  const handleOffline = () => setOffline(true);

  window.addEventListener('app-online', handleOnline);
  window.addEventListener('app-offline', handleOffline);

  return () => {
    window.removeEventListener('app-online', handleOnline);
    window.removeEventListener('app-offline', handleOffline);
  };
}, []);
```

### Fetch Single Note with Fallback
```javascript
import { getNoteWithFallback } from './pwa.js';

const { note, source } = await getNoteWithFallback(42);
console.log(`Note loaded from: ${source}`); // 'cache', 'network', 'cache-fallback'
```

---

## 🔍 Debugging

### Check Service Worker Status
```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Service Workers:', regs);
  regs.forEach(reg => console.log('Scope:', reg.scope));
});
```

### View IndexedDB
1. DevTools → Application → IndexedDB
2. Look for database **`jack-notes-db`**
3. Inspect **`notes`** and **`images`** object stores

### Check Service Worker Logs
1. DevTools → Application → Service Workers
2. Click your SW registration to see console output
3. Logs prefixed with `[SW]` or `[PWA]`

### Test Offline Mode
1. DevTools → Network tab
2. Check **"Offline"** checkbox
3. Try navigating or reloading
4. Should see cached data with `X-Source: IndexedDB` header

---

## 📊 Storage Limits

- **IndexedDB**: ~50 MB on most browsers (depends on device storage)
- **Cache API**: ~50 MB
- **Total**: ~100 MB available for notes + images

**Tip:** Images uploaded to Vercel Blob are served from CDN URLs and cached by the Service Worker. Only image metadata is stored in IndexedDB.

---

## 🚢 Deployment Notes

### Vercel (Recommended)
- `client/public/` (including `manifest.json` and `sw.js`) is served as static files
- `vercel.json` already routes everything correctly
- No additional setup needed ✅

### Docker / Self-Hosted
- Ensure `client/public/manifest.json` and `client/public/sw.js` are in the static root
- Service Worker must be served with `Content-Type: application/javascript`
- Manifest must be served with `Content-Type: application/manifest+json`

### Example Nginx Config
```nginx
location ~ \.(json|js)$ {
  expires 1h;
  add_header Cache-Control "public, must-revalidate";
}

location /sw.js {
  add_header Content-Type "application/javascript";
}

location /manifest.json {
  add_header Content-Type "application/manifest+json";
}
```

---

## 🎯 What's Next (Optional)

### Offline Writes (Sync Queue)
- Add a write queue that syncs when online
- Requires conflict resolution logic
- More complex, but enables full offline editing

### Push Notifications
- Add `notifications` permission to manifest
- Send alerts when notes are accessed on other devices

### Background Sync
- Sync queue with service worker background sync API
- More reliable than manual polling

### Storage Quota Management
- Monitor storage usage with `navigator.storage.estimate()`
- Offer "clear cache" button to free up space

---

## ✨ You're Done!

Your app now loads **instantly** on repeat visits, works **offline**, and feels like a native app. 

Test it:
1. Load the app, browse some notes (caches automatically)
2. Go offline (DevTools → Network → Offline or real WiFi disconnect)
3. Refresh the page—notes still visible
4. Try creating a note—you'll see "offline: writes not supported"
5. Come back online—fresh data syncs automatically

Happy note-taking! 📝
