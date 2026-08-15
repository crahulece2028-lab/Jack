import { useNavigate } from 'react-router-dom';
import { formatDate } from '../api.js';

export default function NoteCard({ note }) {
  const navigate = useNavigate();
  const thumb = note.images[0];

  return (
    <button className="note-card" onClick={() => navigate(`/notes/${note.id}`)}>
      <div className="note-thumb">
        {thumb ? (
          <img src={thumb.url} alt="" loading="lazy" />
        ) : (
          <div className="note-thumb-empty" aria-hidden="true">
            Text
          </div>
        )}
      </div>
      <div className="note-card-body">
        <h3 className="note-card-title">{note.title}</h3>
        <div className="note-card-meta">
          {note.subject && <span className="badge">{note.subject}</span>}
          <span className="note-date">{formatDate(note.updated_at)}</span>
        </div>
      </div>
    </button>
  );
}
