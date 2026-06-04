import mongoose from "mongoose";

const featuredStreamSchema = new mongoose.Schema(
  {
    title:              { type: String, default: "F1 Air Network" },
    subtitle:           { type: String, default: "" },
    thumbnail:          { type: String, default: "" },
    thumbnailPublicId:  { type: String, default: "" },
    streamId:           { type: mongoose.Schema.Types.ObjectId, ref: "Stream", default: null },
    buttonText:         { type: String, default: "Join Live Stream" },
    buttonLink:         { type: String, default: "/livestream" },
    showButton:         { type: Boolean, default: true },
    isActive:           { type: Boolean, default: true },
  },
  { timestamps: true }
);

/**
 * Always returns the single FeaturedStream document.
 * Creates one with defaults if none exists yet.
 */
featuredStreamSchema.statics.getSingleton = async function () {
  let doc = await this.findOne().populate("streamId", "name isLive");
  if (!doc) {
    doc = await this.create({});
    // Re-fetch with populate
    doc = await this.findOne().populate("streamId", "name isLive");
  }
  return doc;
};

const FeaturedStream = mongoose.model("FeaturedStream", featuredStreamSchema);
export default FeaturedStream;
