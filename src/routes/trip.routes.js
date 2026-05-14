import express from 'express';
import {
  getAllTrips,
  getTripById,
  createTrip,
  updateTrip,
  deleteTrip,
  addTimeSlot,
  updateTimeSlot,
  deleteTimeSlot,
} from '../controllers/trip.controller.js';
import { protect, restrictTo } from '../middleware/auth.middleware.js';
import { uploadSingle, uploadMultiple } from '../middleware/multer.middleware.js';
import { validateRequiredFields } from '../middleware/validate.middleware.js';
import validateObjectId from '../utils/validateObjectId.js';

const router = express.Router();

router.use(protect, restrictTo('admin'));

// ── Trip CRUD ─────────────────────────────────────────────────────────────────
router.get('/', getAllTrips);
router.post(
  '/',
  uploadSingle('heroImage'),
  validateRequiredFields(['name', 'fromCountry', 'toCountry', 'startDate', 'endDate', 'departureDate', 'departureTime']),
  createTrip
);

router.get('/:id', validateObjectId('id'), getTripById);
router.patch('/:id', validateObjectId('id'), uploadSingle('heroImage'), updateTrip);
router.delete('/:id', validateObjectId('id'), deleteTrip);

// ── Time slot sub-resource ────────────────────────────────────────────────────
router.post(
  '/:tripId/days/:dayNumber/timeslots',
  validateObjectId('tripId'),
  uploadMultiple('attachments', 5),
  addTimeSlot
);

router.patch(
  '/:tripId/days/:dayNumber/timeslots/:slotId',
  validateObjectId('tripId'),
  uploadMultiple('attachments', 5),
  updateTimeSlot
);

router.delete(
  '/:tripId/days/:dayNumber/timeslots/:slotId',
  validateObjectId('tripId'),
  deleteTimeSlot
);

export default router;
