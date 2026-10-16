const asyncHandler = require('../utils/asyncHandler');
const trackingService = require('../services/tracking.service');
const ApiError = require('../utils/ApiError');

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function escapeForScript(value) {
  // The click id is uniqid()-shaped ([a-z0-9]+), but escape defensively
  // since it's interpolated into inline HTML/JS below.
  return String(value).replace(/[<>"'&]/g, '');
}

function renderRedirectPage(res, { clickId, userId, redirectLink }) {
  const safeClickId = escapeForScript(clickId);
  const safeLink = String(redirectLink).replace(/"/g, '&quot;');

  res.cookie('GskLoots_Ads', clickId, { maxAge: THIRTY_DAYS_MS, path: '/' });
  res.cookie('__global_clickid', clickId, { maxAge: THIRTY_DAYS_MS, path: '/', httpOnly: true });
  res.cookie(`user_${userId}`, clickId, { maxAge: THIRTY_DAYS_MS, path: '/', httpOnly: true });

  res.set('Referrer-Policy', 'no-referrer');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="referrer" content="no-referrer" />
  <meta http-equiv="Referrer-Policy" content="no-referrer" />
  <title>Redirecting...</title>
  <script>
    document.cookie = "__global_clickid=${safeClickId}; max-age=${THIRTY_DAYS_MS / 1000}; path=/";
    document.cookie = "user_${userId}=${safeClickId}; max-age=${THIRTY_DAYS_MS / 1000}; path=/";
    window.onload = function () {
      window.location.replace("${safeLink}");
    };
  </script>
  <noscript>
    <meta http-equiv="refresh" content="0; url=${safeLink}" />
  </noscript>
  <style>
    body { margin: 0; height: 100vh; display: flex; justify-content: center; align-items: center;
      background: linear-gradient(135deg, #f2f9fc, #e8f0fe); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      flex-direction: column; gap: 30px; }
    .message { font-size: 1.6rem; font-weight: 500; color: #333; }
    .wave-loader { display: flex; gap: 6px; }
    .wave-loader span { width: 8px; height: 40px; background-color: #007bff; border-radius: 4px; animation: wave 1.2s infinite ease-in-out; }
    .wave-loader span:nth-child(1) { animation-delay: 0s; }
    .wave-loader span:nth-child(2) { animation-delay: 0.1s; }
    .wave-loader span:nth-child(3) { animation-delay: 0.2s; }
    .wave-loader span:nth-child(4) { animation-delay: 0.3s; }
    .wave-loader span:nth-child(5) { animation-delay: 0.4s; }
    @keyframes wave { 0%,40%,100% { transform: scaleY(0.4); } 20% { transform: scaleY(1); } }
  </style>
</head>
<body>
  <div class="message">Redirecting, please wait...</div>
  <div class="wave-loader"><span></span><span></span><span></span><span></span><span></span></div>
</body>
</html>`);
}

const trackAndRedirect = asyncHandler(async (req, res, next) => {
  try {
    const result = await trackingService.trackClick({
      query: req.query,
      ip: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });
    renderRedirectPage(res, result);
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.isProxyBlock) {
        return res
          .status(403)
          .send('<h1>Access Denied</h1><p><strong>Status:</strong> Failed - VPN Detected</p>');
      }
      return res.status(err.statusCode).send(`<h1>Access Denied</h1><p>${err.message}</p>`);
    }
    return next(err);
  }
});

module.exports = { trackAndRedirect };
