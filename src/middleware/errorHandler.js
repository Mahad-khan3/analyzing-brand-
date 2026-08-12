const env = require('../config/env');

const notFound = (req, res, next) => {
  const err = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  err.statusCode = 404;
  err.code = 'NOT_FOUND';
  next(err);
};

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let code = err.code || 'INTERNAL_SERVER_ERROR';
  let details = err.details || null;

  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Invalid request data';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = 'Invalid identifier format';
  } else if (err.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE';
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `${field} already exists`;
  } else if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    code = 'BAD_JSON';
    message = 'Invalid JSON body';
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
    message = 'Authentication token is invalid or expired';
  } else if (err.name === 'MulterError') {
    statusCode = 400;
    code = 'UPLOAD_ERROR';
    message = err.message;
  }

  if (!err.isOperational && statusCode === 500) {
    console.error('[error]', err);
  }

  const body = {
    success: false,
    message,
    error: code,
  };
  if (details && env.NODE_ENV !== 'production') body.details = details;
  if (statusCode >= 500 && env.NODE_ENV !== 'production') body.stack = err.stack;

  return res.status(statusCode).json(body);
};

module.exports = { notFound, errorHandler };
