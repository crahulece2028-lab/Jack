import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test, before, after } from 'node:test';

const tmp = mkdtempSync(path.join(os.tmpdir(), 'note-app-test-'));
process.env.DB_PATH = path.join(tmp, 'test.db');
process.env.UPLOAD_DIR = path.join(tmp, 'uploads');
process.env.NODE_ENV = 'test';

const { createApp } = await import('../src/app.js');
const { default: db } = await import('../src/db.js');

let server;
let base;

const get = async (p) => fetch(base + p);
const send = async (method, p, body) =>
  fetch(base + p, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const createNote = async (body) => {
  const res = await send('POST', '/api/notes', body);
  assert.equal(res.status, 201);
  return (await res.json()).note;
};

before(async () => {
  server = await new Promise((resolve) => {
    const s = createApp().listen(0, () => resolve(s));
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  db.close();
  try {
    rmSync(tmp, { recursive: true, force: true });
  } catch {
    // On Windows the libSQL native binding keeps the DB file locked until the
    // process exits; the OS temp dir will be cleaned up later.
  }
});

test('health endpoint responds', async () => {
  const res = await get('/api/health');
  assert.equal(res.status, 200);
  assert.equal((await res.json()).ok, true);
});

test('create note with subject and tags', async () => {
  const note = await createNote({
    title: 'Calculus ch. 4',
    subject: 'Math',
    description: 'Derivatives of trig functions.',
    tags: ['exam', 'Math', 'EXAM'],
  });
  assert.equal(note.subject, 'Math');
  assert.deepEqual(note.tags, ['exam', 'math']);
});

test('creates a note without a title using a default title', async () => {
  const note = await createNote({
    subject: 'History',
    description: 'Causes of the French Revolution.',
  });
  assert.equal(note.subject, 'History');
  assert.ok(note.title.length > 0);
  assert.match(note.title, /French Revolution/);
});

test('upload an image to a note and stream it back', async () => {
  const note = await createNote({ title: 'Biology diagram', subject: 'Biology', tags: [] });

  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64'
  );
  const form = new FormData();
  form.append('images', new Blob([png], { type: 'image/png' }), 'diagram.png');

  const res = await fetch(`${base}/api/notes/${note.id}/images`, {
    method: 'POST',
    body: form,
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.images.length, 1);
  assert.match(body.images[0].url, new RegExp(`/api/notes/${note.id}/images/`));

  const file = await fetch(`${base}${body.images[0].url}`);
  assert.equal(file.status, 200);
  assert.match(file.headers.get('content-type'), /image\/png/);
});

test('accepts non-image file uploads (pdf, txt, etc.)', async () => {
  const note = await createNote({ title: 'Attachments', tags: [] });
  const form = new FormData();
  form.append('images', new Blob(['%PDF-1.4 test'], { type: 'application/pdf' }), 'notes.pdf');
  form.append('images', new Blob(['hello'], { type: 'text/plain' }), 'notes.txt');
  const res = await fetch(`${base}/api/notes/${note.id}/images`, {
    method: 'POST',
    body: form,
  });
  assert.equal(res.status, 201);
  const { images } = await res.json();
  assert.equal(images.length, 2);
  assert.ok(images.every((img) => img.url.startsWith(`/api/notes/${note.id}/images/`)));
  assert.ok(images.some((img) => img.mime === 'application/pdf' && img.name === 'notes.pdf'));
  assert.ok(images.some((img) => img.mime === 'text/plain' && img.name === 'notes.txt'));

  const file = await fetch(`${base}${images[0].url}`);
  assert.equal(file.status, 200);
  assert.match(file.headers.get('content-type'), /application\/pdf/);
});

test('search returns only matching notes', async () => {
  const res = await get('/api/notes?search=calculus');
  const { notes } = await res.json();
  assert.equal(notes.length, 1);
  assert.equal(notes[0].title, 'Calculus ch. 4');
});

test('filter by subject', async () => {
  const res = await get('/api/notes?subject=Math');
  const { notes } = await res.json();
  assert.ok(notes.every((n) => n.subject === 'Math'));
});

test('filter by tag', async () => {
  const res = await get('/api/notes?tag=math');
  const { notes } = await res.json();
  assert.equal(notes.length, 1);
});

test('meta subjects lists distinct subjects', async () => {
  const res = await get('/api/notes/meta/subjects');
  const { subjects } = await res.json();
  assert.ok(subjects.includes('Math'));
  assert.ok(subjects.includes('Biology'));
});

test('update a note', async () => {
  const note = await createNote({ title: 'Draft', tags: [] });
  const res = await send('PUT', `/api/notes/${note.id}`, {
    title: 'Renamed',
    subject: 'Physics',
    description: 'Updated body',
    tags: ['final'],
  });
  assert.equal(res.status, 200);
  const { note: updated } = await res.json();
  assert.equal(updated.title, 'Renamed');
  assert.deepEqual(updated.tags, ['final']);
});

test('delete an image', async () => {
  const note = await createNote({ title: 'Temp', tags: [] });
  const form = new FormData();
  form.append('images', new Blob(['x'], { type: 'image/jpeg' }), 'a.jpg');
  const up = await fetch(`${base}/api/notes/${note.id}/images`, {
    method: 'POST',
    body: form,
  });
  const { images } = await up.json();

  const del = await fetch(`${base}/api/notes/images/${images[0].id}`, { method: 'DELETE' });
  assert.equal(del.status, 200);
  const view = await get(`/api/notes/${note.id}`);
  assert.equal((await view.json()).note.images.length, 0);
});

test('delete a note', async () => {
  const note = await createNote({ title: 'Doomed', tags: [] });
  const res = await fetch(`${base}/api/notes/${note.id}`, { method: 'DELETE' });
  assert.equal(res.status, 200);
  const gone = await get(`/api/notes/${note.id}`);
  assert.equal(gone.status, 404);
});
