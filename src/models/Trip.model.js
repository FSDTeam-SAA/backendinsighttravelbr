import mongoose from 'mongoose';

const { Schema } = mongoose;

const appSchema = new Schema(
  {
    appName: { type: String, required: [true, 'App name is required'] },
    iosLink: { type: String },
    androidLink: { type: String },
    websiteLink: { type: String },
  },
  { _id: false }
);

// ── UsefulAppCategorySchema ────────────────────────────────────────────────
const usefulAppCategorySchema = new Schema(
  {
    categoryName: {
      type: String,
      enum: {
        values: [
          'Currency Exchange',
          'Cost of Living',
          'Restaurant Guides',
          'Travel Essentials',
          'Language Translation',
          'Travel Insurance',
        ],
        message: '{VALUE} is not a valid app category',
      },
    },
    icon: { type: String },
    apps: [appSchema],
  },
  { _id: false }
);

// ── DestinationGuidesSchema ────────────────────────────────────────────────
const destinationGuidesSchema = new Schema(
  {
    fromCountry: {
      fromCountry: { type: String},

      quickFacts: {
        currency: { type: String },
        language: { type: String },
        religion: { type: String },
        government: { type: String },
      },
      historyAndCulture: { type: String },
      cityCuriosities: [
        {
          cityName: { type: String },
          description: { type: String },
          _id: false,
        },
      ],
    },
    toCountry: {
      toCountry: { type: String },

      quickFacts: {
        currency: { type: String },
        language: { type: String },
        religion: { type: String },
        government: { type: String },
      },
      historyAndCulture: { type: String },
      cityCuriosities: [
        {
          cityName: { type: String },
          description: { type: String },
          _id: false,
        },
      ],
    }


  },
  { _id: false }
);

// ── TimeSlotSchema ─────────────────────────────────────────────────────────
const timeSlotSchema = new Schema({
  activityTime: {
    type: String,
    required: [true, 'Activity time is required'],
  },
  activityTitle: {
    type: String,
    required: [true, 'Activity title is required'],
  },
  supplier: {
    type: Schema.Types.ObjectId,
    ref: 'Supplier',
  },
  description: { type: String },
  attachments: [
    {
      public_id: { type: String },
      url: { type: String },
      filename: { type: String },
      _id: false,
    },
  ],
  order: { type: Number, default: 0 },
});

// ── DaySchema ──────────────────────────────────────────────────────────────
const daySchema = new Schema({
  dayNumber: {
    type: Number,
    required: [true, 'Day number is required'],
  },
  date: {
    type: Date,
    required: [true, 'Day date is required'],
  },
  timeSlots: [timeSlotSchema],
});

// ── TripSchema ─────────────────────────────────────────────────────────────
const tripSchema = new Schema(
  {
    heroImage: {
      public_id: { type: String, default: '' },
      url: { type: String, default: '' },
    },
    name: {
      type: String,
      required: [true, 'Trip name is required'],
      trim: true,
    },
    fromCountry: {
      type: String,
      required: [true, 'Origin country is required'],
      trim: true,
    },
    toCountry: {
      type: String,
      required: [true, 'Destination country is required'],
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    departureDate: {
      type: Date,
      required: [true, 'Departure date is required'],
    },
    departureTime: {
      type: String,
      required: [true, 'Departure time is required'],
    },
    travelers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Traveler',
      },
    ],
    status: {
      type: String,
      enum: ['Ongoing', 'End'],
      default: 'Ongoing',
    },
    itinerary: [daySchema],
    destinationGuides: destinationGuidesSchema,
    usefulApps: [usefulAppCategorySchema],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: always returns real-time computed status based on endDate
tripSchema.virtual('currentStatus').get(function () {
  if (!this.endDate) return 'Ongoing';
  return this.endDate < new Date() ? 'End' : 'Ongoing';
});

// Pre-save: sync persisted status field with endDate so DB queries stay accurate
tripSchema.pre('save', function (next) {
  if (this.endDate) {
    this.status = this.endDate < new Date() ? 'End' : 'Ongoing';
  }
});

// Pre-find: ensure status is always current when querying
// Keeps persisted status accurate for range/filter queries without extra round-trips
tripSchema.pre(/^find/, function (next) {
  const now = new Date();
  // If the query doesn't already filter by status, add a post-query status correction
  this._autoStatusUpdate = now;
});

tripSchema.post(/^find/, function (docs) {
  if (!docs) return;
  const now = this._autoStatusUpdate;
  const list = Array.isArray(docs) ? docs : [docs];
  list.forEach((doc) => {
    if (doc && doc.endDate) {
      doc.status = doc.endDate < now ? 'End' : 'Ongoing';
    }
  });
});

// Indexes
tripSchema.index({ status: 1 });
tripSchema.index({ startDate: -1 });

const Trip = mongoose.model('Trip', tripSchema);

export default Trip;
