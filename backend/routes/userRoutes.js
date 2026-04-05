import { Router } from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import {
  getProfile,
  updateProfile,
  changePassword,
  getSubscription,
  createSubscription,
  cancelSubscription,
  getUserOrders,
  // Admin
  getAllUsers,
  updateUserCurrency,
  getUserById,
  updateUserRole,
  banUser,
  adminRemoveSubscription,
  giftProduct,
} from "../controllers/userController.js";

const router = Router();

// ─── User (self) routes ───────────────────────
router.get(  "/profile",         protect, getProfile);
router.put(  "/profile",         protect, updateProfile);
router.put(  "/change-password", protect, changePassword);
router.get(  "/subscription",    protect, getSubscription);
router.post( "/subscription",    protect, createSubscription);
router.delete("/subscription",   protect, cancelSubscription);
router.get(  "/orders",          protect, getUserOrders);

// ─── Admin routes ─────────────────────────────
// IMPORTANT: specific paths before /:id
router.get(    "/admin/all",                  protect, adminOnly, getAllUsers);
router.get(    "/admin/:id",                  protect, adminOnly, getUserById);
router.patch(  "/admin/:id/currency",         protect, adminOnly, updateUserCurrency);
router.patch(  "/admin/:id/role",             protect, adminOnly, updateUserRole);
router.patch(  "/admin/:id/ban",              protect, adminOnly, banUser);
router.delete( "/admin/:id/subscription",     protect, adminOnly, adminRemoveSubscription);
router.post(   "/admin/:id/gift",             protect, adminOnly, giftProduct);

export default router;