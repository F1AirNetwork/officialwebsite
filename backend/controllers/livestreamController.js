import Stream from "../models/Stream.js";
import StreamSession from "../models/streamSession.js";
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
export const getAllStreams = async (req, res) => {
  try {
    const stream = await Stream.findOne({ singleton: 1 });
    if (!stream) return sendSuccess(res, [], "No stream configured yet.");

    const viewers = await getViewerCount(stream._id.toString());
    const data    = toPublicStream(stream, !!req.user);

    return sendSuccess(res, [{ ...data, viewers }]);
  } catch (err) {
    return sendError(res, "Failed to fetch stream.");
  }
};

// ─── GET /api/livestream/:id ──────────────────
export const getStreamById = async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.id);
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

// ─── GET /api/livestream/:id/url ──────────────
// Protected — returns HLS URL for authenticated users
export const getStreamUrl = async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.id);
    if (!stream) return sendNotFound(res, "Stream not found.");

    return sendSuccess(res, {
      streamId:  stream._id,
      hlsUrl:    stream.hlsUrl,
      expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    });
  } catch (err) {
    return sendError(res, "Failed to fetch stream URL.");
  }
};

// ══════════════════════════════════════════════
//  ADMIN ROUTES
// ══════════════════════════════════════════════

// ─── POST /api/livestream/admin/config ────────
// Admin — create or fully replace the stream config.
// Old entry is deleted first — only one stream doc ever exists in DB.
export const setStreamConfig = async (req, res) => {
  try {
    const { name, description, hlsUrl, embedUrl, isLive } = req.body;

    if (!name || !description) {
      return res.status(400).json({
        success: false,
        error: "name and description are required.",
      });
    }

    // Wipe old config — keeps DB clean, one entry only
    await Stream.deleteMany({});

    const stream = await Stream.create({
      name:        name.trim(),
      description: description.trim(),
      hlsUrl:      hlsUrl?.trim()   || "",
      embedUrl:    embedUrl?.trim() || "",
      isLive:      isLive ?? false,
      isPremium:   true,
      singleton:   1,
    });

    return sendCreated(res, stream, "Stream configured successfully.");
  } catch (err) {
    console.error("setStreamConfig error:", err);
    return sendError(res, "Failed to configure stream.");
  }
};

// ─── PATCH /api/livestream/admin/config ───────
// Admin — partial update (e.g. just change URL or description)
export const updateStreamConfig = async (req, res) => {
  try {
    const { name, description, hlsUrl, embedUrl, isLive } = req.body;

    const stream = await Stream.findOne({ singleton: 1 });
    if (!stream) {
      return sendNotFound(res, "No stream configured yet. Use POST to create one first.");
    }

    if (name        !== undefined) stream.name        = name.trim();
    if (description !== undefined) stream.description = description.trim();
    if (hlsUrl      !== undefined) stream.hlsUrl      = hlsUrl.trim();
    if (embedUrl    !== undefined) stream.embedUrl    = embedUrl.trim();
    if (isLive      !== undefined) stream.isLive      = isLive;

    await stream.save();
    return sendSuccess(res, stream, "Stream updated successfully.");
  } catch (err) {
    console.error("updateStreamConfig error:", err);
    return sendError(res, "Failed to update stream.");
  }
};

// ─── DELETE /api/livestream/admin/config ──────
// Admin — remove stream config entirely (platform goes offline)
export const deleteStreamConfig = async (req, res) => {
  try {
    await Stream.deleteMany({});
    // Clear all sessions too — no stream means no valid sessions
    await StreamSession.deleteMany({});
    return sendSuccess(res, null, "Stream config deleted. Platform is now offline.");
  } catch (err) {
    return sendError(res, "Failed to delete stream config.");
  }
};

// ─── PATCH /api/livestream/admin/toggle ───────
// Admin — quickly flip stream live/offline without touching other fields
export const toggleLive = async (req, res) => {
  try {
    const stream = await Stream.findOne({ singleton: 1 });
    if (!stream) return sendNotFound(res, "No stream configured yet.");

    stream.isLive = !stream.isLive;
    await stream.save();

    // ── Clear all sessions when stream goes offline ──────────────────────
    // Frees up DB storage and ensures no stale sessions block users next time.
    if (!stream.isLive) {
      const deleted = await StreamSession.deleteMany({ streamId: stream._id });
      console.log(`Stream offline — cleared ${deleted.deletedCount} session(s).`);
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

// ══════════════════════════════════════════════
//  VIEWER / SESSION ROUTES
// ══════════════════════════════════════════════

// ─── POST /api/livestream/:id/join ────────────
export const joinStreamHandler = async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.id);
    if (!stream) return sendNotFound(res, "Stream not found.");

    if (!stream.isLive) {
      return res.status(400).json({
        success: false,
        error: "This stream is not currently live.",
        code: "STREAM_OFFLINE",
      });
    }

    // Recompute totalScreens manually in case virtuals aren't populated
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

    const deviceInfo   = req.headers["user-agent"]?.substring(0, 100) || "Unknown device";
    const sessionToken = await joinStream(
      req.user._id,
      stream._id.toString(),
      req.user,
      deviceInfo
    );

    const viewers = await getViewerCount(stream._id.toString());

    return sendSuccess(res, {
      sessionToken,
      hlsUrl:            stream.hlsUrl,
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