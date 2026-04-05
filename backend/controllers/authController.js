import User from "../models/User.js";
import OTP  from "../models/OTP.js";
import { getCurrencyForCountry } from "../utils/currencyConfig.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from "../utils/jwt.js";
import { generateOtp, sendOtpEmail } from "../utils/email.js";
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendUnauthorized,
  sendBadRequest,
  sendNotFound,
} from "../utils/response.js";

// ─── Helper: sanitize user for response ──────
const sanitizeUser = (user) => ({
  _id:             user._id,
  firstName:       user.firstName,
  lastName:        user.lastName,
  email:           user.email,
  avatar:          user.avatar,
  role:            user.role,
  isVerified:      user.isVerified,
  subscription:    user.subscription,
  screenPurchases: user.screenPurchases,
  country:         user.country,
  currency:        user.currency || "USD",
  createdAt:       user.createdAt,
});

// ─── Helper: issue both tokens ────────────────
const issueTokens = async (user, res) => {
  const isAdmin      = user.role === "admin";
  const accessToken  = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  user.refreshToken  = refreshToken;
  await user.save({ validateBeforeSave: false });
  setRefreshTokenCookie(res, refreshToken, isAdmin);
  return accessToken;
};

// ═══════════════════════════════════════════════
//  POST /api/auth/register
//  Creates account (unverified) + sends OTP email
// ═══════════════════════════════════════════════
export const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, country } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      // If already verified, block re-registration
      if (existing.isVerified) {
        return sendBadRequest(res, "An account with this email already exists.");
      }
      // Unverified account exists — delete it and let them re-register
      await User.deleteOne({ email });
    }

    // Derive currency from country
    const countryCode = country?.toUpperCase().trim().slice(0, 2) || "";
    const currency    = getCurrencyForCountry(countryCode);

    // Create unverified user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      country:    countryCode || undefined,
      currency:   currency    || "USD",
      isVerified: false,
    });

    // Delete any existing OTPs for this email
    await OTP.deleteMany({ email, type: "verify_email" });

    // Generate and save OTP
    const otpCode = generateOtp();
    await OTP.create({ email, otp: otpCode, type: "verify_email" });

    // Send OTP email via SendGrid
    await sendOtpEmail(email, otpCode, "verify_email");

    return sendCreated(
      res,
      { email },
      "Account created. Please check your email for the OTP to verify your account."
    );
  } catch (err) {
    console.error("register error:", err);
    return sendError(res, "Registration failed. Please try again.");
  }
};

// ═══════════════════════════════════════════════
//  POST /api/auth/verify-email
//  Verifies OTP → marks user as verified → issues tokens
// ═══════════════════════════════════════════════
export const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return sendBadRequest(res, "Email and OTP are required.");
    }

    // Find the latest OTP for this email
    const otpRecord = await OTP.findOne({ email, type: "verify_email" })
      .sort({ createdAt: -1 });

    if (!otpRecord) {
      return sendBadRequest(res, "OTP not found or expired. Please request a new one.");
    }

    const isMatch = await otpRecord.compareOtp(otp);
    if (!isMatch) {
      return sendBadRequest(res, "Invalid OTP. Please try again.");
    }

    // Mark user as verified
    const user = await User.findOneAndUpdate(
      { email },
      { isVerified: true },
      { new: true }
    );

    if (!user) return sendNotFound(res, "User not found.");

    // Clean up OTP
    await OTP.deleteMany({ email, type: "verify_email" });

    // Issue tokens — user is now fully logged in
    const accessToken = await issueTokens(user, res);

    return sendSuccess(
      res,
      { user: sanitizeUser(user), accessToken },
      "Email verified successfully. Welcome to F1 Air Network!"
    );
  } catch (err) {
    console.error("verifyEmail error:", err);
    return sendError(res, "Verification failed. Please try again.");
  }
};

