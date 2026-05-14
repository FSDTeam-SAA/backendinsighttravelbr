import Trip from '../models/Trip.model.js';
import Traveler from '../models/Traveler.model.js';
import Supplier from '../models/Supplier.model.js';
import catchAsync from '../utils/catchAsync.js';
import { sendResponse } from '../utils/sendResponse.js';

// ── GET /dashboard/stats ──────────────────────────────────────────────────────
export const getDashboardStats = catchAsync(async (req, res, next) => {
  const [
    totalTrips,
    totalTravelers,
    totalSuppliers,
    ongoingTrips,
    endedTrips,
    recentTrips,
    recentTravelers,
    suppliersByCategory,
  ] = await Promise.all([
    Trip.countDocuments(),
    Traveler.countDocuments(),
    Supplier.countDocuments(),
    Trip.countDocuments({ status: 'Ongoing' }),
    Trip.countDocuments({ status: 'End' }),

    Trip.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name startDate endDate status fromCountry toCountry heroImage'),

    Traveler.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email phone photo totalTrips language'),

    // Breakdown of active suppliers per category
    Supplier.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Dashboard stats fetched successfully',
    data: {
      overview: {
        totalTrips,
        totalTravelers,
        totalSuppliers,
        ongoingTrips,
        endedTrips,
      },
      recentTrips,
      recentTravelers,
      suppliersByCategory: suppliersByCategory.map((s) => ({
        category: s._id,
        count: s.count,
      })),
    },
  });
});

// ── GET /dashboard/chart ──────────────────────────────────────────────────────
export const getMonthlyChart = catchAsync(async (req, res, next) => {
  // Default: last 12 months including the current month
  const months = parseInt(req.query.months) || 12;

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - (months - 1));
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);

  const groupByMonth = {
    _id: {
      year: { $year: '$createdAt' },
      month: { $month: '$createdAt' },
    },
    count: { $sum: 1 },
  };

  const [tripsByMonth, travelersByMonth] = await Promise.all([
    Trip.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: groupByMonth },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    Traveler.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: groupByMonth },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
  ]);

  // Build a full month-by-month series so the frontend gets 0s for empty months
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const chart = [];
  const cursor = new Date(startDate);
  const now = new Date();

  while (
    cursor.getFullYear() < now.getFullYear() ||
    (cursor.getFullYear() === now.getFullYear() && cursor.getMonth() <= now.getMonth())
  ) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth() + 1; // 1-indexed to match MongoDB $month

    const tripEntry = tripsByMonth.find((d) => d._id.year === year && d._id.month === month);
    const travelerEntry = travelersByMonth.find((d) => d._id.year === year && d._id.month === month);

    chart.push({
      label: `${MONTH_NAMES[month - 1]} ${String(year).slice(-2)}`,
      year,
      month,
      trips: tripEntry?.count ?? 0,
      travelers: travelerEntry?.count ?? 0,
    });

    cursor.setMonth(cursor.getMonth() + 1);
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Monthly chart data fetched successfully',
    data: { months: chart },
  });
});
