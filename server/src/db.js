import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@libsql/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Locally we use a plain SQLite file (libsql "file:" mode). On Vercel the
// app connects to a Turso database instead, so the same SQL keeps working.
function localUrl() {
  const p = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'notes.db');
  const abs = path.isAbsolute(p) ? p : path.resolve(p);
  mkdirSync(path.dirname(abs), { recursive: true });
  return `file:${abs}`;
}

const remoteUrl = process.env.TURSO_DATABASE_URL;
const client = createClient(
  remoteUrl
    ? { url: remoteUrl, authToken: process.env.TURSO_AUTH_TOKEN }
    : { url: localUrl() }
);

await Promise.all([
  client.execute('PRAGMA foreign_keys = ON'),
  client.executeMultiple(readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')),
]);
if (!remoteUrl) await client.execute('PRAGMA journal_mode = WAL');

// Migrations for databases created before a column existed.
// CREATE TABLE IF NOT EXISTS above won't alter an existing table.
const imageCols = (await client.execute('PRAGMA table_info(images)')).rows;
if (imageCols.length > 0 && !imageCols.some((c) => c.name === 'url')) {
  await client.execute("ALTER TABLE images ADD COLUMN url TEXT NOT NULL DEFAULT ''");
}

const db = {
  all: async (sql, ...args) => (await client.execute({ sql, args })).rows,
  get: async (sql, ...args) => (await client.execute({ sql, args })).rows[0],
  run: (sql, ...args) => client.execute({ sql, args }),
  exec: (sql) => client.executeMultiple(sql),
  close: () => client.close(),
};

export default db;
