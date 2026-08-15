export default function SubjectListItem({ name, count, active, onClick, onRemove, wide }) {
  const n = Number(count) || 0;
  return (
    <button
      type="button"
      className={`sidebar-item${active ? ' active' : ''}${wide ? ' sidebar-item-wide' : ''}`}
      onClick={onClick}
    >
      <span className="sidebar-name">{name}</span>
      <span className="sidebar-count">{n}</span>
      {onRemove && (
        <span
          role="button"
          tabIndex={0}
          className="sidebar-remove"
          title={`Remove ${name}`}
          aria-label={`Remove ${name}`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              onRemove();
            }
          }}
        >
          ×
        </span>
      )}
    </button>
  );
}
