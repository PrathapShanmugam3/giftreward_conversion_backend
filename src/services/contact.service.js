const { Admin, SiteConfig } = require('../models');
const { sendMail } = require('./mail.service');

// Mirrors ajax/handle-form.php's lead-capture flow (sends a notification to
// the admin + a welcome email to the submitter) and publisher/support.php's
// contact form, which posted nowhere in the legacy app. Unlike the legacy
// handler — which hardcoded a specific developer's personal Gmail address
// as the notification recipient — this sends to the real admin account's
// email (admins.id = 1, the same authoritative admin row used everywhere
// else in this app) so it keeps working regardless of who operates this
// install.
async function submitContact({ name, email, phone, subject, message, source }) {
  const admin = await Admin.findByPk(1);
  const config = await SiteConfig.findByPk(1);
  const siteName = config?.siteName || 'GiftReward';

  if (admin?.email) {
    await sendMail({
      to: admin.email,
      subject: `New contact form submission${subject ? `: ${subject}` : ''}`,
      html: `
        <h3>New Contact / Lead Submission</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
        ${source ? `<p><strong>Source:</strong> ${source}</p>` : ''}
        <p><strong>Message:</strong></p>
        <p>${message || '(no message)'}</p>
      `,
    });
  }

  await sendMail({
    to: email,
    subject: `We received your message — ${siteName}`,
    html: `
      <h3>Hi ${name},</h3>
      <p>Thanks for reaching out to ${siteName}. Our team will get back to you shortly.</p>
      <p>– Team ${siteName}</p>
    `,
  });

  return { received: true };
}

module.exports = { submitContact };
