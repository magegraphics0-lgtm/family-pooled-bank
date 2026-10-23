/**
 * NaijaFamily Pooled Bank - Email Notification Service
 * Handles Nodemailer SMTP transporter initialization, responsive HTML template generation,
 * and asynchronous email dispatch for Welcome and Login Security alerts.
 */

const nodemailer = require('nodemailer');

/**
 * Creates and configures the Nodemailer SMTP transporter strictly from environment variables.
 * If credentials are not provided (e.g. in first-run local development), returns null so
 * the service can safely operate in simulation/dev mode without throwing unhandled exceptions.
 */
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
  });
}

// Active transporter instance (lazily evaluated or re-evaluated if env changes)
let transporter = createTransporter();

/**
 * Helper to get the sender address strictly from .env
 */
function getSenderAddress() {
  return process.env.EMAIL_FROM || '"NaijaFamily Pooled Bank" <noreply@naijafamilybank.org.ng>';
}

/**
 * Format timestamp nicely for human-readable display in emails (Nigerian WAT / Local)
 */
function formatDateTime(dateInput) {
  const date = dateInput ? new Date(dateInput) : new Date();
  return date.toLocaleString('en-NG', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  });
}

/**
 * HTML Template 1: Welcome Email Confirming Family Account Registration
 */
function generateWelcomeEmailTemplate({ firstName, familyName, role, email, isJoin = false }) {
  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const roleTitle = role || (isJoin ? 'Child (Member)' : 'Parent (Family Admin)');
  const headingText = isJoin
    ? `Welcome to the ${familyName} Household!`
    : `Welcome to NaijaFamily Pooled Bank!`;
  const subHeading = isJoin
    ? `You have joined the ${familyName} pooled treasury fund.`
    : `Your new family pooled account "${familyName}" is active and ready.`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headingText}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155; }
    table { border-collapse: collapse; }
    img { border: 0; display: block; }
    @media only screen and (max-width: 620px) {
      .container { width: 100% !important; border-radius: 0 !important; }
      .content-padding { padding: 24px 18px !important; }
      .hero-title { font-size: 22px !important; }
      .feature-box { display: block !important; width: 100% !important; margin-bottom: 12px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #0b1120;">
  <center>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4);">
      
      <!-- HEADER / BRAND BANNER -->
      <tr>
        <td style="background: linear-gradient(135deg, #064e3b 0%, #047857 50%, #0f766e 100%); padding: 36px 32px 30px 32px; text-align: center;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td align="center">
                <div style="display: inline-block; background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 50%; width: 56px; height: 56px; line-height: 56px; text-align: center; font-size: 28px; margin-bottom: 12px;">
                  🏛️
                </div>
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                  NaijaFamily Pooled Bank
                </h1>
                <p style="color: #a7f3d0; margin: 6px 0 0 0; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">
                  Household Financial Transparency & Wealth
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- BODY CONTENT -->
      <tr>
        <td class="content-padding" style="padding: 36px 36px 24px 36px; background-color: #ffffff;">
          <h2 class="hero-title" style="color: #0f172a; margin: 0 0 12px 0; font-size: 22px; font-weight: 700;">
            Hello, ${firstName}! 👋
          </h2>
          <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
            ${subHeading} Together, your family can track shared expenses, pool capital for household projects, and build long-term generational security.
          </p>

          <!-- CONFIRMATION SUMMARY CARD -->
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin: 24px 0; overflow: hidden;">
            <tr>
              <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0; background: #f1f5f9;">
                <strong style="color: #0f172a; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">📋 Account Confirmation Details</strong>
              </td>
            </tr>
            <tr>
              <td style="padding: 16px 20px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px; color: #334155;">
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; width: 40%;">Family Household:</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${familyName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Assigned Role:</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #047857;">
                      <span style="background: #dcfce7; color: #15803d; padding: 2px 8px; border-radius: 6px; font-size: 12px;">${roleTitle}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Registered Email:</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${email}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Registration Date:</td>
                    <td style="padding: 6px 0; color: #0f172a;">${formatDateTime()}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- QUICK FEATURE HIGHLIGHTS -->
          <h3 style="color: #0f172a; font-size: 16px; margin: 24px 0 12px 0; font-weight: 600;">
            What you can do right now:
          </h3>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
            <tr>
              <td style="padding: 8px 0; vertical-align: top;">
                <span style="display: inline-block; font-size: 18px; margin-right: 10px;">💰</span>
              </td>
              <td style="padding: 8px 0; color: #475569; font-size: 14px; line-height: 1.5;">
                <strong style="color: #0f172a;">Pooled Fund Treasury:</strong> Contribute to family savings and approve collective allocations transparently.
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; vertical-align: top;">
                <span style="display: inline-block; font-size: 18px; margin-right: 10px;">📊</span>
              </td>
              <td style="padding: 8px 0; color: #475569; font-size: 14px; line-height: 1.5;">
                <strong style="color: #0f172a;">Category Budgets:</strong> Track expenses across Food, Rent, PHCN/Generator, and School Fees.
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; vertical-align: top;">
                <span style="display: inline-block; font-size: 18px; margin-right: 10px;">🛡️</span>
              </td>
              <td style="padding: 8px 0; color: #475569; font-size: 14px; line-height: 1.5;">
                <strong style="color: #0f172a;">Full Transparency:</strong> Every member sees verified contributions and live transaction ledgers.
              </td>
            </tr>
          </table>

          <!-- CTA BUTTON -->
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0;">
            <tr>
              <td align="center">
                <a href="${appUrl}" target="_blank" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.3);">
                  Launch Family Dashboard &rarr;
                </a>
              </td>
            </tr>
          </table>

          <!-- SECURITY NOTE -->
          <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 6px; margin-top: 24px;">
            <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5;">
              <strong>Security Reminder:</strong> Never share your account password. NaijaFamily Bank staff will never request your login password or OTP.
            </p>
          </div>
        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 36px; text-align: center;">
          <p style="color: #64748b; font-size: 12px; margin: 0 0 6px 0;">
            NaijaFamily Pooled Bank &bull; Household Financial Management Platform
          </p>
          <p style="color: #94a3b8; font-size: 11px; margin: 0;">
            This automated email was sent to ${email} because a new account was registered on this platform.
          </p>
        </td>
      </tr>

    </table>
  </center>
