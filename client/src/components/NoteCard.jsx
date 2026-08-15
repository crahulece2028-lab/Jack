import { useNavigate } from 'react-router-dom';
import { formatDate } from '../api.js';
import FileIcon from './FileIcon.jsx';

export default function NoteCard({ note }) {
  const navigate = useNavigate();
  const thumb = note.images.find((img) => !img.mime || img.mime.startsWith('image/'));

  return (
    <button className="note-card" onClick={() => navigate(`/notes/${note.id}`)}>
      <div className="note-thumb">
        {thumb ? (
          <img src={thumb.url} alt="" loading="lazy" />
        ) : note.images.length > 0 ? (
          <div className="note-thumb-empty">
            <FileIcon type={note.images[0].mime} name={note.images[0].name} />
          </div>
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
