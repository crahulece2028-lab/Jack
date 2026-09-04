/**
 * Example: Using PWA features in a React component
 * 
 * This shows how to integrate offline support into your existing pages.
 * Copy patterns from here into Dashboard, NoteView, etc.
 */

import React, { useState, useEffect } from 'react';
import { getNotesWithFallback, isOnline, getNoteWithFallback } from '../pwa.js';

/**
 * Example Dashboard component with offline support
 */
export function DashboardWithOfflineSupport() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [dataSource, setDataSource] = useState('');

  useEffect(() => {
    // Fetch notes with automatic fallback to cache
    async function loadNotes() {
      setLoading(true);
      try {
        const { notes: data, source } = await getNotesWithFallback({
          forceOnline: false, // Use cache if offline
        });
        setNotes(data);
        setDataSource(source);
      } catch (err) {
        console.error('Failed to load notes:', err);
        setNotes([]);
      } finally {
        setLoading(false);
      }
    }

    loadNotes();
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log('App came online, refreshing notes...');
      setIsOffline(false);
      // Optional: re-fetch fresh data from network
      // loadNotes();
    };

    const handleOffline = () => {
      console.log('App went offline, using cached data');
      setIsOffline(true);
    };

    window.addEventListener('app-online', handleOnline);
    window.addEventListener('app-offline', handleOffline);

    return () => {
      window.removeEventListener('app-online', handleOnline);
      window.removeEventListener('app-offline', handleOffline);
    };
  }, []);

  if (loading) {
    return <div className="loading">Loading notes...</div>;
  }

  return (
    <div>
      {/* Offline indicator */}
      {isOffline && (
        <div className="offline-banner">
          📡 You're offline. Viewing cached notes.
        </div>
      )}

      {/* Data source indicator (for debugging) */}
      {dataSource && (
        <div className="data-source-badge">
          Data from: <strong>{dataSource}</strong>
        </div>
      )}

      {/* Notes list */}
      {notes.length === 0 ? (
        <p>No notes cached. Come online and browse to cache notes for offline viewing.</p>
      ) : (
        <div className="notes-grid">
          {notes.map((note) => (
            <div key={note.id} className="note-card">
              <h3>{note.title}</h3>
              <p className="subject">{note.subject}</p>
              <p className="description">{note.description}</p>
              {note.images && note.images.length > 0 && (
                <div className="image-count">📷 {note.images.length} images</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Example NoteView component with offline support for single note
 */
export function NoteViewWithOfflineSupport({ noteId }) {
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [dataSource, setDataSource] = useState('');

  useEffect(() => {
    async function loadNote() {
      setLoading(true);
      try {
        const { note: data, source } = await getNoteWithFallback(noteId);
        setNote(data);
        setDataSource(source);
      } catch (err) {
        console.error('Failed to load note:', err);
        setNote(null);
      } finally {
        setLoading(false);
      }
    }

    loadNote();
  }, [noteId]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Optional: re-fetch from network
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('app-online', handleOnline);
    window.addEventListener('app-offline', handleOffline);

    return () => {
      window.removeEventListener('app-online', handleOnline);
      window.removeEventListener('app-offline', handleOffline);
    };
  }, []);

  if (loading) {
    return <div>Loading note...</div>;
  }

  if (!note) {
    return (
      <div>
        <p>Note not found {isOffline ? '(offline - no cache)' : ''}</p>
      </div>
    );
  }

  return (
    <div>
      {isOffline && <div className="offline-banner">📡 Offline - viewing cached note</div>}

      <div className="note-detail">
        <h1>{note.title}</h1>
        <p className="meta">
          {note.subject} • {dataSource} • {new Date(note.updated_at).toLocaleDateString()}
        </p>
        <p>{note.description}</p>

        {note.images && note.images.length > 0 && (
          <div className="images">
            <h3>Images ({note.images.length})</h3>
            <div className="image-gallery">
              {note.images.map((img) => (
                <div key={img.id} className="image-item">
                  <img src={img.url} alt={img.name} />
                  <p>{img.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disable writes when offline */}
        {!isOffline ? (
          <div className="actions">
            <button>✏️ Edit</button>
            <button>🗑️ Delete</button>
          </div>
        ) : (
          <div className="offline-notice">Come online to edit or delete this note.</div>
        )}
      </div>
    </div>
  );
}

/**
 * Simple offline status indicator component
 */
export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('app-online', handleOnline);
    window.addEventListener('app-offline', handleOffline);

    return () => {
      window.removeEventListener('app-online', handleOnline);
      window.removeEventListener('app-offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="offline-indicator">
      <span>📡</span> Offline
    </div>
  );
}

/**
 * Add to your App.jsx or Navbar:
 * 
 * import { OfflineIndicator } from './components/OfflineExample.jsx';
 * 
 * function Navbar() {
 *   return (
 *     <nav>
 *       <h1>jack</h1>
 *       <OfflineIndicator />
 *     </nav>
 *   );
 * }
 */
