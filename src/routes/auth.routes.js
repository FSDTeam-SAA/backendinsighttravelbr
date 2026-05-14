import express from 'express';
import {
  adminLogin,
  adminForgotPassword,
  adminVerifyOTP,
  adminResetPassword,
  adminChangePassword,
} from '../controllers/auth.controller.js';
import { protect, restrictTo } from '../middleware/auth.middleware.js';
import { authLimiter } from '../middleware/rateLimiter.middleware.js';
import { validateRequiredFields } from '../middleware/validate.middleware.js';

const router = express.Router();

// Unauthenticated routes — rate limited to prevent brute-force / enumeration
router.post('/login', authLimiter, validateRequiredFields(['email', 'password']), adminLogin);
router.post('/forgot-password', authLimiter, adminForgotPassword);
router.post('/verify-otp', authLimiter, adminVerifyOTP);
router.post('/reset-password', authLimiter, adminResetPassword);

router.patch('/change-password', protect, restrictTo('admin'), adminChangePassword);

export default router;
