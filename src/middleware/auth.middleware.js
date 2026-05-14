import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import { verifyToken } from '../utils/jwt.js';
import User from '../models/User.model.js';
import Traveler from '../models/Traveler.model.js';

export const protect = catchAsync(async (req, res, next) => {
  // 1. Extract token from Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(401, 'You are not logged in. Please log in to get access.'));
  }
  const token = authHeader.split(' ')[1];

  // 2. Verify token — throws JsonWebTokenError / TokenExpiredError
  //    caught by globalErrorHandler (no try/catch needed here)
  const decoded = verifyToken(token, process.env.JWT_SECRET);

  // 3. Find the correct model based on role in token payload
  let currentUser;
  if (decoded.role === 'admin') {
    currentUser = await User.findById(decoded.id);
  } else {
    currentUser = await Traveler.findById(decoded.id);
  }

  if (!currentUser) {
    return next(new AppError(401, 'The user belonging to this token no longer exists.'));
  }

  // 4. Check account is active
  if (!currentUser.isActive) {
    return next(new AppError(403, 'Your account has been deactivated. Please contact support.'));
  }

  // 5. Check if admin password was changed after token was issued
  if (decoded.role === 'admin' && currentUser.changedPasswordAfter(decoded.iat)) {
    return next(new AppError(401, 'Password was recently changed. Please log in again.'));
  }

  // 6. Attach user to request
  req.user = currentUser;
  next();
});

export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return next(new AppError(403, `Access denied. Requires role: ${roles.join(' or ')}.`));
    }
    next();
  };
};
