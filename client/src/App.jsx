import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import EditNote from './pages/EditNote.jsx';
import NewNote from './pages/NewNote.jsx';
import NoteView from './pages/NoteView.jsx';

export default function App() {
  return (
    <>
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/notes/new" element={<NewNote />} />
          <Route path="/notes/:id" element={<NoteView />} />
          <Route path="/notes/:id/edit" element={<EditNote />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
