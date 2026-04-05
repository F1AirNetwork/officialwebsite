import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// ─── Generate 6-digit OTP ─────────────────────
export const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// ─── Send OTP Email ───────────────────────────
export const sendOtpEmail = async (to, otp, type) => {
  const isReset = type === "forgot_password";

  const subject = isReset
    ? "F1 Air Network — Password Reset OTP"
    : "F1 Air Network — Verify Your Email";

  const heading = isReset ? "Reset Your Password" : "Verify Your Email";

  const subtext = isReset
    ? "Enter this OTP to reset your password. This OTP expires in 10 minutes."
    : "Enter this OTP to verify your email address. This OTP expires in 10 minutes.";

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to,
      subject,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          </head>
          <body style="margin:0;padding:0;background-color:#0a0a0a;font-family:Arial,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0;">
              <tr>
                <td align="center">
                  <table width="480" cellpadding="0" cellspacing="0"
                    style="background:#111;border:1px solid #222;border-radius:12px;overflow:hidden;">

                    <!-- Header -->
                    <tr>
                      <td style="padding:32px 40px;border-bottom:1px solid #222;">
                        <p style="margin:0;color:#fff;font-size:13px;letter-spacing:4px;text-transform:uppercase;">
                          F1 AIR NETWORK
                        </p>
                      </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                      <td style="padding:40px;">
                        <h1 style="margin:0 0 12px;color:#fff;font-size:22px;font-weight:700;">
                          ${heading}
                        </h1>
                        <p style="margin:0 0 32px;color:#999;font-size:14px;line-height:1.6;">
                          ${subtext}
                        </p>

                        <!-- OTP Box -->
                        <div style="background:#1a1a1a;border:1px solid #333;border-radius:8px;
                                    padding:28px;text-align:center;margin-bottom:32px;">
                          <p style="margin:0 0 8px;color:#666;font-size:11px;letter-spacing:3px;text-transform:uppercase;">
                            Your OTP
                          </p>
                          <p style="margin:0;color:#fff;font-size:42px;font-weight:700;letter-spacing:12px;">
                            ${otp}
                          </p>
                        </div>

                        <p style="margin:0;color:#555;font-size:12px;line-height:1.6;">
                          This OTP expires in <strong style="color:#888;">10 minutes</strong>.
                          If you didn't request this, you can safely ignore this email.
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="padding:24px 40px;border-top:1px solid #222;">
                        <p style="margin:0;color:#444;font-size:11px;">
                          © ${new Date().getFullYear()} F1 Air Network. All rights reserved.
                        </p>
                      </td>
                    </tr>

                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    console.log(`✅ OTP email sent to ${to}`);
  } catch (err) {
    console.error(`❌ Failed to send OTP email to ${to}:`, err.message);
    // Don't throw — log and continue. Email is nice-to-have, not critical.
  }
};
