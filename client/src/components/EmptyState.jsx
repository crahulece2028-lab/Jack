export default function EmptyState({ title, message, action }) {
  return (
    <div className="empty">
      {title && <h3>{title}</h3>}
      {message && <p className="muted">{message}</p>}
      {action}
    </div>
  );
}
