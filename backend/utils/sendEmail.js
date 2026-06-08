import nodemailer from "nodemailer";
import { env } from "../config.js";

// Basic email format check — catches the most common malformed inputs
// before a network call is made.
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value));

// Ensure the reset URL uses a safe scheme before embedding it in an email.
// A javascript: or data: URL would execute in some email clients.
const isSafeUrl = (value, expectedDomain) => {
  try {
    const parsed = new URL(String(value));

    // Must be https in production
    if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
      return false;
    }

    // Must match expected frontend domain
    const allowedDomain = new URL(expectedDomain).hostname;
    if (parsed.hostname !== allowedDomain) {
      return false;
    }

    // Must have reset path
    if (!parsed.pathname.includes('/reset')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
};

export const sendEmail = async (email, url) => {
  if (!isValidEmail(email)) {
    throw new Error("sendEmail: the recipient email address is not valid.");
  }

  // Validate URL matches configured frontend domain to prevent URL injection
  const frontendUrl = process.env.PASSWORD_RESET_BASE_URL || process.env.FRONTEND_URL;
  if (!frontendUrl) {
    throw new Error(
      "sendEmail: PASSWORD_RESET_BASE_URL or FRONTEND_URL environment variable must be set."
    );
  }

  if (!isSafeUrl(url, frontendUrl)) {
    throw new Error(
      "sendEmail: reset URL must be from the configured frontend domain."
    );
  }

  const emailUser = env.EMAIL_USER;
  const emailPass = env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    throw new Error(
      "EMAIL_USER and EMAIL_PASS environment variables must be set before sending email."
    );
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  await transporter.sendMail({
    from: emailUser,
    to: email,
    subject: "Password Reset",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>You requested a password reset for your account. Click the button below to reset your password.</p>
        <p>This link will expire in 1 hour.</p>

        <a href="${url}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
          Reset Password
        </a>

        <p style="color: #666; font-size: 14px; margin-top: 20px;">
          If you did not request a password reset, please ignore this email and your password will remain unchanged.
        </p>

        <p style="color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px;">
          For security reasons, do not share this link with anyone. This email contains a secure token that should not be shared.
        </p>
      </div>
    `,
  });
};