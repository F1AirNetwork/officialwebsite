import { Router } from "express";
import {
  getAllStreams,
  getStreamById,
  getStreamUrl,
  joinStreamHandler,
  heartbeatHandler,
  leaveStreamHandler,
  getViewers,
  kickSessionHandler,
  setStreamConfig,
  updateStreamConfig,
  deleteStreamConfig,
  toggleLive,
} from "../controllers/livestreamController.js";
import { protect, optionalAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// ─── Public ───────────────────────────────────
router.get("/", optionalAuth, getAllStreams);

// ─── Admin ────────────────────────────────────
// Must come before /:id to avoid "admin" being treated as an ID
router.post(  "/admin/config", protect, requireRole("admin"), setStreamConfig);
router.patch( "/admin/config", protect, requireRole("admin"), updateStreamConfig);
router.delete("/admin/config", protect, requireRole("admin"), deleteStreamConfig);
router.patch( "/admin/toggle", protect, requireRole("admin"), toggleLive);

// ─── Public (by ID) ───────────────────────────
router.get("/:id",     optionalAuth, getStreamById);
router.get("/:id/url", protect,      getStreamUrl);

// ─── Protected (viewer sessions) ─────────────
router.post("/:id/join",      protect, joinStreamHandler);
router.post("/:id/heartbeat", protect, heartbeatHandler);
router.post("/:id/leave",     protect, leaveStreamHandler);
router.get( "/:id/viewers",   protect, getViewers);

// ─── Kick a device ────────────────────────────
router.delete("/sessions/:sessionToken", protect, kickSessionHandler);

export default router;