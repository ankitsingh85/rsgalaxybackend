import nodemailer from 'nodemailer';

// Create transporter using SMTP
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false, // false for 587, true for 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify connection on startup (optional)
transporter.verify((error) => {
  if (error) console.warn('⚠️  Email service not configured:', error.message);
  else console.log('📧 Email service ready');
});

// ── Generate 6-digit OTP ──
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ── Send password reset OTP email ──
export const sendOTPEmail = async (to: string, otp: string, userName: string): Promise<void> => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || `"RS Galaxy Hotel" <${process.env.EMAIL_USER}>`,
    to,
    subject: '🔐 Password Reset OTP — RS Galaxy Hotel',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #faf9f6; padding: 0; margin: 0; }
          .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #b45309 100%); padding: 40px 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-family: Georgia, serif; font-size: 32px; letter-spacing: 2px; }
          .header p { color: rgba(255,255,255,0.9); font-size: 13px; margin-top: 8px; letter-spacing: 3px; text-transform: uppercase; }
          .content { padding: 40px 30px; }
          .greeting { font-size: 18px; color: #1f2937; margin-bottom: 16px; }
          .text { font-size: 14px; color: #4b5563; line-height: 1.7; margin-bottom: 24px; }
          .otp-box { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px dashed #f59e0b; border-radius: 16px; padding: 30px; text-align: center; margin: 30px 0; }
          .otp-label { font-size: 11px; color: #92400e; text-transform: uppercase; letter-spacing: 3px; font-weight: 700; margin-bottom: 10px; }
          .otp-code { font-size: 42px; font-weight: 800; color: #b45309; letter-spacing: 12px; font-family: 'Courier New', monospace; }
          .otp-expiry { font-size: 12px; color: #92400e; margin-top: 12px; }
          .warning { background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 8px; margin: 20px 0; }
          .warning p { font-size: 13px; color: #991b1b; margin: 0; }
          .footer { background: #1f2937; padding: 24px 30px; text-align: center; }
          .footer p { color: #9ca3af; font-size: 12px; margin: 4px 0; }
          .footer .brand { color: #f59e0b; font-weight: 700; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>RS GALAXY HOTEL</h1>
            <p>Always With You</p>
          </div>

          <div class="content">
            <p class="greeting">Hello <strong>${userName}</strong>,</p>

            <p class="text">
              We received a request to reset your password for your RS Galaxy Hotel account.
              Use the verification code below to reset your password:
            </p>

            <div class="otp-box">
              <div class="otp-label">Your One-Time Password</div>
              <div class="otp-code">${otp}</div>
              <div class="otp-expiry">⏱️ Valid for 10 minutes only</div>
            </div>

            <p class="text">
              Enter this 6-digit code on the password reset page to create a new password.
            </p>

            <div class="warning">
              <p><strong>⚠️ Security Notice:</strong> If you didn't request this, please ignore this email or contact our support team immediately. Never share this OTP with anyone — RS Galaxy staff will never ask for it.</p>
            </div>

            <p class="text" style="margin-top: 30px;">
              Need help? Reply to this email or contact us at
              <a href="mailto:support@rsgalaxy.com" style="color: #f59e0b; text-decoration: none; font-weight: 600;">support@rsgalaxy.com</a>
            </p>
          </div>

          <div class="footer">
            <p class="brand">RS GALAXY HOTEL</p>
            <p>Premium 5-Star Luxury · Goa & Rishikesh</p>
            <p style="margin-top: 12px; color: #6b7280;">© ${new Date().getFullYear()} RS Galaxy Hotel. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 OTP email sent to ${to}`);
  } catch (error: any) {
    console.error('❌ Email send failed:', error.message);
    throw new Error('Failed to send OTP email. Please try again.');
  }
};

// ── Send password change confirmation email ──
export const sendPasswordChangedEmail = async (to: string, userName: string): Promise<void> => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || `"RS Galaxy Hotel" <${process.env.EMAIL_USER}>`,
    to,
    subject: '✅ Password Changed Successfully — RS Galaxy Hotel',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-family: Georgia, serif; font-size: 28px;">✅ Password Changed</h1>
        </div>
        <div style="padding: 40px 30px;">
          <p style="font-size: 16px; color: #1f2937;">Hello <strong>${userName}</strong>,</p>
          <p style="font-size: 14px; color: #4b5563; line-height: 1.7;">
            Your RS Galaxy Hotel account password was changed successfully on <strong>${new Date().toLocaleString()}</strong>.
          </p>
          <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 8px; margin: 24px 0;">
            <p style="font-size: 13px; color: #991b1b; margin: 0;">
              <strong>⚠️ Didn't make this change?</strong> Please contact us immediately at
              <a href="mailto:support@rsgalaxy.com" style="color: #ef4444;">support@rsgalaxy.com</a>
            </p>
          </div>
          <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
            Best regards,<br>
            <strong style="color: #f59e0b;">RS Galaxy Hotel Team</strong>
          </p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error: any) {
    console.error('❌ Confirmation email failed:', error.message);
    // Don't throw — password is already changed
  }
};

// ── Send account banned notification email ──
export const sendAccountBannedEmail = async (to: string, userName: string, reason: string): Promise<void> => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || `"RS Galaxy Hotel" <${process.env.EMAIL_USER}>`,
    to,
    subject: '🚫 Account Suspended — RS Galaxy Hotel',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
        <div style="background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-family: Georgia, serif; font-size: 28px;">🚫 Account Suspended</h1>
        </div>
        <div style="padding: 40px 30px;">
          <p style="font-size: 16px; color: #1f2937;">Hello <strong>${userName}</strong>,</p>
          <p style="font-size: 14px; color: #4b5563; line-height: 1.7;">
            Your RS Galaxy Hotel account has been suspended by an administrator for the following reason:
          </p>
          <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 8px; margin: 24px 0;">
            <p style="font-size: 14px; color: #991b1b; margin: 0;">${reason}</p>
          </div>
          <p style="font-size: 14px; color: #6b7280;">
            If you believe this is a mistake, please contact us at
            <a href="mailto:support@rsgalaxy.com" style="color: #ef4444;">support@rsgalaxy.com</a>
          </p>
          <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
            Best regards,<br>
            <strong style="color: #f59e0b;">RS Galaxy Hotel Team</strong>
          </p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error: any) {
    console.error('❌ Ban notification email failed:', error.message);
    // Don't throw — the ban is already applied
  }
};

export const sendNotificationEmail = async (to: string, userName: string, title: string, message: string): Promise<void> => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || `"RS Galaxy Hotel" <${process.env.EMAIL_USER}>`,
    to,
    subject: `${title} - RS Galaxy Hotel`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #b45309 100%); padding: 32px 28px;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${title}</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">RS Galaxy Hotel</p>
        </div>
        <div style="padding: 32px 28px;">
          <p style="font-size: 16px; color: #1f2937;">Hello <strong>${userName}</strong>,</p>
          <p style="font-size: 14px; color: #4b5563; line-height: 1.7; white-space: pre-line;">${message}</p>
          <p style="font-size: 13px; color: #6b7280; margin-top: 28px;">
            This notification was sent by the RS Galaxy Hotel admin team.
          </p>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};
