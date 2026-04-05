import { Router } from "express";
import express    from "express";
import {
  createRazorpayOrder,
  verifyPayment,
  razorpayWebhook,
  createLSCheckoutSession,
  lemonSqueezyWebhook,
  verifyLSPayment,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
} from "../controllers/orderController.js";
import { protect, requireRole } from "../middleware/auth.js";

const router = Router();

// ─── Webhooks — raw body, no auth ─────────────
// Must come BEFORE express.json() body parsing
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  (req, res, next) => {
    if (Buffer.isBuffer(req.body)) req.body = JSON.parse(req.body.toString());
    next();
  },
  razorpayWebhook
);

router.post(
  "/ls-webhook",
  express.raw({ type: "application/json" }),
  lemonSqueezyWebhook
);

// ─── All other routes require auth ────────────
router.use(protect);

// ─── Specific string routes FIRST ─────────────
// Must be before /:id to avoid param collision

// Admin routes
router.get("/admin/all",    requireRole("admin"), getAllOrders);
router.patch("/admin/:id/status", requireRole("admin"), updateOrderStatus);

// Razorpay
router.post("/create-order",   createRazorpayOrder);
router.post("/verify-payment", verifyPayment);

// LemonSqueezy
router.post("/ls-create-checkout", createLSCheckoutSession);
router.post("/ls-verify",          verifyLSPayment);

// ─── Dynamic :id routes LAST ──────────────────
router.get("/",    getMyOrders);
router.get("/:id", getOrderById);

export default router;