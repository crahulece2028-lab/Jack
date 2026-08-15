import { upload } from '@vercel/blob/client';

const BASE = import.meta.env.VITE_API_BASE || '';

export async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(data?.error || 'Request failed');
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  put: (p, body) => request(p, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  del: (p) => request(p, { method: 'DELETE' }),
};

let configPromise;
export function getConfig(force = false) {
  if (!configPromise || force) {
    configPromise = fetch(`${BASE}/api/config`, { credentials: 'include' })
      .then((r) => r.json().catch(() => ({ blob: false, maxImageBytes: 10 * 1024 * 1024 })))
      .catch(() => ({ blob: false, maxImageBytes: 10 * 1024 * 1024 }));
  }
  return configPromise;
}

const EXT = {
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/jpeg': '.jpg',
};

// Vercel Blob mode: upload straight from the browser, then register the URL.
async function uploadBlob(files, noteId) {
  const blobs = [];
  for (const file of files) {
    const pathname = `notes/${crypto.randomUUID()}${EXT[file.type] || '.jpg'}`;
    const result = await upload(pathname, file, {
      access: 'public',
      handleUploadUrl: `${BASE}/api/notes/upload-token`,
    });
    blobs.push({ url: result.url, pathname: result.pathname, mime: file.type || 'image/jpeg' });
  }
  const res = await fetch(`${BASE}/api/notes/${noteId}/images`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blobs }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || 'Upload failed');
  return data;
}

export async function uploadImages(noteId, files) {
  const config = await getConfig();
  if (config.blob) return uploadBlob(files, noteId);

  const form = new FormData();
  for (const f of files) form.append('images', f);
  const res = await fetch(`${BASE}/api/notes/${noteId}/images`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || 'Upload failed');
  return data;
}

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
