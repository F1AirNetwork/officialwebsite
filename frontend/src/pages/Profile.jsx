import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import homeBg from "../assets/home-bg.png";
import { useAuth } from "../context/AuthContext.jsx";
import { orderApi } from "../api/api.js";

const Profile = () => {
  const { user, token, logout } = useAuth();
  const navigate                = useNavigate();
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    const load = async () => {
      try {
        const res  = await orderApi.getMyOrders(token);
        const list = Array.isArray(res.data) ? res.data : res.data?.orders || [];
        setOrders(list);
      } catch { setOrders([]); }
      finally  { setLoading(false); }
    };
    load();
  }, [token]);

  const handleLogout = async () => { await logout(); navigate("/"); };

  const activePaid   = orders.filter((o) => o.status === "paid");
  const initials     = user ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() : "";
  const hasActiveSub = user?.subscription?.status === "active";

  const statusColor = (s) => ({
    paid:      "bg-green-500/10 text-green-400 border-green-500/20",
    pending:   "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    failed:    "bg-red-500/10 text-red-400 border-red-500/20",
    refunded:  "bg-blue-500/10 text-blue-400 border-blue-500/20",
    cancelled: "bg-zinc-800 text-zinc-400 border-zinc-700",
  }[s] || "bg-zinc-800 text-zinc-400 border-zinc-700");

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-0 z-0"
        style={{ backgroundImage: `url(${homeBg})`, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }} />
      <div className="fixed inset-0 z-10 bg-black/90" />

      <div className="relative z-20 px-4 pt-32 pb-24 lg:px-8">
        <div className="max-w-3xl mx-auto space-y-8">

          {/* ── Profile header ── */}
          <div className="flex items-center gap-5 p-6 border bg-white/5 border-white/10 rounded-2xl backdrop-blur-md">
            <div className="flex items-center justify-center w-16 h-16 text-xl font-bold border rounded-full bg-white/10 border-white/20 shrink-0">
              {user?.avatar
                ? <img src={user.avatar} alt="" className="object-cover w-16 h-16 rounded-full" />
                : initials}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold tracking-wide text-white uppercase truncate font-f1">
                {user?.firstName} {user?.lastName}
              </h1>
              <p className="text-sm truncate text-white/50">{user?.email}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {hasActiveSub && (
                  <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                    ● {user.subscription.productName ?? "Pro"}
                  </span>
                )}
                <span className="text-[10px] border border-white/20 text-white/40 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {user?.role}
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
              Active Purchases · {activePaid.length}
            </h2>

            {loading ? (
              <div className="flex justify-center py-10">
                <div className="w-8 h-8 border-2 border-white rounded-full border-t-transparent animate-spin" />
              </div>
            ) : activePaid.length === 0 ? (
              <div className="p-8 text-center border bg-white/5 border-white/10 rounded-xl">
                <p className="mb-1 text-sm text-white/40">No active purchases yet.</p>
                <Link to="/store" className="text-xs tracking-widest uppercase text-brand hover:underline font-f1">
                  Visit the Store →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {activePaid.map((o) => (
                  <div key={o._id} className="flex items-center justify-between gap-4 px-5 py-4 transition-colors border bg-white/5 border-white/10 rounded-xl hover:border-white/20">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{o.productName}</p>
                      <p className="text-[10px] font-mono text-white/30 mt-0.5">
                        #{o._id.slice(-8).toUpperCase()} · {new Date(o.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-semibold text-white">
                        {o.amount === 0 ? "Free" : `$${o.amount}`}
                      </span>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-semibold uppercase tracking-wider ${statusColor(o.status)}`}>
                        {o.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── All orders ── */}
          {!loading && orders.length > activePaid.length && (
            <section>
              <h2 className="mb-4 text-xs tracking-widest uppercase text-white/40 font-f1">
                Order History
              </h2>
              <div className="space-y-2">
                {orders.filter((o) => o.status !== "paid").map((o) => (
                  <div key={o._id} className="flex items-center justify-between gap-4 px-5 py-3 border bg-white/[0.03] border-white/5 rounded-xl">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate text-white/60">{o.productName}</p>
                      <p className="text-[10px] font-mono text-white/20">#{o._id.slice(-8).toUpperCase()}</p>
                    </div>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-semibold uppercase tracking-wider ${statusColor(o.status)}`}>
                      {o.status}
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
                <p className="text-sm font-semibold text-white transition-colors group-hover:text-white">Watch Live</p>
                <p className="text-xs text-white/40">Go to livestream</p>
              </div>
            </Link>
            <Link to="/store"
              className="flex items-center gap-3 p-4 transition-colors border bg-white/5 border-white/10 rounded-xl hover:border-white/20 group">
              <span className="text-xl">🛒</span>
              <div>
                <p className="text-sm font-semibold text-white transition-colors group-hover:text-white">Store</p>
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