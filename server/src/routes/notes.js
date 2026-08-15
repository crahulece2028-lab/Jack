import { Router } from 'express';
import { handleUpload } from '@vercel/blob/client';
import db from '../db.js';
import { MAX_BYTES, upload } from '../middleware/upload.js';
import * as storage from '../lib/storage.js';
import { SUBJECT_PALETTE } from './subjects.js';

const router = Router();

/* ---------- helpers ---------- */

function normalizeTags(input) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  const tags = [];
  for (const raw of input.slice(0, 20)) {
    const tag = String(raw).trim().toLowerCase().slice(0, 30);
    if (tag && !seen.has(tag)) {
      seen.add(tag);
      tags.push(tag);
    }
  }
  return tags;
}

function toCsv(tags) {
  return tags.length ? `,${tags.join(',')},` : '';
}

function fromCsv(csv) {
  return csv ? csv.split(',').filter(Boolean) : [];
}

function noteToJson(row, images = []) {
  return {
    id: row.id,
    title: row.title,
    subject: row.subject,
    description: row.description,
    tags: fromCsv(row.tags),
    created_at: row.created_at,
    updated_at: row.updated_at,
    images: images.map((img) => ({
      id: img.id,
      url: `/api/notes/${row.id}/images/${img.id}/file`,
      mime: img.mime || '',
      name: img.name || '',
    })),
  };
}

async function loadImages(noteIds) {
  if (!noteIds.length) return new Map();
  const placeholders = noteIds.map(() => '?').join(',');
  const rows = await db.all(
    `SELECT * FROM images WHERE note_id IN (${placeholders}) ORDER BY id`,
    ...noteIds
  );
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.note_id)) map.set(r.note_id, []);
    map.get(r.note_id).push(r);
  }
  return map;
}

async function getNote(id) {
  const row = await db.get('SELECT * FROM notes WHERE id = ?', id);
  if (!row) return null;
  row.images = (await loadImages([id])).get(id) || [];
  return row;
}

function validateNoteBody(body) {
  const subject = String(body.subject || '').trim().slice(0, 100);
  const description = String(body.description || '').trim().slice(0, 5000);
  const tags = normalizeTags(body.tags);
  return { title: String(body.title || '').trim().slice(0, 200), subject, description, tags };
}

// The UI no longer asks for a title, so derive one from the note content.
function resolveTitle(title, description, subject) {
  if (title) return title;
  const snippet = description.replace(/\s+/g, ' ').trim().slice(0, 60);
  return snippet || subject || 'Untitled note';
}

function imageJson(row, noteId) {
  return {
    id: row.id,
    url: `/api/notes/${noteId}/images/${row.id}/file`,
    mime: row.mime || '',
    name: row.name || '',
  };
}

// Every file type is allowed for uploads (images, PDFs, docs, sheets, slides…).
const ALLOWED_UPLOAD_TYPES = ['image/*', 'text/*', 'audio/*', 'video/*', 'application/*'];

// Make sure a dashboard tab exists for the note's subject, creating it if
// needed (with the next palette colour). Notes keep subject as free text.
async function ensureSubject(name) {
  if (!name) return;
  const exists = await db.get('SELECT id FROM subjects WHERE LOWER(name) = LOWER(?)', name);
  if (exists) return;
  const { rows } = await db.run(
    `INSERT INTO subjects (name, color, position)
     VALUES (?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM subjects))
     RETURNING id, position`,
    name,
    SUBJECT_PALETTE[0]
  );
  const pos = Number(rows[0].position);
  await db.run(
    'UPDATE subjects SET color = ? WHERE id = ?',
    SUBJECT_PALETTE[pos % SUBJECT_PALETTE.length],
    rows[0].id
  );
}

function cleanName(raw) {
  return String(raw || '')
    .split(/[\\/]/)
    .pop()
    .replace(/[^\w.\- ]+/g, '')
    .trim()
    .slice(0, 120);
}

/* ---------- blob upload token (Vercel Blob only) ---------- */

