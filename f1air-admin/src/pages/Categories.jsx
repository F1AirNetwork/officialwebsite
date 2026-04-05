import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { categoryApi } from "../api/api.js";
import { Plus, Pencil, Trash2, Tag, ToggleLeft, ToggleRight, GripVertical } from "lucide-react";
import Badge from "../components/ui/Badge.jsx";
import Modal from "../components/ui/Modal.jsx";
import Spinner from "../components/ui/Spinner.jsx";

const COLORS = [
  { key: "zinc",   label: "Zinc"   },
  { key: "brand",  label: "Red"    },
  { key: "blue",   label: "Blue"   },
  { key: "green",  label: "Green"  },
  { key: "yellow", label: "Yellow" },
  { key: "purple", label: "Purple" },
];

const EMOJI_SUGGESTIONS = ["📺", "🎮", "🎬", "🏎", "🎵", "📦", "⭐", "💎", "🔴", "📡", "🎯", "🏆"];

const emptyForm = {
  name: "", description: "", icon: "📦", color: "zinc", isActive: true, sortOrder: 0,
};

export default function Categories() {
  const { token } = useAuth();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(null); // null | { mode: "add"|"edit", data? }
  const [form, setForm]             = useState(emptyForm);
  const [saving, setSaving]         = useState(false);
  const [msg, setMsg]               = useState(null);

  const flash = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 4000); };

  const load = async () => {
    setLoading(true);
    try {
      const res = await categoryApi.getAll(token);
      setCategories(res.data?.categories || []);
    } catch (err) {
      flash("error", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [token]);

  const openAdd = () => { setForm(emptyForm); setModal({ mode: "add" }); };
  const openEdit = (cat) => {
    setForm({
      name:        cat.name,
      description: cat.description || "",
      icon:        cat.icon || "📦",
      color:       cat.color || "zinc",
      isActive:    cat.isActive,
      sortOrder:   cat.sortOrder || 0,
    });
    setModal({ mode: "edit", data: cat });
  };

  const handleSave = async () => {
    if (!form.name.trim()) return flash("error", "Category name is required.");
    setSaving(true);
    try {
      if (modal.mode === "add") {
        await categoryApi.create(form, token);
        flash("success", `Category "${form.name}" created!`);
      } else {
        await categoryApi.update(modal.data._id, form, token);
        flash("success", `Category "${form.name}" updated!`);
      }
      setModal(null);
      load();
    } catch (err) {
      flash("error", err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat) => {
    if (!confirm(`Delete category "${cat.name}"? Products using it must be re-assigned first.`)) return;
    try {
      await categoryApi.delete(cat._id, token);
      flash("success", `"${cat.name}" deleted.`);
      load();
    } catch (err) {
      flash("error", err.message);
    }
  };

  const handleToggleActive = async (cat) => {
    try {
      await categoryApi.update(cat._id, { ...cat, isActive: !cat.isActive }, token);
      flash("success", `"${cat.name}" ${!cat.isActive ? "activated" : "deactivated"}.`);
      load();
    } catch (err) {
      flash("error", err.message);
    }
  };

  const Field = ({ label, children }) => (
    <div>
      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">{label}</label>
      {children}
    </div>
  );

  const inputCls = "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-brand transition-colors";

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-display text-4xl tracking-wide">CATEGORIES</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {categories.length} categor{categories.length === 1 ? "y" : "ies"} · used across all products
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-all"
        >
          <Plus size={15} /> Add Category
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

      {/* Info banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4 flex items-start gap-3 text-sm text-zinc-400">
        <Tag size={16} className="text-brand shrink-0 mt-0.5" />
        <div>
          Categories created here are available in the Product editor. Renaming a category <strong className="text-zinc-300">automatically updates</strong> all products assigned to it. Deleting a category is blocked if products are still using it.
        </div>
      </div>

      {/* Empty state */}
      {categories.length === 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl py-20 text-center">
          <Tag size={32} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">No categories yet. Add your first one.</p>
          <button onClick={openAdd} className="mt-4 text-brand text-sm font-semibold hover:underline">
            + Add Category
          </button>
        </div>
      )}

      {/* Category grid */}
      {categories.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {categories
            .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
            .map((cat) => (
              <div
                key={cat._id}
                className={`bg-zinc-900 border rounded-xl p-5 transition-colors group ${
                  cat.isActive ? "border-zinc-800 hover:border-zinc-600" : "border-zinc-800/50 opacity-60"
                }`}
              >
                {/* Top row */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-xl">
                      {cat.icon}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{cat.name}</p>
                      <p className="text-zinc-500 text-xs font-mono">{cat.slug}</p>
                    </div>
                  </div>
                  <Badge color={cat.isActive ? "green" : "zinc"} dot>
                    {cat.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                {/* Description */}
                {cat.description && (
                  <p className="text-zinc-400 text-xs mb-4 leading-relaxed">{cat.description}</p>
                )}

                {/* Color swatch */}
                <div className="flex items-center gap-2 mb-4">
                  <Badge color={cat.color}>{cat.color}</Badge>
                  {cat.sortOrder > 0 && (
                    <span className="text-zinc-600 text-xs font-mono">order: {cat.sortOrder}</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(cat)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg transition-colors"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    onClick={() => handleToggleActive(cat)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg transition-colors"
                  >
                    {cat.isActive
                      ? <><ToggleRight size={12} className="text-green-400" /> Deactivate</>
                      : <><ToggleLeft  size={12} className="text-zinc-500" /> Activate</>
                    }
                  </button>
                  <button
                    onClick={() => handleDelete(cat)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 text-xs rounded-lg transition-colors ml-auto"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === "add" ? "New Category" : `Edit — ${modal?.data?.name}`}
        width="max-w-lg"
      >
        <div className="space-y-5">

          {/* Name + Icon row */}
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-3">
              <Field label="Category Name *">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputCls}
                  placeholder="e.g. Streaming, Community, Gaming..."
                />
              </Field>
            </div>
            <div>
              <Field label="Icon">
                <input
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  className={`${inputCls} text-center text-xl`}
                  maxLength={2}
                  placeholder="📦"
                />
              </Field>
            </div>
          </div>

          {/* Emoji quick picks */}
          <div>
            <p className="text-xs text-zinc-500 mb-2">Quick pick</p>
            <div className="flex flex-wrap gap-2">
              {EMOJI_SUGGESTIONS.map((em) => (
                <button
                  key={em}
                  onClick={() => setForm({ ...form, icon: em })}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-colors ${
                    form.icon === em
                      ? "bg-brand/20 border border-brand/40"
                      : "bg-zinc-800 hover:bg-zinc-700 border border-zinc-700"
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className={`${inputCls} resize-none`}
              placeholder="Short description shown in the store..."
            />
          </Field>

          {/* Color + Sort order */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Badge Color">
              <select
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className={inputCls}
              >
                {COLORS.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
              </select>
            </Field>
            <Field label="Sort Order">
              <input
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                className={inputCls}
                placeholder="0"
              />
            </Field>
          </div>

          {/* Preview badge */}
          <div className="flex items-center gap-3 bg-zinc-800 rounded-lg px-4 py-3">
            <span className="text-zinc-500 text-xs">Preview:</span>
            <span className="text-lg">{form.icon}</span>
            <Badge color={form.color}>{form.name || "Category Name"}</Badge>
            <Badge color={form.isActive ? "green" : "zinc"} dot>
              {form.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>

          {/* Active toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="accent-brand w-4 h-4"
            />
            <span className="text-zinc-300 text-sm">Active (visible in store filter)</span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6 pt-4 border-t border-zinc-800">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-brand hover:bg-brand-dark disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-all"
          >
            {saving ? <Spinner size={14} /> : null}
            {saving ? "Saving..." : modal?.mode === "add" ? "Create Category" : "Save Changes"}
          </button>
          <button
            onClick={() => setModal(null)}
            className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-semibold transition-colors"
          >
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
}
