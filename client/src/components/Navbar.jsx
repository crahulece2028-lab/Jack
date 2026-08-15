import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            j
          </span>
          <span>jack</span>
        </Link>

        <nav className="nav-links">
          <Link to="/notes/new" className="btn btn-primary btn-sm">
            + New note
          </Link>
        </nav>
      </div>
    </header>
  );
}
