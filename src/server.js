const app = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');
const { assertDbConnection } = require('./config/database');
require('./models'); // registers associations

async function start() {
  try {
    await assertDbConnection();
    logger.info(`Database connection established (${env.db.name}@${env.db.host}:${env.db.port})`);
  } catch (err) {
    logger.error('Failed to connect to database', { message: err.message });
    process.exit(1);
  }

  const server = app.listen(env.port, () => {
    logger.info(`giftreward_backend listening on port ${env.port} [${env.nodeEnv}]`);
  });

  const shutdown = (signal) => {
    logger.info(`Received ${signal}, shutting down...`);
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