</body>
</html>
  `.trim();

  const text = `
Welcome to NaijaFamily Pooled Bank!

Hello ${firstName},
${subHeading}

Account Confirmation Details:
- Family Household: ${familyName}
- Assigned Role: ${roleTitle}
- Registered Email: ${email}
- Date: ${formatDateTime()}

Access your family dashboard here:
${appUrl}

Security Reminder: Never share your account password with anyone.
NaijaFamily Pooled Bank - Empowering Household Financial Transparency
  `.trim();

  return { html, text, subject: `🎉 Welcome to NaijaFamily Pooled Bank - ${familyName}` };
}

/**
 * HTML Template 2: Login Security Alert Template
 */
function generateLoginAlertEmailTemplate({ firstName, familyName, role, email, loginTime, ipAddress, userAgent }) {
  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const formattedTime = formatDateTime(loginTime || new Date());
  const cleanIp = ipAddress ? String(ipAddress).replace('::ffff:', '') : 'Localhost / Internal';
  const cleanDevice = userAgent || 'Web Browser (Standard Client)';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Security Alert: Successful Sign-in</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155; }
    table { border-collapse: collapse; }
    img { border: 0; display: block; }
    @media only screen and (max-width: 620px) {
      .container { width: 100% !important; border-radius: 0 !important; }
      .content-padding { padding: 24px 18px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #0b1120;">
  <center>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4);">
      
      <!-- HEADER / SECURITY ALERT BANNER -->
      <tr>
        <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%); padding: 32px 32px 28px 32px; text-align: center; border-bottom: 4px solid #10b981;">
          <div style="display: inline-block; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(52, 211, 153, 0.4); border-radius: 50%; width: 54px; height: 54px; line-height: 54px; text-align: center; font-size: 26px; margin-bottom: 12px;">
            🛡️
          </div>
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">
            Security Alert: Sign-in Notification
          </h1>
          <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 13px;">
            NaijaFamily Pooled Bank Account Protection
          </p>
        </td>
      </tr>

      <!-- BODY -->
      <tr>
        <td class="content-padding" style="padding: 32px 36px 24px 36px; background-color: #ffffff;">
          <h2 style="color: #0f172a; margin: 0 0 10px 0; font-size: 20px; font-weight: 700;">
            Hi ${firstName},
          </h2>
          <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
            We noticed a successful sign-in to your account for the <strong>${familyName}</strong> family pool.
          </p>

          <!-- AUDIT DETAILS TABLE -->
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin: 20px 0; overflow: hidden;">
            <tr>
              <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; background: #f1f5f9;">
                <strong style="color: #0f172a; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">🔍 Sign-in Session Summary</strong>
              </td>
            </tr>
            <tr>
              <td style="padding: 16px 20px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px; color: #334155;">
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; width: 35%;">Timestamp:</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${formattedTime}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">IP Address:</td>
                    <td style="padding: 6px 0; font-family: monospace; font-size: 13px; color: #0284c7;">${cleanIp}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Account Email:</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${email}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Household:</td>
                    <td style="padding: 6px 0; color: #0f172a;">${familyName} (${role || 'Member'})</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Client Info:</td>
                    <td style="padding: 6px 0; font-size: 12px; color: #64748b; word-break: break-all;">${cleanDevice.substring(0, 80)}...</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- SECURITY GUIDANCE -->
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.5;">
              <strong>✅ Was this you?</strong> If you just logged in, no further action is required. You can continue managing your pooled funds safely.
            </p>
          </div>

          <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #ef4444; border-radius: 6px; padding: 14px 16px; margin: 16px 0;">
            <p style="margin: 0; color: #991b1b; font-size: 13px; line-height: 1.5;">
              <strong>⚠️ Don't recognize this activity?</strong> If you did not log in at this time, someone else may have accessed your account. Please log into the portal immediately, update your password, and inform your Family Admin.
            </p>
          </div>

          <!-- ACTION BUTTON -->
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0 12px 0;">
            <tr>
              <td align="center">
                <a href="${appUrl}" target="_blank" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 8px;">
                  Open Family Dashboard &rarr;
                </a>
              </td>
            </tr>
          </table>

        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 36px; text-align: center;">
          <p style="color: #64748b; font-size: 12px; margin: 0 0 6px 0;">
            This is an automated security alert from NaijaFamily Pooled Bank.
          </p>
          <p style="color: #94a3b8; font-size: 11px; margin: 0;">
            To ensure the security of pooled finances, we send email alerts upon every successful sign-in.
          </p>
        </td>
      </tr>

    </table>
  </center>
</body>
</html>
  `.trim();

  const text = `
Security Alert: Successful Sign-in to NaijaFamily Pooled Bank

Hi ${firstName},
We detected a successful sign-in to your NaijaFamily account for ${familyName}.

Session Details:
- Date & Time: ${formattedTime}
- IP Address: ${cleanIp}
- Account: ${email}
- Household: ${familyName}

If this was you, you can safely disregard this message.
If you did not sign in, please update your password immediately:
${appUrl}

NaijaFamily Pooled Bank Security Team
  `.trim();

  return { html, text, subject: `🛡️ Security Alert: Successful Sign-in - ${familyName}` };
}

