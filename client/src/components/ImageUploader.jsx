import { useRef, useState } from 'react';

export default function ImageUploader({ files, onChange }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = (incoming) => {
    const filtered = incoming.filter((f) => f.type.startsWith('image/'));
    if (filtered.length === 0) return;
    onChange([...files, ...filtered]);
  };

  const onInput = (e) => {
    addFiles(Array.from(e.target.files || []));
    e.target.value = '';
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer?.files || []));
  };

  const remove = (i) => onChange(files.filter((_, idx) => idx !== i));

  return (
    <div>
      <div
        className={`dropzone${dragOver ? ' drag-over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <div className="dropzone-icon" aria-hidden="true">
          +
        </div>
        <p className="dropzone-title">Drag & drop images here</p>
        <p className="dropzone-sub">or</p>
        <button type="button" className="btn btn-primary" onClick={() => inputRef.current?.click()}>
          Choose images
        </button>
        <span className="hint">
          Photos of handwritten notes work great. JPG, PNG, WebP or GIF — up to 10 MB each.
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={onInput}
        />
      </div>

      {files.length > 0 && (
        <div className="thumb-grid">
          {files.map((f, i) => (
            <div className="thumb-item" key={`${f.name}-${i}`}>
              <img src={URL.createObjectURL(f)} alt={f.name} />
              <button
                type="button"
                className="thumb-remove"
                aria-label={`Remove ${f.name}`}
                onClick={() => remove(i)}
              >
                ×
              </button>
              <span className="thumb-name" title={f.name}>
                {f.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
