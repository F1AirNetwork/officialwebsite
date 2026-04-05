import { Router } from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController.js";

const router = Router();

// Public
router.get("/",    getAllCategories);
router.get("/:id", getCategoryById);

// Admin only
router.post(  "/",    protect, adminOnly, createCategory);
router.put(   "/:id", protect, adminOnly, updateCategory);
router.delete("/:id", protect, adminOnly, deleteCategory);

export default router;
