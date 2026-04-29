import User from "../model/user.model.js";
import AppError from "../errors/AppError.js";
import catchAsync from "../utils/catchAsync.js";
import httpStatus from "http-status";
import sendResponse from "../utils/sendResponse.js";
import { createToken } from "../utils/authToken.js";
import { generateOTP } from "../utils/commonMethod.js";
import { sendEmail } from "../utils/sendEmail.js";

export const register = catchAsync(async (req, res) => {
  const {
    name,
    email,
    password,
    confirmPassword,
    phoneNumber,
    role,
  } = req.body;

  if (!name || !email || !password || !confirmPassword || !phoneNumber) {
    throw new AppError(httpStatus.BAD_REQUEST, "All fields required");
  }

  if (password !== confirmPassword) {
    throw new AppError(httpStatus.BAD_REQUEST, "Passwords not match");
  }

  const exists = await User.findOne({ email: email.toLowerCase().trim() });
  if (exists) {
    throw new AppError(httpStatus.BAD_REQUEST, "Email already exists");
  }

  const user = await User.create({
    name,
    email: email.toLowerCase().trim(),
    password,
    phoneNumber,
    role: role || "user", // figma te role select thakle ekhane pathaite parba
  });

  const otp = generateOTP();

  user.setOTP(otp);
  await user.save();

  await sendEmail(user.email, "Email Verification OTP", `Your OTP is ${otp}`);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Registered successfully. Verify OTP sent to email.",
    data: {
      email: user.email,
      role: user.role,
      otp, // dev only
    },
  });
});

export const verifyEmail = catchAsync(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new AppError(httpStatus.BAD_REQUEST, "Email and OTP are required");
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (!user.isOTPValid(otp)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid or expired OTP");
  }

  user.isEmailVerified = true;
  user.clearOTP();

  await user.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Email verified successfully",
  });
});

export const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError(httpStatus.BAD_REQUEST, "Email and password required");
  }

  const user = await User.findOne({
    email: email.toLowerCase().trim(),
  }).select("+password");

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (!user.isEmailVerified) {
    throw new AppError(httpStatus.FORBIDDEN, "Email not verified");
  }

  const match = await user.comparePassword(password);

  if (!match) {
    throw new AppError(httpStatus.FORBIDDEN, "Wrong password");
  }

  const payload = {
    _id: user._id,
    email: user.email,
    role: user.role,
  };

  const accessToken = createToken(
    payload,
    process.env.JWT_ACCESS_SECRET,
    "1d"
  );

  const refreshToken = createToken(
    payload,
    process.env.JWT_REFRESH_SECRET,
    "7d"
  );

  user.refreshToken = refreshToken;
  await user.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Login successful",
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      accessToken,
      refreshToken,
    },
  });
});

export const forgetPassword = catchAsync(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new AppError(httpStatus.BAD_REQUEST, "Email is required");
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  const otp = generateOTP();

  user.setResetPasswordOTP(otp);
  await user.save();

  await sendEmail(user.email, "Reset OTP", `Your OTP is ${otp}`);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "OTP sent",
    data: {
      email: user.email,
      otp, // dev only
    },
  });
});

export const verifyResetPasswordOTP = catchAsync(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new AppError(httpStatus.BAD_REQUEST, "Email and OTP are required");
  }

  const user = await User.findOne({
    email: email.toLowerCase().trim(),
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (!user.isResetPasswordOTPValid(otp)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid or expired OTP");
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "OTP verified successfully",
    data: {
      email: user.email,
      resetOtpVerified: true,
    },
  });
});

export const resetPassword = catchAsync(async (req, res) => {
  const { email, otp, password, confirmPassword } = req.body;

  if (!email || !otp || !password || !confirmPassword) {
    throw new AppError(httpStatus.BAD_REQUEST, "All fields required");
  }

  if (password !== confirmPassword) {
    throw new AppError(httpStatus.BAD_REQUEST, "Passwords not match");
  }

  const user = await User.findOne({
    email: email.toLowerCase().trim(),
  }).select("+password");

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (!user.isResetPasswordOTPValid(otp)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid or expired OTP");
  }

  user.password = password;
  user.clearResetPasswordOTP();

  await user.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Password reset successful",
  });
});


export const logout = catchAsync(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Unauthorized");
  }

  await User.findByIdAndUpdate(userId, {
    refreshToken: "",
  });

  res.clearCookie("refreshToken");

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Logged out successfully",
    data: {},
  });
});