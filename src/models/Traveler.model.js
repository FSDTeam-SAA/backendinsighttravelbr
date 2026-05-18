import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const travelerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    cpf: {
      type: String,
      required: [true, 'CPF is required'],
      unique: true,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },
    phone: {
      type: String,
      trim: true,
    },
    passportNumber: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    photo: {
      public_id: { type: String, default: '' },
      url: { type: String, default: '' },
    },
    totalTrips: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    passwordResetOTP: {
      type: String,
      select: false,
    },
    passwordResetOTPExpiry: {
      type: Date,
      select: false,
    },
    language: {
      type: String,
      default: 'pt-BR',
      trim: true,
    },
  },
  { timestamps: true }
);

// Virtual: confirmPassword is validated but never persisted to DB
travelerSchema
  .virtual('confirmPassword')
  .get(function () {
    return this._confirmPassword;
  })
  .set(function (value) {
    this._confirmPassword = value;
  });

// Validate confirmPassword matches password before saving
travelerSchema.pre('save', function (next) {
  if ((this.isNew || this.isModified('password')) && this._confirmPassword !== undefined) {
    if (this.password !== this._confirmPassword) {
      return next(new Error('Passwords do not match'));
    }
  }
  // Ensure confirmPassword is never persisted
  this._confirmPassword = undefined;
});

// Hash password if modified
travelerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return 
  this.password = await bcrypt.hash(this.password, 12);
});

travelerSchema.methods.correctPassword = async function (candidatePassword, hashedPassword) {
  return bcrypt.compare(candidatePassword, hashedPassword);
};

travelerSchema.methods.createPasswordResetOTP = function () {
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  console.log(`Generated OTP for ${this.email}: ${otp}`); // Log OTP for testing purposes
  this.passwordResetOTP = crypto.createHash('sha256').update(otp).digest('hex');
  this.passwordResetOTPExpiry = new Date(Date.now() + 10 * 60 * 1000);
  return otp;
};

// Indexes
travelerSchema.index({ email: 1 });
travelerSchema.index({ cpf: 1 });

const Traveler = mongoose.model('Traveler', travelerSchema);

export default Traveler;
