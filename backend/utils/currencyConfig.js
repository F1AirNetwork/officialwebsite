// ─────────────────────────────────────────────────────────────────────────────
//  utils/currencyConfig.js
//  Single source of truth for currency logic.
//  Import this in authController, userController, and productController.
// ─────────────────────────────────────────────────────────────────────────────

export const CURRENCIES = {
  INR: { code: "INR", symbol: "₹", name: "Indian Rupee"  },
  EUR: { code: "EUR", symbol: "€", name: "Euro"          },
  USD: { code: "USD", symbol: "$", name: "US Dollar"     },
};

// ── Countries billed in INR ───────────────────────────────────────────────────
// India + immediate neighbours + SE Asia (low-income region)
const INR_COUNTRIES = new Set([
  "IN", // India
  "NP", // Nepal
  "BD", // Bangladesh
  "LK", // Sri Lanka
  "BT", // Bhutan
  "PK", // Pakistan
  "MM", // Myanmar
  "TH", // Thailand
  "KH", // Cambodia
  "LA", // Laos
  "VN", // Vietnam
  "ID", // Indonesia
  "MY", // Malaysia
  "PH", // Philippines
  "SG", // Singapore
]);

// ── Countries billed in EUR ───────────────────────────────────────────────────
// EU + EEA + close European neighbours
const EUR_COUNTRIES = new Set([
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR",
  "DE","GR","HU","IE","IT","LV","LT","LU","MT","NL",
  "PL","PT","RO","SK","SI","ES","SE",
  // EEA & close neighbours
  "NO","IS","LI","CH","AL","BA","ME","MK","RS",
]);

/**
 * Map an ISO 3166-1 alpha-2 country code → currency code.
 * @param {string} countryCode  e.g. "IN", "FR", "US"
 * @returns {"INR" | "EUR" | "USD"}
 */
export const getCurrencyForCountry = (countryCode = "") => {
  const c = countryCode.toUpperCase().trim();
  if (INR_COUNTRIES.has(c)) return "INR";
  if (EUR_COUNTRIES.has(c)) return "EUR";
  return "USD";
};

/**
 * Return the correct display price for a product given a currency code.
 * Falls back to base `price` (USD) if the specific field is not set.
 */
export const getDisplayPrice = (product, currencyCode) => {
  if (currencyCode === "INR" && product.priceINR != null) return product.priceINR;
  if (currencyCode === "EUR" && product.priceEUR != null) return product.priceEUR;
  if (product.priceUSD != null) return product.priceUSD;
  return product.price ?? 0;
};