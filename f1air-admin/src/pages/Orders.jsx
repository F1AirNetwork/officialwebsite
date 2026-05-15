import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { orderApi } from "../api/api.js";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import Badge from "../components/ui/Badge.jsx";
import Spinner from "../components/ui/Spinner.jsx";

const STATUS_OPTIONS = ["pending", "paid", "failed", "refunded", "cancelled"];

const statusColor = (s) =>
  ({ paid: "green", pending: "yellow", failed: "red", refunded: "blue", cancelled: "zinc" }[s] || "zinc");

export default function Orders() {
  const { token } = useAuth();
  const [orders, setOrders]     = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter]     = useState("");
  const [loading, setLoading]   = useState(true);
  const [updating, setUpdating] = useState(null); // order id being updated
  const [msg, setMsg]           = useState(null);

  const flash = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 3000); };

  const load = async (p = page, f = filter) => {
    setLoading(true);
    try {
      const params = `?page=${p}&limit=15${f ? `&status=${f}` : ""}`;
      const res = await orderApi.getAll(token, params);
      setOrders(res.data.orders || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      flash("error", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(page, filter); }, [page, filter]);

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdating(orderId);
    try {
      await orderApi.updateStatus(orderId, { status: newStatus }, token);
      flash("success", `Order updated to ${newStatus}`);
      load(page, filter);
    } catch (err) {
      flash("error", err.message);
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-display text-4xl tracking-wide">ORDERS</h1>
          <p className="text-zinc-500 text-sm mt-1">{total} total orders</p>
        </div>
        <button onClick={() => load(page, filter)} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 rounded-lg text-sm font-semibold transition-colors">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Flash */}
      {msg && (
        <div className={`rounded-xl px-5 py-3 text-sm font-medium border ${msg.type === "success" ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
          {msg.text}
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => { setFilter(""); setPage(1); }}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${!filter ? "bg-brand text-white border-brand" : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500"}`}>
          All
        </button>
        {STATUS_OPTIONS.map((s) => (
          <button key={s} onClick={() => { setFilter(s); setPage(1); }}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all capitalize ${filter === s ? "bg-brand text-white border-brand" : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500"}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Spinner size={28} /></div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                {["Order ID", "Customer", "Product", "Amount", "Date", "Status", "Action"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {orders.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-zinc-500 text-sm">No orders found</td></tr>
              ) : orders.map((o) => (
                <tr key={o._id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-5 py-3 text-xs font-mono text-zinc-400">#{o._id.slice(-8).toUpperCase()}</td>
                  <td className="px-5 py-3">
                    <p className="text-sm text-zinc-200">{o.user?.firstName} {o.user?.lastName}</p>
                    <p className="text-xs text-zinc-500">{o.user?.email}</p>
                  </td>
                  <td className="px-5 py-3 text-sm text-zinc-300">{o.productName}</td>
                  <td className="px-5 py-3 text-sm text-white font-semibold">${o.amount}</td>
                  <td className="px-5 py-3 text-xs text-zinc-500">
                    {new Date(o.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-5 py-3">
                    <Badge color={statusColor(o.status)} dot>{o.status}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    {updating === o._id ? (
                      <Spinner size={16} />
                    ) : (
                      <select
                        value={o.status}
                        onChange={(e) => handleStatusChange(o._id, e.target.value)}
                        className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand transition-colors cursor-pointer"
                      >
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}
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
          <p className="text-zinc-500 text-sm">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 border border-zinc-700 rounded-lg text-zinc-300 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 border border-zinc-700 rounded-lg text-zinc-300 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
