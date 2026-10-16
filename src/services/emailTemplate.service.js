const fs = require('fs');
const path = require('path');

const TEMPLATES_DIR = path.join(__dirname, '..', 'emailTemplates');

// Equivalent of PHP's getEmailTemplate(): load an HTML file and replace
// {key} tokens with values. templateName must not contain path separators.
function renderTemplate(templateName, replacements = {}) {
  if (!/^[a-zA-Z0-9_-]+$/.test(templateName)) {
    throw new Error(`Invalid email template name: ${templateName}`);
  }
  const filePath = path.join(TEMPLATES_DIR, `${templateName}.html`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Email template not found: ${templateName}`);
  }
  let html = fs.readFileSync(filePath, 'utf8');
  for (const [key, value] of Object.entries(replacements)) {
    html = html.split(`{${key}}`).join(String(value ?? ''));
  }
  return html;
}

module.exports = { renderTemplate };
