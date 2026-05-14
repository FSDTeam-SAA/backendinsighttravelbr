import { Router } from 'express';
import { generateContent } from '../controllers/aiContent.controller.js';
import { protect, restrictTo } from '../middleware/auth.middleware.js';
import { aiLimiter } from '../middleware/rateLimiter.middleware.js';
import { validateRequiredFields } from '../middleware/validate.middleware.js';

const router = Router();

router.use(protect, restrictTo('admin'));

router.post(
  '/generate',
  aiLimiter,
  validateRequiredFields(['destinationName', 'contentType']),
  generateContent
);

export default router;
