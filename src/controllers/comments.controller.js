const SocialAccount = require('../models/SocialAccount');
const Content = require('../models/Content');
const { success } = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// Comments are fetched from connected social providers. This module stores
// fetched/queued comments per workspace and content.
const listComments = asyncHandler(async (req, res) => {
  const { contentId } = req.query;
  const filter = { workspace: req.workspace._id, commentStorage: true };
  const comments = await Content.find(filter).select('_id title').lean();
  const list = comments
    .filter((c) => !contentId || String(c._id) === String(contentId))
    .map((c) => ({ contentId: c._id, title: c.title, comments: c.comments || [] }));
  return success(res, 200, { comments: list }, 'Comments');
});

const fetchComments = asyncHandler(async (req, res) => {
  const { contentId } = req.params;
  const content = await Content.findOne({ _id: contentId, workspace: req.workspace._id });
  if (!content) throw ApiError.notFound('Content not found');
  const accounts = await SocialAccount.find({ workspace: req.workspace._id, platform: { $in: content.platforms }, status: 'connected' });
  const fetched = [];
  for (const account of accounts) {
    try {
      const provider = require('../integrations/social').getProvider(account.platform);
      if (typeof provider.fetchComments === 'function') {
        const items = await provider.fetchComments(account, content);
        fetched.push({ platform: account.platform, items });
      }
    } catch (err) {
      console.warn('[comments] fetch failed for', account.platform, err.message);
    }
  }
  return success(res, 200, { fetched }, 'Comments fetched');
});

module.exports = { listComments, fetchComments };
