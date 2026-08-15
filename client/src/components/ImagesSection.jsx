import ImageUploader from './ImageUploader.jsx';

export default function ImagesSection({
  newFiles,
  onNewFilesChange,
  existing = [],
  onRemoveExisting,
}) {
  const total = existing.length + newFiles.length;

  return (
    <section className="images-card">
      <div className="images-card-header">
        <div>
          <h3>Add images</h3>
          <p className="muted">
            Photograph your handwritten notes or upload existing pictures. They are the heart of
            your study notes — add as many as you like.
          </p>
        </div>
        {total > 0 && <span className="images-count">{total} image{total > 1 ? 's' : ''}</span>}
      </div>

      {existing.length > 0 && (
        <div className="thumb-grid">
          {existing.map((img) => (
            <div className="thumb-item" key={img.id}>
              <img src={img.url} alt="" />
              {onRemoveExisting && (
                <button
                  type="button"
                  className="thumb-remove"
                  aria-label="Remove image"
                  onClick={() => onRemoveExisting(img)}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <ImageUploader files={newFiles} onChange={onNewFilesChange} />
    </section>
  );
}
