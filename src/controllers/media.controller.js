const Media = require('../models/Media');
const { success } = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const cloudinary = require('../services/cloudinary.service');
const { audit } = require('../services/audit.service');

const listMedia = asyncHandler(async (req, res) => {
  const { type, brandId, page = 1, limit = 30 } = req.query;
  const filter = { workspace: req.workspace._id };
  if (type) filter.type = type;
  if (brandId) filter.brand = brandId;
  const items = await Media.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .populate('brand', 'name');
  const total = await Media.countDocuments(filter);
  return success(res, 200, { items, total, page: Number(page), limit: Number(limit) }, 'Media library');
});

const uploadMedia = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('File is required');
  const { brandId, type = 'image' } = req.body;
  const up = await cloudinary.uploadBuffer(req.file.buffer, {
    folder: `brandpilot/${req.workspace._id}/media`,
    resourceType: req.file.mimetype.startsWith('video') ? 'video' : 'image',
  });
  const media = await Media.create({
    workspace: req.workspace._id,
    brand: brandId || null,
    uploadedBy: req.user._id,
    type,
    url: up.url,
    publicId: up.publicId,
    width: up.width,
    height: up.height,
    sizeBytes: req.file.size,
    mimeType: req.file.mimetype,
    filename: req.file.originalname,
    format: up.format,
  });
  await audit(req, 'media.uploaded', 'media', { description: 'Uploaded media file' });
  return success(res, 201, { media }, 'File uploaded');
});

const deleteMedia = asyncHandler(async (req, res) => {
  const media = await Media.findOne({ _id: req.params.id, workspace: req.workspace._id });
  if (!media) throw ApiError.notFound('Media not found');
  await cloudinary.destroy(media.publicId, media.resourceType);
  await media.deleteOne();
  await audit(req, 'media.deleted', 'media', { description: 'Deleted media file' });
  return success(res, 200, null, 'Media deleted');
});

module.exports = { listMedia, uploadMedia, deleteMedia };
