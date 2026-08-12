const SocialAccount = require('../models/SocialAccount');
const { success } = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// DM (Direct Message) inbox architecture. Real DM pulling requires platform
// messaging APIs (Instagram/WhatsApp/FB Messenger). This module stores and lists
// DMs routed per connected account.
const listDMs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 30 } = req.query;
  const accounts = await SocialAccount.find({ workspace: req.workspace._id, status: 'connected' })
    .select('platform accountName username metadata');
  const threads = accounts
    .map((a) => ({
      id: String(a._id),
      platform: a.platform,
      accountName: a.accountName,
      username: a.username,
      dmCount: 0,
      latestMessage: null,
    }))
    .slice(0, 50);
  return success(res, 200, { threads, page: Number(page), limit: Number(limit) }, 'DM inbox');
});

const fetchDMs = asyncHandler(async (req, res) => {
  const account = await SocialAccount.findOne({ _id: req.params.accountId, workspace: req.workspace._id });
  if (!account) throw ApiError.notFound('Social account not found');
  return success(res, 200, { account: account.toSafeJSON(), messages: [] }, 'DMs fetched (requires platform messaging API connection)');
});

module.exports = { listDMs, fetchDMs };
