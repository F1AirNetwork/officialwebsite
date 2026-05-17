import Stream from "../models/Stream.js";
import StreamSession from "../models/streamSession.js";
import User from "../models/User.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import {
  joinStream,
  leaveStream,
  heartbeat,
  kickSession,
  getViewerCount,
  getUserSessions,
} from "../utils/StreamSession.js";
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
  sendForbidden,
} from "../utils/response.js";

// ─── Helper: strip HLS URL for guests ────────
const toPublicStream = (stream, isAuthenticated) => {
  const obj = stream.toObject({ virtuals: true });
  if (!isAuthenticated) obj.hlsUrl = null;
  return obj;
};

// ══════════════════════════════════════════════
//  PUBLIC ROUTES
// ══════════════════════════════════════════════

// ─── GET /api/livestream ──────────────────────
// Returns all streams, sorted by sortOrder then createdAt
export const getAllStreams = async (req, res) => {
  try {
    const streams = await Stream.find({}).populate("requiredProductId", "name slug").sort({ sortOrder: 1, createdAt: 1 });
    if (!streams.length) return sendSuccess(res, [], "No streams configured yet.");

    const streamsWithViewers = await Promise.all(
      streams.map(async (stream) => {
        const viewers = await getViewerCount(stream._id.toString());
        return { ...toPublicStream(stream, !!req.user), viewers };
      })
    );

    return sendSuccess(res, streamsWithViewers);
  } catch (err) {
    return sendError(res, "Failed to fetch streams.");
  }
};

// ─── GET /api/livestream/:id ──────────────────
export const getStreamById = async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.id).populate("requiredProductId", "name slug");
    if (!stream) return sendNotFound(res, "Stream not found.");

    const viewers = await getViewerCount(stream._id.toString());

    if (stream.isPremium && !req.user) {
      const data = toPublicStream(stream, false);
      return sendSuccess(res, {
        ...data,
        viewers,
        requiresAuth: true,
        message: "Sign in to watch this stream",
      });
    }

    return sendSuccess(res, { ...toPublicStream(stream, true), viewers });
  } catch (err) {
    return sendError(res, "Failed to fetch stream.");
  }
};

// ══════════════════════════════════════════════
//  ADMIN ROUTES
// ══════════════════════════════════════════════

// ─── POST /api/livestream/admin/streams ───────
// Admin — create a new stream
export const createStream = async (req, res) => {
  try {
    const { name, description, hlsUrl, embedUrl, isLive, sortOrder, requiredProductId } = req.body;

    if (!name || !description) {
      return res.status(400).json({
        success: false,
        error: "name and description are required.",
      });
    }

    const stream = await Stream.create({
      name:              name.trim(),
      description:       description.trim(),
      hlsUrl:            hlsUrl?.trim()            || "",
      embedUrl:          embedUrl?.trim()           || "",
      isLive:            isLive                    ?? false,
      isPremium:         true,
      sortOrder:         sortOrder                 ?? 0,
      requiredProductId: requiredProductId         || null,
    });

    return sendCreated(res, stream, "Stream created successfully.");
  } catch (err) {
    console.error("createStream error:", err);
    return sendError(res, "Failed to create stream.");
  }
};

// ─── PATCH /api/livestream/admin/streams/:id ──
// Admin — update a specific stream
export const updateStream = async (req, res) => {
  try {
    const { name, description, hlsUrl, embedUrl, isLive, sortOrder, requiredProductId } = req.body;

    const stream = await Stream.findById(req.params.id);
    if (!stream) return sendNotFound(res, "Stream not found.");

    if (name              !== undefined) stream.name              = name.trim();
    if (description       !== undefined) stream.description       = description.trim();
    if (hlsUrl            !== undefined) stream.hlsUrl            = hlsUrl.trim();
    if (embedUrl          !== undefined) stream.embedUrl          = embedUrl.trim();
    if (isLive            !== undefined) stream.isLive            = isLive;
    if (sortOrder         !== undefined) stream.sortOrder         = sortOrder;
    if (requiredProductId !== undefined) stream.requiredProductId = requiredProductId || null;

    await stream.save();
    return sendSuccess(res, stream, "Stream updated successfully.");
  } catch (err) {
    console.error("updateStream error:", err);
    return sendError(res, "Failed to update stream.");
  }
};

