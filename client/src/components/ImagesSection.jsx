import ImageUploader from './ImageUploader.jsx';
import FileIcon from './FileIcon.jsx';

const isImage = (img) => !img.mime || img.mime.startsWith('image/');

export default function ImagesSection({
  newFiles,
  onNewFilesChange,
  existing = [],
  onRemoveExisting,
  onBack,
  onSave,
}) {
  const total = existing.length + newFiles.length;

  return (
    <section className="images-card">
      <div className="images-card-header">
        <div>
          <h3>Add files</h3>
          <p className="muted">
            Attach photos of your handwritten notes, PDFs, slides, spreadsheets or any other file.
            They are the heart of your study notes — add as many as you like.
          </p>
        </div>
        {total > 0 && <span className="images-count">{total} file{total > 1 ? 's' : ''}</span>}
      </div>

      {existing.length > 0 && (
        <div className="thumb-grid">
          {existing.map((img) => (
            <div className="thumb-item" key={img.id}>
              {isImage(img) ? (
                <img src={img.url} alt="" />
              ) : (
                <FileIcon type={img.mime} name={img.name} />
              )}
              {onRemoveExisting && (
                <button
                  type="button"
                  className="thumb-remove"
                  aria-label="Remove file"
                  onClick={() => onRemoveExisting(img)}
                >
                  ×
                </button>
              )}
              {!isImage(img) && (
                <span className="thumb-name" title={img.name}>
                  {img.name || 'File'}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <ImageUploader files={newFiles} onChange={onNewFilesChange} />

      {(onBack || onSave) && (
        <div className="images-footer">
          {onBack && (
            <button type="button" className="btn btn-ghost" onClick={onBack}>
              ← Back
            </button>
          )}
          {onSave && (
            <button type="button" className="btn btn-primary" onClick={onSave}>
              Save
            </button>
          )}
        </div>
      )}
    </section>
  );
}
