import FeaturedStream from "../models/FeaturedStream.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { sendSuccess, sendError, sendBadRequest } from "../utils/response.js";

// ─── GET  /api/featured ─────────────────────────────────────────────
// Public — returns the homepage featured-stream config
export const getFeatured = async (req, res) => {
  try {
    const doc = await FeaturedStream.getSingleton();
    sendSuccess(res, doc);
  } catch (err) {
    console.error("getFeatured error:", err);
    sendError(res, "Failed to load featured config");
  }
};

// ─── PUT  /api/featured ─────────────────────────────────────────────
// Admin — update all text / toggle fields
export const updateFeatured = async (req, res) => {
  try {
    const allowed = [
      "title", "subtitle", "buttonText", "buttonLink",
      "showButton", "isActive", "streamId",
    ];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        // Allow clearing streamId by sending null or ""
        if (key === "streamId" && !req.body[key]) {
          updates[key] = null;
        } else {
          updates[key] = req.body[key];
        }
      }
    }

    const doc = await FeaturedStream.getSingleton();
    Object.assign(doc, updates);
    await doc.save();

    // Re-fetch with populate
    const updated = await FeaturedStream.getSingleton();
    sendSuccess(res, updated, "Featured config updated");
  } catch (err) {
    console.error("updateFeatured error:", err);
    sendError(res, "Failed to update featured config");
  }
};

// ─── PATCH  /api/featured/thumbnail ─────────────────────────────────
// Admin — upload / replace the thumbnail image
export const uploadThumbnail = async (req, res) => {
  try {
    if (!req.file) return sendBadRequest(res, "No image file provided");

    const doc = await FeaturedStream.getSingleton();

    // Delete old image from Cloudinary if exists
    if (doc.thumbnailPublicId) {
      await deleteFromCloudinary(doc.thumbnailPublicId).catch(() => {});
    }

    const result = await uploadToCloudinary(req.file.buffer, {
      folder: "f1air/featured",
    });

    doc.thumbnail         = result.secure_url;
    doc.thumbnailPublicId = result.public_id;
    await doc.save();

    sendSuccess(res, doc, "Thumbnail uploaded");
  } catch (err) {
    console.error("uploadThumbnail error:", err);
    sendError(res, "Failed to upload thumbnail");
  }
};

// ─── DELETE  /api/featured/thumbnail ────────────────────────────────
// Admin — remove the thumbnail image
export const deleteThumbnail = async (req, res) => {
  try {
    const doc = await FeaturedStream.getSingleton();

    if (doc.thumbnailPublicId) {
      await deleteFromCloudinary(doc.thumbnailPublicId).catch(() => {});
    }

    doc.thumbnail         = "";
    doc.thumbnailPublicId = "";
    await doc.save();

    sendSuccess(res, doc, "Thumbnail removed");
  } catch (err) {
    console.error("deleteThumbnail error:", err);
    sendError(res, "Failed to delete thumbnail");
  }
};
