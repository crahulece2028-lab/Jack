import multer from 'multer';

// Vercel Blob allows up to 500 MB per file on client uploads (1 GB per file is not supported).
export const MAX_BYTES = 500 * 1024 * 1024;

// Accept any file type: images, PDFs, spreadsheets, slides, documents, etc.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 10 },
});
