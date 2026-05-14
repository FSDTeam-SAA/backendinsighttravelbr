import nodemailer from 'nodemailer';

const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

export const sendEmail = async ({ to, subject, html }) => {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"Insight Travel" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};

const otpPurposeConfig = {
  reset: {
    subject: 'Password Reset OTP – Insight Travel',
    heading: 'Reset Your Password',
    body: 'You requested a password reset. Use the OTP below to proceed. This code expires in <strong>10 minutes</strong>.',
    note: "If you didn't request this, you can safely ignore this email.",
  },
  verify: {
    subject: 'Email Verification OTP – Insight Travel',
    heading: 'Verify Your Email',
    body: 'Welcome to Insight Travel! Use the OTP below to verify your email address. This code expires in <strong>10 minutes</strong>.',
    note: "If you didn't create an account, you can safely ignore this email.",
  },
};

export const sendOTPEmail = async ({ to, otp, purpose = 'reset' }) => {
  const config = otpPurposeConfig[purpose] ?? otpPurposeConfig.reset;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${config.subject}</title>
    </head>
    <body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
        <tr>
          <td align="center">
            <table width="560" cellpadding="0" cellspacing="0"
              style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#1a56db,#0e9f6e);padding:36px 40px;text-align:center;">
                  <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
                    Insight Travel
                  </h1>
                  <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
                    ${config.heading}
                  </p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:36px 40px;">
                  <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6;">
                    ${config.body}
                  </p>

                  <!-- OTP box -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding:24px 0;">
                        <div style="display:inline-block;background:#f0f4ff;border:2px dashed #1a56db;
                          border-radius:10px;padding:18px 48px;">
                          <span style="font-size:38px;font-weight:800;letter-spacing:10px;color:#1a56db;
                            font-family:'Courier New',monospace;">
                            ${otp}
                          </span>
                        </div>
                      </td>
                    </tr>
                  </table>

                  <p style="margin:20px 0 0;color:#6b7280;font-size:13px;line-height:1.6;">
                    ${config.note}
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background:#f9fafb;padding:20px 40px;text-align:center;
                  border-top:1px solid #e5e7eb;">
                  <p style="margin:0;color:#9ca3af;font-size:12px;">
                    &copy; ${new Date().getFullYear()} Insight Travel. All rights reserved.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  await sendEmail({ to, subject: config.subject, html });
};
