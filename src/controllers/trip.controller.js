import Trip from '../models/Trip.model.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import { sendResponse } from '../utils/sendResponse.js';
import { getPaginationMeta } from '../utils/commonFunctions.js';
import { uploadOnCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';

// Safely parse a value that might arrive as a JSON string (multipart/form-data)
const safeParseJSON = (val) => {
  if (!val || typeof val !== 'string') return val;
  try { return JSON.parse(val); } catch { return val; }
};

// Fields an admin is allowed to update on a trip document
const ALLOWED_TRIP_FIELDS = [
  'name', 'fromCountry', 'toCountry', 'startDate', 'endDate',
  'departureDate', 'departureTime', 'travelers', 'destinationGuides', 'usefulApps',
];

// Fields an admin is allowed to set on a time slot
const ALLOWED_SLOT_FIELDS = ['activityTime', 'activityTitle', 'supplier', 'description', 'order'];

// Build one itinerary day per calendar day between startDate and endDate (inclusive)
const buildItinerary = (startDate, endDate) => {
  const days = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  let dayNumber = 1;
  while (current <= end) {
    days.push({ dayNumber, date: new Date(current), timeSlots: [] });
    current.setDate(current.getDate() + 1);
    dayNumber++;
  }
  return days;
};

// ── GET /trips ────────────────────────────────────────────────────────────────
export const getAllTrips = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = {};

  if (req.query.search) {
    const regex = new RegExp(req.query.search, 'i');
    filter.$or = [{ name: regex }, { toCountry: regex }];
  }

  if (req.query.status && req.query.status !== 'All') {
    filter.status = req.query.status;
  }

  const total = await Trip.countDocuments(filter);
  const items = await Trip.find(filter)
    .skip(skip)
    .limit(limit)
    .sort({ startDate: -1 })
    .populate('travelers', 'name email')
    .populate('itinerary.timeSlots.supplier', 'name');

  const meta = getPaginationMeta(total, page, limit);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Trips fetched successfully',
    data: { items, meta },
  });
});

// ── GET /trips/:id ────────────────────────────────────────────────────────────
export const getTripById = catchAsync(async (req, res, next) => {
  const trip = await Trip.findById(req.params.id)
    .populate('travelers', 'name email phone cpf photo')
    .populate('itinerary.timeSlots.supplier', 'name category country')
    .populate('createdBy', 'email');

  if (!trip) return next(new AppError(404, 'Trip not found'));

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Trip fetched successfully',
    data: { trip },
  });
});

// ── POST /trips ───────────────────────────────────────────────────────────────
export const createTrip = catchAsync(async (req, res, next) => {
  const body = req.body;

  if (!body.startDate || !body.endDate) {
    return next(new AppError(400, 'startDate and endDate are required'));
  }

  let heroImage = { public_id: '', url: '' };
  if (req.file) {
    const result = await uploadOnCloudinary(req.file.buffer, 'insighttravelbr/trips');
    heroImage = { public_id: result.public_id, url: result.secure_url };
  }

  const trip = await Trip.create({
    heroImage,
    name: body.name,
    fromCountry: body.fromCountry,
    toCountry: body.toCountry,
    startDate: body.startDate,
    endDate: body.endDate,
    departureDate: body.departureDate,
    departureTime: body.departureTime,
    travelers: safeParseJSON(body.travelers) || [],
    itinerary: buildItinerary(body.startDate, body.endDate),
    destinationGuides: safeParseJSON(body.destinationGuides),
    usefulApps: safeParseJSON(body.usefulApps) || [],
    createdBy: req.user._id,
  });

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Trip created successfully',
    data: { trip },
  });
});

// ── PATCH /trips/:id ──────────────────────────────────────────────────────────
export const updateTrip = catchAsync(async (req, res, next) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) return next(new AppError(404, 'Trip not found'));

  if (req.file) {
    if (trip.heroImage?.public_id) await deleteFromCloudinary(trip.heroImage.public_id);
    const result = await uploadOnCloudinary(req.file.buffer, 'insighttravelbr/trips');
    trip.heroImage = { public_id: result.public_id, url: result.secure_url };
  }

  ALLOWED_TRIP_FIELDS.forEach((field) => {
    if (req.body[field] !== undefined) {
      trip[field] = safeParseJSON(req.body[field]);
    }
  });

  // pre-save hook re-calculates status from endDate automatically
  await trip.save();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Trip updated successfully',
    data: { trip },
  });
});

