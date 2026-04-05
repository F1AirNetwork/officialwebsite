import { body, validationResult } from "express-validator";
import { sendBadRequest } from "../utils/response.js";

// ─── Run validation and return errors if any ─
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendBadRequest(
      res,
      "Validation failed",
      errors.array().map((e) => ({ field: e.path, message: e.msg }))
    );
  }
  next();
};

// ─── Auth validators ──────────────────────────
export const registerRules = [
  body("firstName").trim().notEmpty().withMessage("First name is required"),
  body("lastName").trim().notEmpty().withMessage("Last name is required"),
  body("email")
    .isEmail().withMessage("Valid email is required")
    .toLowerCase(), // ← use toLowerCase instead of normalizeEmail (which strips dots)
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.password) throw new Error("Passwords do not match");
    return true;
  }),
  // country is optional — ISO 3166-1 alpha-2 code e.g. "IN", "US", "DE"
  body("country")
    .optional({ nullable: true, checkFalsy: true })
    .isAlpha().withMessage("Country must be 2 letters")
    .isLength({ min: 2, max: 2 }).withMessage("Country code must be exactly 2 characters"),
];

export const loginRules = [
  body("email")
    .isEmail().withMessage("Valid email is required")
    .toLowerCase(), // ← same fix here
  body("password").notEmpty().withMessage("Password is required"),
];

// ─── Order validators ─────────────────────────
export const createOrderRules = [
  body("productId")
    .notEmpty()
    .withMessage("productId is required")
    .isMongoId()
    .withMessage("Invalid productId"),
];

// ─── Subscription validators ──────────────────
export const subscriptionRules = [
  body("productId").notEmpty().isMongoId().withMessage("Valid productId is required"),
  body("productName").trim().notEmpty().withMessage("productName is required"),
  body("price").isNumeric().withMessage("price must be a number"),
];
