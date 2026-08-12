const Content = require('../models/Content');
const SocialAccount = require('../models/SocialAccount');
const Brand = require('../models/Brand');

const computeWorkspaceAnalytics = async ({ workspace, brandId, from, to }) => {
  const match = { workspace };
  if (brandId) match.brand = brandId;
  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) match.createdAt.$lte = new Date(to);
  }

  const [statusAgg, contentAgg, accounts, brands] = await Promise.all([
    Content.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Content.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          impressions: { $sum: '$analytics.impressions' },
          reach: { $sum: '$analytics.reach' },
          likes: { $sum: '$analytics.likes' },
          comments: { $sum: '$analytics.comments' },
          shares: { $sum: '$analytics.shares' },
          saved: { $sum: '$analytics.saved' },
        },
      },
    ]),
    SocialAccount.find({ workspace, status: 'connected' }).select('platform accountName status'),
    Brand.find({ workspace, isActive: true }).select('name logoUrl colors'),
  ]);

  const statusMap = {};
  statusAgg.forEach((s) => { statusMap[s._id] = s.count; });

  const totals = contentAgg[0] || {};
  const engagement = (totals.likes || 0) + (totals.comments || 0) + (totals.shares || 0);
  const engagementRate = totals.reach ? Math.round((engagement / totals.reach) * 10000) / 100 : 0;

  return {
    totals: {
      posts: totals.total || 0,
      published: statusMap.published || 0,
      scheduled: statusMap.scheduled || 0,
      drafts: statusMap.drafts || 0,
      failed: statusMap.failed || 0,
      impressions: totals.impressions || 0,
      reach: totals.reach || 0,
      likes: totals.likes || 0,
      comments: totals.comments || 0,
      shares: totals.shares || 0,
      saved: totals.saved || 0,
      engagement,
      engagementRate,
    },
    platforms: await platformPerformance(workspace, brandId),
    recentPosts: await recentPosts(workspace, brandId),
    connectedAccounts: accounts,
    brands,
    statusBreakdown: statusMap,
  };
};

const platformPerformance = async (workspace, brandId) => {
  const match = { workspace, status: 'published' };
  if (brandId) match.brand = brandId;
  const agg = await Content.aggregate([
    { $match: match },
    { $unwind: '$publishResults' },
    {
      $group: {
        _id: '$publishResults.platform',
        posts: { $sum: 1 },
        impressions: { $sum: '$analytics.impressions' },
        likes: { $sum: '$analytics.likes' },
        comments: { $sum: '$analytics.comments' },
        shares: { $sum: '$analytics.shares' },
      },
    },
    { $sort: { posts: -1 } },
  ]);
  return agg;
};

const recentPosts = async (workspace, brandId, limit = 10) => {
  const filter = { workspace };
  if (brandId) filter.brand = brandId;
  return Content.find(filter).sort({ createdAt: -1 }).limit(limit)
    .populate('brand', 'name logoUrl')
    .select('title caption status platforms scheduledAt publishedAt analytics createdAt lastError');
};

const contentPerformance = async (workspace, brandId) => {
  const filter = { workspace, status: 'published' };
  if (brandId) filter.brand = brandId;
  const posts = await Content.find(filter).sort({ 'analytics.engagement': -1 }).limit(50)
    .populate('brand', 'name')
    .select('title platforms caption analytics publishedAt brand');
  return posts.map((p) => ({
    id: p._id,
    title: p.title || p.caption?.slice(0, 60),
    platform: p.platforms,
    ...p.analytics.toObject(),
    engagementRate: p.analytics.reach ? Math.round(((p.analytics.likes + p.analytics.comments + p.analytics.shares) / p.analytics.reach) * 10000) / 100 : 0,
    publishedAt: p.publishedAt,
    brand: p.brand?.name,
  }));
};

module.exports = { computeWorkspaceAnalytics, contentPerformance, recentPosts };
