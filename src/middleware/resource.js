const Brand = require('../models/Brand');
const Content = require('../models/Content');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const loadBrand = asyncHandler(async (req, res, next) => {
  const brandId = req.params.brandId;
  const brand = await Brand.findOne({ _id: brandId, workspace: req.workspace._id, isActive: true });
  if (!brand) throw ApiError.notFound('Brand not found in this workspace');
  req.brand = brand;
  next();
});

const loadContent = asyncHandler(async (req, res, next) => {
  const content = await Content.findOne({ _id: req.params.id, workspace: req.workspace._id });
  if (!content) throw ApiError.notFound('Content not found');
  req.content = content;
  next();
});

module.exports = { loadBrand, loadContent };
