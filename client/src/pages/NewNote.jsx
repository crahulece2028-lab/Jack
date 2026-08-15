import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, uploadImages } from '../api.js';
import ImagesSection from '../components/ImagesSection.jsx';
import NoteForm from '../components/NoteForm.jsx';

export default function NewNote() {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (values) => {
    setError('');
    setBusy(true);
    try {
      const { note } = await api.post('/api/notes', values);
      if (files.length > 0) await uploadImages(note.id, files);
      navigate(`/notes/${note.id}`, { replace: true });
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  const save = () => formRef.current?.requestSubmit();

  return (
    <div>
      <div className="page-actions">
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/')}>
          ← Back
        </button>
        <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>

      <h2>New note</h2>
      {error && <p className="error">{error}</p>}
      <NoteForm onSubmit={handleSubmit} onCancel={() => navigate('/')} busy={busy} formRef={formRef} />
      <ImagesSection newFiles={files} onNewFilesChange={setFiles} onBack={() => navigate('/')} onSave={save} />
    </div>
  );
}
