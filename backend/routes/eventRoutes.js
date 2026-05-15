import { Router } from "express";
import {
  getAllEvents,
  getLiveEvents,
  getUpcomingEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
} from "../controllers/eventController.js";
import { protect, requireRole } from "../middleware/auth.js";

const router = Router();

// Public — order matters: specific paths before :id
router.get("/",         getAllEvents);
router.get("/live",     getLiveEvents);
router.get("/upcoming", getUpcomingEvents);
router.get("/:id",      getEventById);

// Admin only
router.post("/",      protect, requireRole("admin"), createEvent);
router.put("/:id",    protect, requireRole("admin"), updateEvent);
router.delete("/:id", protect, requireRole("admin"), deleteEvent);

export default router;