// ─── DELETE /api/livestream/admin/streams/:id ─
// Admin — delete a specific stream and its sessions
export const deleteStream = async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.id);
    if (!stream) return sendNotFound(res, "Stream not found.");

    // Delete card image from Cloudinary if present
    if (stream.cardImagePublicId) {
      await deleteFromCloudinary(stream.cardImagePublicId);
    }

    await StreamSession.deleteMany({ streamId: stream._id.toString() });
    await stream.deleteOne();

    return sendSuccess(res, null, "Stream deleted.");
  } catch (err) {
    return sendError(res, "Failed to delete stream.");
  }
};

// ─── PATCH /api/livestream/admin/streams/:id/toggle ──
// Admin — flip live/offline for a specific stream
export const toggleStreamLive = async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.id);
    if (!stream) return sendNotFound(res, "Stream not found.");

    stream.isLive = !stream.isLive;
    await stream.save();

    // Clear sessions when going offline
    if (!stream.isLive) {
      const deleted = await StreamSession.deleteMany({ streamId: stream._id.toString() });
      console.log(`Stream "${stream.name}" offline — cleared ${deleted.deletedCount} session(s).`);
    }

    return sendSuccess(
      res,
      { isLive: stream.isLive },
      `Stream is now ${stream.isLive ? "LIVE 🔴" : "offline"}.`
    );
  } catch (err) {
    return sendError(res, "Failed to toggle stream.");
  }
};

// ─── PATCH /api/livestream/admin/streams/:id/image ──
// Admin — upload / replace card image (multipart)
export const uploadStreamImage = async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.id);
    if (!stream) return sendNotFound(res, "Stream not found.");

    if (!req.file) {
      return res.status(400).json({ success: false, error: "No image file provided." });
    }

    // Delete old image if present
    if (stream.cardImagePublicId) {
      await deleteFromCloudinary(stream.cardImagePublicId);
    }

    // Upload using the existing configured utility
    const { url, publicId } = await uploadToCloudinary(req.file.buffer, {
      folder: "f1air/streams",
      transformation: [
        { width: 800, height: 450, crop: "fill" },
        { quality: "auto", fetch_format: "auto" },
      ],
    });

    stream.cardImage         = url;
    stream.cardImagePublicId = publicId;
    await stream.save();

    return sendSuccess(res, { cardImage: stream.cardImage }, "Stream image uploaded.");
  } catch (err) {
    console.error("uploadStreamImage error:", err);
    return sendError(res, "Failed to upload stream image.");
  }
};

// ─── DELETE /api/livestream/admin/streams/:id/image ──
// Admin — remove card image
export const deleteStreamImage = async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.id);
    if (!stream) return sendNotFound(res, "Stream not found.");

    if (stream.cardImagePublicId) {
      await deleteFromCloudinary(stream.cardImagePublicId);
    }

    stream.cardImage         = "";
    stream.cardImagePublicId = "";
    await stream.save();

    return sendSuccess(res, null, "Stream image removed.");
  } catch (err) {
    return sendError(res, "Failed to remove stream image.");
  }
};

// ══════════════════════════════════════════════
//  VIEWER / SESSION ROUTES
// ══════════════════════════════════════════════

