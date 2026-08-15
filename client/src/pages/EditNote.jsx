import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, uploadImages } from '../api.js';
import ImagesSection from '../components/ImagesSection.jsx';
import NoteForm from '../components/NoteForm.jsx';
import EmptyState from '../components/EmptyState.jsx';

export default function EditNote() {
  const { id } = useParams();
  const navigate = useNavigate();
  const formRef = useRef(null);
  const [note, setNote] = useState(null);
  const [existingImages, setExistingImages] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api
      .get(`/api/notes/${id}`)
      .then((d) => {
        setNote(d.note);
        setExistingImages(d.note.images);
      })
      .catch((e) => (e.status === 404 ? setNotFound(true) : setError(e.message)));
  }, [id]);

  const handleSubmit = useCallback(
    async (values) => {
      setError('');
      setBusy(true);
      try {
        await api.put(`/api/notes/${id}`, values);
        if (newFiles.length > 0) await uploadImages(id, newFiles);
        navigate(`/notes/${id}`, { replace: true });
      } catch (e) {
        setError(e.message);
        setBusy(false);
      }
    },
    [id, newFiles, navigate]
  );

  const save = () => formRef.current?.requestSubmit();

  const removeImage = async (img) => {
    setExistingImages((list) => list.filter((x) => x.id !== img.id));
    try {
      await api.del(`/api/notes/images/${img.id}`);
    } catch (e) {
      setError(e.message);
      setExistingImages((list) => [...list, img]);
    }
  };

  if (notFound) {
    return (
      <EmptyState
        title="Note not found"
        message="It may have been deleted."
        action={
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Back to dashboard
          </button>
        }
      />
    );
  }

  if (!note) return <p className="muted">Loading…</p>;

  return (
    <div>
      <div className="page-actions">
        <button type="button" className="btn btn-ghost" onClick={() => navigate(`/notes/${id}`)}>
          ← Back
        </button>
        <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>

      <h2>Edit note</h2>
      {error && <p className="error">{error}</p>}
      <NoteForm
        initial={note}
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/notes/${id}`)}
        busy={busy}
        formRef={formRef}
      />
      <ImagesSection
        existing={existingImages}
        onRemoveExisting={removeImage}
        newFiles={newFiles}
        onNewFilesChange={setNewFiles}
        onBack={() => navigate(`/notes/${id}`)}
        onSave={save}
      />
    </div>
  );
}
