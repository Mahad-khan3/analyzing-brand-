const { getProvider } = require('../integrations/social');
const SocialAccount = require('../models/SocialAccount');
const Content = require('../models/Content');
const { notify } = require('./notification.service');
const { logActivity } = require('./audit.service');
const ApiError = require('../utils/ApiError');

const publishContent = async (contentId, { accountIds } = {}) => {
  const content = await Content.findById(contentId);
  if (!content) throw ApiError.notFound('Content not found');

  let accounts;
  if (accountIds && accountIds.length) {
    accounts = await SocialAccount.find({ _id: { $in: accountIds }, workspace: content.workspace, status: 'connected' });
  } else {
    accounts = await SocialAccount.find({ workspace: content.workspace, platform: { $in: content.platforms }, status: 'connected' });
  }

  if (!accounts.length) {
    throw ApiError.unprocessable(
      'No connected social account found for this content. Connect a social account first.',
      'NO_SOCIAL_ACCOUNT'
    );
  }

  content.status = 'processing';
  await content.save();

  const results = [];
  let allOk = true;
  let firstError = null;

  for (const account of accounts) {
    try {
      const provider = getProvider(account.platform);
      const result = await provider.publish(account, content);
      results.push({ platform: account.platform, accountId: account._id, success: true, ...result });

      // optimistic analytics snapshot (updated later by real APIs when available)
      content.analytics = content.analytics || {};
      content.analytics.impressions = (content.analytics.impressions || 0) + (result.impressions || 0);
      content.analytics.reach = (content.analytics.reach || 0) + (result.reach || 0);
      content.analytics.likes = (content.analytics.likes || 0) + (result.likes || 0);
      content.analytics.comments = (content.analytics.comments || 0) + (result.comments || 0);
      content.analytics.shares = (content.analytics.shares || 0) + (result.shares || 0);
    } catch (err) {
      allOk = false;
      firstError = firstError || err.message;
      results.push({ platform: account.platform, accountId: account._id, success: false, error: err.message });
    }
  }

  content.publishResults = results;
  content.publishedAt = new Date();

  if (allOk) {
    content.status = 'published';
    content.lastError = '';
    content.errorCode = '';
    content.analytics.engagement = (content.analytics.likes || 0) + (content.analytics.comments || 0) + (content.analytics.shares || 0);
    await content.save();

    await notify({
      user: content.createdBy,
      workspace: content.workspace,
      type: 'post_published',
      title: 'Post published',
      message: `"${content.title || content.caption?.slice(0, 40) || 'Untitled'}" was published successfully.`,
      severity: 'success',
      data: { contentId: content._id },
    });
    await logActivity({
      workspace: content.workspace,
      user: content.createdBy,
      brand: content.brand,
      action: 'content.published',
      category: 'content',
      description: `Published content to ${accounts.map((a) => a.platform).join(', ')}`,
      metadata: { contentId: content._id, results },
    });
  } else {
    content.status = 'failed';
    content.lastError = firstError || 'Publishing failed';
    content.errorCode = 'SOCIAL_PUBLISH_FAILED';
    await content.save();

    await notify({
      user: content.createdBy,
      workspace: content.workspace,
      type: 'post_failed',
      title: 'Post failed',
      message: `"${content.title || 'Untitled'}" could not be published: ${firstError}`,
      severity: 'error',
      data: { contentId: content._id },
    });
  }

  return { status: content.status, results };
};

module.exports = { publishContent };