// ═══════════════════════════════════════════════
//  POST /api/auth/resend-otp
//  Resends verification OTP (rate: 1 per minute)
// ═══════════════════════════════════════════════
export const resendOtp = async (req, res) => {
  try {
    const { email, type = "verify_email" } = req.body;

    if (!email) return sendBadRequest(res, "Email is required.");

    const user = await User.findOne({ email });
    if (!user) return sendNotFound(res, "No account found with this email.");

    if (type === "verify_email" && user.isVerified) {
      return sendBadRequest(res, "This account is already verified.");
    }

    // Rate limit — only allow resend once per minute
    const recentOtp = await OTP.findOne({ email, type }).sort({ createdAt: -1 });
    if (recentOtp) {
      const secondsAgo = (Date.now() - new Date(recentOtp.createdAt).getTime()) / 1000;
      if (secondsAgo < 60) {
        const waitSeconds = Math.ceil(60 - secondsAgo);
        return sendBadRequest(res, `Please wait ${waitSeconds} seconds before requesting a new OTP.`);
      }
    }

    // Delete old OTPs and send a new one
    await OTP.deleteMany({ email, type });
    const otpCode = generateOtp();
    await OTP.create({ email, otp: otpCode, type });
    await sendOtpEmail(email, otpCode, type);

    return sendSuccess(res, { email }, "A new OTP has been sent to your email.");
  } catch (err) {
    console.error("resendOtp error:", err);
    return sendError(res, "Failed to resend OTP.");
  }
};

// ═══════════════════════════════════════════════
//  POST /api/auth/login
// ═══════════════════════════════════════════════
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password +refreshToken");
    if (!user || !user.password) {
      return sendUnauthorized(res, "Invalid email or password.");
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return sendUnauthorized(res, "Invalid email or password.");
    }

    if (!user.isVerified) {
      // Resend OTP automatically
      await OTP.deleteMany({ email, type: "verify_email" });
      const otpCode = generateOtp();
      await OTP.create({ email, otp: otpCode, type: "verify_email" });
      await sendOtpEmail(email, otpCode, "verify_email");

      return res.status(403).json({
        success: false,
        error:   "Account not verified. A new OTP has been sent to your email.",
        requiresVerification: true,
        email,
      });
    }

    const accessToken = await issueTokens(user, res);

    return sendSuccess(
      res,
      { user: sanitizeUser(user), accessToken },
      "Logged in successfully"
    );
  } catch (err) {
    console.error("login error:", err);
    return sendError(res, "Login failed. Please try again.");
  }
};

// ═══════════════════════════════════════════════
//  POST /api/auth/forgot-password
//  Sends password reset OTP to email
// ═══════════════════════════════════════════════
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return sendBadRequest(res, "Email is required.");

    // Fetch user — select password to check if it's a password-based account
    const user = await User.findOne({ email }).select("+password");

    // Always respond the same way — don't reveal if email exists
    if (!user) {
      return sendSuccess(res, null, "If an account with that email exists, an OTP has been sent.");
    }

    // Google-only accounts have no password — they should use Google Sign In
    if (!user.password && user.googleId) {
      return sendSuccess(res, null, "If an account with that email exists, an OTP has been sent.");
    }

    // Rate limit — 1 per minute
    const recentOtp = await OTP.findOne({ email, type: "forgot_password" })
      .sort({ createdAt: -1 });
    if (recentOtp) {
      const secondsAgo = (Date.now() - new Date(recentOtp.createdAt).getTime()) / 1000;
      if (secondsAgo < 60) {
        const waitSeconds = Math.ceil(60 - secondsAgo);
        return sendBadRequest(res, `Please wait ${waitSeconds} seconds before requesting again.`);
      }
    }

    await OTP.deleteMany({ email, type: "forgot_password" });
    const otpCode = generateOtp();
    await OTP.create({ email, otp: otpCode, type: "forgot_password" });
    await sendOtpEmail(email, otpCode, "forgot_password");

    return sendSuccess(
      res,
      null,
      "If an account with that email exists, an OTP has been sent."
    );
  } catch (err) {
    console.error("forgotPassword error:", err);
    return sendError(res, "Failed to send reset OTP.");
  }
};

