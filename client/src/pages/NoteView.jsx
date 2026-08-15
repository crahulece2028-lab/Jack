import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, formatDate } from '../api.js';
import Lightbox from '../components/Lightbox.jsx';

export default function NoteView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [note, setNote] = useState(null);
  const [error, setError] = useState('');
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    api
      .get(`/api/notes/${id}`)
      .then((d) => setNote(d.note))
      .catch((e) => setError(e.message || 'Could not load this note'));
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Delete this note and all its images? This cannot be undone.')) return;
    try {
      await api.del(`/api/notes/${id}`);
      navigate('/');
    } catch (e) {
      setError(e.message);
    }
  };

  if (error) {
    return (
      <div className="empty">
        <h3>{error}</h3>
        <Link to="/" className="btn btn-primary">
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (!note) return <p className="muted">Loading…</p>;

  return (
    <article className="note-view">
      <div className="note-view-header">
        <div>
          <h2>{note.title}</h2>
          <div className="note-card-meta">
            {note.subject && <span className="badge">{note.subject}</span>}
            <span className="note-date">Updated {formatDate(note.updated_at)}</span>
          </div>
        </div>
        <div className="note-view-actions">
          <Link to={`/notes/${note.id}/edit`} className="btn btn-ghost">
            Edit
          </Link>
          <button className="btn btn-danger" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>

      {note.description && <p className="note-description">{note.description}</p>}

      {note.images.length > 0 ? (
        <div className="photo-grid">
          {note.images.map((img, i) => (
            <button key={img.id} className="photo" onClick={() => setLightbox(i)}>
              <img src={img.url} alt={`${note.title} page ${i + 1}`} loading="lazy" />
            </button>
          ))}
        </div>
      ) : (
        <p className="muted">No images on this note yet.</p>
      )}

      {lightbox !== null && (
        <Lightbox
          images={note.images}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onNavigate={setLightbox}
        />
      )}
    </article>
  );
}