/**
 * Generic mail dispatch function
 * Dispatches via Nodemailer if configured, or logs in development/simulation mode.
 */
async function sendEmail({ to, subject, html, text }) {
  if (!transporter) {
    // Attempt re-instantiating in case .env was populated at runtime
    transporter = createTransporter();
  }

  const mailOptions = {
    from: getSenderAddress(),
    to,
    subject,
    text,
    html,
    replyTo: process.env.EMAIL_REPLY_TO || undefined
  };

  if (!transporter) {
    console.log(`\n================== [SMTP DEV SIMULATION] ==================`);
    console.log(`[TO]       ${mailOptions.to}`);
    console.log(`[FROM]     ${mailOptions.from}`);
    console.log(`[SUBJECT]  ${mailOptions.subject}`);
    console.log(`[TIME]     ${new Date().toISOString()}`);
    console.log(`[NOTE]     SMTP credentials not detected in .env. Live dispatch skipped safely.`);
    console.log(`============================================================\n`);
    return {
      success: true,
      simulated: true,
      messageId: `sim-${Date.now()}`,
      recipient: to,
      subject
    };
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[SMTP SUCCESS] Email sent to ${to} | MessageId: ${info.messageId}`);
    return {
      success: true,
      simulated: false,
      messageId: info.messageId,
      recipient: to,
      subject
    };
  } catch (error) {
    console.error(`[SMTP ERROR] Failed to send email to ${to}:`, error.message);
    throw error;
  }
}

/**
 * High-level helper: Send Welcome Email confirming account/family registration
 */
async function sendWelcomeEmail({ to, firstName, familyName, role, isJoin = false }) {
  if (!to) {
    console.warn('[EMAIL WARNING] Cannot send welcome email: Missing recipient address.');
    return;
  }
  const { html, text, subject } = generateWelcomeEmailTemplate({
    firstName,
    familyName,
    role,
    email: to,
    isJoin
  });
  return sendEmail({ to, subject, html, text });
}

/**
 * High-level helper: Send Login Security Alert Email
 */
async function sendLoginAlertEmail({ to, firstName, familyName, role, loginTime, ipAddress, userAgent }) {
  if (!to) {
    console.warn('[EMAIL WARNING] Cannot send login alert: Missing recipient address.');
    return;
  }
  const { html, text, subject } = generateLoginAlertEmailTemplate({
    firstName,
    familyName,
    role,
    email: to,
    loginTime,
    ipAddress,
    userAgent
  });
  return sendEmail({ to, subject, html, text });
}

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendLoginAlertEmail,
  generateWelcomeEmailTemplate,
  generateLoginAlertEmailTemplate,
  formatDateTime
};
