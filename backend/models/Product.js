import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type:     String,
      required: [true, "Product name is required"],
      trim:     true,
    },
    slug: {
      type:      String,
      unique:    true,
      lowercase: true,
      trim:      true,
    },
    description: {
      type: String,
      trim: true,
    },

    // ─── Pricing ──────────────────────────────────
    // `price` is kept as the base/fallback USD price.
    // priceUSD / priceINR / priceEUR are the per-region display prices.
    price: {
      type:     Number,
      required: [true, "Price is required"],
      min:      [0, "Price cannot be negative"],
    },
    priceUSD: { type: Number, default: null },
    priceINR: { type: Number, default: null },
    priceEUR: { type: Number, default: null },

    billingCycle: {
      type:    String,
      enum:    ["month", "year", "one_time"],
      default: "month",
    },

    // ─── Category ──────────────────────────────────
    // Plain string — no enum so any category name from
    // the Category collection is accepted.
    category: {
      type:     String,
      required: [true, "Category is required"],
      trim:     true,
    },

    // ─── Type ─────────────────────────────────────
    type: {
      type:    String,
      enum:    ["subscription", "screen", "one_time"],
      default: "subscription",
    },

    // How many concurrent screens this product grants (for type "screen")
    screensGranted: {
      type:    Number,
      default: 0,
    },

    // ─── Media ────────────────────────────────────
    image:              { type: String, default: null },
    cloudinaryPublicId: { type: String, default: null },

    // ─── Misc ─────────────────────────────────────
    features:   { type: [String], default: [] },
    isActive:   { type: Boolean,  default: true  },
    isFeatured: { type: Boolean,  default: false },
    inStock:    { type: Boolean,  default: true  },

    // LemonSqueezy variant ID for USD store (US / rest of world)
    lsVariantId:    { type: String, default: null },
    // LemonSqueezy variant ID for EUR store (European customers)
    lsVariantIdEur: { type: String, default: null },
    sortOrder:  { type: Number,   default: 0     },
  },
  { timestamps: true }
);

// ─── Auto-generate slug from name if not provided ──
productSchema.pre("save", function () {
  if (this.slug) return;
  this.slug = this.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
});

// ─── Keep base `price` in sync with priceUSD ──────
productSchema.pre("save", function () {
  if (this.priceUSD != null && this.isModified("priceUSD")) {
    this.price = this.priceUSD;
  }
});

const Product = mongoose.model("Product", productSchema);
export default Product;