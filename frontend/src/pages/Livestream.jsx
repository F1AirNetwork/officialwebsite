import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import homeBg from "../assets/home-bg.png";
import { streamApi } from "../api/api.js";
import { useAuth } from "../context/AuthContext.jsx";

const Livestream = () => {
  const { user, token } = useAuth();
  const navigate        = useNavigate();

  const [stream, setStream]             = useState(null);  // stream metadata
  const [hlsUrl, setHlsUrl]             = useState(null);  // ONLY set after successful join
  const [sessionToken, setSessionToken] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [errorCode, setErrorCode]       = useState("");    // NO_SUBSCRIPTION | SCREEN_LIMIT_REACHED | STREAM_OFFLINE

  const streamIdRef    = useRef(null);
  const sessionRef     = useRef(null);
  const heartbeatTimer = useRef(null);
  const joiningRef     = useRef(false);  // prevents double-join in React StrictMode

  // ─── Load stream metadata ────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      setErrorCode("");
      setHlsUrl(null);        // always reset — never show URL from metadata
      setSessionToken(null);

      try {
        const res  = await streamApi.getAll(token);
        const list = Array.isArray(res.data) ? res.data : [res.data];
        const live = list.find((s) => s?.isLive) || list[0] || null;
        setStream(live);
        streamIdRef.current = live?._id || null;

        // ── Only join if: stream exists, is LIVE, and user is logged in ──
        if (live && live.isLive && token) {
          if (joiningRef.current) return; // prevent double-join (React StrictMode)
          joiningRef.current = true;
          try {
            const joinRes = await streamApi.join(
              live._id,
              { deviceInfo: navigator.userAgent },
              token
            );
            // Store hlsUrl if present (HLS mode), sessionToken always set on success
            setHlsUrl(joinRes.data.hlsUrl || null);
            setSessionToken(joinRes.data.sessionToken);
            sessionRef.current = joinRes.data.sessionToken;
          } catch (joinErr) {
            // Parse error code from backend
            let code = "";
            if (joinErr.message?.includes("subscription") || joinErr.message?.includes("NO_SUBSCRIPTION")) code = "NO_SUBSCRIPTION";
            else if (joinErr.message?.includes("SCREEN_LIMIT")) code = "SCREEN_LIMIT_REACHED";
            setErrorCode(code);
            setError(joinErr.message);
          } finally {
            joiningRef.current = false;
          }
        }
      } catch {
        setError("Failed to load stream.");
      } finally {
        setLoading(false);
      }
    };

    load();

    // ── Fire leave on page reload/close (beforeunload) ──────────────────
    const handleBeforeUnload = () => {
      if (sessionRef.current && streamIdRef.current) {
        const body = JSON.stringify({ sessionToken: sessionRef.current });
        const url  = `http://localhost:5000/api/livestream/${streamIdRef.current}/leave`;
        navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      joiningRef.current = false;
      if (heartbeatTimer.current) {
        clearInterval(heartbeatTimer.current);
        heartbeatTimer.current = null;
      }
      // Clear session ref immediately so re-mount starts fresh
      sessionRef.current = null;
    };
  }, [token]);

  // ─── Heartbeat every 15s ────────────────────
  useEffect(() => {
    if (!sessionToken || !streamIdRef.current) return;

    heartbeatTimer.current = setInterval(() => {
      streamApi
        .heartbeat(streamIdRef.current, { sessionToken }, token)
        .catch(() => {});
    }, 15000);

    return () => clearInterval(heartbeatTimer.current);
  }, [sessionToken, token]);

  // ─── Force rejoin — clears stale sessions then retries ─
  const forceRejoin = async () => {
    if (!stream?._id) return;
    setError("");
    setErrorCode("");
    setLoading(true);
    try {
      // Call leave with a dummy token to trigger cleanup on backend
      // Then re-run the full load which will clean dead sessions before joining
      await streamApi.leave(stream._id, { sessionToken: "force-clear" }, token).catch(() => {});
    } finally {
      // Re-run load — cleanDeadSessions runs first inside joinStream
      const res = await streamApi.getAll(token);
      const list = Array.isArray(res.data) ? res.data : [res.data];
      const live = list.find((s) => s?.isLive) || list[0] || null;
      setStream(live);
      streamIdRef.current = live?._id || null;
      if (live && live.isLive && token) {
        try {
          const joinRes = await streamApi.join(live._id, { deviceInfo: navigator.userAgent }, token);
          setHlsUrl(joinRes.data.hlsUrl);
          setSessionToken(joinRes.data.sessionToken);
          sessionRef.current = joinRes.data.sessionToken;
        } catch (joinErr) {
          let code = "";
          if (joinErr.message?.includes("subscription") || joinErr.message?.includes("NO_SUBSCRIPTION")) code = "NO_SUBSCRIPTION";
          else if (joinErr.message?.includes("SCREEN_LIMIT")) code = "SCREEN_LIMIT_REACHED";
          setErrorCode(code);
          setError(joinErr.message);
        }
      }
      setLoading(false);
    }
  };

  // ─── Derived state ──────────────────────────
  const isLive      = stream?.isLive ?? false;
  const isPlaying   = !!hlsUrl || (!!sessionToken && !!stream?.embedUrl); // show player if joined successfully
  const needsLogin  = !token && isLive;
  const needsSubSrciption = errorCode === "NO_SUBSCRIPTION";
  const screenLimit = errorCode === "SCREEN_LIMIT_REACHED";

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div
        className="fixed inset-0 z-0"
        style={{ backgroundImage: `url(${homeBg})`, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }}
      />
      <div className="fixed inset-0 z-10 bg-black/90" />

      <div className="relative z-20 px-6 pt-32 pb-32 lg:px-12">
        <div className="max-w-6xl mx-auto">

          <h1 className="mb-16 text-4xl tracking-widest text-center uppercase font-f1">
            Live Race Broadcast
          </h1>

          {/* ── Loading ── */}
          {loading && (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-2 border-white rounded-full border-t-transparent animate-spin" />
            </div>
          )}

          {!loading && (
            <>
              {/* ── CASE 1: No stream configured at all ── */}
              {!stream && (
                <StatusCard
                  icon="📡"
                  title="No Stream Configured"
                  subtitle="Check back soon for the next race broadcast."
                />
              )}

              {/* ── CASE 2: Stream configured but OFFLINE ── */}
              {stream && !isLive && (
                <StatusCard
                  icon="⏸"
                  title="Stream Offline"
                  subtitle="The broadcast hasn't started yet. Check back when the race is live."
                  badge="OFFLINE"
                  badgeColor="bg-white/10 text-white/50"
                />
              )}

              {/* ── CASE 3: Stream is LIVE but user not logged in ── */}
              {stream && isLive && needsLogin && (
                <StatusCard
                  icon="🔒"
                  title="Login Required"
                  subtitle="You need to log in to watch the live stream."
                  badge="LIVE"
                  badgeColor="bg-red-600 text-white"
                  action={{ label: "Login to Watch", onClick: () => navigate("/login") }}
                />
              )}

              {/* ── CASE 4: Logged in but no subscription ── */}
              {stream && isLive && token && needsSubSrciption && (
                <StatusCard
                  icon="🏎"
                  title="Subscription Required"
                  subtitle="You need an active subscription to watch the live stream."
                  badge="LIVE"
                  badgeColor="bg-red-600 text-white"
                  action={{ label: "Visit Store", onClick: () => navigate("/store") }}
                />
              )}

              {/* ── CASE 5: Screen limit reached ── */}
              {stream && isLive && token && screenLimit && (
                <div className="px-6 py-12 text-center">
                  <div className="mb-4 text-5xl">📺</div>
                  <span className="inline-block px-3 py-1 mb-4 text-xs font-bold tracking-widest text-white uppercase bg-red-600 rounded-full">LIVE</span>
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
                    If you closed the stream without signing out, click "Clear Stale Session & Retry" to resume.
                  </p>
                </div>
              )}

              {/* ── CASE 6: Other error ── */}
              {stream && isLive && token && error && !needsSubSrciption && !screenLimit && (
                <div className="px-6 py-4 mb-8 text-sm text-center text-red-400 border bg-red-500/10 border-red-500/30 rounded-xl">
                  {error}
                </div>
              )}

              {/* ── CASE 7: Successfully joined — show player ── */}
              {isPlaying && (
                <div className="mb-10 overflow-hidden border bg-black/60 border-white/10 rounded-xl backdrop-blur-md">
                  {/* LIVE badge */}
                  <div className="flex items-center gap-3 px-6 pt-5">
                    <span className="bg-red-600 text-white text-[10px] px-3 py-1 uppercase tracking-widest rounded-full font-bold">
                      ● LIVE
                    </span>
                    {stream?.viewerCount > 0 && (
                      <span className="text-xs text-white/40">
                        {stream.viewerCount} watching
                      </span>
                    )}
                  </div>

                  {/* Player */}
                  {stream.embedUrl ? (
                    <div style={{
                      position:      "relative",
                      width:         "100%",
                      paddingBottom: "56.25%",
                      background:    "#000",
                      overflow:      "hidden",
                    }}>
                      <iframe
                        id="player"
                        src={stream.embedUrl}
                        allowFullScreen
                        allow="encrypted-media; picture-in-picture; autoplay"
                        frameBorder="0"
                        scrolling="no"
                        style={{
                          position: "absolute",
                          top:      0,
                          left:     0,
                          width:    "100%",
                          height:   "100%",
                          border:   "none",
                        }}
                      />
                    </div>
                  ) : (
                    <div style={{ position: "relative", paddingBottom: "56.25%" }}>
                      <div style={{ position: "absolute", inset: 0 }}
                        className="flex items-center justify-center text-sm bg-black text-white/40">
                        No embed URL configured — set one in the admin panel.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Stream info (shown whenever stream exists) ── */}
              {stream && (
                <div className="mt-4 text-center">
                  <h2 className="mb-3 text-2xl uppercase font-f1">
                    {stream.name || "F1 Air Live"}
                  </h2>
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

// ─── Reusable status card ────────────────────────
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

export default Livestream;