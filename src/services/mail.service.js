const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;

const getTransporter = () => {
  if (!env.hasSmtp()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }
  return transporter;
};

const sendMail = async ({ to, subject, html, text }) => {
  const tr = getTransporter();
  if (!tr) {
    if (env.NODE_ENV !== 'production') {
      console.log('[mail] SMTP not configured, skipping email to', to, '->', subject);
    }
    return { skipped: true, reason: 'SMTP_NOT_CONFIGURED' };
  }
  try {
    const info = await tr.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
      text: text || html,
    });
    return { skipped: false, messageId: info.messageId };
  } catch (err) {
    console.warn('[mail] failed to send email to', to, '->', subject, ':', err.message);
    return { skipped: true, reason: 'SEND_FAILED', error: err.message };
  }
};

const templates = {
  verifyEmail: (name, code) => ({
    subject: 'Verify your BrandPilot AI email',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px">
        <h2>Welcome to BrandPilot AI, ${name}!</h2>
        <p>Use the verification code below to confirm your email address:</p>
        <p style="font-size:32px;letter-spacing:6px;font-weight:700;color:#6C5CE7">${code}</p>
        <p>This code expires in 30 minutes.</p>
        <p style="color:#888;font-size:13px">If you did not create this account, you can safely ignore this email.</p>
      </div>`,
  }),
  resetPassword: (name, link) => ({
    subject: 'Reset your BrandPilot AI password',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px">
        <h2>Hi ${name},</h2>
        <p>We received a request to reset your password.</p>
        <p><a href="${link}" style="background:#6C5CE7;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Reset password</a></p>
        <p>Or paste this link into your browser:</p>
        <p style="color:#6C5CE7;word-break:break-all">${link}</p>
        <p style="color:#888;font-size:13px">This link expires in 30 minutes. If you did not request this, ignore this email.</p>
      </div>`,
  }),
  teamInvite: (inviterName, workspaceName, link) => ({
    subject: `${inviterName} invited you to ${workspaceName} on BrandPilot AI`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px">
        <h2>You've been invited!</h2>
        <p>${inviterName} invited you to join the workspace <strong>${workspaceName}</strong> on BrandPilot AI.</p>
        <p><a href="${link}" style="background:#6C5CE7;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Accept invitation</a></p>
        <p style="color:#888;font-size:13px">The invitation link expires in 7 days.</p>
      </div>`,
  }),
};

module.exports = { sendMail, templates };
