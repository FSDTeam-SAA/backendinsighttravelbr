import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: ['Tour Operator', 'Hotel', 'Restaurant', 'Transport', 'Guide', 'Other'],
        message: '{VALUE} is not a valid category',
      },
    },
    logo: {
      public_id: { type: String, default: '' },
      url: { type: String, default: '' },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Indexes
supplierSchema.index({ category: 1 });
supplierSchema.index({ country: 1 });

const Supplier = mongoose.model('Supplier', supplierSchema);

export default Supplier;
