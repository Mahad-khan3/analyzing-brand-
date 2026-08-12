const { initPublishingQueue, isRedisReady } = require('./queueManager');
const { startPublishingWorker } = require('./publishing.worker');
const { getRedis } = require('../config/redis');
const Content = require('../models/Content');
const { schedulePublish } = require('./queueManager');
const { scheduleInMemory } = require('./inMemoryScheduler');

const startScheduler = async () => {
  const redis = getRedis();
  let mode = 'in-memory';

  if (redis && redis.status === 'ready') {
    try {
      initPublishingQueue();
      startPublishingWorker();
      mode = 'bullmq';
      console.log('[scheduler] running on Redis + BullMQ');
    } catch (err) {
      console.warn('[scheduler] BullMQ init failed, falling back to in-memory:', err.message);
      mode = 'in-memory';
    }
  } else {
    console.log('[scheduler] Redis not ready, running in-memory scheduler');
  }

  await resyncScheduledContent(mode);
  return mode;
};

const resyncScheduledContent = async (mode) => {
  const due = await Content.find({ status: 'scheduled', scheduledAt: { $gt: new Date() } }).select('_id scheduledAt jobId');
  for (const item of due) {
    if (mode === 'bullmq') {
      try {
        await schedulePublish({ contentId: item._id, scheduledAt: item.scheduledAt });
      } catch (err) {
        console.warn('[scheduler] resync failed for', item._id, err.message);
      }
    } else {
      await scheduleInMemory({ contentId: item._id, scheduledAt: item.scheduledAt });
    }
  }
  if (due.length) console.log(`[scheduler] re-queued ${due.length} scheduled content items`);
};

const stopScheduler = async () => {
  const { closePublishingQueue } = require('./queueManager');
  const { stopWorker } = require('./publishing.worker');
  const { shutdownInMemory } = require('./inMemoryScheduler');
  shutdownInMemory();
  await stopWorker();
  await closePublishingQueue();
};

module.exports = { startScheduler, stopScheduler, resyncScheduledContent };