// ═══════════════════════════════════════════════
//  POST /api/auth/verify-reset-otp
//  Verifies the forgot-password OTP (without resetting yet)
//  Returns a short-lived resetToken the frontend uses in the next step
// ═══════════════════════════════════════════════
export const verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return sendBadRequest(res, "Email and OTP are required.");

    const otpRecord = await OTP.findOne({ email, type: "forgot_password" })
      .sort({ createdAt: -1 });

    if (!otpRecord) {
      return sendBadRequest(res, "OTP not found or expired. Please request a new one.");
    }

    const isMatch = await otpRecord.compareOtp(otp);
    if (!isMatch) return sendBadRequest(res, "Invalid OTP.");

    // Mark OTP as verified (used in reset-password step)
    otpRecord.verified = true;
    await otpRecord.save();

    // Issue a short-lived reset token (reuses access token logic, 15min)
    const user = await User.findOne({ email });
    if (!user) return sendNotFound(res, "User not found.");

    const resetToken = generateAccessToken(user._id);

    return sendSuccess(res, { resetToken }, "OTP verified. You may now reset your password.");
  } catch (err) {
    console.error("verifyResetOtp error:", err);
    return sendError(res, "OTP verification failed.");
  }
};

// ═══════════════════════════════════════════════
//  POST /api/auth/reset-password
//  Resets password using the resetToken from verify-reset-otp
// ═══════════════════════════════════════════════
export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword, confirmPassword, resetToken } = req.body;

    if (!email || !newPassword || !resetToken) {
      return sendBadRequest(res, "email, newPassword, and resetToken are required.");
    }

    if (newPassword !== confirmPassword) {
      return sendBadRequest(res, "Passwords do not match.");
    }

    if (newPassword.length < 6) {
      return sendBadRequest(res, "Password must be at least 6 characters.");
    }

    // Verify the reset token is valid and belongs to this user
    const decoded = verifyAccessToken(resetToken);
    const user = await User.findById(decoded.id);

    if (!user || user.email !== email) {
      return sendUnauthorized(res, "Invalid reset token.");
    }

    // Check there's a verified OTP for this email
    const otpRecord = await OTP.findOne({
      email,
      type: "forgot_password",
      verified: true,
    });

    if (!otpRecord) {
      return sendUnauthorized(res, "OTP not verified. Please complete the OTP step first.");
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Clean up OTPs
    await OTP.deleteMany({ email, type: "forgot_password" });

    return sendSuccess(res, null, "Password reset successfully. You can now log in.");
  } catch (err) {
    console.error("resetPassword error:", err);
    return sendError(res, "Password reset failed.");
  }
};

// ═══════════════════════════════════════════════
//  POST /api/auth/logout
// ═══════════════════════════════════════════════
export const logout = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    clearRefreshTokenCookie(res, req.user?.role === "admin");
    return sendSuccess(res, null, "Logged out successfully");
  } catch (err) {
    return sendError(res, "Logout failed.");
  }
};

// ═══════════════════════════════════════════════
//  POST /api/auth/refresh
// ═══════════════════════════════════════════════
export const refreshToken = async (req, res) => {
  try {
    // Try user cookie first, then admin cookie
    const token = req.cookies?.refreshToken || req.cookies?.adminRefreshToken;
    if (!token) return sendUnauthorized(res, "No refresh token found.");

    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.id).select("+refreshToken");

    if (!user || user.refreshToken !== token) {
      clearRefreshTokenCookie(res);
      return sendUnauthorized(res, "Invalid or expired session. Please sign in again.");
    }

    const newAccessToken  = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });
    setRefreshTokenCookie(res, newRefreshToken, user.role === "admin");

    return sendSuccess(res, { accessToken: newAccessToken }, "Token refreshed");
  } catch (err) {
    clearRefreshTokenCookie(res);
    return sendUnauthorized(res, "Session expired. Please sign in again.");
  }
};

// ═══════════════════════════════════════════════
//  GET /api/auth/me
// ═══════════════════════════════════════════════
export const getMe = async (req, res) => {
  return sendSuccess(res, sanitizeUser(req.user));
};

// ═══════════════════════════════════════════════
//  GET /api/auth/google/callback
//  Called by Passport after Google OAuth completes
//  Issues tokens and redirects to frontend
// ═══════════════════════════════════════════════
export const googleCallback = async (req, res) => {
  try {
    const user = req.user; // populated by passport
    const accessToken = await issueTokens(user, res);

    // Redirect to frontend with access token in query param
    // Frontend reads it from URL, stores in memory, then cleans the URL
    const frontendUrl = process.env.CLIENT_ORIGIN || "http://localhost:5173";
    res.redirect(`${frontendUrl}/auth/callback?token=${accessToken}`);
  } catch (err) {
    console.error("googleCallback error:", err);
    const frontendUrl = process.env.CLIENT_ORIGIN || "http://localhost:5173";
    res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
  }
};