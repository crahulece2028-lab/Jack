import { useEffect, useState } from 'react';
import { api } from '../api.js';
import NoteCard from '../components/NoteCard.jsx';
import SubjectTabs from '../components/SubjectTabs.jsx';

export default function Dashboard() {
  const [notes, setNotes] = useState(null);
  const [active, setActive] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const [error, setError] = useState('');
  const [title, setTitle] = useState('Your notes');
  const [titleInput, setTitleInput] = useState('Your notes');
  const [editingTitle, setEditingTitle] = useState(false);

  useEffect(() => {
    api
      .get('/api/settings')
      .then((d) => {
        setTitle(d.dashboardTitle || 'Your notes');
        setTitleInput(d.dashboardTitle || 'Your notes');
      })
      .catch(() => {});
  }, []);

  const saveTitle = async () => {
    const t = titleInput.trim() || 'Your notes';
    setTitle(t);
    setTitleInput(t);
    setEditingTitle(false);
    try {
      await api.put('/api/settings', { dashboardTitle: t });
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (active) params.set('subject', active);
      params.set('sort', sort);
      api
        .get(`/api/notes?${params}`)
        .then((d) => !cancelled && setNotes(d.notes))
        .catch((e) => !cancelled && setError(e.message));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, active, sort]);

  const heading = active ? active : title;

  return (
    <div className="dash-layout">
      <aside className="dash-sidebar">
        <SubjectTabs active={active} onSelect={setActive} />
      </aside>

      <div className="dash-main">
        <div className="dash-header">
          <div>
            {editingTitle ? (
              <input
                autoFocus
                className="dash-title-input"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                  if (e.key === 'Escape') {
                    setTitleInput(title);
                    setEditingTitle(false);
                  }
                }}
                aria-label="Dashboard title"
              />
            ) : (
              <div className="dash-title-row">
                <h2>{heading}</h2>
                {!active && (
                  <button
                    type="button"
                    className="dash-title-edit"
                    onClick={() => setEditingTitle(true)}
                    aria-label="Edit title"
                    title="Rename (e.g. Semester 2)"
                  >
                    ✎
                  </button>
                )}
              </div>
            )}
            <p className="muted">{active ? `Notes in the ${active} tab.` : 'Search, filter, and jump back in.'}</p>
          </div>
        </div>

        <div className="filters">
          <input
            type="search"
            className="search-input"
            placeholder="Search your notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search notes"
          />
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort notes">
            <option value="recent">Recently updated</option>
            <option value="oldest">Oldest first</option>
            <option value="az">Title A–Z</option>
          </select>
        </div>

        {error && <p className="error">{error}</p>}

        {notes === null ? (
          <p className="muted">Loading…</p>
        ) : notes.length === 0 ? (
          <div className="empty">
            <h3>No notes found</h3>
            <p className="muted">Add your first note, or adjust your search.</p>
            <a href="/notes/new" className="btn btn-primary">
              + New note
            </a>
          </div>
        ) : (
          <div className="notes-grid">
            {notes.map((n) => (
              <NoteCard key={n.id} note={n} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