// ─── POST /api/livestream/:id/join ────────────
export const joinStreamHandler = async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.id).populate("requiredProductId", "name slug");
    if (!stream) return sendNotFound(res, "Stream not found.");

    if (!stream.isLive) {
      return res.status(400).json({
        success: false,
        error: "This stream is not currently live.",
        code: "STREAM_OFFLINE",
      });
    }

    // ── Product gate: stream requires a specific product purchase ──
    if (stream.requiredProductId) {
      const productId = (stream.requiredProductId._id ?? stream.requiredProductId).toString();

      // Fast lookup via purchasedProducts array on User — no extra DB query
      const fullUser   = await User.findById(req.user._id).select("purchasedProducts");
      const hasPurchased = (fullUser?.purchasedProducts || []).some(
        (p) => p.status === "active" && p.productId.toString() === productId
      );

      if (!hasPurchased) {
        return res.status(403).json({
          success:          false,
          error:            `This stream requires the "${stream.requiredProductId.name}" product. Purchase it from the store to watch.`,
          code:             "PRODUCT_REQUIRED",
          requiredProduct:  {
            _id:  stream.requiredProductId._id,
            name: stream.requiredProductId.name,
            slug: stream.requiredProductId.slug,
          },
          upgradeRequired:  true,
        });
      }
    } else {
      // ── Default subscription gate ──
      const hasActiveSub = req.user.subscription?.status === "active";
      const now = new Date();
      const extraScreens = (req.user.screenPurchases || []).filter((s) => {
        if (s.status !== "active") return false;
        if (s.expiresAt && s.expiresAt < now) return false;
        return true;
      }).length;
      const totalScreens = (hasActiveSub ? 1 : 0) + extraScreens;

      if (totalScreens === 0) {
        return res.status(403).json({
          success: false,
          error: "You need an active subscription to watch. Please subscribe to get your first screen.",
          code: "NO_SUBSCRIPTION",
          upgradeRequired: true,
        });
      }
    }

    // Compute totalScreens for session limit (always needed)
    const hasActiveSub = req.user.subscription?.status === "active";
    const now = new Date();
    const extraScreens = (req.user.screenPurchases || []).filter((s) => {
      if (s.status !== "active") return false;
      if (s.expiresAt && s.expiresAt < now) return false;
      return true;
    }).length;
    const totalScreens = (hasActiveSub ? 1 : 0) + extraScreens || 1;

    const deviceInfo   = req.headers["user-agent"]?.substring(0, 100) || "Unknown device";
    const sessionToken = await joinStream(
      req.user._id,
      stream._id.toString(),
      req.user,
      deviceInfo,
      { skipSubscriptionCheck: !!stream.requiredProductId }
    );

    const viewers = await getViewerCount(stream._id.toString());

    return sendSuccess(res, {
      sessionToken,
      hlsUrl:            stream.hlsUrl,
      embedUrl:          stream.embedUrl,
      streamId:          stream._id,
      totalScreens,
      viewers,
      heartbeatInterval: 30,
    }, "Stream joined successfully");

  } catch (err) {
    if (err.code === "SCREEN_LIMIT_REACHED") {
      return res.status(403).json({
        success:         false,
        error:           err.message,
        code:            "SCREEN_LIMIT_REACHED",
        activeSessions:  err.activeSessions,
        upgradeRequired: true,
      });
    }
    console.error("joinStream error:", err);
    return sendError(res, "Failed to join stream.");
  }
};

// ─── POST /api/livestream/:id/heartbeat ───────
export const heartbeatHandler = async (req, res) => {
  try {
    const { sessionToken } = req.body;
    if (!sessionToken) {
      return res.status(400).json({ success: false, error: "sessionToken is required." });
    }

    const result = await heartbeat(sessionToken);

    if (!result.valid) {
      return res.status(401).json({
        success: false,
        valid:   false,
        error:   result.reason || "Your session has ended.",
        code:    "SESSION_ENDED",
      });
    }

    const viewers = await getViewerCount(req.params.id);
    return sendSuccess(res, { valid: true, viewers });
  } catch (err) {
    return sendError(res, "Heartbeat failed.");
  }
};

// ─── POST /api/livestream/:id/leave ──────────
export const leaveStreamHandler = async (req, res) => {
  try {
    const { sessionToken } = req.body;
    if (!sessionToken) {
      return res.status(400).json({ success: false, error: "sessionToken is required." });
    }
    await leaveStream(sessionToken);
    return sendSuccess(res, null, "Left stream successfully.");
  } catch (err) {
    return sendError(res, "Failed to leave stream.");
  }
};

// ─── GET /api/livestream/:id/viewers ─────────
export const getViewers = async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.id);
    if (!stream) return sendNotFound(res, "Stream not found.");

    const [viewers, userSessions] = await Promise.all([
      getViewerCount(stream._id.toString()),
      getUserSessions(req.user._id, stream._id.toString()),
    ]);

    const totalScreens = req.user.totalScreens ?? 0;

    return sendSuccess(res, {
      viewers,
      totalScreens,
      screensUsed:      userSessions.length,
      screensAvailable: Math.max(0, totalScreens - userSessions.length),
      activeSessions:   userSessions,
    });
  } catch (err) {
    return sendError(res, "Failed to fetch viewer data.");
  }
};

// ─── DELETE /api/livestream/sessions/:token ───
export const kickSessionHandler = async (req, res) => {
  try {
    await kickSession(req.params.sessionToken, req.user._id);
    return sendSuccess(res, null, "Device removed from stream.");
  } catch (err) {
    if (err.statusCode === 403) return sendForbidden(res, err.message);
    return sendError(res, "Failed to remove device.");
  }
};