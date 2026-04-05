import mongoose from "mongoose";

const streamSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    streamId: {
      type: String,
      required: true,
      index: true,
    },
    sessionToken: {
      type: String,
      required: true,
      unique: true,
      // A unique token issued to each device/tab watching the stream.
      // Sent with every heartbeat to prove the session is still active.
    },
    deviceInfo: {
      type: String,
      default: "Unknown device",
      // e.g. "Chrome on Windows"
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastHeartbeat: {
      type: Date,
      default: Date.now,
      // Updated every 30s by the frontend. If not updated for 60s,
      // the session is considered dead and cleaned up.
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours
    },
  },
  { timestamps: true }
);

// Auto-delete expired sessions from MongoDB
streamSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const streamSession = mongoose.model("streamSession", streamSessionSchema);
export default streamSession;