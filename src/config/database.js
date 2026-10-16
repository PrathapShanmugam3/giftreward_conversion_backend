const fs = require('fs');
const { Sequelize } = require('sequelize');
const env = require('./env');

// Production ran on non-strict MariaDB 10.6. Local/MySQL 8 defaults to a strict
// sql_mode (ONLY_FULL_GROUP_BY, STRICT_TRANS_TABLES, ...) that breaks several of
// the original queries (GROUP BY without full aggregation, inserts that omit
// NOT-NULL-no-default legacy columns). We relax it per-connection to match the
// environment this schema was actually designed for.
// See .claude/skills/gskloots-php-reference/references/database.md
const RELAXED_SQL_MODE = 'NO_ENGINE_SUBSTITUTION';

const sequelize = new Sequelize(env.db.name, env.db.user, env.db.pass, {
  host: env.db.host,
  port: env.db.port,
  dialect: 'mysql',
  logging: env.db.logging ? console.log : false,
  dialectOptions: env.db.ssl
    ? {
        ssl: {
          ca: fs.readFileSync(env.db.sslCaPath, 'utf8'),
          minVersion: 'TLSv1.2',
          rejectUnauthorized: true,
        },
      }
    : {},
  define: {
    timestamps: true,
    underscored: true,
  },
  // Small pool: on Vercel each serverless invocation can spin up its own
  // instance of this module, so a generous per-instance pool multiplies into
  // way more concurrent DB connections than TiDB's connection limit allows.
  pool: {
    max: env.isServerless ? 2 : 10,
    min: 0,
    idle: 10000,
    acquire: 30000,
  },
  hooks: {
    afterConnect: async (connection) => {
      await new Promise((resolve, reject) => {
        connection.query(`SET SESSION sql_mode = '${RELAXED_SQL_MODE}'`, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    },
  },
});

async function assertDbConnection() {
  await sequelize.authenticate();
}

module.exports = { sequelize, assertDbConnection };
