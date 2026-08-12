const { Worker } = require('bullmq');
const env = require('../config/env');
const { getRedis } = require('../config/redis');
const { publishContent } = require('../services/publishing.service');
const Content = require('../models/Content');
const { getRedisConnection } = require('./queueManager');

let worker = null;

const startPublishingWorker = () => {
  const redis = getRedis();
  if (!redis) {
    console.log('[worker] Redis unavailable, publishing worker disabled (in-memory scheduler active)');
    return null;
  }

  worker = new Worker(
    'publishing',
    async (job) => {
      const { contentId } = job.data;
      return publishContent(contentId);
    },
    { connection: getRedisConnection(), concurrency: 5 }
  );

  worker.on('failed', async (job, err) => {
    console.warn('[worker] job failed:', job?.id, err.message);
    const { contentId } = job?.data || {};
    if (contentId) {
      try {
        await Content.updateOne(
          { _id: contentId },
          { status: 'failed', lastError: err.message, errorCode: 'SOCIAL_PUBLISH_FAILED', retryCount: job.attemptsMade }
        );
      } catch (e) {
        console.warn('[worker] failed to update content:', e.message);
      }
    }
  });

  worker.on('completed', (job) => {
    console.log('[worker] job completed:', job.id);
  });

  worker.on('error', (err) => {
    console.warn('[worker] error:', err.message);
  });

  return worker;
};

const stopWorker = async () => {
  if (worker) {
    await worker.close();
    worker = null;
  }
};

module.exports = { startPublishingWorker, stopWorker };
