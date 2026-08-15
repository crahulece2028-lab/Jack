import { Router } from 'express';
import db from '../db.js';

const router = Router();

// Colours assigned automatically to new tabs, in order.
export const SUBJECT_PALETTE = [
  '#818cf8',
  '#38bdf8',
  '#34d399',
  '#fbbf24',
  '#fb7185',
  '#a78bfa',
  '#2dd4bf',
  '#f472b6',
  '#a3e635',
  '#fb923c',
];

const DEFAULT_COLOR = SUBJECT_PALETTE[0];

function cleanName(raw) {
  return String(raw || '').trim().slice(0, 60);
}

function cleanColor(raw) {
  return /^#[0-9a-fA-F]{6}$/.test(String(raw || '')) ? raw : DEFAULT_COLOR;
}

function subjectJson(row, noteCount) {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    noteCount: Number(noteCount || 0),
  };
}

// GET /api/subjects
router.get('/', async (req, res, next) => {
  try {
    const rows = await db.all(
      `SELECT s.*, (SELECT COUNT(*) FROM notes n WHERE n.subject = s.name) AS noteCount
       FROM subjects s ORDER BY s.position, s.id`
    );
    res.json({ subjects: rows.map((r) => subjectJson(r, r.noteCount)) });
  } catch (e) {
    next(e);
  }
});

// POST /api/subjects  { name, color? }
router.post('/', async (req, res, next) => {
  try {
    const name = cleanName(req.body?.name);
    if (!name) return res.status(400).json({ error: 'Subject name is required' });
    const color = cleanColor(req.body?.color);

    const dup = await db.get('SELECT id FROM subjects WHERE LOWER(name) = LOWER(?)', name);
    if (dup) return res.status(400).json({ error: 'A subject with that name already exists' });

    const { rows } = await db.run(
      `INSERT INTO subjects (name, color, position)
       VALUES (?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM subjects))
       RETURNING id`,
      name,
      color
    );
    const subject = await db.get('SELECT * FROM subjects WHERE id = ?', rows[0].id);
    res.status(201).json({ subject: subjectJson(subject, 0) });
  } catch (e) {
    next(e);
  }
});

// PUT /api/subjects/:id  { name?, color? }
router.put('/:id(\\d+)', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const current = await db.get('SELECT * FROM subjects WHERE id = ?', id);
    if (!current) return res.status(404).json({ error: 'Subject not found' });

    const name = req.body && 'name' in req.body ? cleanName(req.body.name) : current.name;
    if (!name) return res.status(400).json({ error: 'Subject name cannot be empty' });
    const color = req.body && 'color' in req.body ? cleanColor(req.body.color) : current.color;

    if (name.toLowerCase() !== current.name.toLowerCase()) {
      const dup = await db.get('SELECT id FROM subjects WHERE id != ? AND LOWER(name) = LOWER(?)', id, name);
      if (dup) return res.status(400).json({ error: 'A subject with that name already exists' });
    }

    await db.run('UPDATE subjects SET name = ?, color = ? WHERE id = ?', name, color, id);
    if (name !== current.name) {
      // Keep notes in sync when a tab is renamed.
      await db.run('UPDATE notes SET subject = ? WHERE subject = ?', name, current.name);
    }

    const subject = await db.get('SELECT * FROM subjects WHERE id = ?', id);
    const count = (await db.get('SELECT COUNT(*) AS c FROM notes WHERE subject = ?', name)).c;
    res.json({ subject: subjectJson(subject, count) });
  } catch (e) {
    next(e);
  }
});

// DELETE /api/subjects/:id
router.delete('/:id(\\d+)', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const current = await db.get('SELECT * FROM subjects WHERE id = ?', id);
    if (!current) return res.status(404).json({ error: 'Subject not found' });

    // Notes in the deleted subject move back to "All".
    await db.run('UPDATE notes SET subject = ? WHERE subject = ?', '', current.name);
    await db.run('DELETE FROM subjects WHERE id = ?', id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
