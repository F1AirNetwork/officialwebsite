import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { userApi, productApi } from "../api/api.js";
import {
  Monitor, ChevronLeft, ChevronRight, RefreshCw,
  Search, Shield, User as UserIcon, Chrome, Ban,
  Gift, XCircle, ShieldCheck, ShieldOff, Trash2,
} from "lucide-react";
import Badge from "../components/ui/Badge.jsx";
import Spinner from "../components/ui/Spinner.jsx";
import Modal from "../components/ui/Modal.jsx";

// ─── Small action button ──────────────────────
const ActionBtn = ({ onClick, icon: Icon, label, danger, muted }) => (
  <button
    onClick={onClick}
    title={label}
    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg font-medium transition-colors ${
      danger
        ? "bg-red-500/10 hover:bg-red-500/20 text-red-400"
        : muted
        ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-400"
        : "bg-brand/10 hover:bg-brand/20 text-brand"
    }`}
  >
    <Icon size={12} /> {label}
  </button>
);

export default function Users() {
  const { token } = useAuth();

  const [users, setUsers]             = useState([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch]           = useState("");
  const [loading, setLoading]         = useState(true);
  const [msg, setMsg]                 = useState(null);

  // Modals
  const [detailUser, setDetailUser]   = useState(null);   // user detail
  const [detailLoading, setDetailLoading] = useState(false);
  const [banModal, setBanModal]       = useState(null);    // { user }
  const [banReason, setBanReason]     = useState("");
  const [giftModal, setGiftModal]     = useState(null);    // { user }
  const [products, setProducts]       = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [giftNote, setGiftNote]       = useState("");

  const [actioning, setActioning]     = useState(false);
  const [currencyModal, setCurrencyModal] = useState(null);    // { user }
  const [currencyForm, setCurrencyForm]   = useState({ currency: "USD", country: "" });

  const flash = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 4000); };

  // ─── Load users ────────────────────────────
  const load = useCallback(async (p = 1, q = search) => {
    setLoading(true);
    try {
      const params = `?page=${p}&limit=20${q ? `&search=${encodeURIComponent(q)}` : ""}`;
      const res = await userApi.getAll(token, params);
      setUsers(res.data?.users || []);
      setTotal(res.data?.total || 0);
      setTotalPages(res.data?.pages || 1);
      setPage(p);
    } catch (err) {
      flash("error", err.message);
    } finally {
      setLoading(false);
    }
  }, [token, search]);

  useEffect(() => { load(1, ""); }, [token]);

  const handleSearch = () => { setSearch(searchInput); load(1, searchInput); };
  const clearSearch  = () => { setSearchInput(""); setSearch(""); load(1, ""); };

  // ─── Open detail modal ──────────────────────
  const openDetail = async (user) => {
    setDetailUser(user);
    setDetailLoading(true);
    try {
      const res = await userApi.getById(user._id, token);
      setDetailUser(res.data);
    } catch { /* keep list data */ }
    finally { setDetailLoading(false); }
  };

  // ─── Role toggle ────────────────────────────
  const handleRoleToggle = async (user) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    if (!confirm(`Set ${user.firstName} ${user.lastName} as "${newRole}"?`)) return;
    setActioning(true);
    try {
      await userApi.updateRole(user._id, { role: newRole }, token);
      flash("success", `Role updated to '${newRole}'.`);
      load(page, search);
      if (detailUser?._id === user._id) setDetailUser((u) => ({ ...u, role: newRole }));
    } catch (err) { flash("error", err.message); }
    finally { setActioning(false); }
  };

  // ─── Ban / Unban ────────────────────────────
  const openBanModal = (user) => { setBanReason(""); setBanModal({ user }); };

  const handleBan = async (overrideUser = null) => {
    const user = overrideUser || banModal?.user;
    if (!user) return;
    const willBan = !user.isBanned;
    if (willBan && !banReason.trim()) return flash("error", "Please enter a ban reason.");
    setActioning(true);
    try {
      await userApi.ban(user._id, { isBanned: willBan, reason: banReason }, token);
      flash("success", `User ${willBan ? "banned" : "unbanned"} successfully.`);
      setBanModal(null);
      load(page, search);
      if (detailUser?._id === user._id) setDetailUser((u) => ({ ...u, isBanned: willBan, banReason: "" }));
    } catch (err) { flash("error", err.message); }
    finally { setActioning(false); }
  };

  // ─── Remove subscription ────────────────────
  const handleRemoveSub = async (user) => {
    if (!confirm(`Remove ${user.firstName}'s active subscription? This takes effect immediately.`)) return;
    setActioning(true);
    try {
      await userApi.removeSubscription(user._id, token);
      flash("success", "Subscription removed.");
      load(page, search);
      if (detailUser?._id === user._id) {
        setDetailUser((u) => ({ ...u, subscription: { ...u.subscription, status: "cancelled" } }));
      }
    } catch (err) { flash("error", err.message); }
    finally { setActioning(false); }
  };

  // ─── Gift product ────────────────────────────
  const openGiftModal = async (user) => {
    setSelectedProduct("");
    setGiftNote("");
    setGiftModal({ user });
    if (products.length === 0) {
      try {
        const res = await productApi.getAll(token);
        setProducts((res.data?.products || []).filter((p) => p.isActive));
      } catch { flash("error", "Could not load products."); }
    }
  };

  const handleGift = async () => {
    if (!selectedProduct) return flash("error", "Please select a product to gift.");
    setActioning(true);
    try {
      const res = await userApi.gift(giftModal.user._id, { productId: selectedProduct, note: giftNote }, token);
      flash("success", res.message || "Product gifted successfully!");
      setGiftModal(null);
      load(page, search);
    } catch (err) { flash("error", err.message); }
    finally { setActioning(false); }
  };

  // ─── Currency modal ─────────────────────────
  const INR_SET = new Set(["IN","NP","BD","LK","BT","PK","MM","TH","KH","LA","VN","ID","MY","PH","SG"]);
  const EUR_SET = new Set(["AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE","NO","IS","LI","CH","AL","BA","ME","MK","RS"]);
  const deriveCurrency = (c) => INR_SET.has(c) ? "INR" : EUR_SET.has(c) ? "EUR" : "USD";

  const openCurrencyModal = (u) => {
    setCurrencyForm({ currency: u.currency || "USD", country: u.country || "" });
    setCurrencyModal({ user: u });
  };

  const handleCurrencyUpdate = async () => {
    setActioning(true);
    try {
      // Only send non-empty fields
      const payload = { currency: currencyForm.currency };
      if (currencyForm.country?.trim()) payload.country = currencyForm.country.trim();
      await userApi.updateCurrency(currencyModal.user._id, payload, token);
      flash("success", `Currency updated to ${currencyForm.currency}.`);
      setCurrencyModal(null);
      load(page, search);
    } catch (err) { flash("error", err.message); }
    finally { setActioning(false); }
  };

  // ─── Helpers ────────────────────────────────
  const authBadge = (user) => user.googleId
    ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20"><Chrome size={10} /> Google</span>
    : <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-700/50 text-zinc-400 border border-zinc-700"><UserIcon size={10} /> Email</span>;

  const Avatar = ({ user, size = "sm" }) => {
    const dim = size === "lg" ? "w-14 h-14 text-lg" : "w-8 h-8 text-xs";
    return user.avatar
      ? <img src={user.avatar} alt="" className={`${dim} rounded-full object-cover shrink-0`} />
      : <div className={`${dim} rounded-full bg-zinc-700 flex items-center justify-center font-bold text-zinc-300 shrink-0`}>
          {user.firstName?.[0]}{user.lastName?.[0]}
        </div>;
  };

  const inputCls = "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-brand transition-colors";

  // ─── Render ─────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl tracking-wide text-white font-display">USERS</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {total} verified {total === 1 ? "user" : "users"}
          </p>
        </div>
        <button onClick={() => load(page, search)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors border rounded-lg bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Flash */}
      {msg && (
        <div className={`rounded-xl px-5 py-3 text-sm font-medium border ${msg.type === "success"
          ? "bg-green-500/10 text-green-400 border-green-500/20"
          : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
          {msg.text}
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search by name or email..."
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-brand transition-colors"
          />
        </div>
        <button onClick={handleSearch}
          className="px-4 py-2.5 bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-lg transition-colors">
          Search
        </button>
        {search && (
          <button onClick={clearSearch}
            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-colors">
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto border bg-zinc-900 border-zinc-800 rounded-xl">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Spinner size={28} /></div>
        ) : (
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-zinc-800">
                {["User", "Email", "Auth", "Status", "Subscription", "Screens", "Joined", "Actions"].map((h) => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold tracking-wider text-left uppercase text-zinc-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {users.length === 0 ? (
                <tr><td colSpan={8} className="px-5 text-sm text-center py-14 text-zinc-500">
                  {search ? `No users matching "${search}"` : "No users found"}
                </td></tr>
              ) : users.map((u) => (
                <tr key={u._id} className={`hover:bg-zinc-800/30 transition-colors ${u.isBanned ? "opacity-60" : ""}`}>

                  {/* Avatar + name */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar user={u} />
                        {u.isBanned && (
                          <div className="absolute flex items-center justify-center w-4 h-4 bg-red-500 rounded-full -bottom-1 -right-1" title="Banned">
                            <Ban size={8} className="text-white" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white whitespace-nowrap">
                          {u.firstName} {u.lastName}
                        </p>
                        <p className="text-zinc-600 text-[10px] font-mono">{u._id.slice(-8)}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4 text-sm text-zinc-400">{u.email}</td>
                  <td className="px-5 py-4">{authBadge(u)}</td>

                  {/* Status — role + ban */}
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1">
                      <Badge color={u.role === "admin" ? "brand" : "zinc"} dot>{u.role}</Badge>
                      {u.isBanned && <Badge color="red" dot>Banned</Badge>}
                    </div>
                  </td>

                  {/* Subscription + Currency */}
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1">
                      {u.subscription?.status === "active" ? (
                        <>
                          <Badge color="green" dot>Active</Badge>
                          <p className="text-zinc-500 text-[10px] truncate max-w-[110px]">{u.subscription.productName}</p>
                        </>
                      ) : (
                        <span className="text-xs text-zinc-600">None</span>
                      )}
                      {/* Currency badge — click to override */}
                      <button
                        onClick={() => openCurrencyModal(u)}
                        title="Override currency"
                        className="self-start mt-0.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors"
                      >
                        <span className="text-[10px] font-mono text-brand">
                          {u.currency === "INR" ? "₹" : u.currency === "EUR" ? "€" : "$"} {u.currency || "USD"}
                        </span>
                      </button>
                    </div>
                  </td>

                  {/* Screens */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <Monitor size={13} className="text-brand" />
                      <span className="text-sm font-semibold text-white">{u.totalScreens ?? 0}</span>
                    </div>
                  </td>

                  {/* Joined */}
                  <td className="px-5 py-4 text-xs text-zinc-500 whitespace-nowrap">
                    {new Date(u.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <ActionBtn onClick={() => openDetail(u)} icon={UserIcon} label="View" muted />
                      <ActionBtn onClick={() => openGiftModal(u)} icon={Gift} label="Gift" />
                      {u.subscription?.status === "active" && (
                        <ActionBtn onClick={() => handleRemoveSub(u)} icon={XCircle} label="Sub" danger />
                      )}
                      <ActionBtn
                        onClick={() => u.isBanned ? handleBan(u) : openBanModal(u)}
                        icon={u.isBanned ? ShieldCheck : ShieldOff}
                        label={u.isBanned ? "Unban" : "Ban"}
                        danger={!u.isBanned}
                        muted={u.isBanned}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500">Page {page} of {totalPages} · {total} total</p>
          <div className="flex gap-2">
            <button onClick={() => load(page - 1, search)} disabled={page === 1}
              className="p-2 transition-colors border rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 border-zinc-700 text-zinc-300">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => load(page + 1, search)} disabled={page === totalPages}
              className="p-2 transition-colors border rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 border-zinc-700 text-zinc-300">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ══════════ DETAIL MODAL ══════════ */}
      <Modal open={!!detailUser} onClose={() => setDetailUser(null)} title="User Details" width="max-w-xl">
        {detailLoading ? (
          <div className="flex justify-center py-10"><Spinner size={28} /></div>
        ) : detailUser && (
          <div className="space-y-5">

            {/* Avatar + info */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar user={detailUser} size="lg" />
                {detailUser.isBanned && (
                  <div className="absolute flex items-center justify-center w-5 h-5 bg-red-500 rounded-full -bottom-1 -right-1">
                    <Ban size={10} className="text-white" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-lg font-semibold text-white">{detailUser.firstName} {detailUser.lastName}</p>
                <p className="text-sm text-zinc-400">{detailUser.email}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {authBadge(detailUser)}
                  <Badge color={detailUser.role === "admin" ? "brand" : "zinc"} dot>{detailUser.role}</Badge>
                  {detailUser.isBanned && <Badge color="red" dot>Banned</Badge>}
                </div>
              </div>
            </div>

            {detailUser.isBanned && detailUser.banReason && (
              <div className="px-4 py-3 border rounded-lg bg-red-500/10 border-red-500/20">
                <p className="mb-1 text-xs font-semibold tracking-wide text-red-400 uppercase">Ban Reason</p>
                <p className="text-sm text-red-300">{detailUser.banReason}</p>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total Screens", value: detailUser.totalScreens ?? 0 },
                { label: "Screen Purchases", value: detailUser.screenPurchases?.length ?? 0 },
                { label: "Recent Orders", value: detailUser.recentOrders?.length ?? 0 },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 text-center rounded-lg bg-zinc-800">
                  <p className="text-xl font-bold text-white">{value}</p>
                  <p className="text-zinc-500 text-xs mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Subscription */}
            <div className="p-4 rounded-lg bg-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold tracking-widest uppercase text-zinc-400">Subscription</p>
                {detailUser.subscription?.status === "active" && (
                  <button
                    onClick={() => { handleRemoveSub(detailUser); setDetailUser(null); }}
                    disabled={actioning}
                    className="flex items-center gap-1 text-xs text-red-400 transition-colors hover:text-red-300"
                  >
                    <XCircle size={12} /> Remove
                  </button>
                )}
              </div>
              {detailUser.subscription?.status === "active" ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{detailUser.subscription.productName}</p>
                    <p className="text-xs text-zinc-500">${detailUser.subscription.price}/month</p>
                  </div>
                  <Badge color="green" dot>Active</Badge>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">No active subscription</p>
              )}
            </div>

            {/* Recent orders */}
            {detailUser.recentOrders?.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold tracking-widest uppercase text-zinc-400">Recent Orders</p>
                <div className="space-y-2">
                  {detailUser.recentOrders.slice(0, 5).map((o) => (
                    <div key={o._id} className="bg-zinc-800 rounded-lg px-4 py-2.5 flex items-center justify-between">
                      <div>
                        <p className="flex items-center gap-2 text-xs font-medium text-white">
                          {o.productName}
                          {o.isGift && <span className="text-[10px] text-brand font-semibold">🎁 GIFT</span>}
                        </p>
                        <p className="text-zinc-500 text-[10px] font-mono">#{o._id.slice(-6).toUpperCase()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-white">{o.amount === 0 ? "Free" : `$${o.amount}`}</p>
                        <Badge color={o.status === "paid" ? "green" : o.status === "pending" ? "yellow" : "zinc"} dot>
                          {o.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-zinc-600">
              Joined {new Date(detailUser.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
            </p>

            {/* Detail actions */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-800">
              <button
                onClick={() => { handleRoleToggle(detailUser); setDetailUser(null); }}
                disabled={actioning}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors rounded-lg bg-brand/10 hover:bg-brand/20 text-brand"
              >
                <Shield size={14} />
                {detailUser.role === "admin" ? "Remove Admin" : "Make Admin"}
              </button>
              <button
                onClick={() => { setDetailUser(null); openGiftModal(detailUser); }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              >
                <Gift size={14} /> Gift Product
              </button>
              <button
                onClick={() => { setDetailUser(null); openBanModal(detailUser); }}
                disabled={actioning}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  detailUser.isBanned
                    ? "bg-green-500/10 hover:bg-green-500/20 text-green-400"
                    : "bg-red-500/10 hover:bg-red-500/20 text-red-400"
                }`}
              >
                {detailUser.isBanned ? <><ShieldCheck size={14} /> Unban</> : <><Ban size={14} /> Ban</>}
              </button>
              <button onClick={() => setDetailUser(null)}
                className="px-4 py-2 ml-auto text-sm transition-colors rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300">
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ══════════ CURRENCY MODAL ══════════ */}
      <Modal
        open={!!currencyModal}
        onClose={() => setCurrencyModal(null)}
        title={`Set Currency — ${currencyModal?.user?.firstName || ""} ${currencyModal?.user?.lastName || ""}`}
        width="max-w-sm"
      >
        {currencyModal && (
          <div className="space-y-4">
            {/* Current state */}
            <div className="flex items-center gap-3 px-4 py-3 text-sm rounded-lg bg-zinc-800/60">
              <span className="text-zinc-400">Current:</span>
              <span className="font-mono font-semibold text-white">
                {currencyModal.user.currency === "INR" ? "₹" : currencyModal.user.currency === "EUR" ? "€" : "$"} {currencyModal.user.currency || "USD"}
              </span>
              {currencyModal.user.country && (
                <span className="ml-auto text-xs text-zinc-500">Country: {currencyModal.user.country}</span>
              )}
            </div>

            {/* Country input — auto-updates currency */}
            <div>
              <label className="block mb-2 text-xs font-semibold tracking-widest uppercase text-zinc-400">
                Country Code <span className="font-normal normal-case text-zinc-600">(2 letters, auto-sets currency)</span>
              </label>
              <input
                value={currencyForm.country}
                maxLength={2}
                placeholder="e.g. IN, US, DE"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-brand transition-colors font-mono uppercase"
                onChange={(e) => {
                  const c = e.target.value.toUpperCase().slice(0, 2);
                  const derived = c.length === 2 ? deriveCurrency(c) : currencyForm.currency;
                  setCurrencyForm({ country: c, currency: derived });
                }}
              />
            </div>

            {/* Or manual override */}
            <div>
              <label className="block mb-2 text-xs font-semibold tracking-widest uppercase text-zinc-400">
                Currency Override
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { code: "USD", symbol: "$", label: "US Dollar"    },
                  { code: "INR", symbol: "₹", label: "Indian Rupee" },
                  { code: "EUR", symbol: "€", label: "Euro"         },
                ].map(({ code, symbol, label }) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setCurrencyForm((f) => ({ ...f, currency: code }))}
                    className={`flex flex-col items-center gap-0.5 py-2.5 rounded-lg border transition-colors ${
                      currencyForm.currency === code
                        ? "border-brand bg-brand/10 text-brand"
                        : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-500"
                    }`}
                  >
                    <span className="text-lg font-bold">{symbol}</span>
                    <span className="text-[10px] font-mono">{code}</span>
                    <span className="text-[9px] text-zinc-500">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2 border-t border-zinc-800">
              <button
                onClick={handleCurrencyUpdate}
                disabled={actioning}
                className="flex items-center gap-2 bg-brand hover:bg-brand-dark disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-all"
              >
                {actioning ? <Spinner size={14} /> : null} Save Currency
              </button>
              <button
                onClick={() => setCurrencyModal(null)}
                className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ══════════ BAN MODAL ══════════ */}
      <Modal
        open={!!banModal}
        onClose={() => setBanModal(null)}
        title={banModal?.user?.isBanned ? `Unban ${banModal?.user?.firstName}?` : `Ban ${banModal?.user?.firstName}?`}
        width="max-w-md"
      >
        {banModal && (
          <div className="space-y-4">
            {banModal.user.isBanned ? (
              <div className="px-4 py-3 border rounded-lg bg-green-500/10 border-green-500/20">
                <p className="text-sm text-green-400">
                  This will restore {banModal.user.firstName}'s access to the platform immediately.
                </p>
                {banModal.user.banReason && (
                  <p className="mt-1 text-xs text-green-300/70">Previous reason: {banModal.user.banReason}</p>
                )}
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border rounded-lg bg-red-500/10 border-red-500/20">
                  <p className="text-sm text-red-400">
                    Banning <strong>{banModal.user.firstName} {banModal.user.lastName}</strong> will immediately invalidate their session and block all login attempts.
                  </p>
                </div>
                <div>
                  <label className="block mb-2 text-xs font-semibold tracking-widest uppercase text-zinc-400">
                    Reason * <span className="font-normal normal-case text-zinc-600">(shown to user)</span>
                  </label>
                  <textarea
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    rows={3}
                    placeholder="e.g. Terms of service violation, payment fraud..."
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-red-500 transition-colors resize-none"
                  />
                </div>
              </>
            )}
            <div className="flex gap-3 pt-2 border-t border-zinc-800">
              <button
                onClick={handleBan}
                disabled={actioning}
                className={`flex items-center gap-2 font-semibold px-5 py-2.5 rounded-lg text-sm transition-all disabled:opacity-50 ${
                  banModal.user.isBanned
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-red-600 hover:bg-red-700 text-white"
                }`}
              >
                {actioning ? <Spinner size={14} /> : null}
                {banModal.user.isBanned ? "Yes, Unban User" : "Yes, Ban User"}
              </button>
              <button onClick={() => setBanModal(null)}
                className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-semibold transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ══════════ GIFT MODAL ══════════ */}
      <Modal
        open={!!giftModal}
        onClose={() => setGiftModal(null)}
        title={`Gift a Product to ${giftModal?.user?.firstName}`}
        width="max-w-md"
      >
        {giftModal && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 px-4 py-3 border rounded-lg bg-brand/10 border-brand/20">
              <Gift size={16} className="text-brand shrink-0" />
              <p className="text-sm text-zinc-300">
                The gifted product will be applied immediately to{" "}
                <strong className="text-white">{giftModal.user.firstName} {giftModal.user.lastName}</strong>'s account. A $0 order record will be created.
              </p>
            </div>

            <div>
              <label className="block mb-2 text-xs font-semibold tracking-widest uppercase text-zinc-400">Select Product *</label>
              {products.length === 0 ? (
                <div className="flex justify-center py-4"><Spinner size={20} /></div>
              ) : (
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-brand transition-colors"
                >
                  <option value="">— Choose a product —</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}  ·  ${p.price}/{p.billingCycle}  [{p.type}]
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Product type hint */}
            {selectedProduct && (() => {
              const p = products.find((x) => x._id === selectedProduct);
              if (!p) return null;
              const hints = {
                subscription: "📺 Will replace / set user's active subscription for 30 days.",
                screen:       `🖥 Will add ${p.screensGranted} extra screen(s) to the user for 30 days.`,
                one_time:     "📦 Order record created. No automated effect applied.",
              };
              return (
                <div className="px-4 py-3 text-xs rounded-lg bg-zinc-800 text-zinc-400">
                  {hints[p.type] || ""}
                </div>
              );
            })()}

            <div>
              <label className="block mb-2 text-xs font-semibold tracking-widest uppercase text-zinc-400">
                Internal Note <span className="font-normal normal-case text-zinc-600">(optional)</span>
              </label>
              <input
                value={giftNote}
                onChange={(e) => setGiftNote(e.target.value)}
                placeholder="e.g. Compensation for downtime, loyalty reward..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-brand transition-colors"
              />
            </div>

            <div className="flex gap-3 pt-2 border-t border-zinc-800">
              <button
                onClick={handleGift}
                disabled={actioning || !selectedProduct}
                className="flex items-center gap-2 bg-brand hover:bg-brand-dark disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-all"
              >
                {actioning ? <Spinner size={14} /> : <Gift size={14} />}
                {actioning ? "Gifting..." : "Gift Now"}
              </button>
              <button onClick={() => setGiftModal(null)}
                className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-semibold transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}