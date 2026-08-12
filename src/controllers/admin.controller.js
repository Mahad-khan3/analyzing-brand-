const User = require('../models/User');
const Workspace = require('../models/Workspace');
const Brand = require('../models/Brand');
const Content = require('../models/Content');
const Subscription = require('../models/Subscription');
const AIHistory = require('../models/AIHistory');
const ActivityLog = require('../models/ActivityLog');
const { success } = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { audit } = require('../services/audit.service');

const stats = asyncHandler(async (req, res) => {
  const [users, workspaces, brands, content, subscriptions, aiHistory, logs] = await Promise.all([
    User.countDocuments(),
    Workspace.countDocuments(),
    Brand.countDocuments({ isActive: true }),
    Content.countDocuments(),
    Subscription.countDocuments(),
    AIHistory.countDocuments(),
    ActivityLog.countDocuments(),
  ]);
  const aiToday = await AIHistory.countDocuments({ createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } });
  return success(res, 200, {
    stats: { users, workspaces, brands, content, subscriptions, aiHistory, logs, aiToday },
  }, 'System stats');
});

const listUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const filter = {};
  if (search) filter.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
  const users = await User.find(filter).select('-password').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit));
  const total = await User.countDocuments(filter);
  return success(res, 200, { users, total, page: Number(page), limit: Number(limit) }, 'Users');
});

const updateUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role, isActive, isVerified } = req.body;
  const user = await User.findById(userId);
  if (!user) {
    const ApiError = require('../utils/ApiError');
    throw ApiError.notFound('User not found');
  }
  if (role) user.role = role;
  if (isActive !== undefined) user.isActive = isActive;
  if (isVerified !== undefined) user.isVerified = isVerified;
  await user.save();
  await audit(req, 'admin.user_updated', 'admin', { description: `Updated user ${user.email}`, metadata: { userId } });
  return success(res, 200, { user }, 'User updated');
});

const listWorkspaces = asyncHandler(async (req, res) => {
  const workspaces = await Workspace.find().sort({ createdAt: -1 }).limit(100).populate('owner', 'name email');
  return success(res, 200, { workspaces }, 'Workspaces');
});

const listBrands = asyncHandler(async (req, res) => {
  const brands = await Brand.find({ isActive: true }).sort({ createdAt: -1 }).limit(200).populate('workspace', 'name').populate('createdBy', 'name email');
  return success(res, 200, { brands }, 'Brands');
});

const listAIUsage = asyncHandler(async (req, res) => {
  const { page = 1, limit = 30 } = req.query;
  const items = await AIHistory.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit))
    .populate('user', 'name email')
    .populate('workspace', 'name');
  const total = await AIHistory.countDocuments();
  return success(res, 200, { items, total, page: Number(page), limit: Number(limit) }, 'AI usage');
});

const listSubscriptions = asyncHandler(async (req, res) => {
  const subs = await Subscription.find().sort({ createdAt: -1 }).limit(100).populate('workspace', 'name');
  return success(res, 200, { subscriptions: subs }, 'Subscriptions');
});

const listLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const items = await ActivityLog.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit))
    .populate('user', 'name email')
    .populate('workspace', 'name');
  const total = await ActivityLog.countDocuments();
  return success(res, 200, { items, total, page: Number(page), limit: Number(limit) }, 'Logs');
});

module.exports = { stats, listUsers, updateUser, listWorkspaces, listBrands, listAIUsage, listSubscriptions, listLogs };
