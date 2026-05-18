import crypto from 'crypto';
import Traveler from '../models/Traveler.model.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import { sendResponse } from '../utils/sendResponse.js';
import { generateToken, verifyToken } from '../utils/jwt.js';
import { sanitizeUser } from '../utils/commonFunctions.js';
import { sendOTPEmail } from '../utils/sendEmail.js';

const signTokens = (id) => {
  const payload = { id, role: 'traveler' };
  const accessToken = generateToken(payload, process.env.JWT_SECRET, process.env.JWT_EXPIRES_IN || '7d');
  const refreshToken = generateToken(payload, process.env.JWT_REFRESH_SECRET, process.env.JWT_REFRESH_EXPIRES_IN || '30d');
  return { accessToken, refreshToken };
};

// POST /traveler/auth/login
export const travelerLogin = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError(400, 'Please provide email and password'));
  }

  const traveler = await Traveler.findOne({
    email: email.toLowerCase().trim(),
  }).select('+password');

  if (!traveler || !(await traveler.correctPassword(password, traveler.password))) {
    return next(new AppError(401, 'Invalid credentials'));
  }

  if (!traveler.isActive) {
    return next(new AppError(403, 'Your account has been deactivated. Please contact support.'));
  }

  const { accessToken, refreshToken } = signTokens(traveler._id);

  const sanitized = sanitizeUser(traveler);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Login successful',
    data: {
      traveler: {
        ...sanitized,
        language: traveler.language,
      },
      accessToken,
      refreshToken,
    },
  });
});

// POST /traveler/auth/forgot-password
export const travelerForgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError(400, 'Please provide your email address'));
  }

  const traveler = await Traveler.findOne({ email: email });

  // Always return 200 — prevents user enumeration
  if (traveler) {
    const otp = traveler.createPasswordResetOTP();
    await traveler.save({ validateBeforeSave: false });

    try {
      await sendOTPEmail({ to: traveler.email, otp, purpose: 'reset' });
    } catch {
      traveler.passwordResetOTP = undefined;
      traveler.passwordResetOTPExpiry = undefined;
      await traveler.save({ validateBeforeSave: false });
      return next(new AppError(500, 'Failed to send email. Please try again later.'));
    }
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'If that email address is registered, an OTP has been sent.',
  });
});

// POST /traveler/auth/verify-otp
export const travelerVerifyOTP = catchAsync(async (req, res, next) => {
  const { otp, email } = req.body;

  if (!otp) {
    return next(new AppError(400, 'OTP is required'));
  }

  const hashedOTP = crypto.createHash('sha256').update(String(otp)).digest('hex');

  const traveler = await Traveler.findOne({
    email: email,
    passwordResetOTP: hashedOTP,
    passwordResetOTPExpiry: { $gt: Date.now() },
  }).select('+passwordResetOTP +passwordResetOTPExpiry');

  if (!traveler) {
    return next(new AppError(400, 'Invalid or expired OTP'));
  }

  const resetToken = generateToken(
    { id: traveler._id, purpose: 'reset' },
    process.env.JWT_SECRET,
    '15m'
  );

  traveler.passwordResetOTP = undefined;
  traveler.passwordResetOTPExpiry = undefined;
  await traveler.save({ validateBeforeSave: false });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'OTP verified successfully',
    data: { resetToken },
  });
});

// POST /traveler/auth/reset-password
export const travelerResetPassword = catchAsync(async (req, res, next) => {
  const { resetToken, newPassword, confirmPassword } = req.body;

  if (!resetToken || !newPassword || !confirmPassword) {
    return next(new AppError(400, 'resetToken, newPassword, and confirmPassword are required'));
  }

  if (newPassword !== confirmPassword) {
    return next(new AppError(400, 'Passwords do not match'));
  }

  let decoded;
  try {
    decoded = verifyToken(resetToken, process.env.JWT_SECRET);
  } catch {
    return next(new AppError(400, 'Invalid or expired reset token'));
  }

  if (decoded.purpose !== 'reset') {
    return next(new AppError(400, 'Invalid reset token'));
  }

  const traveler = await Traveler.findById(decoded.id);
  if (!traveler) {
    return next(new AppError(404, 'Traveler not found'));
  }

  traveler.password = newPassword;
  traveler.confirmPassword = newPassword; // satisfy confirmPassword virtual validation
  await traveler.save();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Password changed successfully',
  });
});
