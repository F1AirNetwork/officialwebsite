import crypto from "crypto";
import StreamSession from "../models/streamSession.js";

// ─── Get screen limit for a user ─────────────
// 1 base screen (with active subscription) + purchasedScreens
export const getScreenLimit = (user) => {
  const hasActiveSub = user?.subscription?.status === "active";
  const base = hasActiveSub ? 1 : 0;
  const purchased = user?.purchasedScreens || 0;
  return base + purchased;
};

// ─── Generate unique session token ───────────
export const generateSessionToken = () =>
  crypto.randomBytes(32).toString("hex");

// ─── Join stream ─────────────────────────────
export const joinStream = async (userId, streamId, user, deviceInfo = "Unknown") => {
  const screenLimit = getScreenLimit(user);

  if (screenLimit === 0) {
    const err = new Error("You need an active subscription to watch streams. Visit the store to get started.");
    err.statusCode = 403;
    err.code = "NO_SUBSCRIPTION";
    throw err;
  }

  // ── Always clear this user's own previous sessions first ──────────────
  // This handles page reload, browser close, React StrictMode double-mount,
  // and any other case where the session wasn't properly closed.
  // We only block if the user has MORE active sessions than their screen limit
  // AND those sessions all have fresh heartbeats (genuinely watching elsewhere).
  const allSessions = await StreamSession.find({ userId, streamId, isActive: true });
  const now = Date.now();

  if (allSessions.length > 0) {
    if (screenLimit === 1) {
      // Single screen: always clear all previous sessions and take over.
      // The previous session is almost certainly this same user on this same browser.
      await StreamSession.updateMany({ userId, streamId, isActive: true }, { isActive: false });
    } else {
      // Multi-screen: only clear sessions that have gone stale (no heartbeat in 30s)
      const staleIds = allSessions
        .filter((s) => now - new Date(s.lastHeartbeat).getTime() >= 30000)
        .map((s) => s._id);
      if (staleIds.length > 0) {
        await StreamSession.updateMany({ _id: { $in: staleIds } }, { isActive: false });
      }

      // Re-count live sessions after cleanup
      const liveSessions = await StreamSession.find({ userId, streamId, isActive: true });
      if (liveSessions.length >= screenLimit) {
        const err = new Error(
          `You've reached your ${screenLimit}-screen limit. Close another stream or purchase more screens from the store.`
        );
        err.statusCode = 403;
        err.code = "SCREEN_LIMIT_REACHED";
        err.activeSessions = liveSessions.map((s) => ({
          sessionToken:  s.sessionToken,
          deviceInfo:    s.deviceInfo,
          lastHeartbeat: s.lastHeartbeat,
        }));
        err.screenLimit = screenLimit;
        throw err;
      }
    }
  }

  const sessionToken = generateSessionToken();
  await StreamSession.create({
    userId,
    streamId,
    sessionToken,
    deviceInfo,
    isActive:      true,
    lastHeartbeat: new Date(),
  });

  return sessionToken;
};

// ─── Heartbeat ────────────────────────────────
export const heartbeat = async (sessionToken) => {
  const session = await StreamSession.findOne({ sessionToken });

  if (!session || !session.isActive) {
    return { valid: false, reason: "Session ended or invalidated." };
  }

  session.lastHeartbeat = new Date();
  await session.save();

  return { valid: true };
};

// ─── Leave stream ─────────────────────────────
export const leaveStream = async (sessionToken) => {
  await StreamSession.findOneAndUpdate(
    { sessionToken },
    { isActive: false }
  );
};

// ─── Kick a specific session ──────────────────
export const kickSession = async (sessionToken, requestingUserId) => {
  const session = await StreamSession.findOne({ sessionToken });
  if (!session) throw new Error("Session not found.");

  if (session.userId.toString() !== requestingUserId.toString()) {
    const err = new Error("You can only manage your own sessions.");
    err.statusCode = 403;
    throw err;
  }

  session.isActive = false;
  await session.save();
};

// ─── Get total viewer count for a stream ─────
export const getViewerCount = async (streamId) => {
  await cleanAllDeadSessions(streamId);
  return StreamSession.countDocuments({ streamId, isActive: true });
};

// ─── Get user's active sessions ──────────────
export const getUserSessions = async (userId, streamId) => {
  await cleanDeadSessions(userId, streamId);
  return StreamSession.find({ userId, streamId, isActive: true })
    .select("sessionToken deviceInfo lastHeartbeat createdAt");
};

// ─── Clean dead sessions for one user ────────
const cleanDeadSessions = async (userId, streamId) => {
  const cutoff = new Date(Date.now() - 60 * 1000);
  await StreamSession.updateMany(
    { userId, streamId, isActive: true, lastHeartbeat: { $lt: cutoff } },
    { isActive: false }
  );
};

// ─── Clean dead sessions across whole stream ─
const cleanAllDeadSessions = async (streamId) => {
  const cutoff = new Date(Date.now() - 60 * 1000);
  await StreamSession.updateMany(
    { streamId, isActive: true, lastHeartbeat: { $lt: cutoff } },
    { isActive: false }
  );
};