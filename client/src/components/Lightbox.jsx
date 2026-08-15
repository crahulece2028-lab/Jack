import { useCallback, useEffect } from 'react';

export default function Lightbox({ images, index, onClose, onNavigate }) {
  const img = images[index];

  const next = useCallback(() => onNavigate((index + 1) % images.length), [images.length, index, onNavigate]);
  const prev = useCallback(() => onNavigate((index - 1 + images.length) % images.length), [images.length, index, onNavigate]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, onClose]);

  if (!img) return null;

  return (
    <div className="lightbox" onClick={onClose}>
      <img src={img.url} alt="" onClick={(e) => e.stopPropagation()} />
      {images.length > 1 && (
        <>
          <button className="lb-btn lb-prev" onClick={(e) => { e.stopPropagation(); prev(); }} aria-label="Previous">
            ‹
          </button>
          <button className="lb-btn lb-next" onClick={(e) => { e.stopPropagation(); next(); }} aria-label="Next">
            ›
          </button>
          <div className="lb-count">
            {index + 1} / {images.length}
          </div>
        </>
      )}
      <button className="lb-close" onClick={onClose} aria-label="Close">
        ×
      </button>
    </div>
  );
}
