// Vercel serverless entry point. Vercel treats every file under /api as its
// own function; this one captures all routes (see vercel.json's catch-all
// rewrite) and hands them to the existing Express app. Unlike src/server.js,
// there is no app.listen() here — Vercel's Node runtime invokes the exported
// handler directly per-request.
// Sequelize requires the mysql2 driver dynamically at runtime
// (lib/dialects/abstract/connection-manager.js), not with a static
// require(), so Vercel's dependency-tracing bundler can't see that this
// function needs it and leaves it out of the deployed node_modules even
// though it's a real package.json dependency. A plain static require here
// forces the bundler to trace and include it.
require('mysql2');

const app = require('../src/app');

module.exports = app;
