import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    otp: {
      type: String,
      required: true, // stored as bcrypt hash
    },
    type: {
      type: String,
      enum: ["verify_email", "forgot_password"],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
    },
    verified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
  // ← NO TTL index — expiry is checked manually in authController
  // This prevents Atlas from auto-deleting OTPs before they can be verified
);

// Hash OTP before saving
otpSchema.pre("save", async function () {
  if (!this.isModified("otp")) return;
  this.otp = await bcrypt.hash(this.otp, 10);
});

// Instance method to compare OTP
otpSchema.methods.compareOtp = async function (candidateOtp) {
  return bcrypt.compare(candidateOtp, this.otp);
};

// Check if OTP is expired
otpSchema.methods.isExpired = function () {
  return new Date() > this.expiresAt;
};

const OTP = mongoose.model("OTP", otpSchema);
export default OTP;