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

  return (
    <div>
      <SubjectTabs active={active} onSelect={setActive} />

      <div className="dash-header">
        <div>
          <h2>{active ? active : 'Your notes'}</h2>
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
  );
}
