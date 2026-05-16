import Traveler from '../models/Traveler.model.js';
import Trip from '../models/Trip.model.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import { sendResponse } from '../utils/sendResponse.js';
import { getPaginationMeta, sanitizeUser } from '../utils/commonFunctions.js';
import { uploadOnCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';

const ALLOWED_TRAVELER_FIELDS = [
  'name', 'email', 'cpf', 'dateOfBirth', 'phone', 'passportNumber', 'language',
];

// ── GET /travelers ────────────────────────────────────────────────────────────
export const getAllTravelers = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.search) {
    const regex = new RegExp(req.query.search, 'i');
    filter.$or = [{ name: regex }, { email: regex }];
  }

  const total = await Traveler.countDocuments(filter);
  const travelers = await Traveler.find(filter)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const items = travelers.map(sanitizeUser);
  const meta = getPaginationMeta(total, page, limit);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Travelers fetched successfully',
    data: { items, meta },
  });
});

// ── GET /travelers/:id ────────────────────────────────────────────────────────
export const getTravelerById = catchAsync(async (req, res, next) => {
  const traveler = await Traveler.findById(req.params.id);
  if (!traveler) return next(new AppError(404, 'Traveler not found'));

  // Relationship lives on Trip side — query trips this traveler is part of
  const trips = await Trip.find({ travelers: traveler._id })
    .select('name startDate endDate status fromCountry toCountry heroImage');

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Traveler fetched successfully',
    data: { traveler: sanitizeUser(traveler), trips },
  });
});

// ── POST /travelers ───────────────────────────────────────────────────────────
export const createTraveler = catchAsync(async (req, res, next) => {
  const { email, cpf } = req.body;

  // Explicit duplicate checks for clearer error messages than the mongo 11000 handler
  if (email) {
    const emailExists = await Traveler.findOne({ email: email.toLowerCase().trim() });
    if (emailExists) return next(new AppError(409, 'A traveler with this email already exists'));
  }

  if (cpf) {
    const cpfExists = await Traveler.findOne({ cpf: cpf.trim() });
    if (cpfExists) return next(new AppError(409, 'A traveler with this CPF already exists'));
  }

  let photo = { public_id: '', url: '' };
  if (req.file) {
    const result = await uploadOnCloudinary(req.file.buffer, 'insighttravelbr/travelers');
    photo = { public_id: result.public_id, url: result.secure_url };
  }

  const traveler = await Traveler.create({
    name: req.body.name,
    email,
    cpf,
    dateOfBirth: req.body.dateOfBirth,
    phone: req.body.phone,
    passportNumber: req.body.passportNumber,
    password: req.body.password,
    language: req.body.language,
    photo,
  });

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Traveler created successfully',
    data: { traveler: sanitizeUser(traveler) },
  });
});

// ── PATCH /travelers/:id ──────────────────────────────────────────────────────
export const updateTraveler = catchAsync(async (req, res, next) => {
  const traveler = await Traveler.findById(req.params.id);
  if (!traveler) return next(new AppError(404, 'Traveler not found'));

  if (req.file) {
    if (traveler.photo?.public_id) await deleteFromCloudinary(traveler.photo.public_id);
    const result = await uploadOnCloudinary(req.file.buffer, 'insighttravelbr/travelers');
    traveler.photo = { public_id: result.public_id, url: result.secure_url };
  }

  ALLOWED_TRAVELER_FIELDS.forEach((field) => {
    if (req.body[field] !== undefined) traveler[field] = req.body[field];
  });

  await traveler.save();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Traveler updated successfully',
    data: { traveler: sanitizeUser(traveler) },
  });
});

// ── DELETE /travelers/:id ─────────────────────────────────────────────────────
export const deleteTraveler = catchAsync(async (req, res, next) => {
  const traveler = await Traveler.findById(req.params.id);
  if (!traveler) return next(new AppError(404, 'Traveler not found'));

  if (traveler.photo?.public_id) await deleteFromCloudinary(traveler.photo.public_id);

  await traveler.deleteOne();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Traveler deleted successfully',
  });
});



export const getTravelerTrips = catchAsync(async (req, res, next) => {
  const traveler = await Traveler.findById({_id: req.user._id});
  if (!traveler) return next(new AppError(404, 'Traveler not found'));

  const trips = await Trip.find({ travelers: traveler._id , status: 'Ongoing' })
    // .select('name startDate endDate status fromCountry toCountry heroImage')
    .sort({ startDate: -1 });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Traveler trips fetched successfully',
    data: { trips },
  });
});