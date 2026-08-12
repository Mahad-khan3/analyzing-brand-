const { Queue } = require('bullmq');
const env = require('../config/env');
const { getRedis, isRedisReady } = require('../config/redis');

let publishingQueue = null;

const getRedisConnection = () => {
  const options = {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    db: env.REDIS_DB,
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
  };
  if (env.REDIS_PASSWORD) options.password = env.REDIS_PASSWORD;
  return options;
};

const initPublishingQueue = () => {
  if (publishingQueue) return publishingQueue;
  const client = getRedis();
  if (!client) return null;

  publishingQueue = new Queue('publishing', { connection: getRedisConnection() });
  publishingQueue.on('error', (err) => {
    console.warn('[queue] publishing queue error:', err.message);
  });
  return publishingQueue;
};

const schedulePublish = async ({ contentId, scheduledAt, attempts = 5 }) => {
  const delay = Math.max(0, new Date(scheduledAt).getTime() - Date.now());
  const queue = initPublishingQueue();
  if (!queue) return { mode: 'in-memory', jobId: null, error: 'REDIS_UNAVAILABLE' };
  const job = await queue.add(
    'publish',
    { contentId },
    {
      delay,
      attempts,
      backoff: { type: 'exponential', delay: 60000 },
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: { age: 7 * 24 * 3600 },
    }
  );
  return { mode: 'bullmq', jobId: job.id };
};

const cancelPublish = async (jobId) => {
  const queue = initPublishingQueue();
  if (!queue || !jobId) return false;
  const job = await queue.getJob(jobId);
  if (job && job.state === 'delayed' || job && job.state === 'waiting') {
    await job.remove();
    return true;
  }
  return false;
};

const getJobStatus = async (jobId) => {
  const queue = initPublishingQueue();
  if (!queue || !jobId) return null;
  const job = await queue.getJob(jobId);
  if (!job) return null;
  return { id: job.id, state: await job.getState(), attemptsMade: job.attemptsMade };
};

const closePublishingQueue = async () => {
  if (publishingQueue) {
    await publishingQueue.close();
    publishingQueue = null;
  }
};

module.exports = { initPublishingQueue, schedulePublish, cancelPublish, getJobStatus, closePublishingQueue, isRedisReady };
