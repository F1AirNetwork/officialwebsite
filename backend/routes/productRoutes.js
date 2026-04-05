import { Router }  from "express";
import { handleUpload } from "../middleware/upload.js";
import {
  getAllProducts,
  getCategories,
  getScreenProducts,
  getProductById,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  deleteProductImage,
} from "../controllers/productController.js";
import { protect, requireRole } from "../middleware/auth.js";

const router = Router();

// ─── Public ───────────────────────────────────
router.get("/",           getAllProducts);
router.get("/categories", getCategories);
router.get("/screens",    getScreenProducts);
router.get("/id/:id",     getProductById);
router.get("/:slug",      getProductBySlug);

// ─── Admin only ───────────────────────────────
router.post("/",      protect, requireRole("admin"), createProduct);
router.put("/:id",    protect, requireRole("admin"), updateProduct);
router.delete("/:id", protect, requireRole("admin"), deleteProduct);

// handleUpload = multer().single("image") — parses multipart/form-data
router.patch( "/:id/image", protect, requireRole("admin"), handleUpload, uploadProductImage);
router.delete("/:id/image", protect, requireRole("admin"), deleteProductImage);

export default router;