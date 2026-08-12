const app = require('./app');
const env = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const { connectRedis } = require('./config/redis');
const { startScheduler, stopScheduler } = require('./jobs/scheduler');

let server = null;

const start = async () => {
  await connectDB();
  await connectRedis();
  await startScheduler();

  server = app.listen(env.PORT, () => {
    console.log(`[server] BrandPilot AI API running on http://localhost:${env.PORT}`);
    console.log(`[server] Swagger docs at http://localhost:${env.PORT}/api/docs`);
  });
};

const shutdown = async (signal) => {
  console.log(`[server] ${signal} received, shutting down...`);
  if (server) server.close();
  await stopScheduler().catch(() => {});
  await disconnectDB().catch(() => {});
  process.exit(0);
};

start().catch((err) => {
  console.error('[server] failed to start:', err.message);
  process.exit(1);
});

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  console.error('[server] unhandled rejection:', reason);
});
