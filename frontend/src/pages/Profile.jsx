import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import homeBg from "../assets/home-bg.png";
import { useAuth } from "../context/AuthContext.jsx";

const Profile = () => {
  const { user, token, logout } = useAuth();
  const navigate                = useNavigate();

  useEffect(() => {
    if (!token) navigate("/login");
  }, [token]);

  const handleLogout = async () => { await logout(); navigate("/"); };

  // Read directly from user.purchasedProducts — no extra fetch needed
  const activePurchases   = (user?.purchasedProducts || []).filter((p) => p.status === "active");
  const cancelledPurchases = (user?.purchasedProducts || []).filter((p) => p.status !== "active");
  const initials          = user ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() : "";
  const hasActiveSub      = user?.subscription?.status === "active";

  const statusColor = (s) => ({
    active:    "bg-green-500/10 text-green-400 border-green-500/20",
    cancelled: "bg-zinc-800 text-zinc-400 border-zinc-700",
    refunded:  "bg-blue-500/10 text-blue-400 border-blue-500/20",
  }[s] || "bg-zinc-800 text-zinc-400 border-zinc-700");

  if (!user) return null;

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-0 z-0"
        style={{ backgroundImage: `url(${homeBg})`, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }} />
      <div className="fixed inset-0 z-10 bg-black/90" />

      <div className="relative z-20 px-4 pt-32 pb-24 lg:px-8">
        <div className="max-w-3xl mx-auto space-y-8">

          {/* ── Profile header ── */}
          <div className="flex items-center gap-5 p-6 border bg-white/5 border-white/10 rounded-2xl backdrop-blur-md">
            <div className="flex items-center justify-center w-16 h-16 overflow-hidden text-xl font-bold border rounded-full bg-white/10 border-white/20 shrink-0">
              {user.avatar
                ? <img src={user.avatar} alt="" className="object-cover w-16 h-16 rounded-full" />
                : initials}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold tracking-wide text-white uppercase truncate font-f1">
                {user.firstName} {user.lastName}
              </h1>
              <p className="text-sm truncate text-white/50">{user.email}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {hasActiveSub && (
                  <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                    ● {user.subscription.productName ?? "Pro"}
                  </span>
                )}
                <span className="text-[10px] border border-white/20 text-white/40 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {user.role}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-xs tracking-widest uppercase transition-colors border rounded-lg shrink-0 border-white/20 text-white/50 hover:border-red-500/50 hover:text-red-400 font-f1"
            >
              Sign Out
            </button>
          </div>

          {/* ── Active purchases ── */}
          <section>
            <h2 className="mb-4 text-xs tracking-widest uppercase text-white/40 font-f1">
              Active Purchases · {activePurchases.length}
            </h2>

            {activePurchases.length === 0 ? (
              <div className="p-8 text-center border bg-white/5 border-white/10 rounded-xl">
                <p className="mb-1 text-sm text-white/40">No active purchases yet.</p>
                <Link to="/store" className="text-xs tracking-widest uppercase text-brand hover:underline font-f1">
                  Visit the Store →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {activePurchases.map((p) => (
                  <div key={p._id} className="flex items-center justify-between gap-4 px-5 py-4 transition-colors border bg-white/5 border-white/10 rounded-xl hover:border-white/20">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{p.productName}</p>
                      <p className="text-[10px] font-mono text-white/30 mt-0.5">
                        #{p.orderId?.toString().slice(-8).toUpperCase()} · {new Date(p.purchasedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-semibold uppercase tracking-wider ${statusColor(p.status)}`}>
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Cancelled / past purchases ── */}
          {cancelledPurchases.length > 0 && (
            <section>
              <h2 className="mb-4 text-xs tracking-widest uppercase text-white/40 font-f1">
                Past Purchases
              </h2>
              <div className="space-y-2">
                {cancelledPurchases.map((p) => (
                  <div key={p._id} className="flex items-center justify-between gap-4 px-5 py-3 border bg-white/[0.03] border-white/5 rounded-xl">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate text-white/60">{p.productName}</p>
                      <p className="text-[10px] font-mono text-white/20">#{p.orderId?.toString().slice(-8).toUpperCase()}</p>
                    </div>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-semibold uppercase tracking-wider ${statusColor(p.status)}`}>
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Quick links ── */}
          <section className="grid grid-cols-2 gap-3">
            <Link to="/livestream"
              className="flex items-center gap-3 p-4 transition-colors border bg-white/5 border-white/10 rounded-xl hover:border-white/20 group">
              <span className="text-xl">📺</span>
              <div>
                <p className="text-sm font-semibold text-white">Watch Live</p>
                <p className="text-xs text-white/40">Go to livestream</p>
              </div>
            </Link>
            <Link to="/store"
              className="flex items-center gap-3 p-4 transition-colors border bg-white/5 border-white/10 rounded-xl hover:border-white/20 group">
              <span className="text-xl">🛒</span>
              <div>
                <p className="text-sm font-semibold text-white">Store</p>
                <p className="text-xs text-white/40">Browse products</p>
              </div>
            </Link>
          </section>

        </div>
      </div>
    </main>
  );
};

export default Profile;