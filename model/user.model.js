import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
    },

    refreshToken: {
      type: String,
      default: null,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    otp: {
      code: {
        type: String,
        default: null,
      },
      expiresAt: {
        type: Date,
        default: null,
      },
    },

    resetPasswordOtp: {
      code: {
        type: String,
        default: null,
      },
      expiresAt: {
        type: Date,
        default: null,
      },
    },

    profileImage: {
      public_id: {
        type: String,
        default: "",
      },
      url: {
        type: String,
        default: "",
      },
    },
  },
  {
    timestamps: true,
  }
);

// hash password before save
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// compare password
userSchema.methods.comparePassword = async function (plainPassword) {
  return await bcrypt.compare(plainPassword, this.password);
};

userSchema.statics.isUserExistsByEmail = async function (email) {
  return await this.findOne({ email });
};

userSchema.statics.isPasswordMatched = async function (
  plainPassword,
  hashedPassword
) {
  return await bcrypt.compare(plainPassword, hashedPassword);
};

// set normal otp
userSchema.methods.setOTP = function (code, expireMinutes = 5) {
  this.otp = {
    code,
    expiresAt: new Date(Date.now() + expireMinutes * 60 * 1000),
  };
};

// clear normal otp
userSchema.methods.clearOTP = function () {
  this.otp = {
    code: null,
    expiresAt: null,
  };
};

// check normal otp
userSchema.methods.isOTPValid = function (code) {
  return (
    this.otp?.code === code &&
    this.otp?.expiresAt &&
    this.otp.expiresAt > new Date()
  );
};

// set reset password otp
userSchema.methods.setResetPasswordOTP = function (code, expireMinutes = 5) {
  this.resetPasswordOtp = {
    code,
    expiresAt: new Date(Date.now() + expireMinutes * 60 * 1000),
  };
};

// clear reset password otp
userSchema.methods.clearResetPasswordOTP = function () {
  this.resetPasswordOtp = {
    code: null,
    expiresAt: null,
  };
};

// check reset password otp
userSchema.methods.isResetPasswordOTPValid = function (code) {
  return (
    this.resetPasswordOtp?.code === code &&
    this.resetPasswordOtp?.expiresAt &&
    this.resetPasswordOtp.expiresAt > new Date()
  );
};

// hide sensitive data in response
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.otp;
  delete obj.resetPasswordOtp;
  delete obj.refreshToken;
  return obj;
};

const User = mongoose.model("User", userSchema);

export default User;