// ── DELETE /trips/:id ─────────────────────────────────────────────────────────
export const deleteTrip = catchAsync(async (req, res, next) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) return next(new AppError(404, 'Trip not found'));

  // Collect every Cloudinary asset on the trip
  const publicIds = [];
  if (trip.heroImage?.public_id) publicIds.push(trip.heroImage.public_id);
  trip.itinerary?.forEach((day) => {
    day.timeSlots?.forEach((slot) => {
      slot.attachments?.forEach((att) => {
        if (att.public_id) publicIds.push(att.public_id);
      });
    });
  });

  await Promise.all(publicIds.map((id) => deleteFromCloudinary(id)));
  await trip.deleteOne();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Trip deleted successfully',
  });
});

// ── POST /trips/:tripId/days/:dayNumber/timeslots ─────────────────────────────
export const addTimeSlot = catchAsync(async (req, res, next) => {
  const { tripId, dayNumber } = req.params;

  const trip = await Trip.findById(tripId);
  if (!trip) return next(new AppError(404, 'Trip not found'));

  const day = trip.itinerary.find((d) => d.dayNumber === parseInt(dayNumber, 10));
  if (!day) return next(new AppError(404, `Day ${dayNumber} not found in itinerary`));

  const attachments = [];
  if (req.files?.length) {
    for (const file of req.files) {
      const result = await uploadOnCloudinary(file.buffer, 'insighttravelbr/attachments');
      attachments.push({
        public_id: result.public_id,
        url: result.secure_url,
        filename: file.originalname,
      });
    }
  }

  day.timeSlots.push({
    activityTime: req.body.activityTime,
    activityTitle: req.body.activityTitle,
    supplier: req.body.supplier || undefined,
    description: req.body.description,
    order: req.body.order ? parseInt(req.body.order, 10) : 0,
    attachments,
  });

  await trip.save();

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Time slot added successfully',
    data: { trip },
  });
});

// ── PATCH /trips/:tripId/days/:dayNumber/timeslots/:slotId ───────────────────
export const updateTimeSlot = catchAsync(async (req, res, next) => {
  const { tripId, dayNumber, slotId } = req.params;

  const trip = await Trip.findById(tripId);
  if (!trip) return next(new AppError(404, 'Trip not found'));

  const day = trip.itinerary.find((d) => d.dayNumber === parseInt(dayNumber, 10));
  if (!day) return next(new AppError(404, `Day ${dayNumber} not found in itinerary`));

  const slot = day.timeSlots.id(slotId);
  if (!slot) return next(new AppError(404, 'Time slot not found'));

  ALLOWED_SLOT_FIELDS.forEach((field) => {
    if (req.body[field] !== undefined) slot[field] = req.body[field];
  });

  // Upload any new attachment files
  if (req.files?.length) {
    for (const file of req.files) {
      const result = await uploadOnCloudinary(file.buffer, 'insighttravelbr/attachments');
      slot.attachments.push({
        public_id: result.public_id,
        url: result.secure_url,
        filename: file.originalname,
      });
    }
  }

  // Remove attachments: client sends array of public_ids to delete
  const toRemove = safeParseJSON(req.body.removeAttachments) || [];
  if (toRemove.length) {
    await Promise.all(toRemove.map((id) => deleteFromCloudinary(id)));
    slot.attachments = slot.attachments.filter((a) => !toRemove.includes(a.public_id));
  }

  await trip.save();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Time slot updated successfully',
    data: { trip },
  });
});

// ── DELETE /trips/:tripId/days/:dayNumber/timeslots/:slotId ──────────────────
export const deleteTimeSlot = catchAsync(async (req, res, next) => {
  const { tripId, dayNumber, slotId } = req.params;

  const trip = await Trip.findById(tripId);
  if (!trip) return next(new AppError(404, 'Trip not found'));

  const day = trip.itinerary.find((d) => d.dayNumber === parseInt(dayNumber, 10));
  if (!day) return next(new AppError(404, `Day ${dayNumber} not found in itinerary`));

  const slot = day.timeSlots.id(slotId);
  if (!slot) return next(new AppError(404, 'Time slot not found'));

  // Delete every Cloudinary attachment on this slot
  await Promise.all(
    (slot.attachments ?? [])
      .filter((a) => a.public_id)
      .map((a) => deleteFromCloudinary(a.public_id))
  );

  slot.deleteOne();
  await trip.save();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Time slot deleted successfully',
  });
});
