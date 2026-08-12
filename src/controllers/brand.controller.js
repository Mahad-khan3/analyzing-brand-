const Brand = require('../models/Brand');
const BrandMemory = require('../models/BrandMemory');
const { success } = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const cloudinary = require('../services/cloudinary.service');
const { audit } = require('../services/audit.service');
const { enforceLimit } = require('../services/subscription.service');

const listBrands = asyncHandler(async (req, res) => {
  const brands = await Brand.find({ workspace: req.workspace._id, isActive: true })
    .sort({ createdAt: -1 })
    .populate('createdBy', 'name email');
  return success(res, 200, { brands }, 'Brands');
});

const getBrand = asyncHandler(async (req, res) => {
  const brand = req.brand;
  const [memory, analysis, libraryCount, contentCount] = await Promise.all([
    BrandMemory.findOne({ brand: brand._id }),
    require('../models/BrandAnalysis').findOne({ brand: brand._id }).sort({ analysisDate: -1 }),
    require('../models/BrandLibrary').countDocuments({ brand: brand._id }),
    require('../models/Content').countDocuments({ brand: brand._id }),
  ]);
  return success(res, 200, { brand, memory, analysis, libraryCount, contentCount }, 'Brand detail');
});

const createBrand = asyncHandler(async (req, res) => {
  await enforceLimit(req.workspace._id, 'brands');
  const data = req.body;
  const brand = await Brand.create({
    workspace: req.workspace._id,
    createdBy: req.user._id,
    name: data.name,
    description: data.description || '',
    website: data.website || '',
    instagram: data.instagram || '',
    facebook: data.facebook || '',
    linkedin: data.linkedin || '',
    twitter: data.twitter || '',
    youtube: data.youtube || '',
    category: data.category || '',
    isStartup: Boolean(data.isStartup),
    theme: data.theme || 'premium',
    colors: data.colors || undefined,
    fonts: data.fonts || undefined,
    onboarding: { status: 'not_started', currentStep: 0, stepsCompleted: [] },
  });
  await BrandMemory.create({ brand: brand._id, workspace: req.workspace._id, summary: brand.description });

  await audit(req, 'brand.created', 'brand', { brand, description: `Created brand "${brand.name}"` });
  return success(res, 201, { brand }, 'Brand created');
});

const updateBrand = asyncHandler(async (req, res) => {
  const brand = req.brand;
  const allowed = ['name', 'description', 'website', 'instagram', 'facebook', 'linkedin', 'twitter', 'youtube', 'category', 'theme', 'colors', 'fonts', 'username', 'isStartup'];
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) brand[key] = req.body[key];
  });
  await brand.save();
  await audit(req, 'brand.updated', 'brand', { brand, description: `Updated brand "${brand.name}"` });
  return success(res, 200, { brand }, 'Brand updated');
});

const deleteBrand = asyncHandler(async (req, res) => {
  const brand = req.brand;
  brand.isActive = false;
  await brand.save();
  await audit(req, 'brand.deleted', 'brand', { brand, description: `Deleted brand "${brand.name}"` });
  return success(res, 200, null, 'Brand deleted');
});

const uploadBrandLogo = asyncHandler(async (req, res) => {
  const brand = req.brand;
  if (!req.file) throw ApiError.badRequest('Logo image is required');
  const up = await cloudinary.uploadBuffer(req.file.buffer, { folder: `brandpilot/${brand.workspace}/logos`, resourceType: 'image' });
  brand.logoUrl = up.url;
  brand.logoPublicId = up.publicId;
  await brand.save();

  const Media = require('../models/Media');
  await Media.create({
    workspace: brand.workspace,
    brand: brand._id,
    uploadedBy: req.user._id,
    type: 'logo',
    url: up.url,
    publicId: up.publicId,
    width: up.width,
    height: up.height,
    sizeBytes: up.sizeBytes,
  });

  await audit(req, 'brand.logo_uploaded', 'brand', { brand, description: 'Uploaded brand logo' });
  return success(res, 200, { brand }, 'Logo uploaded');
});

const updateOnboarding = asyncHandler(async (req, res) => {
  const brand = req.brand;
  const { status, currentStep, step } = req.body;
  if (status) brand.onboarding.status = status;
  if (currentStep !== undefined) brand.onboarding.currentStep = currentStep;
  if (step) {
    if (!brand.onboarding.stepsCompleted.includes(step)) brand.onboarding.stepsCompleted.push(step);
  }
  await brand.save();
  return success(res, 200, { brand }, 'Onboarding progress updated');
});

const completeOnboarding = asyncHandler(async (req, res) => {
  const brand = req.brand;
  brand.onboarding.status = 'completed';
  brand.onboarding.currentStep = 99;
  await brand.save();
  await audit(req, 'brand.onboarding_completed', 'brand', { brand, description: `Completed onboarding for "${brand.name}"` });
  return success(res, 200, { brand }, 'Onboarding completed');
});

module.exports = { listBrands, getBrand, createBrand, updateBrand, deleteBrand, uploadBrandLogo, updateOnboarding, completeOnboarding };
