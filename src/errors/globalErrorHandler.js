import AppError from '../utils/AppError.js';

const handleCastError = (err) =>
  new AppError(400, `Invalid ${err.path}: ${err.value}`);

const handleDuplicateKeyError = (err) => {
  const match = err.message.match(/"([^"]*)"/);
  const value = match ? match[1] : 'value';
  return new AppError(400, `Duplicate field value: "${value}". Please use another value.`);
};

const handleValidationError = (err) => {
  const message = Object.values(err.errors)
    .map((e) => e.message)
    .join('. ');
  return new AppError(400, message);
};

const handleJWTError = () =>
  new AppError(401, 'Invalid token. Please log in again.');

const handleJWTExpiredError = () =>
  new AppError(401, 'Your token has expired. Please log in again.');

const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  let error = Object.assign(Object.create(Object.getPrototypeOf(err)), err);
  error.message = err.message;

  if (err.name === 'CastError') error = handleCastError(err);
  if (err.code === 11000) error = handleDuplicateKeyError(err);
  if (err.name === 'ValidationError') error = handleValidationError(err);
  if (err.name === 'JsonWebTokenError') error = handleJWTError();
  if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

  const isDev = process.env.NODE_ENV === 'development';

  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.isOperational ? error.message : 'Something went wrong',
    ...(isDev && { stack: err.stack }),
  });
};

export default globalErrorHandler;
