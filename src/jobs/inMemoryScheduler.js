const { publishContent } = require('../services/publishing.service');

const timers = new Map();

const scheduleInMemory = async ({ contentId, scheduledAt, jobId }) => {
  const existing = timers.get(String(contentId));
  if (existing) clearTimeout(existing);

  const delay = Math.max(0, new Date(scheduledAt).getTime() - Date.now());
  const timer = setTimeout(async () => {
    timers.delete(String(contentId));
    try {
      await publishContent(contentId);
    } catch (err) {
      console.warn('[scheduler:memory] publish failed for', contentId, err.message);
    }
  }, delay);

  timers.set(String(contentId), timer);
  return { jobId: jobId || null, mode: 'in-memory' };
};

const cancelInMemory = (contentId) => {
  const key = String(contentId);
  const timer = timers.get(key);
  if (timer) {
    clearTimeout(timer);
    timers.delete(key);
    return true;
  }
  return false;
};

const getInMemoryTimerCount = () => timers.size;

const shutdownInMemory = () => {
  for (const timer of timers.values()) clearTimeout(timer);
  timers.clear();
};

module.exports = { scheduleInMemory, cancelInMemory, getInMemoryTimerCount, shutdownInMemory };
