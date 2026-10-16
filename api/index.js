// Vercel serverless entry point. Vercel treats every file under /api as its
// own function; this one captures all routes (see vercel.json's catch-all
// rewrite) and hands them to the existing Express app. Unlike src/server.js,
// there is no app.listen() here — Vercel's Node runtime invokes the exported
// handler directly per-request.
const app = require('../src/app');

module.exports = app;
