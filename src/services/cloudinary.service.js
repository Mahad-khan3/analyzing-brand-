const cloudinary = require('cloudinary').v2;
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

const isConfigured = () => env.hasCloudinary();

const uploadBuffer = async (buffer, { folder = 'brandpilot', publicId, resourceType = 'auto', metadata = {} } = {}) => {
  if (!isConfigured()) {
    throw ApiError.unprocessable(
      'Cloudinary is not configured on the server. Add Cloudinary credentials to the backend .env file.',
      'CLOUDINARY_NOT_CONFIGURED'
    );
  }
  return new Promise((resolve, reject) => {
    const options = {
      folder,
      resource_type: resourceType,
      ...(publicId ? { public_id: publicId } : {}),
    };
    cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(ApiError.unprocessable(`Cloudinary upload failed: ${error.message}`, 'CLOUDINARY_ERROR'));
      resolve({
        url: result.secure_url,
        publicId: result.public_id,
        resourceType: result.resource_type,
        format: result.format,
        width: result.width,
        height: result.height,
        sizeBytes: result.bytes,
        metadata,
      });
    }).end(buffer);
  });
};

const uploadUrl = async (url, { folder = 'brandpilot', publicId, resourceType = 'image' } = {}) => {
  if (!isConfigured()) {
    throw ApiError.unprocessable(
      'Cloudinary is not configured on the server. Add Cloudinary credentials to the backend .env file.',
      'CLOUDINARY_NOT_CONFIGURED'
    );
  }
  return new Promise((resolve, reject) => {
    const options = {
      folder,
      resource_type: resourceType,
      ...(publicId ? { public_id: publicId } : {}),
    };
    cloudinary.uploader.upload(url, options, (error, result) => {
      if (error) return reject(ApiError.unprocessable(`Cloudinary upload failed: ${error.message}`, 'CLOUDINARY_ERROR'));
      resolve({
        url: result.secure_url,
        publicId: result.public_id,
        resourceType: result.resource_type,
        format: result.format,
        width: result.width,
        height: result.height,
        sizeBytes: result.bytes,
      });
    });
  });
};

const destroy = async (publicId, resourceType = 'image') => {
  if (!publicId) return;
  if (!isConfigured()) return;
  return new Promise((resolve) => {
    cloudinary.uploader.destroy(publicId, { resource_type: resourceType }, (err, result) => {
      if (err) console.warn('[cloudinary] destroy error', err.message);
      resolve(result);
    });
  });
};

module.exports = { uploadBuffer, uploadUrl, destroy, isConfigured };
