const nodemailer = require("nodemailer");
const env = require("../config/env");

function canSendMail() {
  return Boolean(env.emailUser && env.emailPassword);
}

function getTransport() {
  if (!canSendMail()) return null;
  return nodemailer.createTransport({
    host: env.emailHost || "smtp.gmail.com",
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
    const error = new Error("Email is not configured.");
    error.code = "EMAIL_NOT_CONFIGURED";
    throw error;
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
