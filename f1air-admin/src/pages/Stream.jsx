import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { streamApi } from "../api/api.js";
import { Radio, Power, Save, Trash2, Edit3, Wifi } from "lucide-react";
import Badge from "../components/ui/Badge.jsx";
import Spinner from "../components/ui/Spinner.jsx";

const defaultForm = { name: "", description: "", hlsUrl: "", embedUrl: "" };

export default function Stream() {
  const { token } = useAuth();
  const [stream, setStream]   = useState(null);
  const [form, setForm]       = useState(defaultForm);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [toggling, setToggling] = useState(false);
  const [msg, setMsg]         = useState(null); // { type: "success"|"error", text }

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3500);
  };

  const loadStream = async () => {
    try {
      const res = await streamApi.get(token);
      const s = Array.isArray(res.data) ? res.data[0] : res.data;
      setStream(s || null);
      if (s) setForm({ name: s.name, description: s.description || "", hlsUrl: s.hlsUrl || "", embedUrl: s.embedUrl || "" });
    } catch {
      setStream(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStream(); }, [token]);

  const handleSave = async () => {
    if (!form.name) return flash("error", "Stream name is required.");
    setSaving(true);
    try {
      if (stream) {
        await streamApi.update(form, token);
        flash("success", "Stream updated successfully.");
      } else {
        await streamApi.set(form, token);
        flash("success", "Stream configured successfully.");
      }
      await loadStream();
      setEditing(false);
    } catch (err) {
      flash("error", err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    if (!stream) return;
    setToggling(true);
    try {
      await streamApi.toggle({ isLive: !stream.isLive }, token);
      await loadStream();
      flash("success", stream.isLive ? "Stream taken offline." : "Stream is now live!");
    } catch (err) {
      flash("error", err.message);
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete stream configuration? This will take the stream offline.")) return;
    try {
      await streamApi.delete(token);
      setStream(null);
      setForm(defaultForm);
      setEditing(false);
      flash("success", "Stream configuration deleted.");
    } catch (err) {
      flash("error", err.message);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>;

  return (
    <div className="max-w-3xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl tracking-wide text-white font-display">STREAM</h1>
          <p className="mt-1 text-sm text-zinc-500">Configure and control the live stream</p>
        </div>
        {stream && (
          <div className="flex items-center gap-3">
            <button onClick={() => setEditing(!editing)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors border rounded-lg bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-100">
              <Edit3 size={14} /> Edit
            </button>
            <button
              onClick={handleToggle}
              disabled={toggling}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                stream.isLive
                  ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                  : "bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20"
              }`}
            >
              {toggling ? <Spinner size={14} /> : <Power size={14} />}
              {stream.isLive ? "Go Offline" : "Go Live"}
            </button>
          </div>
        )}
      </div>

      {/* Flash message */}
      {msg && (
        <div className={`rounded-xl px-5 py-3 text-sm font-medium border ${
          msg.type === "success"
            ? "bg-green-500/10 text-green-400 border-green-500/20"
            : "bg-red-500/10 text-red-400 border-red-500/20"
        }`}>
          {msg.text}
        </div>
      )}

      {/* Stream Status Card */}
      {stream && !editing ? (
        <div className="overflow-hidden border bg-zinc-900 border-zinc-800 rounded-2xl">
          {/* Live indicator bar */}
          <div className={`h-1 ${stream.isLive ? "bg-brand" : "bg-zinc-700"}`} />
          <div className="p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-semibold text-white">{stream.name}</h2>
                  <Badge color={stream.isLive ? "brand" : "zinc"} dot>
                    {stream.isLive ? "LIVE" : "OFFLINE"}
                  </Badge>
                </div>
                {stream.description && (
                  <p className="text-sm text-zinc-400">{stream.description}</p>
                )}
              </div>
              <div className={`p-3 rounded-xl border ${stream.isLive ? "bg-brand/10 border-brand/20 text-brand" : "bg-zinc-800 border-zinc-700 text-zinc-500"}`}>
                <Radio size={20} />
              </div>
            </div>

            <div className="pt-5 space-y-4 border-t border-zinc-800">
              {stream.hlsUrl && (
                <div>
                  <p className="mb-2 text-xs font-semibold tracking-widest uppercase text-zinc-500">HLS Stream URL</p>
                  <div className="bg-zinc-800 rounded-lg px-4 py-2.5 flex items-center gap-3">
                    <Wifi size={14} className="text-zinc-500 shrink-0" />
                    <code className="font-mono text-xs truncate text-zinc-300">{stream.hlsUrl}</code>
                  </div>
                </div>
              )}
              {stream.embedUrl && (
                <div>
                  <p className="mb-2 text-xs font-semibold tracking-widest uppercase text-zinc-500">Embed URL (iframe)</p>
                  <div className="bg-zinc-800 rounded-lg px-4 py-2.5 flex items-center gap-3">
                    <Wifi size={14} className="text-brand shrink-0" />
                    <code className="font-mono text-xs truncate text-zinc-300">{stream.embedUrl}</code>
                  </div>
                </div>
              )}
            </div>

            {stream.viewerCount !== undefined && (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-800/50 rounded-xl">
                  <p className="mb-1 text-xs text-zinc-500">Viewers</p>
                  <p className="text-2xl text-white font-display">{stream.viewerCount ?? 0}</p>
                </div>
              </div>
            )}
          </div>

          <div className="px-6 pb-6">
            <button onClick={handleDelete} className="flex items-center gap-2 text-sm text-red-400 transition-colors hover:text-red-300">
              <Trash2 size={14} /> Delete configuration
            </button>
          </div>
        </div>
      ) : (
        /* Config Form */
        <div className="p-6 space-y-5 border bg-zinc-900 border-zinc-800 rounded-2xl">
          <h2 className="font-semibold text-white">
            {stream ? "Edit Stream Configuration" : "Configure New Stream"}
          </h2>

          <div>
            <label className="block mb-2 text-xs font-semibold tracking-widest uppercase text-zinc-400">Stream Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Monaco Grand Prix 2025"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/50 transition-colors"
            />
          </div>

          <div>
            <label className="block mb-2 text-xs font-semibold tracking-widest uppercase text-zinc-400">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Short description of the stream..."
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/50 transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block mb-2 text-xs font-semibold tracking-widest uppercase text-zinc-400">HLS Stream URL</label>
            <input
              value={form.hlsUrl}
              onChange={(e) => setForm({ ...form, hlsUrl: e.target.value })}
              placeholder="https://... (.m3u8)"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/50 transition-colors font-mono"
            />
          </div>

          <div>
            <label className="block mb-2 text-xs font-semibold tracking-widest uppercase text-zinc-400">Embed URL (iframe) *</label>
            <input
              value={form.embedUrl}
              onChange={(e) => setForm({ ...form, embedUrl: e.target.value })}
              placeholder="https://pooembed.eu/embed/f1/2026/..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/50 transition-colors font-mono"
            />
            <p className="text-zinc-600 text-xs mt-1.5">Paste the iframe src URL here — this is what viewers will see on the Livestream page.</p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-brand hover:bg-brand-dark disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-all"
            >
              {saving ? <Spinner size={14} /> : <Save size={14} />}
              {saving ? "Saving..." : "Save Configuration"}
            </button>
            {stream && (
              <button onClick={() => setEditing(false)} className="text-zinc-400 hover:text-zinc-200 text-sm px-4 py-2.5 rounded-lg hover:bg-zinc-800 transition-colors">
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}