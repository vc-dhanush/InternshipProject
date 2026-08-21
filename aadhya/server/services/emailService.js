const nodemailer = require("nodemailer");
const env = require("../config/env");

function canSendMail() {
  return Boolean(env.emailHost && env.emailUser && env.emailPassword);
}

function getTransport() {
  if (!canSendMail()) return null;
  return nodemailer.createTransport({
    host: env.emailHost,
    port: env.emailPort,
    secure: env.emailPort === 465,
    auth: {
      user: env.emailUser,
      pass: env.emailPassword,
    },
  });
}

async function sendPasswordResetEmail(to, resetUrl) {
  const subject = "Reset your Aadhya password";
  const text = `You requested a password reset for Aadhya : attendance tracker.\n\nOpen this link to choose a new password:\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`;
  const html = `<p>You requested a password reset for <strong>Aadhya : attendance tracker</strong>.</p><p><a href="${resetUrl}">Reset your password</a></p><p>If you did not request this, you can ignore this email.</p>`;

  const transport = getTransport();
  if (!transport) {
    console.log(`[email] EMAIL is not configured. Password reset link for ${to}: ${resetUrl}`);
    return { sent: false, resetUrl };
  }

  await transport.sendMail({
    from: env.emailFrom,
    to,
    subject,
    text,
    html,
  });
  return { sent: true, resetUrl };
}

module.exports = { sendPasswordResetEmail, canSendMail };
