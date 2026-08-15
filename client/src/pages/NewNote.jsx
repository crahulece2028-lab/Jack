import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, uploadImages } from '../api.js';
import ImagesSection from '../components/ImagesSection.jsx';
import NoteForm from '../components/NoteForm.jsx';

export default function NewNote() {
  const navigate = useNavigate();
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

  return (
    <div>
      <h2>New note</h2>
      {error && <p className="error">{error}</p>}
      <NoteForm onSubmit={handleSubmit} onCancel={() => navigate('/')} busy={busy} />
      <ImagesSection newFiles={files} onNewFilesChange={setFiles} />
    </div>
  );
}
