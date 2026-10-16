const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const postbackService = require('../services/postback.service');

async function handle(req, res, next, { clickId, event, key, offerId }) {
  try {
    const result = await postbackService.processPostback({
      clickId,
      event,
      key,
      offerId,
      advertiserIp: req.ip,
    });
    const body =
      `${result.lines.join('<br>\n')}<br>\n` +
      `{ status : success : postback noted : Conversion ID: ${result.conversionId} : Payout: ${result.payout} }`;
    res.status(200).type('html').send(body);
  } catch (err) {
    if (err instanceof ApiError) {
      return res.status(err.statusCode).type('text').send(err.message);
    }
    return next(err);
  }
}

// Long form: /postback?click_id=&event=&key=&offer_id=
const longForm = asyncHandler(async (req, res, next) => {
  const { click_id: clickId, event, key, offer_id: offerId } = req.query;
  return handle(req, res, next, { clickId, event, key, offerId });
});

// Short form: /postback/:tid/:event/:key
// FIX (quirks.md): the legacy .htaccess rewrite dropped the :event segment
// (rewrote straight to click_id=$1&key=$3), so this URL never actually
// worked in production. Fixed here to pass all three segments through.
const shortForm = asyncHandler(async (req, res, next) => {
  const { tid, event, key } = req.params;
  return handle(req, res, next, { clickId: tid, event, key, offerId: undefined });
});

module.exports = { longForm, shortForm };
