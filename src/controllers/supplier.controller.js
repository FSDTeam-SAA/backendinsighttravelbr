import Supplier from '../models/Supplier.model.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import { sendResponse } from '../utils/sendResponse.js';
import { getPaginationMeta } from '../utils/commonFunctions.js';
import { uploadOnCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';

const ALLOWED_SUPPLIER_FIELDS = ['name', 'email', 'phone', 'country', 'category', 'isActive'];

// ── GET /suppliers ────────────────────────────────────────────────────────────
export const getAllSuppliers = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = {};

  if (req.query.search) {
    const regex = new RegExp(req.query.search, 'i');
    filter.$or = [{ name: regex }, { country: regex }];
  }

  if (req.query.category) {
    filter.category = req.query.category;
  }

  const total = await Supplier.countDocuments(filter);
  const items = await Supplier.find(filter)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const meta = getPaginationMeta(total, page, limit);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Suppliers fetched successfully',
    data: { items, meta },
  });
});

// ── GET /suppliers/:id ────────────────────────────────────────────────────────
export const getSupplierById = catchAsync(async (req, res, next) => {
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) return next(new AppError(404, 'Supplier not found'));

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Supplier fetched successfully',
    data: { supplier },
  });
});

// ── POST /suppliers ───────────────────────────────────────────────────────────
export const createSupplier = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (email) {
    const exists = await Supplier.findOne({ email: email.toLowerCase().trim() });
    if (exists) return next(new AppError(409, 'A supplier with this email already exists'));
  }

  let logo = { public_id: '', url: '' };
  if (req.file) {
    const result = await uploadOnCloudinary(req.file.buffer, 'insighttravelbr/suppliers');
    logo = { public_id: result.public_id, url: result.secure_url };
  }

  const supplier = await Supplier.create({
    name: req.body.name,
    email,
    phone: req.body.phone,
    country: req.body.country,
    category: req.body.category,
    logo,
  });

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Supplier created successfully',
    data: { supplier },
  });
});

// ── PATCH /suppliers/:id ──────────────────────────────────────────────────────
export const updateSupplier = catchAsync(async (req, res, next) => {
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) return next(new AppError(404, 'Supplier not found'));

  if (req.file) {
    if (supplier.logo?.public_id) await deleteFromCloudinary(supplier.logo.public_id);
    const result = await uploadOnCloudinary(req.file.buffer, 'insighttravelbr/suppliers');
    supplier.logo = { public_id: result.public_id, url: result.secure_url };
  }

  ALLOWED_SUPPLIER_FIELDS.forEach((field) => {
    if (req.body[field] !== undefined) supplier[field] = req.body[field];
  });

  await supplier.save();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Supplier updated successfully',
    data: { supplier },
  });
});

// ── DELETE /suppliers/:id ─────────────────────────────────────────────────────
export const deleteSupplier = catchAsync(async (req, res, next) => {
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) return next(new AppError(404, 'Supplier not found'));

  if (supplier.logo?.public_id) await deleteFromCloudinary(supplier.logo.public_id);

  await supplier.deleteOne();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Supplier deleted successfully',
  });
});
