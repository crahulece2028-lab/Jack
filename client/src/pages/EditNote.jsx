import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, uploadImages } from '../api.js';
import ImagesSection from '../components/ImagesSection.jsx';
import NoteForm from '../components/NoteForm.jsx';

export default function EditNote() {
  const { id } = useParams();
  const navigate = useNavigate();
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
      <div className="empty">
        <h3>Note not found</h3>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          Back to dashboard
        </button>
      </div>
    );
  }

  if (!note) return <p className="muted">Loading…</p>;

  return (
    <div>
      <h2>Edit note</h2>
      {error && <p className="error">{error}</p>}
      <NoteForm
        initial={note}
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/notes/${id}`)}
        busy={busy}
      />
      <ImagesSection
        existing={existingImages}
        onRemoveExisting={removeImage}
        newFiles={newFiles}
        onNewFilesChange={setNewFiles}
      />
    </div>
  );
}
