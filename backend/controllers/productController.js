import Product from "../models/Product.js";
import {
  sendSuccess, sendError, sendNotFound,
  sendBadRequest, sendCreated,
} from "../utils/response.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

// ─── GET /api/products ────────────────────────
export const getAllProducts = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = {};
    if (category && category !== "All") filter.category = category;
    const products = await Product.find(filter).sort({ sortOrder: 1, createdAt: 1 });
    return sendSuccess(res, { count: products.length, products });
  } catch (err) {
    return sendError(res, "Failed to fetch products.");
  }
};

// ─── GET /api/products/categories ─────────────
export const getCategories = async (req, res) => {
  try {
    const cats = await Product.distinct("category");
    return sendSuccess(res, ["All", ...cats]);
  } catch (err) {
    return sendError(res, "Failed to fetch categories.");
  }
};

// ─── GET /api/products/screens ────────────────
export const getScreenProducts = async (req, res) => {
  try {
    const screens = await Product.find({ type: "screen", isActive: true }).sort({ sortOrder: 1 });
    return sendSuccess(res, { count: screens.length, screens });
  } catch (err) {
    return sendError(res, "Failed to fetch screen products.");
  }
};

// ─── GET /api/products/id/:id ─────────────────
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return sendNotFound(res, "Product not found.");
    return sendSuccess(res, product);
  } catch (err) {
    return sendError(res, "Failed to fetch product.");
  }
};

// ─── GET /api/products/:slug ──────────────────
export const getProductBySlug = async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug });
    if (!product) return sendNotFound(res, "Product not found.");
    return sendSuccess(res, product);
  } catch (err) {
    return sendError(res, "Failed to fetch product.");
  }
};

// ─── POST /api/products ───────────────────────
export const createProduct = async (req, res) => {
  try {
    if (!req.body.slug && req.body.name) {
      req.body.slug = req.body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    }
    const product = await Product.create(req.body);
    return sendCreated(res, product, "Product created");
  } catch (err) {
    console.error("createProduct error:", err.message);
    if (err.code === 11000) {
      return sendBadRequest(res, "A product with this name/slug already exists.");
    }
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message).join(", ");
      return sendBadRequest(res, "Validation failed: " + messages);
    }
    return sendError(res, "Failed to create product.");
  }
};

// ─── PUT /api/products/:id ────────────────────
export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!product) return sendNotFound(res, "Product not found.");
    return sendSuccess(res, product, "Product updated");
  } catch (err) {
    console.error("updateProduct error:", err.message);
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message).join(", ");
      return sendBadRequest(res, "Validation failed: " + messages);
    }
    return sendError(res, "Failed to update product.");
  }
};

// ─── DELETE /api/products/:id ─────────────────
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return sendNotFound(res, "Product not found.");
    if (product.cloudinaryPublicId) {
      await deleteFromCloudinary(product.cloudinaryPublicId).catch(() => {});
    }
    return sendSuccess(res, null, "Product deleted");
  } catch (err) {
    return sendError(res, "Failed to delete product.");
  }
};

// ─── PATCH /api/products/:id/image ───────────
export const uploadProductImage = async (req, res) => {
  try {
    if (!req.file) return sendBadRequest(res, "No image file provided.");
    const product = await Product.findById(req.params.id);
    if (!product) return sendNotFound(res, "Product not found.");

    if (product.cloudinaryPublicId) {
      await deleteFromCloudinary(product.cloudinaryPublicId).catch(() => {});
    }

    const result = await uploadToCloudinary(req.file.buffer, { folder: "f1air/products" });
    product.image              = result.url;
    product.cloudinaryPublicId = result.publicId;
    await product.save();

    return sendSuccess(res, product, "Image uploaded");
  } catch (err) {
    console.error("uploadProductImage error:", err.message);
    return sendError(res, "Failed to upload image.");
  }
};

// ─── DELETE /api/products/:id/image ──────────
export const deleteProductImage = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return sendNotFound(res, "Product not found.");
    if (product.cloudinaryPublicId) {
      await deleteFromCloudinary(product.cloudinaryPublicId).catch(() => {});
    }
    product.image              = null;
    product.cloudinaryPublicId = null;
    await product.save();
    return sendSuccess(res, product, "Image removed");
  } catch (err) {
    return sendError(res, "Failed to delete image.");
  }
};