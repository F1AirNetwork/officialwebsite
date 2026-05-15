import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(`${process.env.MONGODB_URI}/F1Air`, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS:          45000,
      connectTimeoutMS:         10000,
    });
    console.log(`✅ MongoDB Atlas connected: ${conn.connection.host}`);

    // ── Keep-alive ping every 4 minutes ──────────────────────────────────
    // Atlas closes idle connections after 5 minutes. This prevents that.
    setInterval(async () => {
      try {
        // Timeout: if ping takes > 5 seconds, skip it and try next interval
        const pingPromise = mongoose.connection.db.admin().ping();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("MongoDB ping timeout")), 5000)
        );
        await Promise.race([pingPromise, timeoutPromise]);
        // console.log("✅ MongoDB keep-alive ping successful");
      } catch (err) {
        console.warn("⚠️  MongoDB keep-alive ping failed:", err.message);
        // Try manual reconnect if disconnected
        if (mongoose.connection.readyState === 0) {
          console.log("🔄 Attempting MongoDB reconnection...");
          try {
            await mongoose.connect(`${process.env.MONGODB_URI}/F1Air`, {
              serverSelectionTimeoutMS: 5000,
              socketTimeoutMS: 45000,
              connectTimeoutMS: 10000,
            });
            console.log("✅ MongoDB reconnected successfully");
          } catch (reconnectErr) {
            console.error("❌ MongoDB reconnection failed:", reconnectErr.message);
          }
        }
      }
    }, 4 * 60 * 1000); // every 4 minutes

  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
};

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️  MongoDB disconnected — attempting reconnect...");
});
mongoose.connection.on("reconnected",  () => console.log("🔄 MongoDB reconnected"));
mongoose.connection.on("error",        (err) => console.error("MongoDB error:", err.message));

export default connectDB;