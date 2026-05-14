import mongoose from 'mongoose';
import AppError from './AppError.js';

const validateObjectId = (paramName = 'id') => (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params[paramName])) {
    return next(new AppError(400, `Invalid ${paramName}: not a valid MongoDB ObjectId`));
  }
  next();
};

export default validateObjectId;
