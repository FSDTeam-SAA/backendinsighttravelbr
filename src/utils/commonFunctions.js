const SENSITIVE_FIELDS = [
  'password',
  'otp',
  'resetPasswordOtp',
  'refreshToken',
  'passwordResetOTP',
  'passwordResetOTPExpiry',
  'passwordChangedAt',
];

export const sanitizeUser = (user) => {
  const obj = user.toObject ? user.toObject() : { ...user };
  SENSITIVE_FIELDS.forEach((field) => delete obj[field]);
  return obj;
};

export const getPaginationMeta = (total, page, limit) => {
  return {
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / limit),
  };
};
