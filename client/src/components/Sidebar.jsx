import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import SubjectListItem from './SubjectListItem.jsx';

export default function Sidebar({ active, onSelect }) {
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

  const remove = async (subject) => {
    if (!window.confirm(`Delete the "${subject.name}" subject? Notes in it will move back to All subjects.`)) return;
    try {
      await api.del(`/api/subjects/${subject.id}`);
      if (active === subject.name) onSelect('');
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const total = (subjects || []).reduce((sum, s) => sum + (Number(s.noteCount) || 0), 0);

  return (
    <div className="sidebar">
      {error && <p className="error">{error}</p>}

      <div className="sidebar-list">
        <SubjectListItem
          name="All subjects"
          count={total}
          active={active === ''}
          onClick={() => onSelect('')}
        />
        {(subjects || []).map((s) => (
          <SubjectListItem
            key={s.id}
            name={s.name}
            count={s.noteCount}
            active={active === s.name}
            onClick={() => onSelect(s.name)}
          />
        ))}
      </div>

      {adding ? (
        <div className="sidebar-add-form">
          <input
            autoFocus
            placeholder="Subject name"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            onBlur={(e) => {
              if (!e.currentTarget.parentElement?.contains(e.relatedTarget)) {
                setAdding(false);
                setAddName('');
              }
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
          <div className="sidebar-add-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => create(addName)}>
              Save
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setAdding(false);
                setAddName('');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="sidebar-add"
          onClick={() => setAdding(true)}
          title="Add subject"
          aria-label="Add subject"
        >
          + Add subject
        </button>
      )}

      <button type="button" className="sidebar-manage" onClick={() => setManaging(true)}>
        Manage subjects
      </button>

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
                placeholder="Add a subject…"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
              />
              <button type="submit" className="btn btn-ghost">
                Add
              </button>
            </form>

            <div className="manage-list">
              {(subjects || []).map((s) => (
                <ManageRow key={s.id} subject={s} onRename={rename} onRemove={remove} />
              ))}
              {subjects && subjects.length === 0 && (
                <p className="muted">No subjects yet — add one above, or save a note with a topic name.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ManageRow({ subject, onRename, onRemove }) {
  const [name, setName] = useState(subject.name);

  useEffect(() => {
    setName(subject.name);
  }, [subject.name]);

  return (
    <div className="manage-row">
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
      <button type="button" className="manage-delete" onClick={() => onRemove(subject)}>
        Delete
      </button>
    </div>
  );
}
