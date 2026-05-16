import express from 'express';
import {
  getAllTravelers,
  getTravelerById,
  createTraveler,
  updateTraveler,
  deleteTraveler,
  getTravelerTrips,
} from '../controllers/traveler.controller.js';
import { protect, restrictTo } from '../middleware/auth.middleware.js';
import { uploadSingle } from '../middleware/multer.middleware.js';
import { validateRequiredFields } from '../middleware/validate.middleware.js';
import validateObjectId from '../utils/validateObjectId.js';

const router = express.Router();


router.get('/me', protect, getTravelerTrips);

router.use(protect, restrictTo('admin'));

router.get('/', getAllTravelers);
router.post(
  '/',
  uploadSingle('photo'),
  // validateRequiredFields(['name', 'email', 'cpf', 'dateOfBirth', 'password', 'confirmPassword']),
  createTraveler
);

router.get('/:id', validateObjectId('id'), getTravelerById);
router.patch('/:id', validateObjectId('id'), uploadSingle('photo'), updateTraveler);
router.delete('/:id', validateObjectId('id'), deleteTraveler);



export default router;
