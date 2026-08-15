import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, formatDate } from '../api.js';
import Lightbox from '../components/Lightbox.jsx';
import FileIcon from '../components/FileIcon.jsx';
import EmptyState from '../components/EmptyState.jsx';

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
      <EmptyState
        title="Could not load this note"
        message="It may have been moved or deleted."
        action={
          <Link to="/" className="btn btn-primary">
            Back to dashboard
          </Link>
        }
      />
    );
  }

  if (!note) return <p className="muted">Loading…</p>;

  const imageAttachments = note.images.filter((img) => !img.mime || img.mime.startsWith('image/'));
  const fileAttachments = note.images.filter((img) => img.mime && !img.mime.startsWith('image/'));

  return (
    <article className="note-view">
      <div className="note-view-back">
        <Link to="/" className="btn btn-ghost">
          ← Back to home
        </Link>
      </div>
      <div className="note-view-header">
        <div>
          <h2>{note.title}</h2>
          <div className="note-card-meta">
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

      {note.images.length === 0 ? (
        <p className="muted">No files on this note yet.</p>
      ) : (
        <>
          {fileAttachments.length > 0 && (
            <div className="file-list">
              {fileAttachments.map((f) => (
                <a
                  key={f.id}
                  className="file-item"
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <FileIcon type={f.mime} name={f.name} />
                  <span className="file-item-name">{f.name || 'File'}</span>
                  <span className="file-item-open">Open ↗</span>
                </a>
              ))}
            </div>
          )}

          {imageAttachments.length > 0 && (
            <div className="photo-grid">
              {imageAttachments.map((img, i) => (
                <button key={img.id} className="photo" onClick={() => setLightbox(i)}>
                  <img src={img.url} alt={`${note.title} page ${i + 1}`} loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {lightbox !== null && (
        <Lightbox
          images={imageAttachments}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onNavigate={setLightbox}
        />
      )}
    </article>
  );
}
