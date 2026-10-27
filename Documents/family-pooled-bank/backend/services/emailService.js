/**
 * OnePot Asynchronous SMTP Email Notification Service
 * Configured with Nodemailer to dispatch real emails using SMTP/Gmail credentials from .env
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

let cachedTransporter = null;

/**
 * Configure Nodemailer transport using process.env
 * Uses SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS.
 */
function getTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  return cachedTransporter;
}

/**
 * Resolve default sender identity
 * Default from sender address is process.env.SMTP_USER
 */
function getSenderAddress() {
  return process.env.SMTP_USER || process.env.SMTP_FROM || 'noreply@onepot.app';
}

/**
 * Parse Device and Operating System from HTTP User-Agent Header
 */
function parseDeviceAndOS(userAgent = '') {
  const ua = userAgent || '';
  let os = 'Unknown OS';
  let device = 'Personal Device';

  // Parse Operating System
  if (/windows nt 10\.0/i.test(ua)) os = 'Windows 10/11';
  else if (/windows nt 6\.3/i.test(ua)) os = 'Windows 8.1';
  else if (/windows nt 6\.2/i.test(ua)) os = 'Windows 8';
  else if (/windows nt 6\.1/i.test(ua)) os = 'Windows 7';
  else if (/windows/i.test(ua)) os = 'Windows';
  else if (/iphone/i.test(ua)) os = 'iOS';
  else if (/ipad/i.test(ua)) os = 'iPadOS';
  else if (/android/i.test(ua)) {
    const match = ua.match(/android\s+([0-9.]+)/i);
    os = match ? `Android ${match[1]}` : 'Android';
  } else if (/mac os x/i.test(ua) || /macintosh/i.test(ua)) {
    os = 'macOS';
  } else if (/linux/i.test(ua)) {
    os = 'Linux';
  }

  // Parse Device Name
  if (/iphone/i.test(ua)) device = 'Apple iPhone';
  else if (/ipad/i.test(ua)) device = 'Apple iPad';
  else if (/macintosh/i.test(ua)) device = 'Apple Mac';
  else if (/windows/i.test(ua)) device = 'Windows PC';
  else if (/android/i.test(ua)) {
    const modelMatch = ua.match(/;\s*([^;]+?)\s*Build\//i);
    device = modelMatch ? modelMatch[1].trim() : 'Android Device';
  } else if (/mobile/i.test(ua)) {
    device = 'Mobile Device';
  } else {
    device = 'Desktop Computer';
  }

  return { device, os };
}

/**
 * Core email dispatch helper.
 * Catches and logs any SMTP transport errors cleanly in console.error without throwing.
 */
async function sendEmail({ to, subject, html, text, from }) {
  if (!to) {
    console.warn('[EMAIL WARNING] No recipient address provided. Skipping dispatch.');
    return { success: false, error: 'No recipient' };
  }

  try {
    const transporter = getTransporter();
    const sender = from || getSenderAddress();

    const info = await transporter.sendMail({
      from: sender,
      to,
      subject,
      html,
      text: text || ''
    });

    console.log(`=======================================================`);
    console.log(`📧 [EMAIL DELIVERED TO INBOX] Recipient: ${to}`);
    console.log(`📬 [SUBJECT]: ${subject}`);
    console.log(`🆔 [MESSAGE ID]: ${info.messageId}`);
    if (nodemailer.getTestMessageUrl(info)) {
      console.log(`🔗 [PREVIEW URL]: ${nodemailer.getTestMessageUrl(info)}`);
    }
    console.log(`=======================================================`);

    return {
      success: true,
      messageId: info.messageId,
      recipient: to,
      subject
    };
  } catch (error) {
    console.error(`[SMTP ERROR] Failed to send email to ${to}:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 1. ALAT-Style Login Security Alert Email
 * Subject: You Logged In
 * Sends asynchronously in the background without blocking API responses.
 */
async function sendLoginAlert(user = {}, req = null) {
  const to = user?.email || user?.to;
  if (!to) return { success: false, error: 'No recipient' };

  const name = user?.first_name || user?.firstName || user?.name || 'there';

  let userAgent = '';
  if (req && req.headers) {
    userAgent = req.headers['user-agent'] || '';
  } else if (user?.userAgent || user?.user_agent) {
    userAgent = user?.userAgent || user?.user_agent;
  }

  const { device, os } = parseDeviceAndOS(userAgent);
  const now = new Date();
  const formattedTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const formattedDate = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const subject = 'You Logged In';

  const plainText = `Hi ${name},\nYou logged into your OnePot account from a device (${device}), Operating System ${os} at ${formattedTime} on ${formattedDate}. If this login did not originate from you, please let us know by sending an email to support@onepot.com. Alternatively, you can call 0700-ONE-POT immediately. Thanks.`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You Logged In</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <center>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); text-align: left;">
      <tr>
        <td style="padding: 24px 28px 16px 28px; border-bottom: 1px solid #f1f5f9;">
          <span style="font-size: 24px; vertical-align: middle;">🍲</span>
          <span style="font-size: 20px; font-weight: 800; color: #0f172a; margin-left: 8px; vertical-align: middle; letter-spacing: -0.5px;">OnePot</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 28px;">
          <p style="font-size: 15px; color: #0f172a; margin: 0 0 16px 0; font-weight: 600;">Hi ${name},</p>
          <p style="font-size: 14px; color: #334155; line-height: 1.6; margin: 0 0 20px 0;">
            You logged into your OnePot account from a device (<strong>${device}</strong>), Operating System <strong>${os}</strong> at <strong>${formattedTime}</strong> on <strong>${formattedDate}</strong>. If this login did not originate from you, please let us know by sending an email to <a href="mailto:support@onepot.com" style="color: #059669; text-decoration: underline; font-weight: 600;">support@onepot.com</a>. Alternatively, you can call <a href="tel:0700663768" style="color: #059669; font-weight: 700; text-decoration: none;">0700-ONE-POT</a> immediately. Thanks.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding: 16px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;">
          OnePot • <em>"One family, one pot = No stories"</em>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;

  try {
    return await sendEmail({ to, subject, html, text: plainText });
  } catch (err) {
    console.error('Failed to send login alert email:', err.message);
    return { success: false, error: err.message };
  }
}

const sendLoginAlertEmail = sendLoginAlert;

/**
 * 2. Welcome Email
 * Subject: Welcome to OnePot
 * Sends asynchronously in the background without blocking API responses.
 */
async function sendWelcomeEmail(user = {}) {
  console.log("Dispatching welcome email to:", user.email);
  const to = user?.email || user?.to;
  if (!to) return { success: false, error: 'No recipient' };

  const name = user?.first_name || user?.firstName || user?.name || 'there';
  const subject = 'Welcome to OnePot';

  const plainText = `Hi ${name},\nWelcome to OnePot! Your family vault has been successfully created. You can now invite family members, set up your smart bowls, and start pooling your funds. Get started by logging in and setting your first budget limit. Thanks.`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to OnePot</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <center>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); text-align: left;">
      <tr>
        <td style="padding: 24px 28px 16px 28px; border-bottom: 1px solid #f1f5f9;">
          <span style="font-size: 24px; vertical-align: middle;">🍲</span>
          <span style="font-size: 20px; font-weight: 800; color: #0f172a; margin-left: 8px; vertical-align: middle; letter-spacing: -0.5px;">OnePot</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 28px;">
          <p style="font-size: 15px; color: #0f172a; margin: 0 0 16px 0; font-weight: 600;">Hi ${name},</p>
          <p style="font-size: 14px; color: #334155; line-height: 1.6; margin: 0 0 20px 0;">
            Welcome to OnePot! Your family vault has been successfully created. You can now invite family members, set up your smart bowls, and start pooling your funds. Get started by logging in and setting your first budget limit. Thanks.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding: 16px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;">
          OnePot • <em>"One family, one pot = No stories"</em>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;

  try {
    return await sendEmail({ to, subject, html, text: plainText });
  } catch (err) {
    console.error('Failed to send welcome email:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 3. Password Reset Email (Kept for forgot-password flow)
 */
async function sendPasswordResetEmail({ to, firstName, resetOtp, resetLink, expiresMinutes = 15 }) {
  if (!to) return;
  const otpCode = resetOtp || '123456';
  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const link = resetLink || `${appUrl}?resetToken=${otpCode}`;

  const subject = `🔐 Reset Your OnePot Account Password (Code: ${otpCode})`;
  const text = `Hello ${firstName || 'there'}, use OTP code ${otpCode} to reset your OnePot password. It expires in ${expiresMinutes} minutes. If you did not request this, please ignore.`;
  const html = `<p>Hello ${firstName || 'there'}, use OTP code <strong>${otpCode}</strong> to reset your OnePot password.</p><p><a href="${link}">Reset Password</a></p>`;

  return sendEmail({ to, subject, html, text });
}

/**
 * 4. Contribution Confirmation Email (Kept for paymentController verification)
 */
async function sendContributionConfirmationEmail({ to, contributorName, amount, totalPotBalance, familyName }) {
  if (!to) return;
  const formattedAmount = Number(amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 });
  const subject = `Contribution Confirmed: ₦${formattedAmount} added to ${familyName || 'the Pot'}`;
  const text = `Hello! ₦${formattedAmount} contributed by ${contributorName || 'Family Member'} to ${familyName || 'the Pot'}. Total Balance: ₦${Number(totalPotBalance || 0).toLocaleString('en-NG')}.`;
  const html = `<p><strong>Contribution Confirmed!</strong></p><p>₦${formattedAmount} contributed by ${contributorName || 'Family Member'} to ${familyName || 'the Pot'}.</p>`;

  return sendEmail({ to, subject, html, text });
}

const SMTPNotificationService = {
  sendEmail,
  sendLoginAlert,
  sendLoginAlertEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendContributionConfirmationEmail,
  parseDeviceAndOS,
  getTransporter
};

module.exports = {
  sendEmail,
  sendLoginAlert,
  sendLoginAlertEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendContributionConfirmationEmail,
  parseDeviceAndOS,
  getTransporter,
  SMTPNotificationService
};
