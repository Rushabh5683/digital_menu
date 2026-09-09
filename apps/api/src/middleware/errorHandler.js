export class AppError extends Error {
  constructor(message, statusCode = 500, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function notFoundHandler(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;

  if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Resource not found';
  } else if (err.code === 'P2003') {
    statusCode = 400;
    message = 'Invalid related resource id';
  } else if (err.name === 'PrismaClientValidationError') {
    statusCode = 400;
    message =
      process.env.NODE_ENV !== 'production'
        ? err.message.split('\n').filter(Boolean).slice(-1)[0] || 'Invalid request data'
        : 'Invalid request data';
    if (process.env.NODE_ENV !== 'production') {
      console.error(err.message);
    }
  }

  const payload = {
    error: true,
    message,
  };

  if (details) {
    payload.details = details;
  }

  if (process.env.NODE_ENV !== 'production' && statusCode >= 500) {
    payload.stack = err.stack;
  }

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json(payload);
}
