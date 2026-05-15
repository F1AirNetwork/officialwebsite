import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { streamApi, productApi } from "../api/api.js";
import {
  Radio, Power, Save, Trash2, Edit3, Wifi, Plus, ImagePlus, X, ShoppingBag,
} from "lucide-react";
import Badge from "../components/ui/Badge.jsx";
import Modal from "../components/ui/Modal.jsx";
import Spinner from "../components/ui/Spinner.jsx";

const emptyForm = {
  name: "", description: "", hlsUrl: "", embedUrl: "",
  sortOrder: 0, requiredProductId: "",
};

export default function Stream() {
  const { token } = useAuth();

  const [streams, setStreams]   = useState([]);
  const [products, setProducts] = useState([]); // for the product selector
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null);
  const [form, setForm]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);
  const [toggling, setToggling] = useState(null);
  const [msg, setMsg]           = useState(null);

  const [imageFile, setImageFile]       = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const fileInputRef = useRef(null);

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3500);
  };

  const loadStreams = async () => {
    try {
      const res  = await streamApi.getAll(token);
      const list = Array.isArray(res.data) ? res.data : [res.data].filter(Boolean);
      setStreams(list);
    } catch {
      setStreams([]);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const res = await productApi.getAll(token);
      const list = res.data?.products || res.data || [];
      // Only subscription / one_time products make sense as stream gates
      setProducts(list.filter((p) => p.isActive && p.type !== "screen"));
    } catch {
      setProducts([]);
    }
  };

  useEffect(() => {
    loadStreams();
    loadProducts();
  }, [token]);

  const openAdd = () => {
    setForm({ ...emptyForm, sortOrder: streams.length });
    setImageFile(null);
    setImagePreview(null);
    setModal({ mode: "add" });
  };

  const openEdit = (s) => {
    setForm({
      name:              s.name,
      description:       s.description        || "",
      hlsUrl:            s.hlsUrl             || "",
      embedUrl:          s.embedUrl           || "",
      sortOrder:         s.sortOrder          ?? 0,
      requiredProductId: s.requiredProductId?._id || s.requiredProductId || "",
    });
    setImageFile(null);
    setImagePreview(s.cardImage || null);
    setModal({ mode: "edit", data: s });
  };

  const closeModal = () => {
    setModal(null);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleImagePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (!form.name.trim())        return flash("error", "Stream name is required.");
    if (!form.description.trim()) return flash("error", "Description is required.");
    setSaving(true);
    try {
      const payload = {
        name:              form.name.trim(),
        description:       form.description.trim(),
        hlsUrl:            form.hlsUrl.trim(),
        embedUrl:          form.embedUrl.trim(),
        sortOrder:         form.sortOrder,
        requiredProductId: form.requiredProductId || null,
      };

      let savedStream;
      if (modal.mode === "add") {
        const res = await streamApi.create(payload, token);
        savedStream = res.data;
        flash("success", `Stream "${savedStream.name}" created.`);
      } else {
        const res = await streamApi.updateById(modal.data._id, payload, token);
        savedStream = res.data;
        flash("success", `Stream "${savedStream.name}" updated.`);
      }

      if (imageFile && savedStream?._id) {
        setUploadingImg(true);
        try {
          await streamApi.uploadImage(savedStream._id, imageFile, token);
        } catch {
          flash("error", "Stream saved but image upload failed. Try re-uploading from Edit.");
        } finally {
          setUploadingImg(false);
        }
      }

      closeModal();
      loadStreams();
    } catch (err) {
      flash("error", err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s) => {
    if (!confirm(`Delete stream "${s.name}"? This will end all active sessions.`)) return;
    try {
      await streamApi.deleteById(s._id, token);
      flash("success", `"${s.name}" deleted.`);
      loadStreams();
    } catch (err) {
      flash("error", err.message);
    }
  };

  const handleToggle = async (s) => {
    setToggling(s._id);
    try {
      await streamApi.toggleById(s._id, token);
      flash("success", s.isLive ? `"${s.name}" taken offline.` : `"${s.name}" is now LIVE!`);
      loadStreams();
    } catch (err) {
      flash("error", err.message);
    } finally {
      setToggling(null);
    }
  };

  const handleDeleteImage = async (s) => {
    if (!confirm("Remove card image?")) return;
    try {
      await streamApi.deleteImage(s._id, token);
      flash("success", "Image removed.");
      loadStreams();
    } catch (err) {
      flash("error", err.message);
    }
  };

  const inputCls = "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/50 transition-colors";

  // Helper: get product name for a stream
  const productName = (s) => {
    if (!s.requiredProductId) return null;
    return s.requiredProductId?.name || products.find((p) => p._id === s.requiredProductId)?.name || null;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>;

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl tracking-wide text-white font-display">STREAMS</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {streams.length} stream{streams.length !== 1 ? "s" : ""} configured &middot; {streams.filter((s) => s.isLive).length} live
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-all"
        >
          <Plus size={15} /> Add Stream
        </button>
      </div>

      {/* Flash */}
      {msg && (
        <div className={`rounded-xl px-5 py-3 text-sm font-medium border ${
          msg.type === "success"
            ? "bg-green-500/10 text-green-400 border-green-500/20"
            : "bg-red-500/10 text-red-400 border-red-500/20"
        }`}>{msg.text}</div>
      )}

      {/* Empty */}
      {streams.length === 0 && (
        <div className="py-20 text-center border bg-zinc-900 border-zinc-800 rounded-2xl">
          <Radio size={32} className="mx-auto mb-3 text-zinc-700" />
          <p className="mb-4 text-sm text-zinc-500">No streams configured yet.</p>
          <button onClick={openAdd} className="text-sm font-semibold text-brand hover:underline">
            + Add your first stream
          </button>
        </div>
      )}

      {/* Stream list */}
      <div className="space-y-4">
        {[...streams]
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name))
          .map((s) => {
            const pName = productName(s);
            return (
              <div
                key={s._id}
                className={`overflow-hidden border rounded-2xl bg-zinc-900 transition-colors ${
                  s.isLive ? "border-brand/30" : "border-zinc-800"
                }`}
              >
                <div className={`h-0.5 ${s.isLive ? "bg-brand" : "bg-zinc-800"}`} />

                <div className="flex gap-5 p-5">
                  {/* Thumbnail */}
                  <div className="relative flex-shrink-0 w-32 h-20 overflow-hidden rounded-lg bg-zinc-800 group">
                    {s.cardImage ? (
                      <>
                        <img src={s.cardImage} alt={s.name} className="object-cover w-full h-full" />
                        <button
                          onClick={() => handleDeleteImage(s)}
                          title="Remove image"
                          className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white transition-opacity opacity-0 group-hover:opacity-100 bg-black/60 hover:text-red-400"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center justify-center w-full h-full text-zinc-600">
                        <Radio size={20} />
                      </div>
                    )}
                  </div>

                  {/* Info + actions */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex flex-wrap items-center min-w-0 gap-2">
                        <h2 className="text-base font-semibold text-white truncate">{s.name}</h2>
                        <Badge color={s.isLive ? "brand" : "zinc"} dot>
                          {s.isLive ? "LIVE" : "OFFLINE"}
                        </Badge>
                        {pName && (
                          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
                            <ShoppingBag size={9} /> {pName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => openEdit(s)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors border rounded-lg bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300"
                        >
                          <Edit3 size={12} /> Edit
                        </button>
                        <button
                          onClick={() => handleToggle(s)}
                          disabled={toggling === s._id}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border disabled:opacity-50 ${
                            s.isLive
                              ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20"
                              : "bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/20"
                          }`}
                        >
                          {toggling === s._id ? <Spinner size={12} /> : <Power size={12} />}
                          {s.isLive ? "Go Offline" : "Go Live"}
                        </button>
                        <button
                          onClick={() => handleDelete(s)}
                          title="Delete stream"
                          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {s.description && (
                      <p className="mb-2 text-xs text-zinc-400 line-clamp-1">{s.description}</p>
                    )}

                    <div className="flex flex-col gap-1.5">
                      {s.hlsUrl && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/60">
                          <Wifi size={11} className="text-zinc-500 shrink-0" />
                          <code className="font-mono text-[10px] text-zinc-400 truncate">{s.hlsUrl}</code>
                          <span className="ml-auto text-[9px] uppercase tracking-widest text-zinc-600 shrink-0">HLS</span>
                        </div>
                      )}
                      {s.embedUrl && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/60">
                          <Wifi size={11} className="text-brand shrink-0" />
                          <code className="font-mono text-[10px] text-zinc-400 truncate">{s.embedUrl}</code>
                          <span className="ml-auto text-[9px] uppercase tracking-widest text-zinc-600 shrink-0">EMBED</span>
                        </div>
                      )}
                      {!s.hlsUrl && !s.embedUrl && (
                        <p className="text-[10px] text-zinc-600 italic">No stream URL configured</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        open={!!modal}
        onClose={closeModal}
        title={modal?.mode === "add" ? "Add New Stream" : `Edit — ${modal?.data?.name}`}
        width="max-w-xl"
      >
        <div className="space-y-5">

          {/* Image upload */}
          <div>
            <label className="block mb-2 text-xs font-semibold tracking-widest uppercase text-zinc-400">Card Image</label>
            {imagePreview ? (
              <div className="relative w-full overflow-hidden rounded-xl aspect-video bg-zinc-800">
                <img src={imagePreview} alt="Preview" className="object-cover w-full h-full" />
                <button
                  onClick={handleRemoveImage}
                  className="absolute flex items-center gap-1 px-2 py-1 text-xs font-semibold text-white transition-colors rounded-lg top-2 right-2 bg-black/60 hover:bg-red-600"
                >
                  <X size={11} /> Remove
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center w-full gap-2 transition-colors border-2 border-dashed rounded-xl aspect-video border-zinc-700 hover:border-brand/50 hover:bg-brand/5 text-zinc-500 hover:text-zinc-300"
              >
                <ImagePlus size={24} />
                <span className="text-xs">Click to upload image</span>
                <span className="text-[10px] text-zinc-600">JPEG, PNG or WebP · max 5 MB</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleImagePick}
              className="hidden"
            />
          </div>

          {/* Name */}
          <div>
            <label className="block mb-2 text-xs font-semibold tracking-widest uppercase text-zinc-400">Stream Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Monaco Grand Prix — Main Feed"
              className={inputCls}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block mb-2 text-xs font-semibold tracking-widest uppercase text-zinc-400">Description *</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              placeholder="Short description shown on the stream card..."
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* HLS URL */}
          <div>
            <label className="block mb-2 text-xs font-semibold tracking-widest uppercase text-zinc-400">HLS Stream URL</label>
            <input
              value={form.hlsUrl}
              onChange={(e) => setForm({ ...form, hlsUrl: e.target.value })}
              placeholder="https://... (.m3u8)"
              className={`${inputCls} font-mono`}
            />
            <p className="mt-1 text-[10px] text-zinc-600">Used by the native HLS video player.</p>
          </div>

          {/* Embed URL */}
          <div>
            <label className="block mb-2 text-xs font-semibold tracking-widest uppercase text-zinc-400">Embed URL (iframe)</label>
            <input
              value={form.embedUrl}
              onChange={(e) => setForm({ ...form, embedUrl: e.target.value })}
              placeholder="https://pooembed.eu/embed/f1/..."
              className={`${inputCls} font-mono`}
            />
            <p className="mt-1 text-[10px] text-zinc-600">Fallback iframe player if no HLS URL is set.</p>
          </div>

          {/* Required product */}
          <div>
            <label className="block mb-2 text-xs font-semibold tracking-widest uppercase text-zinc-400">
              Required Product <span className="tracking-normal normal-case text-zinc-600">(optional)</span>
            </label>
            <select
              value={form.requiredProductId}
              onChange={(e) => setForm({ ...form, requiredProductId: e.target.value })}
              className={inputCls}
            >
              <option value="">— Default subscription gate —</option>
              {products.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} {p.priceUSD ? `· $${p.priceUSD}` : p.price ? `· $${p.price}` : ""}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[10px] text-zinc-600">
              If set, only users who have purchased this product can watch. Leave blank to use the default subscription check.
            </p>
          </div>

          {/* Sort order */}
          <div>
            <label className="block mb-2 text-xs font-semibold tracking-widest uppercase text-zinc-400">Sort Order</label>
            <input
              type="number"
              min={0}
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
              className={inputCls}
            />
            <p className="mt-1 text-[10px] text-zinc-600">Lower numbers appear first on the Livestream page.</p>
          </div>
        </div>

        <div className="flex gap-3 pt-4 mt-6 border-t border-zinc-800">
          <button
            onClick={handleSave}
            disabled={saving || uploadingImg}
            className="flex items-center gap-2 bg-brand hover:bg-brand-dark disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-all"
          >
            {(saving || uploadingImg) ? <Spinner size={14} /> : <Save size={14} />}
            {uploadingImg ? "Uploading image..." : saving ? "Saving..." : modal?.mode === "add" ? "Create Stream" : "Save Changes"}
          </button>
          <button onClick={closeModal} className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-semibold transition-colors">
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
}