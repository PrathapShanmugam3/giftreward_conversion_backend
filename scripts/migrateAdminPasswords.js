// One-time migration: the legacy app stored admins.password in PLAINTEXT
// (see .claude/skills/gskloots-php-reference/references/quirks.md). This
// script hashes any admin password that isn't already a bcrypt hash.
// Idempotent — safe to run multiple times; rows already hashed are skipped.
//
// Usage: node scripts/migrateAdminPasswords.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Admin, sequelize } = require('../src/models');
const logger = require('../src/utils/logger');

const BCRYPT_PREFIX = /^\$2[aby]\$/;

async function run() {
  await sequelize.authenticate();
  const admins = await Admin.findAll();
  let migrated = 0;

  for (const admin of admins) {
    if (BCRYPT_PREFIX.test(admin.password)) {
      logger.info(`Admin #${admin.id} (${admin.username}) already hashed — skipping`);
      continue;
    }
    const plain = admin.password;
    admin.password = await bcrypt.hash(plain, 10);
    await admin.save();
    migrated += 1;
    logger.info(`Admin #${admin.id} (${admin.username}) password hashed`);
  }

  logger.info(`Done. Migrated ${migrated} of ${admins.length} admin(s).`);
  process.exit(0);
}

run().catch((err) => {
  logger.error('Migration failed', { message: err.message, stack: err.stack });
  process.exit(1);
});
