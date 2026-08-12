const Content = require('../models/Content');
const { success } = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const calendarData = asyncHandler(async (req, res) => {
  const { year, month, brandId, status } = req.query;
  const start = new Date(year || new Date().getFullYear(), (month || new Date().getMonth()) - 0, 1);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);

  const filter = {
    workspace: req.workspace._id,
    $or: [
      { scheduledAt: { $gte: start, $lt: end } },
      { publishedAt: { $gte: start, $lt: end } },
      { createdAt: { $gte: start, $lt: end } },
    ],
  };
  if (brandId) filter.brand = brandId;
  if (status) filter.status = status;

  const items = await Content.find(filter)
    .sort({ scheduledAt: 1 })
    .populate('brand', 'name logoUrl colors');
  return success(res, 200, { items, month: start.getMonth(), year: start.getFullYear() }, 'Calendar data');
});

const reschedule = asyncHandler(async (req, res) => {
  const content = req.content;
  const { scheduledAt } = req.body;
  if (!scheduledAt) return res.status(400).json({ success: false, message: 'scheduledAt required', error: 'BAD_REQUEST' });

  const { schedulePublish } = require('../jobs/queueManager');
  const { scheduleInMemory, cancelInMemory } = require('../jobs/inMemoryScheduler');
  const { isRedisReady } = require('../config/redis');

  if (content.status === 'scheduled' && content.jobId) {
    if (isRedisReady()) await require('../jobs/queueManager').cancelPublish(content.jobId);
    else cancelInMemory(content._id);
  }

  content.scheduledAt = new Date(scheduledAt);
  content.status = content.status === 'published' ? content.status : 'scheduled';
  content.lastError = '';
  if (content.status === 'scheduled') {
    const result = isRedisReady()
      ? await schedulePublish({ contentId: content._id, scheduledAt: content.scheduledAt })
      : await scheduleInMemory({ contentId: content._id, scheduledAt: content.scheduledAt });
    content.jobId = result.jobId || null;
  }
  await content.save();
  return success(res, 200, { content }, 'Rescheduled');
});

module.exports = { calendarData, reschedule };
