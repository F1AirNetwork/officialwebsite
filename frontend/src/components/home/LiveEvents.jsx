import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { eventApi, streamApi, featuredApi } from "../../api/api.js";
import { useAuth } from "../../context/AuthContext.jsx";

// ─── Skeleton loader ──────────────────────────────────────────────────────────
const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-white/5 rounded ${className}`} />
);

export default function LiveEvents() {
  const { token } = useAuth();

  const [featured, setFeatured] = useState(null);  // admin-configured featured data
  const [anyLive, setAnyLive]   = useState(false);  // is any stream currently live?
  const [events, setEvents]     = useState([]);      // upcoming events list
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      // Fetch featured config (public, no auth needed)
      try {
        const res = await featuredApi.get();
        setFeatured(res.data || null);
      } catch (_) {
        setFeatured(null);
      }

      // Check if any stream is live (for the LIVE badge)
      try {
        const streamRes = await streamApi.getAll(token || null);
        const list = Array.isArray(streamRes.data) ? streamRes.data : [streamRes.data];
        setAnyLive(list.some((s) => s?.isLive));
      } catch (_) {
        setAnyLive(false);
      }

      // Fetch upcoming events
      try {
        const evRes = await eventApi.getAll();
        const all   = evRes.data?.events || [];
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

  // Derive display values from featured config
  const isActive    = featured?.isActive !== false;
  const title       = featured?.title || "F1 Air Network";
  const subtitle    = featured?.subtitle || "Live race coverage with multi-angle views, real-time telemetry, and pit lane insights.";
  const thumbnail   = featured?.thumbnail || "";
  const showButton  = featured?.showButton !== false;
  const buttonText  = featured?.buttonText || "Join Live Stream";
  const buttonLink  = featured?.buttonLink || "/livestream";

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

          {/* ── LEFT: Featured stream thumbnail ──────────────────────── */}
          <div className="border lg:col-span-2 border-white/15 bg-black/60 backdrop-blur-md">

            {/* Thumbnail area */}
            <div className="relative flex items-center justify-center overflow-hidden bg-black aspect-video">

              {loading ? (
                <Skeleton className="absolute inset-0 rounded-none" />
              ) : thumbnail ? (
                /* ── Thumbnail image ── */
                <>
                  <img
                    src={thumbnail}
                    alt={title}
                    className="object-cover w-full h-full"
                  />
                  {/* Gradient overlay for readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                </>
              ) : (
                /* ── No thumbnail placeholder ── */
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

              {/* LIVE badge — shown when any stream is actually live */}
              {!loading && anyLive && (
                <span className="absolute top-4 left-4 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 z-10">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  LIVE NOW
                </span>
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
                    {title}
                  </h3>
                  <p className="mb-6 text-sm text-white/70">
                    {subtitle}
                  </p>

                  {/* CTA button */}
                  {showButton && (
                    <Link
                      to={buttonLink}
                      className="inline-block px-6 py-3 tracking-widest text-white uppercase transition bg-gray-700 rounded-md font-f1 md:px-8 md:py-4 hover:bg-gray-500 hover:text-black"
                    >
                      {buttonText}
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