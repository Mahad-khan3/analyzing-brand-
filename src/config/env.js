const dotenv = require('dotenv');

dotenv.config();

const bool = (v, def = false) => {
  if (v === undefined || v === null || v === '') return def;
  return ['1', 'true', 'yes'].includes(String(v).toLowerCase());
};

const env = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/brandpilot-ai',

  JWT_SECRET: process.env.JWT_SECRET || 'dev-jwt-secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev-jwt-refresh-secret',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || '',

  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',

  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  GEMINI_MAX_TOKENS: parseInt(process.env.GEMINI_MAX_TOKENS || '8192', 10),
  GEMINI_TEMPERATURE: parseFloat(process.env.GEMINI_TEMPERATURE || '0.7'),

  FAL_KEY: process.env.FAL_KEY || '',
  FAL_MODEL: process.env.FAL_MODEL || 'fal-ai/flux/dev',
  FAL_BASE_URL: process.env.FAL_BASE_URL || 'https://queue.fal.run',
  FAL_TIMEOUT_MS: parseInt(process.env.FAL_TIMEOUT_MS || '300000', 10),
  FLUX_DEFAULT_WIDTH: parseInt(process.env.FLUX_DEFAULT_WIDTH || '1080', 10),
  FLUX_DEFAULT_HEIGHT: parseInt(process.env.FLUX_DEFAULT_HEIGHT || '1080', 10),

  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',
  REDIS_DB: parseInt(process.env.REDIS_DB || '0', 10),
  REDIS_ENABLED: bool(process.env.REDIS_ENABLED, true),

  THROTTLE_TTL: parseInt(process.env.THROTTLE_TTL || '60', 10),
  THROTTLE_LIMIT: parseInt(process.env.THROTTLE_LIMIT || '100', 10),

  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'BrandPilot AI <no-reply@brandpilot.ai>',

  isProduction: () => env.NODE_ENV === 'production',
  hasGemini: () => Boolean(env.GEMINI_API_KEY),
  hasFal: () => Boolean(env.FAL_KEY),
  hasCloudinary: () => Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET),
  hasSmtp: () => Boolean(env.SMTP_USER && env.SMTP_PASS),
};

module.exports = env;
