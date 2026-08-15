export default function SubjectListItem({ name, count, active, onClick }) {
  const n = Number(count) || 0;
  return (
    <button
      type="button"
      className={`sidebar-item${active ? ' active' : ''}`}
      onClick={onClick}
    >
      <span className={`sidebar-dot${n > 0 ? '' : ' empty'}`} aria-hidden="true" />
      <span className="sidebar-name">{name}</span>
      <span className="sidebar-count">{n}</span>
    </button>
  );
}
