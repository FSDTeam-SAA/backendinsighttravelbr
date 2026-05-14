import express from 'express';
import {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '../controllers/supplier.controller.js';
import { protect, restrictTo } from '../middleware/auth.middleware.js';
import { uploadSingle } from '../middleware/multer.middleware.js';
import { validateRequiredFields } from '../middleware/validate.middleware.js';
import validateObjectId from '../utils/validateObjectId.js';

const router = express.Router();

router.use(protect, restrictTo('admin'));

router.get('/', getAllSuppliers);
router.post(
  '/',
  uploadSingle('logo'),
  validateRequiredFields(['name', 'email', 'country', 'category']),
  createSupplier
);

router.get('/:id', validateObjectId('id'), getSupplierById);
router.patch('/:id', validateObjectId('id'), uploadSingle('logo'), updateSupplier);
router.delete('/:id', validateObjectId('id'), deleteSupplier);

export default router;
