import { Link } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { eventApi, streamApi } from "../../api/api.js";
import { useAuth } from "../../context/AuthContext.jsx";

// ─── Tiny HLS preview player (no controls, muted, autoplay) ──────────────────
const HlsPreview = ({ url }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!url || !videoRef.current) return;
    let hls;

    const load = async () => {
      // Dynamically import hls.js so it doesn't break if not installed
      try {
        const { default: Hls } = await import("hls.js");
        if (Hls.isSupported()) {
          hls = new Hls({ autoStartLoad: true, maxBufferLength: 10 });
          hls.loadSource(url);
          hls.attachMedia(videoRef.current);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            videoRef.current?.play().catch(() => {});
          });
        } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
          videoRef.current.src = url;
          videoRef.current.play().catch(() => {});
        }
      } catch (_) {}
    };

    load();
    return () => hls?.destroy();
  }, [url]);

  return (
    <video
      ref={videoRef}
      muted
      playsInline
      autoPlay
      className="object-cover w-full h-full"
    />
  );
};

// ─── Skeleton loader ──────────────────────────────────────────────────────────
const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-white/5 rounded ${className}`} />
);

export default function LiveEvents() {
  const { user, token } = useAuth();

  const [stream, setStream]   = useState(null);   // current stream config
  const [events, setEvents]   = useState([]);      // upcoming events list
  const [loading, setLoading] = useState(true);

  // Does the user have an active subscription?
  const hasSubscription = user?.subscription?.status === "active";
  const isLoggedIn      = !!user;

  useEffect(() => {
    const fetchAll = async () => {
      try {
        // Fetch stream config (optionalAuth — returns hlsUrl only if authenticated)
        const streamRes = await streamApi.getAll(token || null);
        const list = Array.isArray(streamRes.data) ? streamRes.data : [streamRes.data];
        setStream(list[0] || null);
      } catch (_) {
        setStream(null);
      }

      try {
        // Fetch upcoming + live events (up to 5 in the sidebar)
        const evRes = await eventApi.getAll();
        const all   = evRes.data?.events || [];
        // Show live events first, then upcoming, exclude completed
        const shown = all
          .filter((e) => e.status !== "completed")
          .sort((a, b) => {
            if (a.status === "live" && b.status !== "live") return -1;
            if (b.status === "live" && a.status !== "live") return  1;
            return 0;
          })
          .slice(0, 5);
        setEvents(shown);
      } catch (_) {
        setEvents([]);
      }

      setLoading(false);
    };

    fetchAll();
  }, [token]);

  const isLive = stream?.isLive === true;

  // Should we show the actual stream preview?
  // Only if: stream is live AND user has a subscription AND stream has an HLS url
  const canPreview = isLive && hasSubscription && stream?.hlsUrl;

  return (
    <section className="relative z-20 py-28">
      <div className="px-6 mx-auto max-w-7xl lg:px-24">

        {/* Heading */}
        <div className="flex flex-col items-center justify-center w-full mb-16 text-center">
          <h2 className="text-3xl tracking-widest text-center uppercase font-f1">
            Live & Upcoming Streams
          </h2>
          <div className="w-16 h-px mt-4 bg-white" />
        </div>

        {/* Main layout */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">

          {/* ── LEFT: Featured stream player ──────────────────────────── */}
          <div className="border lg:col-span-2 border-white/15 bg-black/60 backdrop-blur-md">

            {/* Video area */}
            <div className="relative flex items-center justify-center overflow-hidden bg-black aspect-video">

              {loading ? (
                <Skeleton className="absolute inset-0 rounded-none" />
              ) : canPreview ? (
                /* ── Live preview for subscribers ── */
                <>
                  <HlsPreview url={stream.hlsUrl} />
                  {/* LIVE badge */}
                  <span className="absolute top-4 left-4 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 z-10">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    LIVE NOW
                  </span>
                  {/* Muted notice */}
                  <span className="absolute bottom-4 right-4 text-[10px] text-white/40 bg-black/60 px-2 py-0.5 rounded z-10">
                    Preview · Muted
                  </span>
                </>

              ) : isLive && !hasSubscription ? (
                /* ── Live but locked (no subscription) ── */
                <>
                  {/* Blurred static background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 to-black" />
                  <span className="absolute top-4 left-4 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    LIVE NOW
                  </span>
                  {/* Lock overlay */}
                  <div className="relative z-10 px-6 text-center">
                    <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 border-2 rounded-full border-white/20 bg-white/5">
                      <svg className="w-7 h-7 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <p className="mb-1 text-sm tracking-widest text-white uppercase font-f1">
                      Subscription Required
                    </p>
                    <p className="mb-5 text-xs text-white/50">
                      {isLoggedIn
                        ? "Upgrade your plan to watch live streams"
                        : "Sign in and subscribe to watch live streams"}
                    </p>
                    <Link
                      to={isLoggedIn ? "/store" : "/login"}
                      className="font-f1 text-xs uppercase tracking-widest border border-white px-5 py-2.5 hover:bg-gray-500 hover:text-black transition"
                    >
                      {isLoggedIn ? "Get Subscription" : "Sign In"}
                    </Link>
                  </div>
                </>

              ) : (
                /* ── Stream offline ── */
                <div className="px-6 text-center">
                  <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 border rounded-full border-white/10 bg-white/5">
                    <svg className="w-7 h-7 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm tracking-widest uppercase font-f1 text-white/40">
                    No Stream Live
                  </p>
                  <p className="mt-2 text-xs text-white/30">
                    Check upcoming events on the right →
                  </p>
                </div>
              )}
            </div>

            {/* Stream info */}
            <div className="p-6">
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="w-2/3 h-5" />
                  <Skeleton className="w-full h-3" />
                  <Skeleton className="w-4/5 h-3" />
                </div>
              ) : (
                <>
                  <h3 className="mb-2 text-lg uppercase font-f1">
                    {stream?.name || "F1 Air Network"}
                  </h3>
                  <p className="mb-6 text-sm text-white/70">
                    {stream?.description || "Live race coverage with multi-angle views, real-time telemetry, and pit lane insights."}
                  </p>

                  {/* Join button — only shown when stream is live */}
                  {isLive && (
                    <Link
                      to="/livestream"
                      className="inline-block px-6 py-3 tracking-widest text-white uppercase transition bg-gray-700 rounded-md font-f1 md:px-8 md:py-4 hover:bg-gray-500 hover:text-black"
                    >
                      {hasSubscription ? "Join Live Stream" : "View Stream"}
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── RIGHT: Upcoming events ─────────────────────────────────── */}
          <div className="p-6 border border-white/15 bg-black/40 backdrop-blur-md">
            <h3 className="mb-6 text-lg tracking-widest uppercase font-f1">
              Upcoming Events
            </h3>

            {loading ? (
              <div className="space-y-4">
                {[1,2,3,4,5].map((i) => (
                  <div key={i} className="flex items-center justify-between pb-4 border-b border-white/10">
                    <Skeleton className="w-1/2 h-3" />
                    <Skeleton className="w-24 h-6" />
                  </div>
                ))}
              </div>
            ) : events.length === 0 ? (
              <p className="py-8 text-sm text-center text-white/30">
                No upcoming events scheduled.
              </p>
            ) : (
              <ul className="space-y-4">
                {events.map((event) => (
                  <li
                    key={event._id}
                    className="flex items-center justify-between pb-4 border-b border-white/10 last:border-b-0"
                  >
                    <div className="flex flex-col gap-0.5 pr-3">
                      <span className="text-sm leading-snug">{event.name}</span>
                      {event.series && (
                        <span className="text-white/30 text-[10px] uppercase tracking-wider">{event.series}</span>
                      )}
                    </div>
                    <span className={`text-xs border px-3 py-1 uppercase tracking-wider whitespace-nowrap shrink-0 ${
                      event.status === "live"
                        ? "border-red-500 text-red-400 bg-red-500/10"
                        : "border-white text-white"
                    }`}>
                      {event.status === "live" ? "🔴 LIVE" : event.displayTime}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}