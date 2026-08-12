const ActivityLog = require('../models/ActivityLog');
const { success } = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const listActivities = asyncHandler(async (req, res) => {
  const { page = 1, limit = 30, category } = req.query;
  const filter = { workspace: req.workspace._id };
  if (category) filter.category = category;
  const items = await ActivityLog.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .populate('user', 'name email');
  const total = await ActivityLog.countDocuments(filter);
  return success(res, 200, { items, total, page: Number(page), limit: Number(limit) }, 'Activity log');
});

const listMyActivities = asyncHandler(async (req, res) => {
  const { page = 1, limit = 30 } = req.query;
  const items = await ActivityLog.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));
  const total = await ActivityLog.countDocuments({ user: req.user._id });
  return success(res, 200, { items, total, page: Number(page), limit: Number(limit) }, 'Activity log');
});

module.exports = { listActivities, listMyActivities };
