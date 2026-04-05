import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { createClient } from "redis";
import passport, { initializePassport } from "./utils/passport.js";
import connectDB from "./config/Db.js";

import authRoutes       from "./routes/authRoutes.js";
import userRoutes       from "./routes/userRoutes.js";
import productRoutes    from "./routes/productRoutes.js";
import categoryRoutes   from "./routes/categoryRoutes.js";
import eventRoutes      from "./routes/eventRoutes.js";
import livestreamRoutes from "./routes/livestreamRoutes.js";
import orderRoutes      from "./routes/orderRoutes.js";
import screenRoutes     from "./routes/screenRoutes.js";

const app  = express();
const PORT = process.env.PORT || 5000;

await connectDB();

// ─── Redis for Rate Limiting (prevents memory bloat) ──
const redisClient = createClient({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  db: 0,
  retry_strategy: (options) => {
    if (options.error?.code === "ECONNREFUSED") {
      console.warn("⚠️  Redis unavailable. Rate limiting disabled (use Redis in production!)");
      return false; // Disable Redis, fallback to memory store for dev
    }
    return undefined;
  },
});

redisClient.on("error", (err) => {
  if (err.code !== "ECONNREFUSED") {
    console.error("Redis error:", err);
  }
});

redisClient.on("connect", () => {
  console.log("✅ Redis connected for rate limiting");
});

const useRedisStore = process.env.REDIS_ENABLED !== "false";
let redisReady = false;

if (useRedisStore) {
  redisClient.on("ready", () => {
    redisReady = true;
  });
}

// ─── Security ────────────────────────────────
app.use(helmet());

// Parse CLIENT_ORIGINS from environment (comma-separated)
// Fallback to individual CLIENT_ORIGIN and admin origin for development
const allowedOrigins = process.env.CLIENT_ORIGINS 
  ? process.env.CLIENT_ORIGINS.split(",").map(o => o.trim())
  : [
      process.env.CLIENT_ORIGIN || "http://localhost:5173",
      "http://localhost:5174","https://f1-air-admin.vercel.app",  // Development admin
    ];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // Allow requests with no origin (like mobile apps)
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) return cb(null, true);
    
    // Allow any Vercel preview/production deployment (*.vercel.app)
    if (origin.endsWith(".vercel.app")) return cb(null, true);
    
    // Allow localhost for development
    if (origin.includes("localhost") || origin.includes("127.0.0.1")) return cb(null, true);
    
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials:    true,
  methods:        ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ─── Request timeout (prevents hang forever) ─
// Any request that hasn't responded in 30s gets a 503.
app.use((req, res, next) => {
  res.setTimeout(30000, () => {
    if (!res.headersSent) {
      res.status(503).json({ success: false, error: "Request timed out." });
    }
  });
  next();
});

// ─── Rate Limiting ────────────────────────────
// Skip rate limiting for localhost in development (prevents false "Too many requests" errors)
const isDevelopment = process.env.NODE_ENV === "development";
const skipRateLimitForLocalhost = (req) => {
  // Check for both IPv4 (127.0.0.1) and IPv6 (::1) localhost, plus common local IPs
  const isLocalhost = req.ip === "127.0.0.1" || req.ip === "::1" || req.ip === "::ffff:127.0.0.1";
  return isDevelopment && isLocalhost;
};

// Create rate limit store (Redis if available, memory fallback)
const createRateLimitStore = () => {
  if (redisReady && useRedisStore) {
    return new RedisStore({
      client: redisClient,
      prefix: "rl:", // Rate limit prefix in Redis
    });
  }
  // If Redis not available, use memory store
  return undefined; // express-rate-limit will use default memory store
};

// General rate limit: 100 requests per 15 seconds
app.use("/api", rateLimit({
  store: createRateLimitStore(),
  windowMs: 15 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimitForLocalhost,
  message: { success: false, error: "Too many requests. Please slow down." },
}));

// Auth endpoints: stricter limits (20 requests per 15 seconds)
app.use("/api/auth/login",    rateLimit({
  store: createRateLimitStore(),
  windowMs: 15 * 1000,
  max: 20,
  skip: skipRateLimitForLocalhost,
  message: { success: false, error: "Too many auth attempts." }
}));
app.use("/api/auth/register", rateLimit({
  store: createRateLimitStore(),
  windowMs: 15 * 1000,
  max: 20,
  skip: skipRateLimitForLocalhost,
  message: { success: false, error: "Too many auth attempts." }
}));

// ─── Body Parsing ─────────────────────────────
// Webhooks need raw body — must come BEFORE express.json()
app.use("/api/orders/webhook",    express.raw({ type: "application/json" }));
app.use("/api/orders/ls-webhook", express.raw({ type: "application/json" }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));
initializePassport();
app.use(passport.initialize());

// ─── Health Check ─────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    success:     true,
    service:     "F1 Air Network API",
    database:    "MongoDB Atlas",
    environment: process.env.NODE_ENV,
    timestamp:   new Date().toISOString(),
  });
});

// ─── Routes ───────────────────────────────────
app.use("/api/auth",          authRoutes);
app.use("/api/users",         userRoutes);
app.use("/api/products",      productRoutes);
app.use("/api/categories",    categoryRoutes);
app.use("/api/events",        eventRoutes);
app.use("/api/livestream",    livestreamRoutes);
app.use("/api/orders",        orderRoutes);
app.use("/api/admin/screens", screenRoutes);

// ─── 404 ──────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.path} not found` });
});

// ─── Global Error Handler ─────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  if (!res.headersSent) {
    res.status(err.status || 500).json({
      success: false,
      error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
    });
  }
});

// ─── Catch unhandled rejections (prevent silent hangs) ─
process.on("unhandledRejection", (reason) => {
  console.error("❌ UNHANDLED REJECTION - THIS CAN CAUSE HANGS:", reason);
  console.error("Stack:", new Error().stack);
});
process.on("uncaughtException", (err) => {
  console.error("❌ UNCAUGHT EXCEPTION - Server may become unstable:", err.message);
  console.error("Stack:", err.stack);
  // Optionally: exit process if critical
  // process.exit(1);
});

// ─── Monitor event loop lag (indicates blocking operations) ─
let lagWarningIncrement = 0;
setInterval(() => {
  const start = Date.now();
  setImmediate(() => {
    const lag = Date.now() - start;
    if (lag > 100) {
      lagWarningIncrement++;
      if (lagWarningIncrement % 5 === 0) {
        console.warn(`⚠️  Event loop lag detected: ${lag}ms (possible blocking operation)`);
      }
    }
  });
}, 30000); // Check every 30 seconds

app.listen(PORT, () => {
  console.log(`\n🏎️  F1 Air Network API   →  http://localhost:${PORT}`);
  console.log(`   Environment          →  ${process.env.NODE_ENV}`);
  console.log(`   Allowed origins      →  ${allowedOrigins.join(", ")}\n`);
});