import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";

export const initializePassport = () => {
  passport.use(
    new GoogleStrategy(
      {
        clientID:     process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:  process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error("No email found in Google profile"), null);

          let user = await User.findOne({ $or: [{ googleId: profile.id }, { email }] });

          if (user) {
            if (!user.googleId) {
              user.googleId   = profile.id;
              user.isVerified = true;
              if (!user.avatar) user.avatar = profile.photos?.[0]?.value || null;
              await user.save();
            }
            return done(null, user);
          }

          const nameParts = profile.displayName?.split(" ") || ["User"];
          user = await User.create({
            googleId:   profile.id,
            firstName:  profile.name?.givenName  || nameParts[0],
            lastName:   profile.name?.familyName || nameParts.slice(1).join(" ") || ".",
            email,
            avatar:     profile.photos?.[0]?.value || null,
            isVerified: true,
          });

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
};

// Do NOT call initializePassport() here — env vars aren't loaded yet at import time.
// server.js calls initializePassport() after dotenv.config().

export default passport;