// The browser asks for a signed token, uploads the file straight to Blob,
// then registers the resulting URL via POST /api/notes/:id/images (JSON).
if (storage.isBlob()) {
  router.post('/upload-token', async (req, res, next) => {
    try {
      const jsonResponse = await handleUpload({
        request: req,
        body: req.body,
        onBeforeGenerateToken: async () => ({
          allowedContentTypes: ALLOWED_UPLOAD_TYPES,
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: false,
        }),
      });
      res.status(200).json(jsonResponse);
    } catch (e) {
      next(e);
    }
  });
}

/* ---------- routes ---------- */

// GET /api/notes?search=&subject=&tag=&sort=recent|oldest|az
router.get('/', async (req, res, next) => {
  try {
    const where = [];
    const params = [];
    const { search, subject, tag, sort } = req.query;

    if (search) {
      const like = `%${search.trim()}%`;
      where.push('(n.title LIKE ? OR n.subject LIKE ? OR n.description LIKE ? OR n.tags LIKE ?)');
      params.push(like, like, like, like);
    }
    if (subject) {
      where.push('n.subject = ?');
      params.push(subject);
    }
    if (tag) {
      where.push('n.tags LIKE ?');
      params.push(`%,${tag},%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const order =
      sort === 'oldest' ? 'n.created_at ASC' : sort === 'az' ? 'n.title COLLATE NOCASE ASC' : 'n.updated_at DESC';
    const rows = await db.all(
      `SELECT n.* FROM notes n ${whereSql} ORDER BY ${order} LIMIT 500`,
      ...params
    );

    const imageMap = await loadImages(rows.map((r) => r.id));
    res.json({ notes: rows.map((row) => noteToJson(row, imageMap.get(row.id) || [])) });
  } catch (e) {
    next(e);
  }
});

// GET /api/notes/:id
router.get('/:id(\\d+)', async (req, res, next) => {
  try {
    const note = await getNote(Number(req.params.id));
    if (!note) return res.status(404).json({ error: 'Note not found' });
    return res.json({ note: noteToJson(note, note.images) });
  } catch (e) {
    next(e);
  }
});

// POST /api/notes
router.post('/', async (req, res, next) => {
  try {
    const { title: rawTitle, subject, description, tags } = validateNoteBody(req.body);
    const title = resolveTitle(rawTitle, description, subject);

    const result = await db.run(
      `INSERT INTO notes (title, subject, description, tags)
       VALUES (?, ?, ?, ?) RETURNING id`,
      title,
      subject,
      description,
      toCsv(tags)
    );
    await ensureSubject(subject);
    const note = await getNote(result.rows[0].id);
    res.status(201).json({ note: noteToJson(note) });
  } catch (e) {
    next(e);
  }
});

// PUT /api/notes/:id
router.put('/:id(\\d+)', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!(await getNote(id))) return res.status(404).json({ error: 'Note not found' });

    const { title: rawTitle, subject, description, tags } = validateNoteBody(req.body);
    const title = resolveTitle(rawTitle, description, subject);

    await db.run(
      `UPDATE notes SET title = ?, subject = ?, description = ?, tags = ?, updated_at = ?
       WHERE id = ?`,
      title,
      subject,
      description,
      toCsv(tags),
      new Date().toISOString(),
      id
    );
    await ensureSubject(subject);

    const note = await getNote(id);
    res.json({ note: noteToJson(note, note.images) });
  } catch (e) {
    next(e);
  }
});

// DELETE /api/notes/:id
router.delete('/:id(\\d+)', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await getNote(id);
    if (!existing) return res.status(404).json({ error: 'Note not found' });

    for (const img of existing.images) await storage.remove(img.storage_key);
    await db.run('DELETE FROM notes WHERE id = ?', id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// POST /api/notes/:id/images
//   multipart field "images" (local/S3 mode) — one or more files, or
//   JSON body { blobs: [{ url, pathname, mime }] } (Vercel Blob mode).
router.post('/:id(\\d+)/images', upload.array('images', 10), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!(await getNote(id))) return res.status(404).json({ error: 'Note not found' });

    // Vercel Blob mode: the files were uploaded straight from the browser,
    // we only need to record the resulting URLs.
    if (req.body && Array.isArray(req.body.blobs)) {
      const blobs = [];
      for (const b of req.body.blobs) {
        const url = String(b?.url || '');
        const pathname = String(b?.pathname || '');
        if (!/^https:\/\//.test(url) || !pathname) {
          return res.status(400).json({ error: 'Invalid blob reference' });
        }
        blobs.push({
          url,
          pathname,
          mime: String(b?.mime || '').slice(0, 100) || 'application/octet-stream',
          name: cleanName(b?.name || ''),
        });
      }
      if (!blobs.length) return res.status(400).json({ error: 'No files provided' });

      const created = [];
      for (const blob of blobs) {
        const result = await db.run(
          `INSERT INTO images (note_id, storage_key, mime, url, name)
           VALUES (?, ?, ?, ?, ?) RETURNING id, mime, name`,
          id,
          blob.pathname,
          blob.mime,
          blob.url,
          blob.name
        );
        created.push(imageJson(result.rows[0], id));
      }

      await db.run('UPDATE notes SET updated_at = ? WHERE id = ?', new Date().toISOString(), id);
      const note = await getNote(id);
      return res.status(201).json({ note: noteToJson(note, note.images), images: created });
    }

    // Multipart mode: files arrive in the request body.
    if (!req.files || !req.files.length) {
      return res.status(400).json({ error: 'No files provided (field "images")' });
    }

    const created = [];
    for (const file of req.files) {
      const key = await storage.save(file.buffer, file.mimetype);
      const result = await db.run(
        `INSERT INTO images (note_id, storage_key, mime, url, name)
         VALUES (?, ?, ?, ?, ?) RETURNING id, mime, name`,
        id,
        key,
        file.mimetype,
        '',
        cleanName(file.originalname || '')
      );
      created.push(imageJson(result.rows[0], id));
    }

    await db.run('UPDATE notes SET updated_at = ? WHERE id = ?', new Date().toISOString(), id);
    const note = await getNote(id);
    res.status(201).json({ note: noteToJson(note, note.images), images: created });
  } catch (e) {
    next(e);
  }
});

// DELETE /api/notes/images/:imageId
router.delete('/images/:imageId(\\d+)', async (req, res, next) => {
  try {
    const row = await db.get(
      `SELECT i.*, n.id AS note_id FROM images i JOIN notes n ON n.id = i.note_id
       WHERE i.id = ?`,
      Number(req.params.imageId)
    );
    if (!row) return res.status(404).json({ error: 'Image not found' });

    await storage.remove(row.storage_key);
    await db.run('DELETE FROM images WHERE id = ?', row.id);
    await db.run('UPDATE notes SET updated_at = ? WHERE id = ?', new Date().toISOString(), row.note_id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// GET /api/notes/:noteId/images/:imageId/file
// Local/S3 mode streams the bytes; Blob mode redirects to the CDN URL.
router.get('/:noteId(\\d+)/images/:imageId(\\d+)/file', async (req, res, next) => {
  try {
    const row = await db.get(
      `SELECT i.*, n.id AS note_id FROM images i JOIN notes n ON n.id = i.note_id
       WHERE i.id = ?`,
      Number(req.params.imageId)
    );
    if (!row) return res.status(404).json({ error: 'Image not found' });

    if (row.url) {
      return res.redirect(302, row.url);
    }

    const stream = await storage.createStream(row.storage_key);
    res.setHeader('Content-Type', row.mime);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    stream.on('error', () => {
      if (!res.headersSent) res.status(500).end();
    });
    stream.pipe(res);
  } catch (e) {
    next(e);
  }
});

// GET /api/notes/meta/subjects
router.get('/meta/subjects', async (req, res, next) => {
  try {
    const rows = await db.all(
      `SELECT DISTINCT subject FROM notes WHERE subject != '' ORDER BY subject`
    );
    res.json({ subjects: rows.map((r) => r.subject) });
  } catch (e) {
    next(e);
  }
});

export default router;
