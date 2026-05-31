import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Hls from "hls.js";
import homeBg from "../assets/home-bg.png";
import { streamApi } from "../api/api.js";
import { useAuth } from "../context/AuthContext.jsx";

const LivestreamPlayer = () => {
  const { id }    = useParams();
  const { token } = useAuth();
  const navigate  = useNavigate();

  const [stream, setStream]             = useState(null);
  const [hlsUrl, setHlsUrl]             = useState(null);
  const [sessionToken, setSessionToken] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [errorCode, setErrorCode]       = useState(""); // NO_SUBSCRIPTION | SCREEN_LIMIT_REACHED | PRODUCT_REQUIRED
  const [requiredProduct, setRequiredProduct] = useState(null); // { _id, name, slug }
  const [isFullscreen, setIsFullscreen] = useState(false);

  const videoRef            = useRef(null);
  const hlsRef              = useRef(null);
  const sessionRef          = useRef(null);
  const heartbeatTimer      = useRef(null);
  const joiningRef          = useRef(false);
  const playerContainerRef  = useRef(null);

  // ─── Fullscreen toggle ──────────────────────
  const toggleFullscreen = useCallback(async () => {
    const container = playerContainerRef.current;
    if (!container) return;

    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Fullscreen not supported or denied
    }
  }, []);

  // ─── Listen for fullscreen changes ──────────
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // ─── Keyboard shortcuts: F = toggle, Escape = exit ──
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input or textarea
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || document.activeElement?.isContentEditable) return;

      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleFullscreen]);

  // ─── Load stream + join ──────────────────────
  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);
      setError("");
      setErrorCode("");
      setHlsUrl(null);
      setSessionToken(null);

      try {
        const res  = await streamApi.getById(id, token);
        const live = res.data;
        if (alive) setStream(live);

        if (live?.isLive && token) {
          if (joiningRef.current) return;
          joiningRef.current = true;
          try {
            const joinRes = await streamApi.join(id, { deviceInfo: navigator.userAgent }, token);
            if (alive) {
              setHlsUrl(joinRes.data.hlsUrl || null);
              setSessionToken(joinRes.data.sessionToken);
              sessionRef.current = joinRes.data.sessionToken;
            }
          } catch (joinErr) {
            const msg = joinErr.message || "";
            let code  = "";
            if (msg.includes("subscription") || msg.includes("NO_SUBSCRIPTION")) code = "NO_SUBSCRIPTION";
            else if (msg.includes("SCREEN_LIMIT"))                                code = "SCREEN_LIMIT_REACHED";
            if (alive) { setErrorCode(code); setError(joinErr.message); }
          } finally {
            joiningRef.current = false;
          }
        }
      } catch {
        if (alive) setError("Failed to load stream.");
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();

    // Leave on page close / refresh
    const handleBeforeUnload = () => {
      if (sessionRef.current) {
        const body = JSON.stringify({ sessionToken: sessionRef.current });
        const url  = `${import.meta.env.VITE_API_BASE_URL || "https://f1-air.onrender.com/api"}/livestream/${id}/leave`;
        navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      alive = false;
      joiningRef.current = false;
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
      if (sessionRef.current) {
        streamApi.leave(id, { sessionToken: sessionRef.current }, token).catch(() => {});
        sessionRef.current = null;
      }
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
  }, [id, token]);

  // ─── Heartbeat every 15s ────────────────────
  useEffect(() => {
    if (!sessionToken) return;
    heartbeatTimer.current = setInterval(() => {
      streamApi.heartbeat(id, { sessionToken }, token).catch(() => {});
    }, 15000);
    return () => clearInterval(heartbeatTimer.current);
  }, [sessionToken, id, token]);

  // ─── HLS player ─────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsUrl) return;
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    if (Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsUrl;
    }
    return () => { hlsRef.current?.destroy(); };
  }, [hlsUrl]);

  // ─── Force rejoin (clear stale session) ─────
  const forceRejoin = async () => {
    setError("");
    setErrorCode("");
    setLoading(true);
    try {
      await streamApi.leave(id, { sessionToken: "force-clear" }, token).catch(() => {});
      const joinRes = await streamApi.join(id, { deviceInfo: navigator.userAgent }, token);
      setHlsUrl(joinRes.data.hlsUrl || null);
      setSessionToken(joinRes.data.sessionToken);
      sessionRef.current = joinRes.data.sessionToken;
    } catch (joinErr) {
      const msg = joinErr.message || "";
      let code  = "";
      if (msg.includes("subscription") || msg.includes("NO_SUBSCRIPTION")) code = "NO_SUBSCRIPTION";
      else if (msg.includes("SCREEN_LIMIT"))                                code = "SCREEN_LIMIT_REACHED";
      setErrorCode(code);
      setError(joinErr.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Derived state ───────────────────────────
  const isLive          = stream?.isLive ?? false;
  const isPlaying       = !!sessionToken && (!!hlsUrl || !!stream?.embedUrl);
  const needsLogin      = !token && isLive;
  const needsSub        = errorCode === "NO_SUBSCRIPTION";
  const screenLimit     = errorCode === "SCREEN_LIMIT_REACHED";
  const needsProduct    = errorCode === "PRODUCT_REQUIRED";
  // Populate requiredProduct from stream metadata (populated by backend)
  const reqProduct      = stream?.requiredProductId ?? null;

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div
        className="fixed inset-0 z-0"
        style={{ backgroundImage: `url(${homeBg})`, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }}
      />
      <div className="fixed inset-0 z-10 bg-black/90" />

      <div className="relative z-20 px-6 pb-32 pt-28 lg:px-12">
        <div className="max-w-5xl mx-auto">

          {/* Back link */}
          <button
            onClick={() => navigate("/livestream")}
            className="flex items-center gap-2 mb-8 text-xs tracking-widest uppercase transition-colors text-white/40 hover:text-white font-f1"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            All Streams
          </button>

          {/* Loading */}
          {loading && (
            <div className="flex justify-center py-24">
              <div className="w-10 h-10 border-2 border-white rounded-full border-t-transparent animate-spin" />
            </div>
          )}

          {!loading && (
            <>
              {/* CASE 1: Not found */}
              {!stream && (
                <StatusCard icon="📡" title="Stream Not Found" subtitle="This stream doesn't exist or has been removed." />
              )}

              {/* CASE 2: Offline */}
              {stream && !isLive && (
                <StatusCard
                  icon="⏸"
                  title="Stream Offline"
                  subtitle="This broadcast hasn't started yet. Check back when the race is live."
                  badge="OFFLINE"
                  badgeColor="bg-white/10 text-white/50"
                />
              )}

              {/* CASE 3: Live but not logged in */}
              {stream && isLive && needsLogin && (
                <StatusCard
                  icon="🔒"
                  title="Login Required"
                  subtitle="You need to log in to watch this live stream."
                  badge="LIVE"
                  badgeColor="bg-red-600 text-white"
                  action={{ label: "Login to Watch", onClick: () => navigate("/login") }}
                />
              )}

              {/* CASE 4: No subscription */}
              {stream && isLive && token && needsSub && (
                <StatusCard
                  icon="🏎"
                  title="Subscription Required"
                  subtitle="You need an active subscription to watch this live stream."
                  badge="LIVE"
                  badgeColor="bg-red-600 text-white"
                  action={{ label: "Visit Store", onClick: () => navigate("/store") }}
                />
              )}

              {/* CASE 4.5: Product purchase required */}
              {stream && isLive && token && needsProduct && (
                <div className="p-12 mb-12 text-center border bg-white/5 border-white/10 rounded-xl">
                  <div className="mb-5 text-4xl">🛒</div>
                  <span className="inline-block px-3 py-1 mb-5 text-xs font-bold tracking-widest text-white uppercase bg-red-600 rounded-full">
                    LIVE
                  </span>
                  <h2 className="mb-3 text-xl tracking-widest uppercase font-f1">Purchase Required</h2>
                  <p className="max-w-md mx-auto mb-2 text-sm text-white/50">
                    This stream requires a specific product to watch.
                  </p>
                  {reqProduct?.name && (
                    <p className="mb-6 text-sm font-semibold text-white/80">
                      Required: <span className="text-brand">{reqProduct.name}</span>
                    </p>
                  )}
                  <button
                    onClick={() => navigate("/store")}
                    className="px-8 py-3 text-xs tracking-widest uppercase transition border font-f1 border-white/40 hover:bg-white hover:text-black"
                  >
                    Go to Store
                  </button>
                </div>
              )}

              {/* CASE 5: Screen limit */}
              {stream && isLive && token && screenLimit && (
                <div className="px-6 py-12 text-center">
                  <div className="mb-4 text-5xl">📺</div>
                  <span className="inline-block px-3 py-1 mb-4 text-xs font-bold tracking-widest text-white uppercase bg-red-600 rounded-full">
                    LIVE
                  </span>
                  <h2 className="mb-3 text-2xl tracking-wide uppercase font-f1">Screen Limit Reached</h2>
                  <p className="max-w-md mx-auto mb-6 text-sm text-white/50">
                    {error || "You're already watching on another device."}
                  </p>
                  <div className="flex flex-col justify-center gap-3 sm:flex-row">
                    <button
                      onClick={forceRejoin}
                      disabled={loading}
                      className="px-6 py-3 text-sm tracking-wider text-white uppercase transition rounded-lg bg-brand hover:bg-brand-dark font-f1 disabled:opacity-50"
                    >
                      {loading ? "Retrying..." : "Clear Stale Session & Retry"}
                    </button>
                    <button
                      onClick={() => navigate("/store")}
                      className="px-6 py-3 text-sm tracking-wider uppercase transition rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white/70 font-f1"
                    >
                      Buy Extra Screen
                    </button>
                  </div>
                  <p className="mt-4 text-xs text-white/30">
                    Closed the stream without signing out? Click "Clear Stale Session & Retry" to resume.
                  </p>
                </div>
              )}

              {/* CASE 6: Other error */}
              {stream && isLive && token && error && !needsSub && !screenLimit && (
                <div className="px-6 py-4 mb-8 text-sm text-center text-red-400 border bg-red-500/10 border-red-500/30 rounded-xl">
                  {error}
                </div>
              )}

              {/* CASE 7: Playing */}
              {isPlaying && (
                <div className="mb-8 overflow-hidden border bg-black/60 border-white/10 rounded-2xl backdrop-blur-md">
                  {/* Top bar — hidden in fullscreen */}
                  {!isFullscreen && (
                    <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-4 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <span className="bg-red-600 text-white text-[10px] px-3 py-1 uppercase tracking-widest rounded-full font-bold flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                          LIVE
                        </span>
                        <h2 className="text-sm font-semibold tracking-widest uppercase font-f1 text-white/80">
                          {stream?.name}
                        </h2>
                      </div>
                      {stream?.viewers > 0 && (
                        <span className="text-xs text-white/30">{stream.viewers} watching</span>
                      )}
                    </div>
                  )}

                  {/* Player container — THIS is what goes fullscreen (not the iframe) */}
                  <div
                    ref={playerContainerRef}
                    style={{
                      position: "relative",
                      width: "100%",
                      paddingBottom: isFullscreen ? "0" : "56.25%",
                      height: isFullscreen ? "100vh" : undefined,
                      background: "#000",
                    }}
                  >
                    {hlsUrl ? (
                      <video
                        ref={videoRef}
                        controls
                        autoPlay
                        playsInline
                        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
                      />
                    ) : stream?.embedUrl ? (
                      <iframe
                        src={stream.embedUrl}
                        /* No allowFullScreen — prevents the iframe from going fullscreen
                           on its own, which would reveal the embed source domain. */
                        allow="encrypted-media; picture-in-picture; autoplay"
                        frameBorder="0"
                        scrolling="no"
                        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                      />
                    ) : (
                      <div
                        style={{ position: "absolute", inset: 0 }}
                        className="flex items-center justify-center text-sm bg-black text-white/30"
                      >
                        No playback URL configured — set one in the admin panel.
                      </div>
                    )}

                    {/* Custom fullscreen toggle button */}
                    <button
                      onClick={toggleFullscreen}
                      title={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"}
                      style={{
                        position: "absolute",
                        bottom: isFullscreen ? "20px" : "12px",
                        right: isFullscreen ? "20px" : "12px",
                        zIndex: 50,
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "8px 12px",
                        background: "rgba(0,0,0,0.75)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: "8px",
                        color: "#fff",
                        cursor: "pointer",
                        backdropFilter: "blur(8px)",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(255,255,255,0.15)";
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(0,0,0,0.75)";
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                      }}
                    >
                      {isFullscreen ? (
                        /* Minimize / exit-fullscreen icon (4 inward corners) */
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M8 3v3a2 2 0 0 1-2 2H3" />
                          <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
                          <path d="M3 16h3a2 2 0 0 1 2 2v3" />
                          <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
                        </svg>
                      ) : (
                        /* Fullscreen icon (4 outward corners) */
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                          <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                          <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                          <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                        </svg>
                      )}
                      <span style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        background: "rgba(255,255,255,0.12)",
                        padding: "2px 5px",
                        borderRadius: "4px",
                        letterSpacing: "0.5px",
                        lineHeight: 1,
                      }}>F</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Stream info */}
              {stream && (
                <div className="mt-6 text-center">
                  <h1 className="mb-2 text-2xl uppercase font-f1">{stream.name}</h1>
                  {stream.description && (
                    <p className="max-w-2xl mx-auto text-sm leading-relaxed text-white/50">
                      {stream.description}
                    </p>
                  )}
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </main>
  );
};

// ─── Status card ─────────────────────────────────
const StatusCard = ({ icon, title, subtitle, badge, badgeColor, action }) => (
  <div className="p-12 mb-12 text-center border bg-white/5 border-white/10 rounded-xl">
    <div className="mb-5 text-4xl">{icon}</div>
    {badge && (
      <span className={`inline-block text-xs px-3 py-1 uppercase tracking-widest rounded-full font-bold mb-5 ${badgeColor}`}>
        {badge}
      </span>
    )}
    <h2 className="mb-3 text-xl tracking-widest uppercase font-f1">{title}</h2>
    <p className="max-w-md mx-auto mb-6 text-sm text-white/50">{subtitle}</p>
    {action && (
      <button
        onClick={action.onClick}
        className="px-8 py-3 text-xs tracking-widest uppercase transition border font-f1 border-white/40 hover:bg-white hover:text-black"
      >
        {action.label}
      </button>
    )}
  </div>
);

export default LivestreamPlayer;