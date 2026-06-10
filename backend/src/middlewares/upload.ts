import multer from 'multer';
import { ValidationError } from '../utils/errors.js';
import { CLOUDINARY_CONFIG } from '@hofra/shared';

const storage = multer.memoryStorage();

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ValidationError('Formato de archivo no permitido. Use: JPG, PNG o WebP'));
  }
};

export const uploadSingle = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: CLOUDINARY_CONFIG.MAX_FILE_SIZE,
  },
}).single('imagen');

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: CLOUDINARY_CONFIG.MAX_FILE_SIZE,
  },
});
