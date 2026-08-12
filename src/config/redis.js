const Redis = require('ioredis');
const env = require('./env');

let redis = null;
let lastError = null;

const createRedisClient = () => {
  const options = {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    db: env.REDIS_DB,
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
    lazyConnect: true,
    retryStrategy: (times) => Math.min(times * 200, 3000),
  };
  if (env.REDIS_PASSWORD) options.password = env.REDIS_PASSWORD;

  const client = new Redis(options);
  client.on('error', (err) => {
    lastError = err;
    if (env.NODE_ENV !== 'test') {
      console.warn('[redis] connection error:', err.message);
    }
  });
  return client;
};

const getRedis = () => {
  if (redis) return redis;
  if (!env.REDIS_ENABLED) return null;
  redis = createRedisClient();
  return redis;
};

const isRedisReady = () => Boolean(redis && redis.status === 'ready');

const connectRedis = async () => {
  if (!env.REDIS_ENABLED) {
    console.log('[redis] disabled by config');
    return null;
  }
  try {
    const client = getRedis();
    await client.connect();
    console.log('[redis] connected');
    return client;
  } catch (err) {
    lastError = err;
    console.warn('[redis] could not connect, scheduling will fall back to in-memory:', err.message);
    return null;
  }
};

const getRedisError = () => lastError;

module.exports = { getRedis, isRedisReady, connectRedis, getRedisError };
