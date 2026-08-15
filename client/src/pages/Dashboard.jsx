import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import NoteCard from '../components/NoteCard.jsx';
import Sidebar from '../components/Sidebar.jsx';
import SearchBar from '../components/SearchBar.jsx';
import EmptyState from '../components/EmptyState.jsx';

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
  const showNewNote = notes !== null && notes.length > 0;

  let subtitle;
  if (active) {
    subtitle =
      notes === null
        ? `Loading ${active}…`
        : notes.length > 0
          ? `${notes.length} note${notes.length === 1 ? '' : 's'} in ${active}`
          : `No notes in ${active} yet.`;
  } else {
    subtitle = 'Every note, every subject.';
  }

  return (
    <div className="dash-layout">
      <aside className="dash-sidebar">
        <Sidebar active={active} onSelect={setActive} />
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
                <h2 className="page-title">{heading}</h2>
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
            <p className="muted subtitle">{subtitle}</p>
          </div>
          {showNewNote && (
            <Link to="/notes/new" className="btn btn-primary">
              + New note
            </Link>
          )}
        </div>

        <div className="dash-toolbar">
          <SearchBar value={search} onChange={setSearch} />
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="sort-select" aria-label="Sort notes">
            <option value="recent">Recently updated</option>
            <option value="oldest">Oldest first</option>
            <option value="az">Title A–Z</option>
          </select>
        </div>

        {error && <p className="error">{error}</p>}

        {notes === null ? (
          <p className="muted">Loading…</p>
        ) : notes.length === 0 ? (
          <EmptyState
            title={active ? `No notes in ${active}` : 'No notes yet'}
            message={
              active
                ? 'Add the first note for this subject.'
                : search.trim()
                  ? 'Nothing matches your search.'
                  : 'Your notes will appear here. Add the first one to get started.'
            }
            action={
              <Link to="/notes/new" className="btn btn-primary">
                + New note
              </Link>
            }
          />
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
