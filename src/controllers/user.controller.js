const User = require('../models/User');
const { success } = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sanitizeUser } = require('../utils/crypto');
const cloudinary = require('../services/cloudinary.service');
const { audit } = require('../services/audit.service');

const getProfile = asyncHandler(async (req, res) => {
  return success(res, 200, { user: sanitizeUser(req.user) }, 'Profile');
});

const updateProfile = asyncHandler(async (req, res) => {
  const { name, preferences } = req.body;
  if (name) req.user.name = name;
  if (preferences) {
    let prefs = preferences;
    if (typeof prefs === 'string') {
      try { prefs = JSON.parse(prefs); } catch { prefs = {}; }
    }
    req.user.preferences = { ...(req.user.preferences?.toObject?.() || {}), ...prefs };
  }
  if (req.file) {
    const up = await cloudinary.uploadBuffer(req.file.buffer, { folder: 'brandpilot/avatars', resourceType: 'image' });
    req.user.profileImage = up.url;
  }
  await req.user.save();
  await audit(req, 'user.profile_updated', 'settings', { description: 'Updated profile' });
  return success(res, 200, { user: sanitizeUser(req.user) }, 'Profile updated');
});

const getSubscriptions = asyncHandler(async (req, res) => {
  const Subscription = require('../models/Subscription');
  const plans = await Subscription.find({ workspace: { $in: req.user.subscriptionWorkspaces || [] } });
  return success(res, 200, { plans }, 'Subscriptions');
});

module.exports = { getProfile, updateProfile };
