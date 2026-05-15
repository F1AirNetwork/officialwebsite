import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import homeBg from "../assets/home-bg.png";
import { streamApi } from "../api/api.js";
import { useAuth } from "../context/AuthContext.jsx";

const Livestream = () => {
  const { token } = useAuth();
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res  = await streamApi.getAll(token);
        const list = Array.isArray(res.data) ? res.data : [res.data].filter(Boolean);
        if (alive) setStreams(list);
      } catch {
        if (alive) setError("Failed to load streams.");
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, [token]);

  const liveStreams    = streams.filter((s) => s?.isLive);
  const offlineStreams = streams.filter((s) => !s?.isLive);

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage:    `url(${homeBg})`,
          backgroundSize:     "cover",
          backgroundPosition: "center",
          backgroundRepeat:   "no-repeat",
        }}
      />
      <div className="fixed inset-0 z-10 bg-black/90" />

      <div className="relative z-20 px-6 pt-32 pb-32 lg:px-12">
        <div className="max-w-6xl mx-auto">

          {/* Page header */}
          <h1 className="mb-3 text-4xl tracking-widest text-center uppercase font-f1">
            Live Race Broadcasts
          </h1>
          <p className="mb-16 text-sm text-center text-white/50">
            Choose a stream below to watch
          </p>

          {/* Loading */}
          {loading && (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-2 border-white rounded-full border-t-transparent animate-spin" />
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="px-6 py-4 mb-8 text-sm text-center text-red-400 border bg-red-500/10 border-red-500/30 rounded-xl">
              {error}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && streams.length === 0 && (
            <div className="p-12 text-center border bg-white/5 border-white/10 rounded-xl">
              <div className="mb-4 text-4xl">📡</div>
              <h2 className="mb-2 text-xl tracking-widest uppercase font-f1">No Streams Configured</h2>
              <p className="text-sm text-white/50">Check back soon for the next race broadcast.</p>
            </div>
          )}

          {/* ── LIVE streams section ── */}
          {!loading && liveStreams.length > 0 && (
            <section className="mb-16">
              <div className="flex items-center gap-3 mb-6">
                <span className="bg-red-600 text-white text-[10px] px-3 py-1 uppercase tracking-widest rounded-full font-bold">
                  ● LIVE NOW
                </span>
                <span className="text-xs tracking-widest uppercase text-white/40 font-f1">
                  {liveStreams.length} {liveStreams.length === 1 ? "stream" : "streams"} broadcasting
                </span>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {liveStreams.map((s) => (
                  <StreamCard key={s._id} stream={s} live />
                ))}
              </div>
            </section>
          )}

          {/* ── OFFLINE streams section ── */}
          {!loading && offlineStreams.length > 0 && (
            <section>
              {liveStreams.length > 0 && (
                <div className="flex items-center gap-3 mb-6">
                  <span className="bg-white/10 text-white/50 text-[10px] px-3 py-1 uppercase tracking-widest rounded-full font-bold">
                    OFFLINE
                  </span>
                  <span className="text-xs tracking-widest uppercase text-white/40 font-f1">
                    Coming up
                  </span>
                </div>
              )}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {offlineStreams.map((s) => (
                  <StreamCard key={s._id} stream={s} />
                ))}
              </div>
            </section>
          )}

        </div>
      </div>
    </main>
  );
};

// ─────────────────────────────────────────────────────────
//  Stream Card — styled like store product cards
// ─────────────────────────────────────────────────────────
const StreamCard = ({ stream, live = false }) => {
  return (
    <Link
      to={`/livestream/${stream._id}`}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 backdrop-blur-md ${
        live
          ? "bg-black/60 border-red-500/30 hover:border-red-500 hover:shadow-lg hover:shadow-red-500/10"
          : "bg-black/40 border-white/10 hover:border-white/30 hover:shadow-lg hover:shadow-white/5"
      }`}
    >
      {/* ── Thumbnail ── */}
      <div className="relative w-full overflow-hidden aspect-video bg-zinc-900">
        {stream.cardImage ? (
          <>
            <img
              src={stream.cardImage}
              alt={stream.name}
              className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          </>
        ) : (
          /* Fallback placeholder */
          <div className={`absolute inset-0 flex items-center justify-center ${
            live
              ? "bg-gradient-to-br from-red-900/30 via-zinc-900 to-black"
              : "bg-gradient-to-br from-zinc-800 to-zinc-950"
          }`}>
            <span className="text-4xl opacity-30">📡</span>
          </div>
        )}

        {/* Live / Offline badge over thumbnail */}
        {live ? (
          <div className="absolute flex items-center gap-2 top-3 left-3">
            <span className="flex items-center gap-1.5 bg-red-600 text-white text-[10px] px-2.5 py-1 uppercase tracking-widest rounded-full font-bold shadow-lg">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              LIVE
            </span>
            {stream.viewers > 0 && (
              <span className="bg-black/60 text-white/70 text-[10px] px-2.5 py-1 rounded-full backdrop-blur-sm">
                {stream.viewers} watching
              </span>
            )}
          </div>
        ) : (
          <div className="absolute top-3 left-3">
            <span className="bg-black/60 text-white/40 text-[10px] px-2.5 py-1 uppercase tracking-widest rounded-full backdrop-blur-sm font-bold">
              OFFLINE
            </span>
          </div>
        )}

        {/* Required product badge top-right */}
        {stream.requiredProductId?.name && (
          <div className="absolute top-3 right-3">
            <span className="text-[9px] tracking-widest uppercase border border-blue-400/40 text-blue-300 bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-sm">
              🛒 {stream.requiredProductId.name}
            </span>
          </div>
        )}
      </div>

      {/* ── Card body ── */}
      <div className="flex flex-col flex-1 p-5">
        <h3 className="mb-1 text-base font-bold leading-tight tracking-wide text-white uppercase truncate font-f1">
          {stream.name}
        </h3>

        {stream.description && (
          <p className="mb-4 text-xs leading-relaxed text-white/50 line-clamp-2">
            {stream.description}
          </p>
        )}

        {/* CTA row */}
        <div className={`mt-auto flex items-center justify-between pt-3 border-t ${
          live ? "border-red-500/20" : "border-white/10"
        }`}>
          <span className={`text-[11px] tracking-widest uppercase font-f1 transition-colors ${
            live
              ? "text-red-400 group-hover:text-red-300"
              : "text-white/40 group-hover:text-white/70"
          }`}>
            {live ? "Watch now →" : "View details →"}
          </span>

          {/* Arrow icon */}
          <span className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
            live
              ? "bg-red-600/20 text-red-400 group-hover:bg-red-600 group-hover:text-white"
              : "bg-white/5 text-white/30 group-hover:bg-white/10 group-hover:text-white/60"
          }`}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
};

export default Livestream;