import multer from 'multer';

export const MAX_BYTES = 10 * 1024 * 1024;

// Accept any file type: images, PDFs, spreadsheets, slides, documents, etc.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 10 },
});
