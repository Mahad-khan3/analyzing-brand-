const { success } = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { getJobStatus } = require('../jobs/queueManager');
const { getInMemoryTimerCount } = require('../jobs/inMemoryScheduler');
const { isRedisReady } = require('../config/redis');
const Content = require('../models/Content');

const status = asyncHandler(async (req, res) => {
  return success(res, 200, {
    mode: isRedisReady() ? 'bullmq' : 'in-memory',
    redisAvailable: isRedisReady(),
    scheduled: await Content.countDocuments({ workspace: req.workspace._id, status: 'scheduled' }),
    inMemoryTimers: getInMemoryTimerCount(),
  }, 'Scheduler status');
});

const jobStatus = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const info = isRedisReady() ? await getJobStatus(jobId) : null;
  return success(res, 200, { job: info }, 'Job status');
});

module.exports = { status, jobStatus };
