import mongoose from "mongoose";
import bcrypt    from "bcryptjs";

const subscriptionSchema = new mongoose.Schema(
  {
    product:     { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    productName: { type: String },
    price:       { type: Number },
    status:      { type: String, enum: ["active", "cancelled", "expired"], default: "active" },
    startDate:   { type: Date, default: Date.now },
    renewalDate: { type: Date },
  },
  { _id: false }
);

const screenPurchaseSchema = new mongoose.Schema(
  {
    orderId:     { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    price:       { type: Number, required: true },
    purchasedAt: { type: Date, default: Date.now },
    expiresAt:   { type: Date, default: null },
    status:      { type: String, enum: ["active", "expired", "cancelled"], default: "active" },
  },
  { _id: true }
);

// ─── Purchased products array ──────────────────
// Source of truth for "what has this user paid for".
// Populated on every successful payment (Razorpay, LS, free, gift).
// Used by stream product gate and Store isPurchased check.
const purchasedProductSchema = new mongoose.Schema(
  {
    productId:   { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    orderId:     { type: mongoose.Schema.Types.ObjectId, ref: "Order",   required: true },
    productName: { type: String, required: true },
    purchasedAt: { type: Date,   default: Date.now },
    status:      { type: String, enum: ["active", "cancelled", "refunded"], default: "active" },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: [true, "First name is required"], trim: true },
    lastName:  { type: String, required: [true, "Last name is required"],  trim: true },
    email: {
      type:      String,
      required:  [true, "Email is required"],
      unique:    true,
      lowercase: true,
      trim:      true,
      match:     [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },
    password: { type: String, minlength: [6, "Password must be at least 6 characters"], select: false },
    googleId: { type: String, default: null },
    avatar:   { type: String, default: null },

    role:       { type: String, enum: ["user", "admin"], default: "user" },
    isVerified: { type: Boolean, default: false },

    country:  { type: String, default: "", trim: true, uppercase: true, maxlength: 2 },
    currency: { type: String, enum: ["USD", "INR", "EUR"], default: "USD" },

    isBanned:  { type: Boolean, default: false },
    banReason: { type: String,  default: ""    },
    bannedAt:  { type: Date,    default: null  },

    // ─── Primary subscription (latest active sub) ──
    subscription: { type: subscriptionSchema, default: null },

    // ─── Screen purchases ──────────────────────────
    screenPurchases: { type: [screenPurchaseSchema], default: [] },

    // ─── All purchased products ────────────────────
    // Append-only log of every paid product. Never delete entries —
    // set status to "cancelled" or "refunded" instead.
    purchasedProducts: { type: [purchasedProductSchema], default: [] },

    refreshToken: { type: String, select: false },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// ─── Virtual: total screens ───────────────────
userSchema.virtual("totalScreens").get(function () {
  const hasActiveSub = this.subscription?.status === "active";
  const baseScreens  = hasActiveSub ? 1 : 0;
  const now = new Date();
  const activeExtraScreens = (this.screenPurchases || []).filter((s) => {
    if (s.status !== "active") return false;
    if (s.expiresAt && s.expiresAt < now) return false;
    return true;
  }).length;
  return baseScreens + activeExtraScreens;
});

userSchema.virtual("activeExtraScreens").get(function () {
  const now = new Date();
  return (this.screenPurchases || []).filter((s) => {
    if (s.status !== "active") return false;
    if (s.expiresAt && s.expiresAt < now) return false;
    return true;
  }).length;
});

userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// ─── Instance method: add a purchased screen ──
userSchema.methods.addScreen = async function (orderId, price, expiresAt = null) {
  this.screenPurchases.push({ orderId, price, expiresAt, status: "active" });
  await this.save({ validateBeforeSave: false });
};

// ─── Instance method: record a product purchase ─
userSchema.methods.addPurchase = async function (productId, orderId, productName) {
  // Avoid duplicate active entries for the same order
  const exists = this.purchasedProducts.some(
    (p) => p.orderId.toString() === orderId.toString()
  );
  if (!exists) {
    this.purchasedProducts.push({ productId, orderId, productName, status: "active" });
    await this.save({ validateBeforeSave: false });
  }
};

// ─── Instance method: cancel a specific purchase ─
userSchema.methods.cancelPurchase = async function (orderId) {
  const entry = this.purchasedProducts.find(
    (p) => p.orderId.toString() === orderId.toString()
  );
  if (entry) {
    entry.status = "cancelled";
    await this.save({ validateBeforeSave: false });
  }
};

// ─── Hash password before saving ─────────────
userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;