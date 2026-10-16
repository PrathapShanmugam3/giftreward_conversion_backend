const fs = require('fs');
// Sequelize requires the mysql2 driver dynamically at runtime (inside
// lib/dialects/abstract/connection-manager.js), not with a static
// require() of its own. Bundlers that trace dependencies statically (like
// Vercel's) can't see that dynamic require and silently leave mysql2 out of
// the deployed function, even though it's a real package.json dependency
// and `npm install` pulls it in fine at build time. A plain, literal
// require() right here — in the same file that needs it — forces it into
// every bundler's trace and into the deployed node_modules.
require('mysql2');
const { Sequelize } = require('sequelize');
const env = require('./env');

// Production ran on non-strict MariaDB 10.6. Local/MySQL 8 defaults to a strict
// sql_mode (ONLY_FULL_GROUP_BY, STRICT_TRANS_TABLES, ...) that breaks several of
// the original queries (GROUP BY without full aggregation, inserts that omit
// NOT-NULL-no-default legacy columns). We relax it per-connection to match the
// environment this schema was actually designed for.
// See .claude/skills/gskloots-php-reference/references/database.md
const RELAXED_SQL_MODE = 'NO_ENGINE_SUBSTITUTION';

function readCaCert(caPath) {
  try {
    return fs.readFileSync(caPath, 'utf8');
  } catch (err) {
    // This file is required transitively by every route (app.js -> routes ->
    // controllers -> models -> here), so a bad path crashes the whole
    // serverless function on cold start with an opaque 500. On Vercel this
    // usually means the .crt file wasn't included in the function bundle —
    // see "functions.api/index.js.includeFiles" in vercel.json.
    throw new Error(
      `DB_SSL is enabled but the CA cert could not be read at "${caPath}": ${err.message}`
    );
  }
}

const sequelize = new Sequelize(env.db.name, env.db.user, env.db.pass, {
  host: env.db.host,
  port: env.db.port,
  dialect: 'mysql',
  logging: env.db.logging ? console.log : false,
  dialectOptions: env.db.ssl
    ? {
        ssl: {
          ca: readCaCert(env.db.sslCaPath),
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
