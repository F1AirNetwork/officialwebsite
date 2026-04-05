import Category from "../models/Category.js";
import Product from "../models/Product.js";
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
  sendBadRequest,
} from "../utils/response.js";

// ─── GET /api/categories ──────────────────────
// Public — returns all active categories
export const getAllCategories = async (req, res) => {
  try {
    const { includeInactive } = req.query;
    const filter = includeInactive === "true" ? {} : { isActive: true };

    const categories = await Category.find(filter).sort({ sortOrder: 1, name: 1 });
    return sendSuccess(res, { categories, total: categories.length });
  } catch (err) {
    return sendError(res, "Failed to fetch categories.");
  }
};

// ─── GET /api/categories/:id ──────────────────
export const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return sendNotFound(res, "Category not found.");

    // Also return how many products use this category
    const productCount = await Product.countDocuments({ category: category.name });
    return sendSuccess(res, { ...category.toObject(), productCount });
  } catch (err) {
    return sendError(res, "Failed to fetch category.");
  }
};

// ─── POST /api/categories ─────────────────────
// Admin only
export const createCategory = async (req, res) => {
  try {
    const { name, description, icon, color, isActive, sortOrder } = req.body;

    if (!name?.trim()) return sendBadRequest(res, "Category name is required.");

    // Check duplicate name
    const exists = await Category.findOne({ name: { $regex: `^${name.trim()}$`, $options: "i" } });
    if (exists) return sendBadRequest(res, `Category "${name}" already exists.`);

    // Build slug from name
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const category = await Category.create({
      name: name.trim(),
      slug,
      description: description?.trim() || "",
      icon:        icon || "📦",
      color:       color || "zinc",
      isActive:    isActive !== false,
      sortOrder:   sortOrder || 0,
    });

    return sendCreated(res, category, "Category created successfully.");
  } catch (err) {
    console.error("createCategory error:", err);
    if (err.code === 11000) return sendBadRequest(res, "A category with this name already exists.");
    return sendError(res, "Failed to create category.");
  }
};

// ─── PUT /api/categories/:id ──────────────────
// Admin only
export const updateCategory = async (req, res) => {
  try {
    const { name, description, icon, color, isActive, sortOrder } = req.body;

    const category = await Category.findById(req.params.id);
    if (!category) return sendNotFound(res, "Category not found.");

    if (name && name.trim() !== category.name) {
      // Check duplicate name excluding self
      const conflict = await Category.findOne({
        name:   { $regex: `^${name.trim()}$`, $options: "i" },
        _id:    { $ne: category._id },
      });
      if (conflict) return sendBadRequest(res, `Category "${name}" already exists.`);

      // If name changed, update slug + update all products using old category name
      const oldName = category.name;
      const newSlug = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      category.name = name.trim();
      category.slug = newSlug;

      // Cascade update products that use this category name
      await Product.updateMany({ category: oldName }, { $set: { category: name.trim() } });
    }

    if (description !== undefined) category.description = description.trim();
    if (icon        !== undefined) category.icon        = icon;
    if (color       !== undefined) category.color       = color;
    if (isActive    !== undefined) category.isActive    = isActive;
    if (sortOrder   !== undefined) category.sortOrder   = sortOrder;

    await category.save();
    return sendSuccess(res, category, "Category updated successfully.");
  } catch (err) {
    console.error("updateCategory error:", err);
    return sendError(res, "Failed to update category.");
  }
};

// ─── DELETE /api/categories/:id ───────────────
// Admin only — refuses if products are still assigned
export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return sendNotFound(res, "Category not found.");

    const productCount = await Product.countDocuments({ category: category.name });
    if (productCount > 0) {
      return sendBadRequest(
        res,
        `Cannot delete "${category.name}" — ${productCount} product(s) still use this category. Re-assign them first.`
      );
    }

    await category.deleteOne();
    return sendSuccess(res, null, `Category "${category.name}" deleted.`);
  } catch (err) {
    return sendError(res, "Failed to delete category.");
  }
};
