import { Router } from 'express';
import { getDashboardStats, getMonthlyChart } from '../controllers/dashboard.controller.js';
import { protect, restrictTo } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect, restrictTo('admin'));

router.get('/stats', getDashboardStats);
router.get('/chart', getMonthlyChart);

export default router;
