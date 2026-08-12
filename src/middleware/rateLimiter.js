const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const createLimiter = (options = {}) =>
  rateLimit({
    windowMs: (options.windowMs || env.THROTTLE_TTL) * 1000,
    limit: options.limit || env.THROTTLE_LIMIT,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many requests, please try again later',
      error: 'RATE_LIMITED',
    },
    ...options,
  });

const authLimiter = createLimiter({ windowMs: 15 * 60, limit: 50 });
const aiLimiter = createLimiter({ windowMs: 60, limit: 30 });
const uploadLimiter = createLimiter({ windowMs: 60, limit: 20 });

module.exports = { createLimiter, authLimiter, aiLimiter, uploadLimiter };
