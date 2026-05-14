import { Router } from 'express';
import { verifyFact } from '../controllers/factCheck.controller.js';
import { protect, restrictTo } from '../middleware/auth.middleware.js';
import { aiLimiter } from '../middleware/rateLimiter.middleware.js';
import { validateRequiredFields } from '../middleware/validate.middleware.js';

const router = Router();

router.use(protect, restrictTo('admin'));

router.post(
  '/verify',
  aiLimiter,
  validateRequiredFields(['text']),
  verifyFact
);

export default router;
