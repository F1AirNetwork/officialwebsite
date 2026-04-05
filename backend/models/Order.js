import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user:        { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true, index: true },
    product:     { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    amount:      { type: Number, required: true, min: 0 },
    currency:    { type: String, default: "INR" },

    status: {
      type:    String,
      enum:    ["pending", "paid", "failed", "refunded", "cancelled"],
      default: "pending",
      index:   true,
    },
    paidAt: { type: Date, default: null },

    // ─── Payment gateway ───────────────────────
    gateway: {
      type:    String,
      enum:    ["razorpay", "lemonsqueezy"],
      default: "razorpay",
    },

    // ─── Razorpay fields ───────────────────────
    razorpayOrderId:   { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },

    // ─── LemonSqueezy fields ───────────────────
    lsCheckoutId:  { type: String, default: null }, // checkout session id
    lsOrderId:     { type: String, default: null }, // ls order id (from webhook)
    lsCustomerId:  { type: String, default: null }, // ls customer id

    // ─── Gift orders ───────────────────────────
    isGift:   { type: Boolean, default: false },
    giftNote: { type: String,  default: ""    },
    giftedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);
export default Order;