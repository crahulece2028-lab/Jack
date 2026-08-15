import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function NoteForm({ initial, onSubmit, onCancel, busy, formRef }) {
  const [subject, setSubject] = useState(initial?.subject || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    api
      .get('/api/subjects')
      .then((d) => setSubjects(d.subjects))
      .catch(() => {});
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ subject, description });
  };

  return (
    <form className="card form" onSubmit={handleSubmit} ref={formRef}>
      <div className="field">
        <label htmlFor="subject">Topic name</label>
        <input
          id="subject"
          type="text"
          maxLength={100}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. Biology"
          list="subject-tabs"
        />
        <datalist id="subject-tabs">
          {subjects.map((s) => (
            <option key={s.id} value={s.name} />
          ))}
        </datalist>
      </div>

      <div className="field">
        <label htmlFor="description">Notes</label>
        <textarea
          id="description"
          rows={6}
          maxLength={5000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Type your notes here, or add photos below…"
        />
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save note'}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
