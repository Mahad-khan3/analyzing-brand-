const Content = require('../models/Content');
const { success } = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { schedulePublish } = require('../jobs/queueManager');
const { scheduleInMemory, cancelInMemory } = require('../jobs/inMemoryScheduler');
const { isRedisReady } = require('../config/redis');
const { publishContent } = require('../services/publishing.service');
const { audit } = require('../services/audit.service');

const listContent = asyncHandler(async (req, res) => {
  const { status, brandId, platform, page = 1, limit = 30, search } = req.query;
  const filter = { workspace: req.workspace._id };
  if (status) filter.status = status;
  if (brandId) filter.brand = brandId;
  if (platform) filter.platforms = platform;
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { caption: { $regex: search, $options: 'i' } },
    ];
  }
  const items = await Content.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .populate('brand', 'name logoUrl')
    .populate('media');
  const total = await Content.countDocuments(filter);
  return success(res, 200, { items, total, page: Number(page), limit: Number(limit) }, 'Content list');
});

const getContent = asyncHandler(async (req, res) => {
  return success(res, 200, { content: req.content }, 'Content detail');
});

const createContent = asyncHandler(async (req, res) => {
  const data = req.body;
  const content = await Content.create({
    workspace: req.workspace._id,
    brand: data.brandId,
    createdBy: req.user._id,
    title: data.title || '',
    caption: data.caption || '',
    hashtags: data.hashtags || [],
    cta: data.cta || '',
    link: data.link || '',
    media: data.media || [],
    mediaUrls: data.mediaUrls || [],
    platforms: data.platforms || ['instagram'],
    postType: data.postType || '',
    topic: data.topic || '',
    status: data.isDraft ? 'draft' : 'draft',
    isDraft: Boolean(data.isDraft),
    scheduledAt: data.scheduledAt || null,
  });
  await audit(req, 'content.created', 'content', { description: 'Created content', metadata: { contentId: content._id } });
  return success(res, 201, { content }, 'Content created');
});

const updateContent = asyncHandler(async (req, res) => {
  const content = req.content;
  const allowed = ['title', 'caption', 'hashtags', 'cta', 'link', 'media', 'mediaUrls', 'platforms', 'postType', 'topic', 'isDraft', 'brandId'];
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) content[key] = req.body[key];
  });
  await content.save();
  await audit(req, 'content.updated', 'content', { description: 'Updated content', metadata: { contentId: content._id } });
  return success(res, 200, { content }, 'Content updated');
});

const duplicateContent = asyncHandler(async (req, res) => {
  const src = req.content;
  const copy = await Content.create({
    workspace: src.workspace,
    brand: src.brand,
    createdBy: req.user._id,
    title: `${src.title || 'Copy'} (copy)`,
    caption: src.caption,
    hashtags: src.hashtags,
    cta: src.cta,
    link: src.link,
    media: src.media,
    mediaUrls: src.mediaUrls,
    platforms: src.platforms,
    postType: src.postType,
    topic: src.topic,
    status: 'draft',
    isDraft: true,
  });
  return success(res, 201, { content: copy }, 'Content duplicated');
});

const deleteContent = asyncHandler(async (req, res) => {
  const content = req.content;
  if (content.status === 'scheduled') {
    if (isRedisReady()) {
      const { cancelPublish } = require('../jobs/queueManager');
      await cancelPublish(content.jobId);
    } else {
      cancelInMemory(content._id);
    }
  }
  await content.deleteOne();
  await audit(req, 'content.deleted', 'content', { description: 'Deleted content', metadata: { contentId: content._id } });
  return success(res, 200, null, 'Content deleted');
});

const scheduleContent = asyncHandler(async (req, res) => {
  const content = req.content;
  const { scheduledAt } = req.body;
  if (!scheduledAt) throw ApiError.badRequest('scheduledAt is required');
  const at = new Date(scheduledAt);
  if (at < new Date()) throw ApiError.badRequest('Scheduled time must be in the future');

  if (content.status === 'scheduled' && content.jobId) {
    if (isRedisReady()) await require('../jobs/queueManager').cancelPublish(content.jobId);
    else cancelInMemory(content._id);
  }

  content.scheduledAt = at;
  content.status = 'scheduled';
  content.lastError = '';
  content.errorCode = '';

  let result;
  if (isRedisReady()) {
    result = await schedulePublish({ contentId: content._id, scheduledAt: at });
    content.jobId = result.jobId || content.jobId;
  } else {
    result = await scheduleInMemory({ contentId: content._id, scheduledAt: at });
    content.jobId = result.jobId || content.jobId;
  }
  await content.save();

  const { notify } = require('../services/notification.service');
  await notify({
    user: req.user._id,
    workspace: req.workspace._id,
    type: 'post_scheduled',
    title: 'Post scheduled',
    message: `"${content.title || 'Untitled'}" scheduled for ${at.toLocaleString()}`,
    severity: 'info',
    data: { contentId: content._id },
  });

  await audit(req, 'content.scheduled', 'content', { description: 'Scheduled content', metadata: { contentId: content._id, scheduledAt: at, queue: result.mode } });
  return success(res, 200, { content, queueMode: result.mode }, 'Content scheduled');
});

const cancelSchedule = asyncHandler(async (req, res) => {
  const content = req.content;
  if (content.status !== 'scheduled') throw ApiError.badRequest('Content is not scheduled');
  if (isRedisReady() && content.jobId) await require('../jobs/queueManager').cancelPublish(content.jobId);
  else cancelInMemory(content._id);
  content.status = 'cancelled';
  content.jobId = null;
  await content.save();
  await audit(req, 'content.schedule_cancelled', 'content', { description: 'Cancelled schedule', metadata: { contentId: content._id } });
  return success(res, 200, { content }, 'Schedule cancelled');
});

const publishNow = asyncHandler(async (req, res) => {
  const content = req.content;
  if (content.status === 'scheduled' && content.jobId) {
    if (isRedisReady()) await require('../jobs/queueManager').cancelPublish(content.jobId);
    else cancelInMemory(content._id);
  }
  const result = await publishContent(content._id);
  await audit(req, 'content.published_manual', 'content', { description: 'Published manually', metadata: { contentId: content._id, result: result.status } });
  return success(res, 200, result, 'Publishing complete');
});

const retryPublish = asyncHandler(async (req, res) => {
  const content = req.content;
  if (content.status !== 'failed') throw ApiError.badRequest('Only failed content can be retried');
  content.retryCount += 1;
  await content.save();
  const result = await publishContent(content._id);
  return success(res, 200, result, 'Retry complete');
});

module.exports = {
  listContent, getContent, createContent, updateContent, duplicateContent, deleteContent,
  scheduleContent, cancelSchedule, publishNow, retryPublish,
};
