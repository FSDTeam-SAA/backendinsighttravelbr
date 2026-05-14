import AppError from '../utils/AppError.js';

// Middleware factory — returns 400 if any required field is absent or empty string
export const validateRequiredFields = (fields) => (req, res, next) => {
  const missing = fields.filter(
    (f) => req.body[f] === undefined || req.body[f] === null || req.body[f] === ''
  );

  if (missing.length > 0) {
    return next(new AppError(400, `Missing required fields: ${missing.join(', ')}`));
  }

  next();
};
