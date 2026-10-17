const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const env = require('./config/env');
const apiRoutes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { apiLimiter, trackingLimiter, postbackLimiter } = require('./middleware/rateLimiters');
const goRoutes = require('./routes/go.routes');
const postbackRoutes = require('./routes/postback.routes');
const postbackShortRoutes = require('./routes/postbackShort.routes');
const reportingApiRoutes = require('./routes/reportingApi.routes');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1); // behind Nginx/Apache in production

// Default helmet (CSP included) for everything except /go, which serves a
// tiny redirect page relying on an inline <script>/<style> and needs CSP
// off. helmet only ever *sets* the CSP header when enabled — it never
// clears one set by an earlier middleware — so excluding /go here (rather
// than layering a second disabled helmet() on that route afterward, which
// does nothing) is the only way to actually relax it for that one route.
// Confirmed by testing: the layered-helmet approach left the strict CSP
// header on /go's response even with contentSecurityPolicy:false passed
// to the route-scoped instance.
const defaultHelmet = helmet();
app.use((req, res, next) => {
  if (req.path.startsWith('/go')) return next();
  return defaultHelmet(req, res, next);
});
app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.isProd ? 'combined' : 'dev'));

// --- Public tracking routes (clean paths, no .php/.html extensions) ---
// These replace the legacy PHP file-based URLs (go/index.php, postback.php,
// api.php). Advertiser/publisher integrations pointed at the old *.php
// links need to be reissued against these new paths when this backend goes
// live — see .claude/skills/gskloots-php-reference for the original shapes.
app.use(
  '/go',
  helmet({ contentSecurityPolicy: false }), // the redirect page's inline <script> needs this relaxed, scoped to just /go
  trackingLimiter,
  goRoutes
);
// Short form must be registered before the /postback mount below, or
// Express matches the /postback prefix first and never falls through to
// the 3-segment pattern. Rate limiter is applied inside postbackShort.routes.js
// on the specific route, not here — a bare app.use(limiter, router) with no
// path prefix runs for every request reaching this point in the stack, not
// just ones this router matches (confirmed with a standalone test).
app.use(postbackShortRoutes); // short form: /postback/:tid/:event/:key
app.use('/postback', postbackLimiter, postbackRoutes); // long form: /postback?click_id=&event=&key=
app.use('/report', trackingLimiter, reportingApiRoutes); // was api.php
// /o, /refer and /tracking are also React page routes served by the
// frontend (the pages at those paths call back into this API). To avoid the
// page route and the API route colliding on the same path, the API side
// lives under /api/o, /api/refer and /api/tracking — see routes/index.js.

app.use('/api', apiLimiter, apiRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
