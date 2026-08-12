const BrandLibrary = require('../models/BrandLibrary');
const { success } = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const cloudinary = require('../services/cloudinary.service');
const { audit } = require('../services/audit.service');

const listAssets = asyncHandler(async (req, res) => {
  const { assetType, brandId, folder, search, page = 1, limit = 30 } = req.query;
  const filter = { workspace: req.workspace._id };
  if (assetType) filter.assetType = assetType;
  if (brandId) filter.brand = brandId;
  if (folder) filter.folder = folder;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { title: { $regex: search, $options: 'i' } },
      { tags: { $regex: search, $options: 'i' } },
    ];
  }
  const items = await BrandLibrary.find(filter)
    .sort({ isFavorite: -1, createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .populate('brand', 'name logoUrl');
  const total = await BrandLibrary.countDocuments(filter);
  const folders = await BrandLibrary.distinct('folder', { workspace: req.workspace._id });
  return success(res, 200, { items, total, folders, page: Number(page), limit: Number(limit) }, 'Library assets');
});

const createAsset = asyncHandler(async (req, res) => {
  const asset = await BrandLibrary.create({
    workspace: req.workspace._id,
    brand: req.body.brandId || null,
    user: req.user._id,
    assetType: req.body.assetType || 'other',
    name: req.body.name || '',
    title: req.body.title || '',
    caption: req.body.caption || '',
    hashtags: req.body.hashtags || [],
    cta: req.body.cta || '',
    prompt: req.body.prompt || '',
    imageUrl: req.body.imageUrl || '',
    publicId: req.body.publicId || '',
    data: req.body.data || {},
    tags: req.body.tags || [],
    folder: req.body.folder || 'General',
  });
  await audit(req, 'library.asset_created', 'media', { description: 'Saved asset to library' });
  return success(res, 201, { asset }, 'Asset saved');
});

const updateAsset = asyncHandler(async (req, res) => {
  const asset = await BrandLibrary.findOne({ _id: req.params.id, workspace: req.workspace._id });
  if (!asset) throw ApiError.notFound('Asset not found');
  ['name', 'title', 'caption', 'hashtags', 'cta', 'prompt', 'tags', 'folder', 'isFavorite', 'brandId'].forEach((k) => {
    if (req.body[k] !== undefined) asset[k] = req.body[k];
  });
  await asset.save();
  return success(res, 200, { asset }, 'Asset updated');
});

const deleteAsset = asyncHandler(async (req, res) => {
  const asset = await BrandLibrary.findOne({ _id: req.params.id, workspace: req.workspace._id });
  if (!asset) throw ApiError.notFound('Asset not found');
  await cloudinary.destroy(asset.publicId);
  await asset.deleteOne();
  await audit(req, 'library.asset_deleted', 'media', { description: 'Deleted library asset' });
  return success(res, 200, null, 'Asset deleted');
});

module.exports = { listAssets, createAsset, updateAsset, deleteAsset };
