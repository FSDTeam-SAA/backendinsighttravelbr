import express from 'express';
import {
  adminLogin,
  adminForgotPassword,
  adminVerifyOTP,
  adminResetPassword,
  adminChangePassword,
} from '../controllers/auth.controller.js';
import { protect, restrictTo } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/login', adminLogin);
router.post('/forgot-password', adminForgotPassword);
router.post('/verify-otp', adminVerifyOTP);
router.post('/reset-password', adminResetPassword);

router.patch('/change-password', protect, restrictTo('admin'), adminChangePassword);

export default router;
