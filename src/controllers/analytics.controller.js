const { computeWorkspaceAnalytics, contentPerformance, recentPosts } = require('../services/analytics.service');
const { success } = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { providers } = require('../integrations/social');
const SocialAccount = require('../models/SocialAccount');
const Content = require('../models/Content');

const workspaceAnalytics = asyncHandler(async (req, res) => {
  const { brandId, from, to } = req.query;
  const data = await computeWorkspaceAnalytics({ workspace: req.workspace._id, brandId, from, to });
  return success(res, 200, data, 'Analytics');
});

const performance = asyncHandler(async (req, res) => {
  const { brandId } = req.query;
  const data = await contentPerformance(req.workspace._id, brandId);
  return success(res, 200, { posts: data }, 'Content performance');
});

const recent = asyncHandler(async (req, res) => {
  const { brandId, limit } = req.query;
  const data = await recentPosts(req.workspace._id, brandId, Number(limit) || 10);
  return success(res, 200, { posts: data }, 'Recent posts');
});

const syncSocialAnalytics = asyncHandler(async (req, res) => {
  const accounts = await SocialAccount.find({ workspace: req.workspace._id, status: 'connected' });
  let synced = 0;
  for (const account of accounts) {
    try {
      const provider = providers[account.platform];
      if (!provider || typeof provider.fetchAnalytics !== 'function') continue;
      const published = await Content.find({ workspace: req.workspace._id, status: 'published' }).limit(50);
      for (const item of published) {
        const metrics = await provider.fetchAnalytics(account, item);
        if (metrics) {
          item.analytics = { ...item.analytics, ...metrics };
          await item.save();
          synced += 1;
        }
      }
    } catch (err) {
      console.warn('[analytics] sync failed for', account.platform, err.message);
    }
  }
  return success(res, 200, { synced }, 'Analytics sync complete');
});

module.exports = { workspaceAnalytics, performance, recent, syncSocialAnalytics };
