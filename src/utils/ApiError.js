class ApiError extends Error {
  constructor(statusCode, message, code = 'ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg = 'Bad request', code = 'BAD_REQUEST', details = null) {
    return new ApiError(400, msg, code, details);
  }

  static unauthorized(msg = 'Not authorized', code = 'UNAUTHORIZED') {
    return new ApiError(401, msg, code);
  }

  static forbidden(msg = 'Forbidden', code = 'FORBIDDEN') {
    return new ApiError(403, msg, code);
  }

  static notFound(msg = 'Resource not found', code = 'NOT_FOUND') {
    return new ApiError(404, msg, code);
  }

  static conflict(msg = 'Conflict', code = 'CONFLICT') {
    return new ApiError(409, msg, code);
  }

  static unprocessable(msg = 'Unprocessable entity', code = 'UNPROCESSABLE_ENTITY', details = null) {
    return new ApiError(422, msg, code, details);
  }

  static tooManyRequests(msg = 'Too many requests', code = 'RATE_LIMITED') {
    return new ApiError(429, msg, code);
  }
}

module.exports = ApiError;
