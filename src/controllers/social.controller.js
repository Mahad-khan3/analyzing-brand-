const SocialAccount = require('../models/SocialAccount');
const { success } = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { providers } = require('../integrations/social');
const { audit } = require('../services/audit.service');
const { enforceLimit } = require('../services/subscription.service');

const PLATFORMS = ['facebook', 'instagram', 'linkedin', 'twitter', 'tiktok', 'pinterest', 'youtube'];

const listAccounts = asyncHandler(async (req, res) => {
  const accounts = await SocialAccount.find({ workspace: req.workspace._id }).sort({ createdAt: -1 });
  return success(res, 200, { accounts: accounts.map((a) => a.toSafeJSON()) }, 'Connected accounts');
});

const connectAccount = asyncHandler(async (req, res) => {
  await enforceLimit(req.workspace._id, 'socialAccounts');
  const { platform, accountId, accountName, username, accessToken, refreshToken, tokenExpiresAt, metadata } = req.body;

  if (!PLATFORMS.includes(platform)) throw ApiError.badRequest('Invalid platform');
  if (!accountId) throw ApiError.badRequest('accountId is required');
  if (!accessToken) throw ApiError.badRequest('accessToken is required');

  // In a production setup OAuth happens server-side and tokens are never sent from the client.
  // This endpoint exists for developer/testing flows with long-lived tokens.
  if (['facebook', 'instagram', 'linkedin', 'pinterest', 'twitter', 'tiktok', 'youtube'].includes(platform)) {
    const acct = await SocialAccount.findOneAndUpdate(
      { workspace: req.workspace._id, platform, accountId },
      {
        workspace: req.workspace._id,
        user: req.user._id,
        platform,
        accountId,
        accountName: accountName || accountId,
        username: username || '',
        accessToken,
        refreshToken: refreshToken || '',
        tokenExpiresAt: tokenExpiresAt || null,
        metadata: metadata || {},
        status: 'connected',
        lastError: '',
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    await audit(req, 'social.connected', 'social', { description: `Connected ${platform} account` });
    return success(res, 200, { account: acct.toSafeJSON() }, `${platform} account connected`);
  }
  throw ApiError.badRequest('Unsupported platform');
});

const disconnectAccount = asyncHandler(async (req, res) => {
  const account = await SocialAccount.findOne({ _id: req.params.id, workspace: req.workspace._id });
  if (!account) throw ApiError.notFound('Social account not found');
  account.status = 'disconnected';
  account.accessToken = '';
  account.refreshToken = '';
  await account.save();
  await audit(req, 'social.disconnected', 'social', { description: `Disconnected ${account.platform} account` });
  return success(res, 200, { account: account.toSafeJSON() }, 'Account disconnected');
});

const refreshAccount = asyncHandler(async (req, res) => {
  const account = await SocialAccount.findOne({ _id: req.params.id, workspace: req.workspace._id });
  if (!account) throw ApiError.notFound('Social account not found');
  try {
    const provider = providers[account.platform];
    const refreshed = await provider.refreshToken(account);
    if (refreshed?.accessToken) {
      account.accessToken = refreshed.accessToken;
      if (refreshed.refreshToken) account.refreshToken = refreshed.refreshToken;
      if (refreshed.expiresAt) account.tokenExpiresAt = refreshed.expiresAt;
      account.status = 'connected';
      await account.save();
    }
    return success(res, 200, { account: account.toSafeJSON() }, 'Account refreshed');
  } catch (err) {
    account.status = 'error';
    account.lastError = err.message;
    await account.save();
    throw err;
  }
});

const getPlatforms = asyncHandler(async (req, res) => {
  return success(res, 200, {
    platforms: PLATFORMS.map((p) => ({
      platform: p,
      status: providers[p] && typeof providers[p].publish === 'function' ? 'available' : 'unavailable',
    })),
  }, 'Available platforms');
});

module.exports = { listAccounts, connectAccount, disconnectAccount, refreshAccount, getPlatforms };
