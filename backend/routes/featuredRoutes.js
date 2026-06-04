import { Router } from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import { handleUpload } from "../middleware/upload.js";
import {
  getFeatured,
  updateFeatured,
  uploadThumbnail,
  deleteThumbnail,
} from "../controllers/featuredController.js";

const router = Router();

// Public
router.get("/", getFeatured);

// Admin only
router.put("/",          protect, adminOnly, updateFeatured);
router.patch("/thumbnail", protect, adminOnly, handleUpload, uploadThumbnail);
router.delete("/thumbnail", protect, adminOnly, deleteThumbnail);

export default router;
