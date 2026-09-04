/**
 * IndexedDB cache for notes and images from /api/notes endpoint.
 * Schema matches the actual API response shape:
 * - notes: { id, title, subject, description, tags[], created_at, updated_at, images[] }
 * - images: { id, noteId, url, mime, name }
 */

const DB_NAME = 'jack-notes-db';
const DB_VERSION = 1;
const NOTES_STORE = 'notes';
const IMAGES_STORE = 'images';

let db = null;

/**
 * Initialize IndexedDB with notes and images object stores.
 */
export async function initDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const idb = event.target.result;

      // Notes store: keyed by id
      if (!idb.objectStoreNames.contains(NOTES_STORE)) {
        const notesStore = idb.createObjectStore(NOTES_STORE, { keyPath: 'id' });
        notesStore.createIndex('subject', 'subject', { unique: false });
        notesStore.createIndex('updated_at', 'updated_at', { unique: false });
      }

      // Images store: keyed by id, indexed by noteId for lookup
      if (!idb.objectStoreNames.contains(IMAGES_STORE)) {
        const imagesStore = idb.createObjectStore(IMAGES_STORE, { keyPath: 'id' });
        imagesStore.createIndex('noteId', 'noteId', { unique: false });
      }
    };
  });
}

/**
 * Save a note (and its images) to IndexedDB.
 * @param {Object} note - { id, title, subject, description, tags[], created_at, updated_at, images[] }
 */
export async function saveNote(note) {
  await initDB();
  const tx = db.transaction([NOTES_STORE, IMAGES_STORE], 'readwrite');

  // Save the note (without images array embedded)
  const noteToStore = { ...note, images: undefined };
  await new Promise((resolve, reject) => {
    tx.objectStore(NOTES_STORE).put(noteToStore);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });

  // Save each image separately, linked by noteId
  if (Array.isArray(note.images) && note.images.length > 0) {
    const imageTx = db.transaction(IMAGES_STORE, 'readwrite');
    for (const img of note.images) {
      imageTx.objectStore(IMAGES_STORE).put({
        ...img,
        noteId: note.id, // Ensure noteId is set for lookup
      });
    }
    await new Promise((resolve, reject) => {
      imageTx.oncomplete = resolve;
      imageTx.onerror = () => reject(imageTx.error);
    });
  }
}

/**
 * Save multiple notes at once (used after bulk API fetch).
 * @param {Array} notes - Array of note objects with images
 */
export async function saveNotes(notes) {
  await initDB();
  for (const note of notes) {
    await saveNote(note);
  }
}

/**
 * Get a single note by id, with its images.
 * @param {number} noteId
 * @returns {Object|null} - Note with images[] array, or null if not found
 */
export async function getNote(noteId) {
  await initDB();
  const noteTx = db.transaction(NOTES_STORE, 'readonly');
  const note = await new Promise((resolve, reject) => {
    const req = noteTx.objectStore(NOTES_STORE).get(noteId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  if (!note) return null;

  // Fetch images for this note
  const imagesTx = db.transaction(IMAGES_STORE, 'readonly');
  const images = await new Promise((resolve, reject) => {
    const req = imagesTx.objectStore(IMAGES_STORE).index('noteId').getAll(noteId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  return { ...note, images };
}

/**
 * Get all notes from cache, optionally filtered by subject.
 * Returns notes with their images assembled.
 * @param {string|null} subject - Filter by subject (optional)
 * @returns {Array} - Sorted by updated_at DESC (most recent first)
 */
export async function getAllNotes(subject = null) {
  await initDB();

  let notes;
  if (subject) {
    const tx = db.transaction(NOTES_STORE, 'readonly');
    notes = await new Promise((resolve, reject) => {
      const req = tx.objectStore(NOTES_STORE).index('subject').getAll(subject);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } else {
    const tx = db.transaction(NOTES_STORE, 'readonly');
    notes = await new Promise((resolve, reject) => {
      const req = tx.objectStore(NOTES_STORE).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // Fetch all images and assemble them with notes
  const imagesTx = db.transaction(IMAGES_STORE, 'readonly');
  const allImages = await new Promise((resolve, reject) => {
    const req = imagesTx.objectStore(IMAGES_STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  const imagesByNote = new Map();
  for (const img of allImages) {
    if (!imagesByNote.has(img.noteId)) {
      imagesByNote.set(img.noteId, []);
    }
    imagesByNote.get(img.noteId).push(img);
  }

  const result = notes.map((note) => ({
    ...note,
    images: imagesByNote.get(note.id) || [],
  }));

  // Sort by updated_at DESC (most recent first)
  result.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  return result;
}

/**
 * Delete a note and all its images from cache.
 * @param {number} noteId
 */
export async function deleteNote(noteId) {
  await initDB();

  // Delete note
  const noteTx = db.transaction(NOTES_STORE, 'readwrite');
  await new Promise((resolve, reject) => {
    noteTx.objectStore(NOTES_STORE).delete(noteId);
    noteTx.oncomplete = resolve;
    noteTx.onerror = () => reject(noteTx.error);
  });

  // Delete all images for this note
  const imageTx = db.transaction(IMAGES_STORE, 'readwrite');
  const images = await new Promise((resolve, reject) => {
    const req = imageTx.objectStore(IMAGES_STORE).index('noteId').getAll(noteId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  const delTx = db.transaction(IMAGES_STORE, 'readwrite');
  for (const img of images) {
    delTx.objectStore(IMAGES_STORE).delete(img.id);
  }

  await new Promise((resolve, reject) => {
    delTx.oncomplete = resolve;
    delTx.onerror = () => reject(delTx.error);
  });
}

/**
 * Update a note in cache (e.g., after edit).
 * @param {Object} note - Updated note object with images[]
 */
export async function updateNote(note) {
  // Delete old images, then save the note (which saves new images)
  await deleteNote(note.id);
  await saveNote(note);
}

/**
 * Clear all cached notes and images.
 * Useful for logout or full refresh.
 */
export async function clearCache() {
  await initDB();
  const tx = db.transaction([NOTES_STORE, IMAGES_STORE], 'readwrite');

  await new Promise((resolve, reject) => {
    tx.objectStore(NOTES_STORE).clear();
    tx.objectStore(IMAGES_STORE).clear();
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Search cached notes by text, subject, or tag.
 * Mimics the API's /api/notes query parameters.
 * @param {string} search - Search in title, subject, description, tags
 * @param {string} subject - Filter by subject
 * @param {string} tag - Filter by tag
 * @returns {Array} - Matching notes sorted by updated_at DESC
 */
export async function searchNotes(search = '', subject = '', tag = '') {
  const allNotes = await getAllNotes();

  return allNotes.filter((note) => {
    if (subject && note.subject.toLowerCase() !== subject.toLowerCase()) {
      return false;
    }
    if (tag && !note.tags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      return false;
    }
    if (search) {
      const q = search.toLowerCase();
      const matchesSearch =
        note.title.toLowerCase().includes(q) ||
        note.subject.toLowerCase().includes(q) ||
        note.description.toLowerCase().includes(q) ||
        note.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchesSearch) return false;
    }
    return true;
  });
}
