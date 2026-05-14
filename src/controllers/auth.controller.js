import crypto from 'crypto';
import User from '../models/User.model.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import { sendResponse } from '../utils/sendResponse.js';
import { generateToken, verifyToken } from '../utils/jwt.js';
import { sanitizeUser } from '../utils/commonFunctions.js';
import { sendOTPEmail } from '../utils/sendEmail.js';

const signTokens = (id, role) => {
  const payload = { id, role };
  const accessToken = generateToken(payload, process.env.JWT_SECRET, process.env.JWT_EXPIRES_IN || '7d');
  const refreshToken = generateToken(payload, process.env.JWT_REFRESH_SECRET, process.env.JWT_REFRESH_EXPIRES_IN || '30d');
  return { accessToken, refreshToken };
};

// POST /auth/login
export const adminLogin = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError(400, 'Please provide email and password'));
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError(401, 'Invalid credentials'));
  }

  if (!user.isActive) {
    return next(new AppError(403, 'Your account has been deactivated'));
  }

  const { accessToken, refreshToken } = signTokens(user._id, user.role);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Login successful',
    data: { user: sanitizeUser(user), accessToken, refreshToken },
  });
});

// POST /auth/forgot-password
export const adminForgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError(400, 'Please provide your email address'));
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });

  // Always respond with 200 regardless of whether email exists (prevents user enumeration)
  if (user) {
    const otp = user.createPasswordResetOTP();
    await user.save({ validateBeforeSave: false });

    try {
      await sendOTPEmail({ to: user.email, otp, purpose: 'reset' });
    } catch {
      user.passwordResetOTP = undefined;
      user.passwordResetOTPExpiry = undefined;
      await user.save({ validateBeforeSave: false });
      return next(new AppError(500, 'Failed to send email. Please try again later.'));
    }
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'If that email address is registered, an OTP has been sent.',
  });
});

// POST /auth/verify-otp
export const adminVerifyOTP = catchAsync(async (req, res, next) => {
  const { otp } = req.body;

  if (!otp) {
    return next(new AppError(400, 'OTP is required'));
  }

  const hashedOTP = crypto.createHash('sha256').update(String(otp)).digest('hex');

  const user = await User.findOne({
    passwordResetOTP: hashedOTP,
    passwordResetOTPExpiry: { $gt: Date.now() },
  }).select('+passwordResetOTP +passwordResetOTPExpiry');

  if (!user) {
    return next(new AppError(400, 'Invalid or expired OTP'));
  }

  // Generate short-lived reset token (15 min) — purpose field locks it to password reset only
  const resetToken = generateToken(
    { id: user._id, purpose: 'reset' },
    process.env.JWT_SECRET,
    '15m'
  );

  // Clear OTP so it cannot be reused
  user.passwordResetOTP = undefined;
  user.passwordResetOTPExpiry = undefined;
  await user.save({ validateBeforeSave: false });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'OTP verified successfully',
    data: { resetToken },
  });
});

// POST /auth/reset-password
export const adminResetPassword = catchAsync(async (req, res, next) => {
  const { resetToken, newPassword, confirmPassword } = req.body;

  if (!resetToken || !newPassword || !confirmPassword) {
    return next(new AppError(400, 'resetToken, newPassword, and confirmPassword are required'));
  }

  if (newPassword !== confirmPassword) {
    return next(new AppError(400, 'Passwords do not match'));
  }

  // Verify reset token — global error handler handles JWT errors
  let decoded;
  try {
    decoded = verifyToken(resetToken, process.env.JWT_SECRET);
  } catch {
    return next(new AppError(400, 'Invalid or expired reset token'));
  }

  if (decoded.purpose !== 'reset') {
    return next(new AppError(400, 'Invalid reset token'));
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    return next(new AppError(404, 'User not found'));
  }

  // Assign plain password — pre-save hook will hash it and set passwordChangedAt
  user.password = newPassword;
  await user.save();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Password changed successfully',
  });
});

// PATCH /auth/change-password  (protected — requires req.user)
export const adminChangePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return next(new AppError(400, 'currentPassword, newPassword, and confirmPassword are required'));
  }

  if (newPassword !== confirmPassword) {
    return next(new AppError(400, 'New passwords do not match'));
  }

  // Re-fetch with password field (protect middleware doesn't select it)
  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.correctPassword(currentPassword, user.password))) {
    return next(new AppError(401, 'Current password is incorrect'));
  }

  user.password = newPassword;
  // pre-save hook handles hashing + sets passwordChangedAt
  await user.save();

  // Regenerate tokens so the client stays logged in with fresh credentials
  const { accessToken, refreshToken } = signTokens(user._id, user.role);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Password changed successfully',
    data: { accessToken, refreshToken },
  });
});
