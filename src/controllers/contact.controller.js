const asyncHandler = require('../utils/asyncHandler');
const contactService = require('../services/contact.service');

const submit = asyncHandler(async (req, res) => {
  const { name, email, phone, subject, message, source } = req.body;
  await contactService.submitContact({ name, email, phone, subject, message, source });
  res.json({ success: true });
});

module.exports = { submit };
