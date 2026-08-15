import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';

const SWATCHES = [
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

export default function SubjectTabs({ active, onSelect }) {
  const [subjects, setSubjects] = useState(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [addName, setAddName] = useState('');
  const [managing, setManaging] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api.get('/api/subjects');
      setSubjects(d.subjects);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (name) => {
    const trimmed = String(name || '').trim();
    if (!trimmed) return;
    try {
      await api.post('/api/subjects', { name: trimmed });
      setAddName('');
      setAdding(false);
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const rename = async (subject, name) => {
    const trimmed = String(name || '').trim();
    if (!trimmed || trimmed === subject.name) return;
    try {
      await api.put(`/api/subjects/${subject.id}`, { name: trimmed });
      if (active === subject.name) onSelect(trimmed);
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const setColor = async (subject, color) => {
    try {
      await api.put(`/api/subjects/${subject.id}`, { color });
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const remove = async (subject) => {
    if (!window.confirm(`Delete the "${subject.name}" tab? Notes in it will move back to All.`)) return;
    try {
      await api.del(`/api/subjects/${subject.id}`);
      if (active === subject.name) onSelect('');
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="subject-tabs">
      {error && <p className="error">{error}</p>}
      <div className="tabs-row">
        <div className="tabs-scroll">
          <button
            type="button"
            className={`tab${active === '' ? ' active' : ''}`}
            onClick={() => onSelect('')}
          >
            <span className="tab-dot" style={{ background: 'var(--primary-strong)' }} />
            All
          </button>
          {(subjects || []).map((s) => (
            <button
              key={s.id}
              type="button"
              className={`tab${active === s.name ? ' active' : ''}`}
              onClick={() => onSelect(s.name)}
            >
              <span className="tab-dot" style={{ background: s.color }} />
              {s.name}
              <span className="tab-count">{s.noteCount}</span>
            </button>
          ))}
          {adding ? (
            <input
              autoFocus
              className="tab-input"
              placeholder="Subject name…"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              onBlur={() => {
                setAdding(false);
                setAddName('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  create(addName);
                }
                if (e.key === 'Escape') {
                  setAdding(false);
                  setAddName('');
                }
              }}
            />
          ) : (
            <button
              type="button"
              className="tab tab-add"
              onClick={() => setAdding(true)}
              title="Add subject"
              aria-label="Add subject"
            >
              +
            </button>
          )}
        </div>
        <button type="button" className="tab-manage" onClick={() => setManaging(true)}>
          ⚙ Manage
        </button>
      </div>

      {managing && (
        <div className="modal-backdrop" onClick={() => setManaging(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Manage subjects</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setManaging(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form
              className="manage-add"
              onSubmit={(e) => {
                e.preventDefault();
                create(addName);
              }}
            >
              <input
                className="manage-add-input"
                placeholder="Add a subject tab…"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
              />
              <button type="submit" className="btn btn-primary btn-sm">
                Add
              </button>
            </form>

            <div className="manage-list">
              {(subjects || []).map((s) => (
                <ManageRow key={s.id} subject={s} onRename={rename} onColor={setColor} onRemove={remove} />
              ))}
              {subjects && subjects.length === 0 && (
                <p className="muted">No subject tabs yet — add one above, or save a note with a subject.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ManageRow({ subject, onRename, onColor, onRemove }) {
  const [name, setName] = useState(subject.name);

  useEffect(() => {
    setName(subject.name);
  }, [subject.name]);

  return (
    <div className="manage-row">
      <div className="manage-swatches">
        {SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            className={`swatch${c.toLowerCase() === subject.color.toLowerCase() ? ' active' : ''}`}
            style={{ background: c }}
            onClick={() => onColor(subject, c)}
            aria-label={`Set colour ${c}`}
          />
        ))}
      </div>
      <input
        className="manage-rename"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => onRename(subject, name)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') {
            setName(subject.name);
            e.currentTarget.blur();
          }
        }}
      />
      <span className="manage-count">
        {subject.noteCount} note{subject.noteCount === 1 ? '' : 's'}
      </span>
      <button type="button" className="manage-delete" onClick={() => onRemove(subject)} aria-label="Delete subject">
        ×
      </button>
    </div>
  );
}
