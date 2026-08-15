import { Router } from 'express';
import db from '../db.js';

const router = Router();

const DEFAULTS = { dashboardTitle: 'Your notes' };

async function readSettings() {
  const rows = await db.all('SELECT key, value FROM settings');
  const map = {};
  for (const r of rows) map[r.key] = r.value;
  return map;
}

// GET /api/settings
router.get('/', async (req, res, next) => {
  try {
    const settings = await readSettings();
    res.json({ ...DEFAULTS, ...settings });
  } catch (e) {
    next(e);
  }
});

// PUT /api/settings  { dashboardTitle? }
router.put('/', async (req, res, next) => {
  try {
    const body = req.body || {};
    const updates = [];
    if ('dashboardTitle' in body) {
      updates.push(['dashboardTitle', String(body.dashboardTitle).trim().slice(0, 60)]);
    }
    for (const [key, value] of updates) {
      await db.run(
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        key,
        value
      );
    }
    res.json({ ...DEFAULTS, ...(await readSettings()) });
  } catch (e) {
    next(e);
  }
});

export default router;
