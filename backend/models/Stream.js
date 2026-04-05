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
      default: "",  // iframe src — e.g. https://pooembed.eu/embed/f1/2026/china/race
    },
    isLive: {
      type: Boolean,
      default: false,
    },
    isPremium: {
      type: Boolean,
      default: true, // always true — requires subscription to watch
    },

    // Singleton guard — only one stream config allowed at a time
    // This field is always set to 1, and the schema enforces uniqueness on it.
    // Upserting on { singleton: 1 } replaces the existing doc automatically.
    singleton: {
      type: Number,
      default: 1,
      unique: true,
      immutable: true,
    },
  },
  { timestamps: true }
);

const Stream = mongoose.model("Stream", streamSchema);
export default Stream;