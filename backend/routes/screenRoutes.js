import { Router } from "express";
import Product from "../models/Product.js";
import User from "../models/User.js";
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
  sendBadRequest,
} from "../utils/response.js";
import { protect, requireRole } from "../middleware/auth.js";

const router = Router();

// All routes here are admin-only
router.use(protect, requireRole("admin"));

// ─── GET /api/admin/screens ───────────────────
// List all screen add-on products
router.get("/", async (req, res) => {
  try {
    const screens = await Product.find({ type: "screen" }).sort({ screensGranted: 1 });
    return sendSuccess(res, { count: screens.length, screens });
  } catch (err) {
    return sendError(res, "Failed to fetch screen products.");
  }
});

// ─── POST /api/admin/screens ──────────────────
// Create a new screen add-on product
// Body: { name, price, screensGranted, description, billingCycle? }
router.post("/", async (req, res) => {
  try {
    const { name, price, screensGranted, description, billingCycle } = req.body;

    if (!name || price === undefined || !screensGranted) {
      return sendBadRequest(res, "name, price, and screensGranted are required.");
    }

    if (price < 0) return sendBadRequest(res, "Price cannot be negative.");
    if (screensGranted < 1) return sendBadRequest(res, "screensGranted must be at least 1.");

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const screen = await Product.create({
      name,
      slug:           `screen-${slug}-${Date.now()}`,
      category:       "Screen",
      type:           "screen",
      price,
      screensGranted: parseInt(screensGranted),
      description:    description || `Add ${screensGranted} extra screen(s) to your account.`,
      billingCycle:   billingCycle || "month",
      isActive:       true,
    });

    return sendCreated(res, screen, "Screen product created successfully.");
  } catch (err) {
    console.error("createScreen error:", err);
    return sendError(res, "Failed to create screen product.");
  }
});

// ─── PATCH /api/admin/screens/:id ────────────
// Update price or other fields of a screen product
// Body: { price?, name?, screensGranted?, isActive?, billingCycle? }
router.patch("/:id", async (req, res) => {
  try {
    const { price, name, screensGranted, isActive, billingCycle, description } = req.body;

    const screen = await Product.findOne({ _id: req.params.id, type: "screen" });
    if (!screen) return sendNotFound(res, "Screen product not found.");

    if (price       !== undefined) screen.price          = price;
    if (name        !== undefined) screen.name           = name;
    if (screensGranted !== undefined) screen.screensGranted = parseInt(screensGranted);
    if (isActive    !== undefined) screen.isActive       = isActive;
    if (billingCycle !== undefined) screen.billingCycle  = billingCycle;
    if (description !== undefined) screen.description    = description;

    await screen.save();
    return sendSuccess(res, screen, "Screen product updated successfully.");
  } catch (err) {
    console.error("updateScreen error:", err);
    return sendError(res, "Failed to update screen product.");
  }
});

// ─── DELETE /api/admin/screens/:id ───────────
// Delete a screen product
router.delete("/:id", async (req, res) => {
  try {
    const screen = await Product.findOneAndDelete({ _id: req.params.id, type: "screen" });
    if (!screen) return sendNotFound(res, "Screen product not found.");
    return sendSuccess(res, null, "Screen product deleted.");
  } catch (err) {
    return sendError(res, "Failed to delete screen product.");
  }
});

// ─── GET /api/admin/screens/users ────────────
// View all users with their screen counts (for admin oversight)
router.get("/users", async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find({ "screenPurchases.0": { $exists: true } })
        .select("firstName lastName email subscription screenPurchases")
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      User.countDocuments({ "screenPurchases.0": { $exists: true } }),
    ]);

    return sendSuccess(res, {
      total,
      page:       parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      users:      users.map((u) => ({
        _id:       u._id,
        name:      `${u.firstName} ${u.lastName}`,
        email:     u.email,
        totalScreens:     u.totalScreens,
        purchasedScreens: u.activeExtraScreens,
        screenPurchases:  u.screenPurchases,
      })),
    });
  } catch (err) {
    return sendError(res, "Failed to fetch user screen data.");
  }
});

export default router;