import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { eventApi } from "../api/api.js";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Badge from "../components/ui/Badge.jsx";
import Modal from "../components/ui/Modal.jsx";
import Spinner from "../components/ui/Spinner.jsx";

const emptyForm = {
  name: "", series: "Formula 1", status: "upcoming",
  displayTime: "", circuit: "", badge: "", badgeColor: "yellow", featured: false,
};

const SERIES  = ["Formula 1", "MotoGP", "WEC", "IndyCar", "Formula E", "NASCAR", "Other"];
const STATUSES = ["upcoming", "live", "completed", "cancelled"];
const BADGE_COLORS = ["red", "yellow", "green", "blue", "zinc"];

const statusColor = (s) => ({ live: "brand", upcoming: "yellow", completed: "zinc", cancelled: "red" }[s] || "zinc");

export default function Events() {
  const { token } = useAuth();
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null);
  const [form, setForm]       = useState(emptyForm);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState(null);

  const flash = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 3000); };

  const load = async () => {
    try {
      const res = await eventApi.getAll(token);
      setEvents(res.data?.events || res.data || []);
    } catch (err) { flash("error", err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [token]);

  const openAdd  = () => { setForm(emptyForm); setModal({ mode: "add" }); };
  const openEdit = (e) => { setForm({ ...e, featured: !!e.featured }); setModal({ mode: "edit", data: e }); };

  const handleSave = async () => {
    if (!form.name || !form.series) return flash("error", "Name and series are required.");
    setSaving(true);
    try {
      if (modal.mode === "add") await eventApi.create(form, token);
      else await eventApi.update(modal.data._id, form, token);
      flash("success", modal.mode === "add" ? "Event created!" : "Event updated!");
      setModal(null);
      load();
    } catch (err) { flash("error", err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this event?")) return;
    try { await eventApi.delete(id, token); flash("success", "Event deleted."); load(); }
    catch (err) { flash("error", err.message); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-display text-4xl tracking-wide">EVENTS</h1>
          <p className="text-zinc-500 text-sm mt-1">{events.length} events scheduled</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-all">
          <Plus size={15} /> Add Event
        </button>
      </div>

      {/* Flash */}
      {msg && (
        <div className={`rounded-xl px-5 py-3 text-sm font-medium border ${msg.type === "success" ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
          {msg.text}
        </div>
      )}

      {/* Cards Grid */}
      {events.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl py-16 text-center text-zinc-500 text-sm">
          No events yet. Add your first event.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {events.map((e) => (
            <div key={e._id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-600 transition-colors group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge color={statusColor(e.status)} dot>{e.status}</Badge>
                  {e.featured && <Badge color="brand">Featured</Badge>}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(e)} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"><Pencil size={13} /></button>
                  <button onClick={() => handleDelete(e._id)} className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={13} /></button>
                </div>
              </div>
              <h3 className="text-white font-semibold text-base mb-1 leading-snug">{e.name}</h3>
              <p className="text-zinc-500 text-xs mb-2 font-mono">{e.series}</p>
              {e.circuit && <p className="text-zinc-400 text-xs">{e.circuit}</p>}
              {e.displayTime && <p className="text-zinc-500 text-xs mt-1">{e.displayTime}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === "add" ? "Add Event" : "Edit Event"} width="max-w-xl">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Event Name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-brand transition-colors"
              placeholder="F1 Monaco Grand Prix" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Series</label>
              <select value={form.series} onChange={(e) => setForm({ ...form, series: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-brand transition-colors">
                {SERIES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-brand transition-colors">
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Circuit</label>
            <input value={form.circuit} onChange={(e) => setForm({ ...form, circuit: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-brand transition-colors"
              placeholder="Circuit de Monaco" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Display Time</label>
            <input value={form.displayTime} onChange={(e) => setForm({ ...form, displayTime: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-brand transition-colors"
              placeholder="Today, 14:00 GMT" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Badge Label</label>
              <input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-brand transition-colors"
                placeholder="LIVE / TODAY / NEW" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Badge Color</label>
              <select value={form.badgeColor} onChange={(e) => setForm({ ...form, badgeColor: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-brand transition-colors">
                {BADGE_COLORS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="accent-brand w-4 h-4" />
            <span className="text-zinc-300 text-sm">Featured event</span>
          </label>
        </div>
        <div className="flex gap-3 mt-6 pt-4 border-t border-zinc-800">
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-brand hover:bg-brand-dark disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-all">
            {saving ? <Spinner size={14} /> : null} {saving ? "Saving..." : "Save Event"}
          </button>
          <button onClick={() => setModal(null)} className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-semibold transition-colors">Cancel</button>
        </div>
      </Modal>
    </div>
  );
}
