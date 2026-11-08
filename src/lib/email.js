import nodemailer from 'nodemailer';

function envVal(key) {
  const raw = process.env[key];
  if (raw == null || raw === '') return '';
  let v = String(raw).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  return v.trim();
}

function smtpConfig() {
  const host = envVal('SMTP_HOST') || 'smtp.hostinger.com';
  const port = parseInt(envVal('SMTP_PORT') || '465', 10);
  const secure =
    envVal('SMTP_SECURE').toLowerCase() === 'false' ? false : port === 465;
  const user = envVal('SMTP_USER');
  const pass = envVal('SMTP_PASS');
  const from = envVal('SMTP_FROM') || (user ? `"Hood Gaming" <${user}>` : '');
  return { host, port, secure, user, pass, from };
}

export async function verifySmtpConnection() {
  const cfg = smtpConfig();
  if (!cfg.user || !cfg.pass) {
    return { success: false, error: 'SMTP_USER or SMTP_PASS not set' };
  }
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 12000,
    tls: { rejectUnauthorized: false },
  });
  try {
    await transporter.verify();
    return { success: true, host: cfg.host, port: cfg.port, user: cfg.user };
  } catch (err) {
    return { success: false, error: err.message, user: cfg.user, host: cfg.host, port: cfg.port };
  }
}

function createSmtpTransporter() {
  const cfg = smtpConfig();

  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 12000,
    tls: {
      rejectUnauthorized: false,
    },
  });
}

export async function sendEmail({ to, subject, html, text }) {
  const cfg = smtpConfig();

  if (!cfg.user || !cfg.pass) {
    console.log(`[SMTP SIMULATED] To: ${to} | Subject: ${subject}`);
    return { success: true, simulated: true };
  }

  try {
    const transporter = createSmtpTransporter();
    const fromRaw = cfg.from;

    const info = await transporter.sendMail({
      from: fromRaw,
      to,
      subject,
      text: text || '',
      html,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[SMTP ERROR] To: ${to} | ${error.message}`);
    return { success: false, error: error.message };
  }
}

export function getWelcomeEmailTemplate(username) {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://hoodgaming.com';
  return `
    <div style="background:#070d1e;color:#fff;padding:40px;font-family:Helvetica,Arial,sans-serif;max-width:560px;margin:auto;border-radius:16px;border:1px solid #2cb64e;text-align:center;">
      <h1 style="color:#2cb64e;margin:0 0 8px;font-size:22px;">HOOD GAMING</h1>
      <p style="color:#94a3b8;font-size:13px;margin-top:0;">Official Sweepstakes Concierge</p>
      <h2 style="font-size:18px;text-align:left;">Welcome, ${username}!</h2>
      <p style="font-size:14px;color:#cbd5e1;line-height:1.6;text-align:left;">
        Your account is verified. Complete the Freeplay task in the lobby to claim sweeps credits, then explore deposit &amp; game IDs.
      </p>
      <a href="${base}" style="display:inline-block;margin-top:20px;background:#2cb64e;color:#070d1e;padding:12px 28px;font-weight:900;text-decoration:none;border-radius:999px;">Play Now</a>
    </div>
  `;
}

export function getOtpEmailTemplate(otp, purpose = 'Account Verification') {
  return `
    <div style="background:#070d1e;color:#fff;padding:36px 24px;font-family:Helvetica,Arial,sans-serif;max-width:520px;margin:auto;border-radius:16px;border:1px solid #1a3363;text-align:center;">
      <h1 style="color:#2cb64e;margin:0;font-size:20px;">Hood Gaming</h1>
      <p style="color:#94a3b8;font-size:12px;margin:8px 0 24px;">${purpose}</p>
      <div style="background:#09142a;border:1px solid #2cb64e33;border-radius:12px;padding:24px;">
        <p style="font-size:13px;color:#cbd5e1;margin:0 0 16px;">Your 6-digit code (expires in 10 minutes):</p>
        <div style="font-size:32px;font-weight:900;letter-spacing:8px;color:#2cb64e;font-family:monospace;">${otp}</div>
      </div>
    </div>
  `;
}
