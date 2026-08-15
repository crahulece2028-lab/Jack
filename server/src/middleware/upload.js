import multer from 'multer';

export const ACCEPTED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    if (!ACCEPTED_MIMES.has(file.mimetype)) {
      const err = new Error('Only JPG, PNG, WebP and GIF images are allowed');
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  },
});
