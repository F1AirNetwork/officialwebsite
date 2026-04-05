import User from "../models/User.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { getCurrencyForCountry, CURRENCIES } from "../utils/currencyConfig.js";
import mongoose from "mongoose";
mongoose.set("returnOriginal", false); // suppress findOneAndUpdate `new` deprecation
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
  sendBadRequest,
} from "../utils/response.js";

// ─── GET /api/users/profile ───────────────────
export const getProfile = async (req, res) => {
  try {
    return sendSuccess(res, req.user);
  } catch (err) {
    return sendError(res);
  }
};

// ─── PUT /api/users/profile ───────────────────
export const updateProfile = async (req, res) => {
  try {
    const allowedFields = ["firstName", "lastName", "avatar"];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (Object.keys(updates).length === 0) {
      return sendBadRequest(res, "No valid fields provided to update.");
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    return sendSuccess(res, user, "Profile updated successfully");
  } catch (err) {
    console.error("updateProfile error:", err);
    return sendError(res, "Failed to update profile.");
  }
};

// ─── PUT /api/users/change-password ──────────
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return sendBadRequest(res, "currentPassword and newPassword are required.");
    }
    if (newPassword.length < 6) {
      return sendBadRequest(res, "New password must be at least 6 characters.");
    }

    const user = await User.findById(req.user._id).select("+password");
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return sendBadRequest(res, "Current password is incorrect.");

    user.password = newPassword;
    await user.save();
    return sendSuccess(res, null, "Password changed successfully");
  } catch (err) {
    console.error("changePassword error:", err);
    return sendError(res, "Failed to change password.");
  }
};

// ─── GET /api/users/subscription ─────────────
export const getSubscription = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("subscription.product");
    return sendSuccess(res, user.subscription || null);
  } catch (err) {
    return sendError(res);
  }
};

// ─── POST /api/users/subscription ────────────
export const createSubscription = async (req, res) => {
  try {
    const { productId, productName, price } = req.body;
    const renewalDate = new Date();
    renewalDate.setDate(renewalDate.getDate() + 30);

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        subscription: {
          product: productId, productName, price,
          status: "active", startDate: new Date(), renewalDate,
        },
      },
      { new: true }
    );
    return sendSuccess(res, user.subscription, "Subscription activated");
  } catch (err) {
    console.error("createSubscription error:", err);
    return sendError(res, "Failed to activate subscription.");
  }
};

// ─── DELETE /api/users/subscription ──────────
export const cancelSubscription = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user.subscription || user.subscription.status !== "active") {
      return sendBadRequest(res, "No active subscription found.");
    }
    user.subscription.status = "cancelled";
    await user.save();
    return sendSuccess(res, user.subscription, "Subscription cancelled");
  } catch (err) {
    return sendError(res, "Failed to cancel subscription.");
  }
};

// ─── GET /api/users/orders ────────────────────
export const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate("product", "name slug image category")
      .sort({ createdAt: -1 });
    return sendSuccess(res, { count: orders.length, orders });
  } catch (err) {
    return sendError(res);
  }
};

// ══════════════════════════════════════════════
//  ADMIN ENDPOINTS
// ══════════════════════════════════════════════

// ─── GET /api/users/admin/all ─────────────────
// All verified (email-verified + Google) users
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {
      $or: [{ isVerified: true }, { googleId: { $ne: null } }],
    };

    if (search) {
      filter.$and = [
        filter.$or ? { $or: filter.$or } : {},
        {
          $or: [
            { firstName: { $regex: search, $options: "i" } },
            { lastName:  { $regex: search, $options: "i" } },
            { email:     { $regex: search, $options: "i" } },
          ],
        },
      ];
      delete filter.$or;
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password -refreshToken")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      users,
      total,
      page:  parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    console.error("getAllUsers error:", err);
    return sendError(res, "Failed to fetch users.");
  }
};

// ─── GET /api/users/admin/:id ─────────────────
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password -refreshToken");
    if (!user) return sendNotFound(res, "User not found.");

    const recentOrders = await Order.find({ user: user._id })
      .populate("product", "name slug")
      .sort({ createdAt: -1 })
      .limit(10);

    return sendSuccess(res, { ...user.toJSON(), recentOrders });
  } catch (err) {
    return sendError(res, "Failed to fetch user.");
  }
};

// ─── PATCH /api/users/admin/:id/role ──────────
export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!["user", "admin"].includes(role)) {
      return sendBadRequest(res, "role must be 'user' or 'admin'.");
    }

    // Prevent self-demotion
    if (req.params.id === req.user._id.toString() && role !== "admin") {
      return sendBadRequest(res, "You cannot change your own role.");
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, select: "-password -refreshToken" }
    );
    if (!user) return sendNotFound(res, "User not found.");

    return sendSuccess(res, user, `Role updated to '${role}'.`);
  } catch (err) {
    return sendError(res, "Failed to update role.");
  }
};


