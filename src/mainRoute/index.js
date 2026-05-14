import express from 'express';
import authRoutes from '../routes/auth.routes.js';
import travelerAuthRoutes from '../routes/traveler.auth.routes.js';
// import tripRoutes from '../routes/trip.routes.js';
// import travelerRoutes from '../routes/traveler.routes.js';
// import supplierRoutes from '../routes/supplier.routes.js';

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth
router.use('/auth', authRoutes);
router.use('/traveler/auth', travelerAuthRoutes);

// Feature routes (added in later prompts)
// router.use('/trips', tripRoutes);
// router.use('/travelers', travelerRoutes);
// router.use('/suppliers', supplierRoutes);

export default router;
