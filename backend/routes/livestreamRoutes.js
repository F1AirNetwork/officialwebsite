import { Router } from "express";
import multer from "multer";
import {
  getAllStreams,
  getStreamById,
  joinStreamHandler,
  heartbeatHandler,
  leaveStreamHandler,
  getViewers,
  kickSessionHandler,
  createStream,
  updateStream,
  deleteStream,
  toggleStreamLive,
  uploadStreamImage,
  deleteStreamImage,
} from "../controllers/livestreamController.js";
import { protect, optionalAuth, requireRole } from "../middleware/auth.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, and WebP images are allowed."));
    }
  },
});

// ─── Public ───────────────────────────────────
router.get("/", optionalAuth, getAllStreams);

// ─── Admin: stream CRUD ───────────────────────
// NOTE: protect + requireRole MUST come before upload for auth to work,
// but multer MUST parse the multipart body before the controller runs.
// Express runs middleware left→right, so the order below is correct.
router.post(  "/admin/streams",                                          protect, requireRole("admin"), createStream);
router.patch( "/admin/streams/:id",                                      protect, requireRole("admin"), updateStream);
router.delete("/admin/streams/:id",                                      protect, requireRole("admin"), deleteStream);
router.patch( "/admin/streams/:id/toggle",                               protect, requireRole("admin"), toggleStreamLive);
router.patch( "/admin/streams/:id/image",  protect, requireRole("admin"), upload.single("image"),       uploadStreamImage);
router.delete("/admin/streams/:id/image",                                protect, requireRole("admin"), deleteStreamImage);

// ─── Public (by ID) ───────────────────────────
router.get("/:id", optionalAuth, getStreamById);

// ─── Protected (viewer sessions) ─────────────
router.post("/:id/join",      protect, joinStreamHandler);
router.post("/:id/heartbeat", protect, heartbeatHandler);
router.post("/:id/leave",     protect, leaveStreamHandler);
router.get( "/:id/viewers",   protect, getViewers);

// ─── Kick a device ────────────────────────────
router.delete("/sessions/:sessionToken", protect, kickSessionHandler);

export default router;