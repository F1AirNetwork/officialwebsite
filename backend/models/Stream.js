import mongoose from "mongoose";

const streamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Stream name is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Stream description is required"],
      trim: true,
    },
    hlsUrl: {
      type: String,
      trim: true,
      default: "",
    },
    embedUrl: {
      type: String,
      trim: true,
      default: "",
    },
    cardImage: {
      type: String,
      trim: true,
      default: "",
    },
    cardImagePublicId: {
      type: String,
      trim: true,
      default: "",
    },
    isLive: {
      type: Boolean,
      default: false,
    },
    isPremium: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },

    // ─── Product gate ─────────────────────────────
    // If set, user must own an order for this product (status: "paid")
    // to be allowed to join the stream.
    // If null, the default subscription check applies instead.
    requiredProductId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     "Product",
      default: null,
    },
  },
  { timestamps: true }
);

const Stream = mongoose.model("Stream", streamSchema);
export default Stream;