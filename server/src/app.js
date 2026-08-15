import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import notesRoutes from './routes/notes.js';
import { isBlob, usesLocalDisk } from './lib/storage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.join(__dirname, '..');
const CLIENT_DIST = path.join(__dirname, '..', '..', 'client', 'dist');

// On Vercel the static React build is served by Vercel itself, and this
// Express app runs as a function that only receives /api/* requests.
const onVercel = Boolean(process.env.VERCEL);

export function createApp() {
  const app = express();
  app.disable('x-powered-by');

  if (process.env.CORS_ORIGIN) {
    const origins = process.env.CORS_ORIGIN.split(',').map((s) => s.trim());
    app.use(cors({ origin: origins }));
  }

  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (req, res) => {
    res.json({ ok: true, uptime: process.uptime() });
  });

  app.get('/api/config', (req, res) => {
    res.json({ blob: isBlob(), maxImageBytes: 500 * 1024 * 1024 });
  });

  app.use('/api/notes', notesRoutes);

  if (usesLocalDisk() && !onVercel) {
    const uploadsDir = path.isAbsolute(process.env.UPLOAD_DIR || '')
      ? process.env.UPLOAD_DIR
      : path.join(SERVER_ROOT, process.env.UPLOAD_DIR || 'uploads');
    app.use('/uploads', express.static(uploadsDir));
  }

  // In production the React build is served from here (single-instance deploy).
  if (!onVercel && process.env.NODE_ENV === 'production' && existsSync(CLIENT_DIST)) {
    app.use(express.static(CLIENT_DIST));
    app.get(/^(?!\/api\/|\/uploads\/).*/, (req, res) => {
      res.sendFile(path.join(CLIENT_DIST, 'index.html'));
    });
  }

  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'File is too large (max 10 MB)'
        : err.message || 'Internal server error';
    if (status >= 500) console.error(err);
    res.status(status).json({ error: message });
  });

  return app;
}
