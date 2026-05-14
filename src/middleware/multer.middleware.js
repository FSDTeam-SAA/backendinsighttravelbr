import multer from 'multer';
import AppError from '../utils/AppError.js';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new AppError(400, 'Only image and PDF files are allowed'), false);
  }
};

const FILE_SIZE_LIMIT = 5 * 1024 * 1024; // 5 MB

export const uploadSingle = (fieldName) =>
  multer({
    storage,
    limits: { fileSize: FILE_SIZE_LIMIT },
    fileFilter,
  }).single(fieldName);

export const uploadMultiple = (fieldName, maxCount) =>
  multer({
    storage,
    limits: { fileSize: FILE_SIZE_LIMIT },
    fileFilter,
  }).array(fieldName, maxCount);
