import crypto   from "crypto";
import Razorpay from "razorpay";
import Order    from "../models/Order.js";
import Product  from "../models/Product.js";
import User     from "../models/User.js";
import {
  sendSuccess, sendCreated, sendError,
  sendNotFound, sendBadRequest, sendForbidden,
} from "../utils/response.js";

// ════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════

// ─── Razorpay client (lazy init after dotenv) ──
let _razorpay = null;
const getRazorpay = () => {
  if (!_razorpay) {
    _razorpay = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return _razorpay;
};

// ─── LemonSqueezy checkout (lazy, no SDK needed) ─
const createLSCheckout = async ({ variantId, storeId, userEmail, userName, orderId }) => {
  console.log("LS KEY:", process.env.LEMONSQUEEZY_API_KEY);
  
  // Validate CLIENT_ORIGIN is set
  const clientOrigin = process.env.CLIENT_ORIGIN || "https://f1-air-frontend.vercel.app";
  if (!clientOrigin.startsWith("http")) {
    throw new Error("Invalid CLIENT_ORIGIN environment variable. Must be a full URL (e.g., https://f1-air-frontend.vercel.app)");
  }
  
  const payload = {
    data: {
      type: "checkouts",
      attributes: {
        checkout_data: {
          email:  userEmail,
          name:   userName,
          custom: { order_id: orderId.toString() },
        },
        product_options: {
          redirect_url:      `${clientOrigin}/payment-success?gateway=ls`,
          receipt_link_url:  `${clientOrigin}/store`,
        },
        checkout_options: {
          button_color: "#e10600",
        },
      },
      relationships: {
        store: {
          data: { type: "stores", id: String(storeId) },
        },
        variant: {
          data: { type: "variants", id: String(variantId) },
        },
      },
    },
  };

  console.log("LS payload:", JSON.stringify(payload, null, 2));

  // Use AbortController to enforce a 10-second timeout on API call
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method:  "POST",
      headers: {
        "Authorization": `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
        "Accept":        "application/vnd.api+json",
        "Content-Type":  "application/vnd.api+json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const json = await res.json();

    if (!res.ok) {
      console.error("LemonSqueezy API error:", JSON.stringify(json, null, 2));
      throw new Error(json?.errors?.[0]?.detail || "LemonSqueezy checkout creation failed.");
    }

    return json.data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("LemonSqueezy API request timed out after 10 seconds. Please try again.");
    }
    throw err;
  }
};

// ─── Pick right price for user's currency ─────
const resolvePrice = (product, currency) => {
  if (currency === "INR" && product.priceINR != null) return product.priceINR;
  if (currency === "EUR" && product.priceEUR != null) return product.priceEUR;
  if (product.priceUSD != null) return product.priceUSD;
  return product.price ?? 0;
};

// ─── Convert display price → paise (Razorpay) ─
const toPaise = (amount, currency) => {
  if (currency === "INR") return Math.round(amount * 100);
  const usdRate = parseFloat(process.env.EXCHANGE_RATE_USD || "83");
  const eurRate = parseFloat(process.env.EXCHANGE_RATE_EUR || "90");
  if (currency === "USD") return Math.round(amount * usdRate * 100);
  if (currency === "EUR") return Math.round(amount * eurRate * 100);
  return Math.round(amount * 100);
};

// ─── Grant product to user after payment ──────
const applyProductEffect = async (order, product, user) => {
  if (product.type === "subscription") {
    const renewalDate = new Date();
    if      (product.billingCycle === "year")  renewalDate.setFullYear(renewalDate.getFullYear() + 1);
    else if (product.billingCycle === "month") renewalDate.setMonth(renewalDate.getMonth() + 1);
    else                                       renewalDate.setMonth(renewalDate.getMonth() + 1);

    user.subscription = {
      product:     product._id,
      productName: product.name,
      price:       order.amount,
      status:      "active",
      startDate:   new Date(),
      renewalDate,
    };
    await user.save({ validateBeforeSave: false });
  }

  if (product.type === "screen") {
    const count     = product.screensGranted || 1;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    for (let i = 0; i < count; i++) {
      user.screenPurchases.push({
        orderId:  order._id,
        price:    Math.round((order.amount / count) * 100) / 100,
        expiresAt,
        status:   "active",
      });
    }
    await user.save({ validateBeforeSave: false });
  }
};

// ════════════════════════════════════════════════
//  RAZORPAY — POST /api/orders/create-order
// ════════════════════════════════════════════════
export const createRazorpayOrder = async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) return sendBadRequest(res, "productId is required.");

    const product = await Product.findById(productId);
    if (!product)          return sendNotFound(res, "Product not found.");
    if (!product.isActive) return sendBadRequest(res, "This product is not currently available.");

    const user     = req.user;
    const currency = user.currency || "INR";
    const price    = resolvePrice(product, currency);

    if (!price || price <= 0)
      return sendBadRequest(res, "This product has no price set for your region.");

    const amountPaise = toPaise(price, currency);

    const rzpOrder = await getRazorpay().orders.create({
      amount:   amountPaise,
      currency: "INR",
      receipt:  `f1air_${Date.now()}`,
      notes: {
        userId:    user._id.toString(),
        productId: product._id.toString(),
        userEmail: user.email,
      },
    });

    const order = await Order.create({
      user:            user._id,
      product:         product._id,
      productName:     product.name,
      amount:          price,
      currency,
      gateway:         "razorpay",
      status:          "pending",
      razorpayOrderId: rzpOrder.id,
    });

    return sendCreated(res, {
      orderId:         order._id,
      razorpayOrderId: rzpOrder.id,
      amount:          amountPaise,
      currency:        "INR",
      keyId:           process.env.RAZORPAY_KEY_ID,
      productName:     product.name,
      prefill: {
        name:  `${user.firstName} ${user.lastName}`,
        email: user.email,
      },
    }, "Order created.");
  } catch (err) {
    console.error("createRazorpayOrder:", err);
    return sendError(res, "Failed to create payment order.");
  }
};

// ════════════════════════════════════════════════
//  RAZORPAY — POST /api/orders/verify-payment
// ════════════════════════════════════════════════
export const verifyPayment = async (req, res) => {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature)
      return sendBadRequest(res, "Missing required payment fields.");

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (expected !== razorpaySignature)
      return sendForbidden(res, "Payment signature verification failed.");

    const order = await Order.findOneAndUpdate(
      { _id: orderId, user: req.user._id, status: "pending" },
      { status: "paid", paidAt: new Date(), razorpayPaymentId, razorpaySignature },
      { new: true }
    );
    if (!order) return sendNotFound(res, "Order not found or already processed.");

    const [product, user] = await Promise.all([
      Product.findById(order.product),
      User.findById(req.user._id),
    ]);
    if (product && user) await applyProductEffect(order, product, user);

    const updated = await User.findById(req.user._id);
    return sendSuccess(res, {
      order,
      subscription:    updated.subscription,
      screenPurchases: updated.screenPurchases,
    }, "Payment verified! Your product has been activated.");
  } catch (err) {
    console.error("verifyPayment:", err);
    return sendError(res, "Payment verification failed.");
  }
};

// ════════════════════════════════════════════════
//  RAZORPAY — POST /api/orders/webhook
// ════════════════════════════════════════════════
export const razorpayWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (secret) {
      const sig      = req.headers["x-razorpay-signature"];
      const expected = crypto
        .createHmac("sha256", secret)
        .update(JSON.stringify(req.body))
        .digest("hex");
      if (sig !== expected)
        return res.status(400).json({ error: "Invalid signature" });
    }

    const event = req.body;
    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;
      const order   = await Order.findOne({ razorpayOrderId: payment.order_id, status: "pending" });
      if (order) {
        order.status = "paid"; order.paidAt = new Date();
        order.razorpayPaymentId = payment.id;
        await order.save();
        const [product, user] = await Promise.all([
          Product.findById(order.product),
          User.findById(order.user),
        ]);
        if (product && user) await applyProductEffect(order, product, user);
      }
    }
    if (event.event === "payment.failed") {
      await Order.findOneAndUpdate(
        { razorpayOrderId: event.payload.payment.entity.order_id, status: "pending" },
        { status: "failed" }
      );
    }
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("razorpayWebhook:", err);
    return res.status(500).json({ error: "Webhook error" });
  }
};

// ════════════════════════════════════════════════
//  LEMONSQUEEZY — POST /api/orders/ls-create-checkout
//  Creates a hosted checkout URL and redirects user.
// ════════════════════════════════════════════════
export const createLSCheckoutSession = async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) return sendBadRequest(res, "productId is required.");

    const product = await Product.findById(productId);
    if (!product)          return sendNotFound(res, "Product not found.");
    if (!product.isActive) return sendBadRequest(res, "This product is not currently available.");

    const user     = req.user;
    const currency = user.currency || "USD";

    // Pick correct store + variant based on currency
    const isEur     = currency === "EUR";
    const storeId   = isEur
      ? (process.env.LEMONSQUEEZY_STORE_ID_EUR || process.env.LEMONSQUEEZY_STORE_ID)
      : process.env.LEMONSQUEEZY_STORE_ID;
    const variantId = isEur
      ? (product.lsVariantIdEur || product.lsVariantId)
      : product.lsVariantId;

    if (!variantId)
      return sendBadRequest(res, `This product is not configured for ${currency} payments yet. Please set the LemonSqueezy Variant ID in the admin panel.`);

    const price = resolvePrice(product, currency);

    // Create a pending order first so we have an ID for the custom data
    const order = await Order.create({
      user:        user._id,
      product:     product._id,
      productName: product.name,
      amount:      price,
      currency,
      gateway:     "lemonsqueezy",
      status:      "pending",
    });

    const checkout = await createLSCheckout({
      variantId,
      storeId,
      userEmail: user.email,
      userName:  `${user.firstName} ${user.lastName}`,
      orderId:   order._id,
    });

    // Store the checkout id for reference
    order.lsCheckoutId = checkout.id;
    await order.save();

    // Return the checkout URL — frontend redirects user there
    const checkoutUrl = checkout.attributes?.url;
    if (!checkoutUrl) throw new Error("No checkout URL returned from LemonSqueezy.");

    return sendCreated(res, {
      orderId:     order._id,
      checkoutUrl,
      productName: product.name,
    }, "LemonSqueezy checkout created.");
  } catch (err) {
    console.error("createLSCheckoutSession:", err);
    return sendError(res, err.message || "Failed to create checkout.");
  }
};

// ════════════════════════════════════════════════
//  LEMONSQUEEZY — POST /api/orders/ls-webhook
//  LemonSqueezy server-to-server events.
//  Register URL in LS Dashboard → Settings → Webhooks.
// ════════════════════════════════════════════════
export const lemonSqueezyWebhook = async (req, res) => {
  try {
    // ── Verify signature ───────────────────────
    const secret    = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    const signature = req.headers["x-signature"];

    if (!secret || !signature) {
      return res.status(400).json({ error: "Missing webhook secret or signature." });
    }

    const hmac     = crypto.createHmac("sha256", secret);
    const digest   = hmac.update(req.body).digest("hex"); // req.body is raw Buffer
    if (digest !== signature) {
      return res.status(400).json({ error: "Invalid signature." });
    }

    const event = JSON.parse(req.body.toString());
    const type  = event.meta?.event_name;

    console.log("LS Webhook received:", type);

    // ── order_created — payment succeeded ──────
    if (type === "order_created") {
      const lsOrder    = event.data?.attributes;
      const customData = event.meta?.custom_data || {};
      const orderId    = customData.order_id;

      if (!orderId) {
        console.warn("LS webhook: no order_id in custom_data");
        return res.status(200).json({ received: true });
      }

      if (lsOrder?.status === "paid") {
        const order = await Order.findOneAndUpdate(
          { _id: orderId, status: "pending" },
          {
            status:       "paid",
            paidAt:       new Date(),
            lsOrderId:    String(event.data?.id),
            lsCustomerId: String(lsOrder?.customer_id || ""),
          },
          { new: true }
        );

        if (order) {
          const [product, user] = await Promise.all([
            Product.findById(order.product),
            User.findById(order.user),
          ]);
          if (product && user) {
            await applyProductEffect(order, product, user);
            console.log(`LS payment activated: ${product.name} for ${user.email}`);
          }
        }
      }
    }

    // ── order_refunded ─────────────────────────
    if (type === "order_refunded") {
      const customData = event.meta?.custom_data || {};
      const orderId    = customData.order_id;
      if (orderId) {
        await Order.findByIdAndUpdate(orderId, { status: "refunded" });
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("lemonSqueezyWebhook:", err);
    return res.status(500).json({ error: "Webhook error." });
  }
};

// ════════════════════════════════════════════════
//  LEMONSQUEEZY — POST /api/orders/ls-verify
//  Called by frontend on /payment-success?gateway=ls
//  Checks LS API directly for payment status and
//  activates product without needing webhook.
// ════════════════════════════════════════════════
export const verifyLSPayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return sendBadRequest(res, "orderId is required.");

    const order = await Order.findOne({ _id: orderId, user: req.user._id });
    if (!order) return sendNotFound(res, "Order not found.");

    // Already activated — just return success
    if (order.status === "paid") {
      const updated = await User.findById(req.user._id);
      return sendSuccess(res, {
        activated:       true,
        subscription:    updated.subscription,
        screenPurchases: updated.screenPurchases,
      }, "Already activated.");
    }

    if (order.gateway !== "lemonsqueezy")
      return sendBadRequest(res, "Not a LemonSqueezy order.");

    // Query LS API directly using the checkout ID
    if (!order.lsCheckoutId)
      return sendBadRequest(res, "No checkout ID found for this order.");

    const lsRes = await fetch(
      `https://api.lemonsqueezy.com/v1/checkouts/${order.lsCheckoutId}`,
      {
        headers: {
          "Authorization": `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
          "Accept":        "application/vnd.api+json",
        },
      }
    );

    if (!lsRes.ok) {
      return sendBadRequest(res, "Could not verify payment with LemonSqueezy.");
    }

    const lsData  = await lsRes.json();
    const lsAttrs = lsData?.data?.attributes;
    console.log("LS checkout status:", lsAttrs?.status);

    // ── Search LS orders directly by our MongoDB order._id in custom_data ─
    // The checkout API doesn't expose order_id reliably before webhook fires.
    // Instead we search all recent orders and match by custom_data.order_id.
    // Search both USD and EUR stores for this order
    const storeIds  = [
      process.env.LEMONSQUEEZY_STORE_ID,
      process.env.LEMONSQUEEZY_STORE_ID_EUR,
    ].filter(Boolean);

    const allOrders = [];
    for (const sid of storeIds) {
      const r = await fetch(
        `https://api.lemonsqueezy.com/v1/orders?filter[store_id]=${sid}&page[size]=25`,
        {
          headers: {
            "Authorization": `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
            "Accept":        "application/vnd.api+json",
          },
        }
      );
      if (r.ok) {
        const d = await r.json();
        allOrders.push(...(d?.data || []));
      }
    }
    // Deduplicate by order id
    const orders = [...new Map(allOrders.map(o => [o.id, o])).values()];

    console.log(`LS orders found: ${orders.length}`);
    const ourOrderId = order._id.toString();
    orders.forEach(o => {
      const cd = o.attributes?.custom_data || o.meta?.custom_data;
      console.log(`  LS order ${o.id}: status=${o.attributes?.status}, email=${o.attributes?.user_email}, custom_data=`, JSON.stringify(cd));
    });

    // Match by custom_data.order_id (try multiple key formats)
    let lsMatch = orders.find(o => {
      const cd = o.attributes?.custom_data || o.meta?.custom_data;
      if (!cd) return false;
      return String(cd.order_id)    === ourOrderId
          || String(cd.orderId)     === ourOrderId
          || String(cd["order-id"]) === ourOrderId;
    });

    // Fallback: match most recent paid order by user email
    if (!lsMatch) {
      const userDoc = await User.findById(order.user).select("email");
      if (userDoc?.email) {
        lsMatch = orders.find(o =>
          o.attributes?.status === "paid" &&
          o.attributes?.user_email === userDoc.email
        );
        if (lsMatch) console.log("Matched LS order by email fallback:", lsMatch.id);
      }
    }

    if (!lsMatch) {
      console.log("No LS order matched for order_id:", ourOrderId);
      return sendSuccess(res, { activated: false }, "Payment not confirmed yet.");
    }

    const isPaid = lsMatch.attributes?.status === "paid";
    console.log(`Matched LS order ${lsMatch.id}, status: ${lsMatch.attributes?.status}`);

    if (isPaid) {
      order.status    = "paid";
      order.paidAt    = new Date();
      order.lsOrderId = String(lsMatch.id);
      await order.save();

      const [product, user] = await Promise.all([
        Product.findById(order.product),
        User.findById(req.user._id),
      ]);
      if (product && user) await applyProductEffect(order, product, user);

      const updated = await User.findById(req.user._id);
      return sendSuccess(res, {
        activated:       true,
        subscription:    updated.subscription,
        screenPurchases: updated.screenPurchases,
      }, "Payment verified and product activated.");
    }

    return sendSuccess(res, { activated: false }, "Payment not confirmed yet.");
  } catch (err) {
    console.error("verifyLSPayment:", err);
    return sendError(res, "Failed to verify LemonSqueezy payment.");
  }
};

// ════════════════════════════════════════════════
//  ADMIN — PATCH /api/orders/:id/status
//  Manually update order status from admin panel
// ════════════════════════════════════════════════
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["pending", "paid", "failed", "refunded", "cancelled"];
    if (!status || !validStatuses.includes(status)) {
      return sendBadRequest(res, `Status must be one of: ${validStatuses.join(", ")}`);
    }

    const order = await Order.findById(req.params.id);
    if (!order) return sendNotFound(res, "Order not found.");

    const wasAlreadyPaid = order.status === "paid";
    order.status = status;
    if (status === "paid" && !order.paidAt) order.paidAt = new Date();
    await order.save();

    // If manually marking as paid and wasn't paid before, apply product effect
    if (status === "paid" && !wasAlreadyPaid) {
      const [product, user] = await Promise.all([
        Product.findById(order.product),
        User.findById(order.user),
      ]);
      if (product && user) {
        await applyProductEffect(order, product, user);
        console.log(`Admin manually activated: ${product.name} for user ${order.user}`);
      }
    }

    return sendSuccess(res, order, `Order status updated to ${status}.`);
  } catch (err) {
    console.error("updateOrderStatus:", err);
    return sendError(res, "Failed to update order status.");
  }
};

// ════════════════════════════════════════════════
//  Read routes
// ════════════════════════════════════════════════
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate("product", "name slug image category")
      .sort({ createdAt: -1 });
    return sendSuccess(res, { count: orders.length, orders });
  } catch (err) {
    return sendError(res, "Failed to fetch orders.");
  }
};

export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id })
      .populate("product", "name slug image");
    if (!order) return sendNotFound(res, "Order not found.");
    return sendSuccess(res, order);
  } catch (err) {
    return sendError(res, "Failed to fetch order.");
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("user", "firstName lastName email")
        .populate("product", "name slug")
        .sort({ createdAt: -1 })
        .skip(skip).limit(parseInt(limit)),
      Order.countDocuments(filter),
    ]);
    return sendSuccess(res, {
      total, page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      orders,
    });
  } catch (err) {
    return sendError(res, "Failed to fetch orders.");
  }
};