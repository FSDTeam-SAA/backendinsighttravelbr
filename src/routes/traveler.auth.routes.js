import express from 'express';
import {
  travelerLogin,
  travelerForgotPassword,
  travelerVerifyOTP,
  travelerResetPassword,
} from '../controllers/traveler.auth.controller.js';

const router = express.Router();

router.post('/login', travelerLogin);
router.post('/forgot-password', travelerForgotPassword);
router.post('/verify-otp', travelerVerifyOTP);
router.post('/reset-password', travelerResetPassword);

export default router;
