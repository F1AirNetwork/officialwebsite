import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { streamApi, orderApi, productApi, eventApi } from "../api/api.js";
import { Radio, ShoppingCart, Package, Calendar, TrendingUp, Users } from "lucide-react";
import Badge from "../components/ui/Badge.jsx";
import Spinner from "../components/ui/Spinner.jsx";

const StatCard = ({ icon: Icon, label, value, sub, color = "brand" }) => {
  const colors = {
    brand:  "text-brand bg-brand/10 border-brand/20",
    green:  "text-green-400 bg-green-500/10 border-green-500/20",
    yellow: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    blue:   "text-blue-400 bg-blue-500/10 border-blue-500/20",
  };
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-zinc-400 text-sm font-medium">{label}</span>
        <div className={`p-2 rounded-lg border ${colors[color]}`}>
          <Icon size={16} />
        </div>
      </div>
      <p className="text-white text-3xl font-display tracking-wide">{value ?? "—"}</p>
      {sub && <p className="text-zinc-500 text-xs mt-1">{sub}</p>}
    </div>
  );
};

export default function Dashboard() {
  const { token } = useAuth();
  const [stream, setStream]   = useState(null);
  const [orders, setOrders]   = useState([]);
  const [products, setProducts] = useState([]);
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, o, p, e] = await Promise.allSettled([
          streamApi.get(token),
          orderApi.getAll(token, "?limit=5"),
          productApi.getAll(token),
          eventApi.getAll(token),
        ]);
        if (s.status === "fulfilled") setStream(s.value.data);
        if (o.status === "fulfilled") setOrders(o.value.data?.orders || []);
        if (p.status === "fulfilled") setProducts(p.value.data?.products || []);
        if (e.status === "fulfilled") setEvents(e.value.data?.events || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const revenue = orders
    .filter((o) => o.status === "paid")
    .reduce((sum, o) => sum + o.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={32} />
      </div>
    );
  }

  const liveStream = Array.isArray(stream) ? stream.find((s) => s.isLive) : stream?.isLive ? stream : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-white font-display text-4xl tracking-wide">DASHBOARD</h1>
        <p className="text-zinc-500 text-sm mt-1">F1 Air Network control centre</p>
      </div>

      {/* Live Banner */}
      {liveStream && (
        <div className="bg-brand/10 border border-brand/30 rounded-xl px-6 py-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-brand rounded-full animate-pulse" />
            <span className="text-brand font-semibold text-sm font-mono uppercase tracking-widest">Live Now</span>
          </div>
          <p className="text-white font-semibold">{liveStream.name}</p>
          <Badge color="brand">STREAMING</Badge>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Radio}       label="Stream Status" value={liveStream ? "LIVE" : "OFFLINE"} color={liveStream ? "brand" : "blue"} sub={liveStream?.name} />
        <StatCard icon={ShoppingCart} label="Recent Orders" value={orders.length} color="green" sub="Last 5 orders" />
        <StatCard icon={Package}     label="Products"      value={products.length} color="yellow" sub="Active listings" />
        <StatCard icon={Calendar}    label="Events"        value={events.length}   color="blue"   sub="Total events" />
      </div>

      {/* Recent Orders */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <TrendingUp size={16} className="text-brand" /> Recent Orders
          </h2>
          <a href="/orders" className="text-brand text-sm hover:underline">View all →</a>
        </div>
        {orders.length === 0 ? (
          <div className="px-6 py-10 text-center text-zinc-500 text-sm">No orders yet</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                {["Order", "Customer", "Product", "Amount", "Status"].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {orders.map((order) => (
                <tr key={order._id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-6 py-3 text-xs font-mono text-zinc-500">#{order._id.slice(-6).toUpperCase()}</td>
                  <td className="px-6 py-3 text-sm text-zinc-300">
                    {order.user?.firstName} {order.user?.lastName}
                  </td>
                  <td className="px-6 py-3 text-sm text-zinc-300">{order.productName}</td>
                  <td className="px-6 py-3 text-sm text-white font-semibold">${order.amount}</td>
                  <td className="px-6 py-3">
                    <Badge color={order.status === "paid" ? "green" : order.status === "pending" ? "yellow" : "red"} dot>
                      {order.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
