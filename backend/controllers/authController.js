import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/user.js";
import { env } from "../config.js";
import { sendEmail } from "../utils/sendEmail.js";
import { HttpError } from "../utils/httpError.js";

const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
const GENERIC_RESET_MESSAGE =
  "If an account with that email exists, a password reset link has been sent.";

const buildFrontendBaseUrl = (req) => {
  const configuredBaseUrl =
    env.PASSWORD_RESET_BASE_URL ||
    env.FRONTEND_URL ||
    env.CLIENT_URL;

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  const protocol = req.headers["x-forwarded-proto"] || req.protocol;
  return `${protocol}://${req.get("host")}`;
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      res.status(200).json({
        success: true,
        message: GENERIC_RESET_MESSAGE,
      });
      return;
    }

    const rawResetToken = crypto.randomBytes(32).toString("hex");
    const hashedResetToken = crypto
      .createHash("sha256")
      .update(rawResetToken)
      .digest("hex");

    user.resetPasswordToken = hashedResetToken;
    user.resetPasswordExpire = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await user.save({ validateBeforeSave: false });

    const frontendBaseUrl = buildFrontendBaseUrl(req);
    const resetUrl = `${frontendBaseUrl.replace(/\/$/, "")}/reset-password?token=${rawResetToken}`;

    try {
      await sendEmail(user.email, resetUrl);
    } catch (mailError) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      next(new HttpError(500, "Unable to send reset email. Please try again later.", { cause: mailError.message }));
      return;
    }

    res.status(200).json({
      success: true,
      message: GENERIC_RESET_MESSAGE,
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const password = req.body.password || req.body.newPassword;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      next(new HttpError(400, "Reset token is invalid or has expired"));
      return;
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    next(error);
  }
};
