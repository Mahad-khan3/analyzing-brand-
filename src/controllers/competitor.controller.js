const Competitor = require('../models/Competitor');
const { success } = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { audit } = require('../services/audit.service');

const listCompetitors = asyncHandler(async (req, res) => {
  const { brandId } = req.query;
  const filter = { workspace: req.workspace._id };
  if (brandId) filter.brand = brandId;
  const items = await Competitor.find(filter).sort({ createdAt: -1 });
  return success(res, 200, { competitors: items }, 'Competitors');
});

const createCompetitor = asyncHandler(async (req, res) => {
  const data = req.body;
  const competitor = await Competitor.create({
    workspace: req.workspace._id,
    brand: data.brandId || null,
    createdBy: req.user._id,
    name: data.name,
    website: data.website || '',
    socialProfiles: data.socialProfiles || {},
    industry: data.industry || '',
    notes: data.notes || '',
  });
  await audit(req, 'competitor.created', 'brand', { description: `Added competitor ${data.name}` });
  return success(res, 201, { competitor }, 'Competitor added');
});

const updateCompetitor = asyncHandler(async (req, res) => {
  const competitor = await Competitor.findOne({ _id: req.params.id, workspace: req.workspace._id });
  if (!competitor) throw ApiError.notFound('Competitor not found');
  ['name', 'website', 'socialProfiles', 'industry', 'notes', 'brandId'].forEach((k) => {
    if (req.body[k] !== undefined) competitor[k] = req.body[k];
  });
  await competitor.save();
  return success(res, 200, { competitor }, 'Competitor updated');
});

const deleteCompetitor = asyncHandler(async (req, res) => {
  const competitor = await Competitor.findOne({ _id: req.params.id, workspace: req.workspace._id });
  if (!competitor) throw ApiError.notFound('Competitor not found');
  await competitor.deleteOne();
  await audit(req, 'competitor.deleted', 'brand', { description: `Removed competitor ${competitor.name}` });
  return success(res, 200, null, 'Competitor removed');
});

module.exports = { listCompetitors, createCompetitor, updateCompetitor, deleteCompetitor };