// ─── PATCH /api/users/admin/:id/currency ──────
// Admin can override a user's currency or update their country.
export const updateUserCurrency = async (req, res) => {
  try {
    const { currency, country } = req.body;

    const cleanCountry  = country?.trim() || "";
    const cleanCurrency = currency?.trim() || "";

    if (!cleanCurrency && !cleanCountry) {
      return sendBadRequest(res, "Provide at least one of: currency, country.");
    }
    if (cleanCurrency && !CURRENCIES[cleanCurrency]) {
      return sendBadRequest(res, `currency must be one of: ${Object.keys(CURRENCIES).join(", ")}.`);
    }

    const update = {};
    if (cleanCountry.length === 2) {
      update.country  = cleanCountry.toUpperCase();
      update.currency = cleanCurrency || getCurrencyForCountry(update.country);
    } else if (cleanCurrency) {
      update.currency = cleanCurrency;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, select: "-password -refreshToken" }
    );
    if (!user) return sendNotFound(res, "User not found.");

    return sendSuccess(
      res,
      { currency: user.currency, country: user.country },
      `Currency updated to ${user.currency}.`
    );
  } catch (err) {
    console.error("updateUserCurrency error:", err);
    return sendError(res, "Failed to update currency.");
  }
};

// ─── PATCH /api/users/admin/:id/ban ───────────
// Toggle ban status. Banned users cannot log in.
export const banUser = async (req, res) => {
  try {
    const { isBanned, reason } = req.body;

    // Prevent self-ban
    if (req.params.id === req.user._id.toString()) {
      return sendBadRequest(res, "You cannot ban yourself.");
    }

    const user = await User.findById(req.params.id);
    if (!user) return sendNotFound(res, "User not found.");
    if (user.role === "admin") {
      return sendBadRequest(res, "Cannot ban another admin. Demote them first.");
    }

    user.isBanned      = isBanned !== false; // default true
    user.banReason     = isBanned !== false ? (reason || "Banned by admin") : "";
    user.bannedAt      = isBanned !== false ? new Date() : null;
    // Invalidate their refresh token so they're logged out immediately
    if (isBanned !== false) user.refreshToken = null;

    await user.save({ validateBeforeSave: false });

    const action = user.isBanned ? "banned" : "unbanned";
    return sendSuccess(res, { _id: user._id, isBanned: user.isBanned, banReason: user.banReason }, `User ${action} successfully.`);
  } catch (err) {
    console.error("banUser error:", err);
    return sendError(res, "Failed to update ban status.");
  }
};

// ─── DELETE /api/users/admin/:id/subscription ─
// Admin removes a user's active subscription immediately
export const adminRemoveSubscription = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return sendNotFound(res, "User not found.");

    if (!user.subscription || user.subscription.status !== "active") {
      return sendBadRequest(res, "User has no active subscription.");
    }

    const productName = user.subscription.productName;
    user.subscription.status = "cancelled";
    await user.save({ validateBeforeSave: false });

    return sendSuccess(res, null, `Subscription "${productName}" removed from user.`);
  } catch (err) {
    console.error("adminRemoveSubscription error:", err);
    return sendError(res, "Failed to remove subscription.");
  }
};

// ─── POST /api/users/admin/:id/gift ───────────
// Gift any product (subscription, screen, or one-time) to a user
// Creates a "paid" order record + applies the product effect to the user
export const giftProduct = async (req, res) => {
  try {
    const { productId, note } = req.body;

    if (!productId) return sendBadRequest(res, "productId is required.");

    const [user, product] = await Promise.all([
      User.findById(req.params.id),
      Product.findById(productId),
    ]);

    if (!user)    return sendNotFound(res, "User not found.");
    if (!product) return sendNotFound(res, "Product not found.");
    if (!product.isActive) return sendBadRequest(res, "Cannot gift an inactive product.");

    // ── Create a gift order record ──────────────
    const order = await Order.create({
      user:        user._id,
      product:     product._id,
      productName: product.name,
      amount:      0,           // gifted = free
      currency:    "usd",
      status:      "paid",
      paidAt:      new Date(),
      isGift:      true,
      giftNote:    note || `Gifted by admin ${req.user.firstName} ${req.user.lastName}`,
      giftedBy:    req.user._id,
    });

    // ── Apply product effect to user ────────────
    if (product.type === "subscription") {
      // Overwrite or set subscription
      const renewalDate = new Date();
      renewalDate.setDate(renewalDate.getDate() + 30);

      user.subscription = {
        product:     product._id,
        productName: product.name,
        price:       product.price,
        status:      "active",
        startDate:   new Date(),
        renewalDate,
      };
      await user.save({ validateBeforeSave: false });

    } else if (product.type === "screen" && product.screensGranted > 0) {
      // Add N screen purchases to the user
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      for (let i = 0; i < product.screensGranted; i++) {
        user.screenPurchases.push({
          orderId:     order._id,
          price:       0,
          purchasedAt: new Date(),
          expiresAt,
          status:      "active",
        });
      }
      await user.save({ validateBeforeSave: false });

    } else if (product.type === "one_time") {
      // No automated effect — just the order record as proof
      // (Extend this block for digital delivery, etc.)
    }

    return sendCreated(res, {
      order,
      gift: {
        to:      `${user.firstName} ${user.lastName}`,
        product: product.name,
        type:    product.type,
      },
    }, `${product.name} gifted to ${user.firstName} successfully.`);

  } catch (err) {
    console.error("giftProduct error:", err);
    return sendError(res, "Failed to gift product.");
  }
};