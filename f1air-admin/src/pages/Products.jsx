import { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { productApi, categoryApi } from "../api/api.js";
import { Plus, Pencil, Trash2, Monitor, Package, Upload, X, ImageIcon } from "lucide-react";
import Badge from "../components/ui/Badge.jsx";
import Modal from "../components/ui/Modal.jsx";
import Spinner from "../components/ui/Spinner.jsx";

const emptyProduct = {
  name: "", description: "", billingCycle: "month",
  category: "", type: "subscription", isActive: true, isFeatured: false, features: "",
  priceUSD: "", priceINR: "", priceEUR: "", lsVariantId: "", lsVariantIdEur: "",
};

const emptyScreen = {
  name: "", price: "", screensGranted: 1, description: "", billingCycle: "month",
};

// Categories loaded dynamically from API
const BILLING = ["month", "year", "one_time"];

export default function Products() {
  const { token } = useAuth();
  const [products, setProducts]           = useState([]);
  const [screens, setScreens]             = useState([]);
  const [categories, setCategories]       = useState([]);
  const [tab, setTab]                     = useState("products");
  const [loading, setLoading]             = useState(true);
  const [modal, setModal]                 = useState(null);
  const [screenModal, setScreenModal]     = useState(null);
  const [imageModal, setImageModal]       = useState(null);
  const [form, setForm]                   = useState(emptyProduct);
  const [screenForm, setScreenForm]       = useState(emptyScreen);
  const [saving, setSaving]               = useState(false);
  const [uploading, setUploading]         = useState(false);
  const [msg, setMsg]                     = useState(null);

  const [selectedFile, setSelectedFile]   = useState(null);
  const [previewUrl, setPreviewUrl]       = useState(null);
  const fileInputRef                      = useRef(null);
  // Inline image in add/edit modal
  const [modalFile, setModalFile]         = useState(null);
  const [modalPreview, setModalPreview]   = useState(null);
  const modalFileRef                      = useRef(null);

  const flash = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 3500); };

  const load = async () => {
    try {
      const [p, s, c] = await Promise.allSettled([
        productApi.getAll(token),
        productApi.getScreens(token),
        categoryApi.getAll(token),
      ]);
      if (p.status === "fulfilled") setProducts(p.value.data?.products || []);
      if (s.status === "fulfilled") setScreens(s.value.data?.screens || []);
      if (c.status === "fulfilled") {
        const cats = (c.value.data?.categories || []).filter((x) => x.isActive).map((x) => x.name);
        setCategories(cats);
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [token]);

  // ─── Products CRUD ────────────────────────────
  const openAdd  = () => { setForm({ ...emptyProduct, category: categories[0] || "" }); setModalFile(null); setModalPreview(null); setModal({ mode: "add" }); };
  const openEdit = (p) => {
    setForm({
      ...p,
      features: (p.features || []).join(", "),
      priceUSD: p.priceUSD != null ? String(p.priceUSD) : String(p.price ?? ""),
      lsVariantId:    p.lsVariantId    || "",
      lsVariantIdEur: p.lsVariantIdEur || "",
      priceINR: p.priceINR != null ? String(p.priceINR) : "",
      priceEUR: p.priceEUR != null ? String(p.priceEUR) : "",
    });
    setModalFile(null);
    setModalPreview(p.image || null);
    setModal({ mode: "edit", data: p });
  };

  const handleSave = async () => {
    if (!form.name.trim())     return flash("error", "Product name is required.");
    if (!form.category)        return flash("error", "Please select a category. Create one in the Categories page first if needed.");
    if (!form.priceUSD)        return flash("error", "USD price is required.");
    setSaving(true);
    try {
      const payload = {
        ...form,
        price:    parseFloat(form.priceUSD) || 0,
        priceUSD: form.priceUSD !== "" ? parseFloat(form.priceUSD) : null,
        priceINR: form.priceINR !== "" ? parseFloat(form.priceINR) : null,
        priceEUR: form.priceEUR !== "" ? parseFloat(form.priceEUR) : null,
        features: form.features ? form.features.split(",").map((f) => f.trim()).filter(Boolean) : [],
        slug:     form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
        lsVariantId:    form.lsVariantId?.trim()    || null,
        lsVariantIdEur: form.lsVariantIdEur?.trim() || null,
      };
      let savedId = modal.data?._id;
      if (modal.mode === "add") {
        const res = await productApi.create(payload, token);
        savedId = res.data?._id;
      } else {
        await productApi.update(modal.data._id, payload, token);
      }
      // Upload image if one was selected in the modal
      if (modalFile && savedId) {
        await productApi.uploadImage(savedId, modalFile, token);
      }
      flash("success", modal.mode === "add" ? "Product created!" : "Product updated!");
      setModal(null);
      setModalFile(null);
      setModalPreview(null);
      load();
    } catch (err) { flash("error", err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this product? Its Cloudinary image will also be removed.")) return;
    try { await productApi.delete(id, token); flash("success", "Product deleted."); load(); }
    catch (err) { flash("error", err.message); }
  };

  // ─── Image upload ─────────────────────────────
  const openImageModal = (product) => {
    setSelectedFile(null);
    setPreviewUrl(product.image || null);
    setImageModal({ product });
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUploadImage = async () => {
    if (!selectedFile) return flash("error", "Please select an image first.");
    setUploading(true);
    try {
      const res = await productApi.uploadImage(imageModal.product._id, selectedFile, token);
      flash("success", "Image uploaded to Cloudinary!");
      setImageModal(null);
      setSelectedFile(null);
      setPreviewUrl(null);
      load();
    } catch (err) { flash("error", err.message); }
    finally { setUploading(false); }
  };

  const handleDeleteImage = async (product) => {
    if (!product.image) return;
    if (!confirm("Remove this product's image?")) return;
    try {
      await productApi.deleteImage(product._id, token);
      flash("success", "Image removed.");
      load();
      if (imageModal?.product._id === product._id) {
        setPreviewUrl(null);
        setImageModal(null);
      }
    } catch (err) { flash("error", err.message); }
  };

  // ─── Screen add-ons CRUD ──────────────────────
  const openScreenAdd  = () => { setScreenForm(emptyScreen); setScreenModal({ mode: "add" }); };
  const openScreenEdit = (s) => {
    setScreenForm({ ...s, price: String(s.price), screensGranted: String(s.screensGranted) });
    setScreenModal({ mode: "edit", data: s });
  };

  const handleScreenSave = async () => {
    setSaving(true);
    try {
      const payload = { ...screenForm, price: parseFloat(screenForm.price), screensGranted: parseInt(screenForm.screensGranted) };
      if (screenModal.mode === "add") await productApi.createScreen(payload, token);
      else await productApi.updateScreen(screenModal.data._id, payload, token);
      flash("success", screenModal.mode === "add" ? "Screen add-on created!" : "Screen add-on updated!");
      setScreenModal(null);
      load();
    } catch (err) { flash("error", err.message); }
    finally { setSaving(false); }
  };

  const handleScreenDelete = async (id) => {
    if (!confirm("Delete this screen add-on?")) return;
    try { await productApi.deleteScreen(id, token); flash("success", "Screen add-on deleted."); load(); }
    catch (err) { flash("error", err.message); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl tracking-wide text-white font-display">PRODUCTS</h1>
          <p className="mt-1 text-sm text-zinc-500">Manage subscriptions and screen add-ons</p>
        </div>
        <button
          onClick={tab === "products" ? openAdd : openScreenAdd}
          className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-all"
        >
          <Plus size={15} /> Add {tab === "products" ? "Product" : "Screen Add-on"}
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

      {/* Tabs */}
      <div className="flex gap-1 p-1 border bg-zinc-900 border-zinc-800 rounded-xl w-fit">
        {[{ key: "products", icon: Package, label: "Products" }, { key: "screens", icon: Monitor, label: "Screen Add-ons" }].map(({ key, icon: Icon, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === key ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ── Products Table ── */}
      {tab === "products" && (
        <div className="overflow-hidden border bg-zinc-900 border-zinc-800 rounded-xl">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                {["Image", "Name", "Category", "Price", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-6 py-3 text-xs font-semibold tracking-wider text-left uppercase text-zinc-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {products.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-10 text-sm text-center text-zinc-500">No products yet</td></tr>
              ) : products.map((p) => (
                <tr key={p._id} className="transition-colors hover:bg-zinc-800/30">
                  {/* Thumbnail */}
                  <td className="px-6 py-4">
                    <div
                      onClick={() => openImageModal(p)}
                      className="relative flex items-center justify-center w-12 h-12 overflow-hidden transition-colors border rounded-lg cursor-pointer border-zinc-700 bg-zinc-800 hover:border-brand group"
                      title="Click to upload/change image"
                    >
                      {p.image ? (
                        <>
                          <img src={p.image} alt={p.name} className="object-cover w-full h-full" />
                          <div className="absolute inset-0 flex items-center justify-center transition-opacity opacity-0 bg-black/50 group-hover:opacity-100">
                            <Upload size={12} className="text-white" />
                          </div>
                        </>
                      ) : (
                        <ImageIcon size={18} className="transition-colors text-zinc-600 group-hover:text-brand" />
                      )}
                    </div>
                  </td>

                  {/* Name */}
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-white">{p.name}</p>
                    <p className="font-mono text-xs text-zinc-500">{p.slug}</p>
                  </td>

                  <td className="px-6 py-4"><Badge color="blue">{p.category}</Badge></td>

                  <td className="px-6 py-4 text-sm font-semibold text-white">
                    ${p.price}<span className="text-xs font-normal text-zinc-500">/{p.billingCycle}</span>
                  </td>

                  <td className="px-6 py-4">
                    <Badge color={p.isActive ? "green" : "zinc"} dot>{p.isActive ? "Active" : "Inactive"}</Badge>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openImageModal(p)} title="Upload image"
                        className="p-1.5 text-zinc-400 hover:text-brand hover:bg-brand/10 rounded-lg transition-colors">
                        <Upload size={14} />
                      </button>
                      <button onClick={() => openEdit(p)} title="Edit product"
                        className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(p._id)} title="Delete product"
                        className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Screens Table ── */}
      {tab === "screens" && (
        <div className="overflow-hidden border bg-zinc-900 border-zinc-800 rounded-xl">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                {["Name", "Screens Granted", "Price", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-6 py-3 text-xs font-semibold tracking-wider text-left uppercase text-zinc-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {screens.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-10 text-sm text-center text-zinc-500">No screen add-ons yet</td></tr>
              ) : screens.map((s) => (
                <tr key={s._id} className="transition-colors hover:bg-zinc-800/30">
                  <td className="px-6 py-4 text-sm font-medium text-white">{s.name}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Monitor size={14} className="text-brand" />
                      <span className="font-semibold text-white">{s.screensGranted}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-white">
                    ${s.price}<span className="text-xs font-normal text-zinc-500">/{s.billingCycle}</span>
                  </td>
                  <td className="px-6 py-4"><Badge color={s.isActive ? "green" : "zinc"} dot>{s.isActive ? "Active" : "Inactive"}</Badge></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openScreenEdit(s)} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => handleScreenDelete(s._id)} className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Image Upload Modal ── */}
      <Modal open={!!imageModal} onClose={() => { setImageModal(null); setSelectedFile(null); setPreviewUrl(null); }}
        title={`Upload Image — ${imageModal?.product?.name}`} width="max-w-md">
        <div className="space-y-4">
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="p-6 text-center transition-colors border-2 border-dashed cursor-pointer border-zinc-700 hover:border-brand rounded-xl group"
          >
            {previewUrl ? (
              <div className="relative">
                <img src={previewUrl} alt="preview" className="object-contain w-full mx-auto rounded-lg max-h-48" />
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setPreviewUrl(imageModal?.product?.image || null); }}
                  className="absolute p-1 text-white transition-colors rounded-full top-2 right-2 bg-black/60 hover:bg-red-500/80"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div className="py-4">
                <Upload size={28} className="mx-auto mb-3 transition-colors text-zinc-600 group-hover:text-brand" />
                <p className="text-sm font-medium text-zinc-400">Drop an image here or click to browse</p>
                <p className="mt-1 text-xs text-zinc-600">JPEG, PNG, WebP · max 5 MB</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* Current image info */}
          {imageModal?.product?.image && !selectedFile && (
            <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-zinc-800">
              <div>
                <p className="text-xs font-medium text-zinc-300">Current image (Cloudinary)</p>
                <p className="text-zinc-600 text-[10px] font-mono truncate max-w-[220px]">{imageModal.product.image}</p>
              </div>
              <button
                onClick={() => handleDeleteImage(imageModal.product)}
                className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Remove image"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-zinc-800">
            <button
              onClick={handleUploadImage}
              disabled={!selectedFile || uploading}
              className="flex items-center gap-2 bg-brand hover:bg-brand-dark disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-all"
            >
              {uploading ? <Spinner size={14} /> : <Upload size={14} />}
              {uploading ? "Uploading..." : "Upload to Cloudinary"}
            </button>
            <button
              onClick={() => { setImageModal(null); setSelectedFile(null); setPreviewUrl(null); }}
              className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Product Edit/Add Modal ── */}
      <Modal open={!!modal} onClose={() => setModal(null)}
        title={modal?.mode === "add" ? "Add Product" : "Edit Product"} width="max-w-2xl">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block mb-2 text-xs font-semibold tracking-widest uppercase text-zinc-400">Name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-brand transition-colors"
              placeholder="F1 Premium" />
          </div>
          <div>
            <label className="block mb-2 text-xs font-semibold tracking-widest uppercase text-zinc-400">Product Image</label>
            <div
              onClick={() => modalFileRef.current?.click()}
              className="flex items-center w-full h-10 gap-3 px-3 transition-colors border rounded-lg cursor-pointer bg-zinc-800 border-zinc-700 hover:border-brand"
            >
              {modalPreview
                ? <img src={modalPreview} alt="preview" className="object-cover rounded h-7 w-7 shrink-0" />
                : <ImageIcon size={16} className="text-zinc-600 shrink-0" />
              }
              <span className="text-sm truncate text-zinc-400">
                {modalFile ? modalFile.name : modalPreview ? "Image selected" : "Click to upload image"}
              </span>
              {(modalFile || (modalPreview && modal?.mode === "edit")) && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setModalFile(null); setModalPreview(modal?.data?.image || null); }}
                  className="ml-auto transition-colors text-zinc-600 hover:text-red-400"
                >
                  <X size={14} />
                </button>
              )}
              <input ref={modalFileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  setModalFile(file);
                  setModalPreview(URL.createObjectURL(file));
                }}
              />
            </div>
          </div>
          <div className="col-span-2">
            <label className="block mb-2 text-xs font-semibold tracking-widest uppercase text-zinc-400">
              Pricing <span className="font-normal normal-case text-zinc-600">(blank = not offered in that currency)</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5">$ USD *</label>
                <input type="number" min="0" step="0.01" value={form.priceUSD}
                  onChange={(e) => setForm({ ...form, priceUSD: e.target.value })}
                  className="w-full px-3 py-2 text-sm transition-colors border rounded-lg bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-brand"
                  placeholder="19.99" />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5">₹ INR</label>
                <input type="number" min="0" step="1" value={form.priceINR}
                  onChange={(e) => setForm({ ...form, priceINR: e.target.value })}
                  className="w-full px-3 py-2 text-sm transition-colors border rounded-lg bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-brand"
                  placeholder="499" />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5">€ EUR</label>
                <input type="number" min="0" step="0.01" value={form.priceEUR}
                  onChange={(e) => setForm({ ...form, priceEUR: e.target.value })}
                  className="w-full px-3 py-2 text-sm transition-colors border rounded-lg bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-brand"
                  placeholder="17.99" />
              </div>
            </div>
          </div>
          <div>
            <label className="block mb-2 text-xs font-semibold tracking-widest uppercase text-zinc-400">Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-brand transition-colors">
              {categories.length === 0
                ? <option value="">No categories — create one in Categories page first</option>
                : <>
                    <option value="" disabled>Select a category…</option>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </>
              }
            </select>
          </div>
          <div>
            <label className="block mb-2 text-xs font-semibold tracking-widest uppercase text-zinc-400">Billing Cycle</label>
            <select value={form.billingCycle} onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-brand transition-colors">
              {BILLING.map((b) => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block mb-2 text-xs font-semibold tracking-widest uppercase text-zinc-400">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-brand transition-colors resize-none"
              placeholder="Short description..." />
          </div>
          <div className="col-span-2">
            <label className="block mb-2 text-xs font-semibold tracking-widest uppercase text-zinc-400">Features (comma-separated)</label>
            <input value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-brand transition-colors"
              placeholder="HD streaming, 4 screens, Downloads..." />
          </div>
          <div className="flex items-center col-span-2 gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 accent-brand" />
              <span className="text-sm text-zinc-300">Active</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} className="w-4 h-4 accent-brand" />
              <span className="text-sm text-zinc-300">Featured</span>
            </label>
          </div>
        </div>
        <div className="flex gap-3 pt-4 mt-6 border-t border-zinc-800">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 text-xs font-semibold tracking-widest uppercase text-zinc-400">
                LS Variant ID <span className="font-normal normal-case text-zinc-600">USD store</span>
              </label>
              <input
                value={form.lsVariantId || ""}
                onChange={(e) => setForm({ ...form, lsVariantId: e.target.value })}
                placeholder="e.g. 123456"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-brand transition-colors font-mono"
              />
            </div>
            <div>
              <label className="block mb-2 text-xs font-semibold tracking-widest uppercase text-zinc-400">
                LS Variant ID <span className="font-normal normal-case text-zinc-600">EUR store</span>
              </label>
              <input
                value={form.lsVariantIdEur || ""}
                onChange={(e) => setForm({ ...form, lsVariantIdEur: e.target.value })}
                placeholder="e.g. 789012"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-brand transition-colors font-mono"
              />
            </div>
          </div>
          <p className="-mt-2 text-xs text-zinc-600">LemonSqueezy → Products → your product → Variants → copy the numeric ID from each store</p>

          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 bg-brand hover:bg-brand-dark disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-all">
            {saving ? <Spinner size={14} /> : null} {saving ? "Saving..." : "Save Product"}
          </button>
          <button onClick={() => setModal(null)}
            className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-semibold transition-colors">
            Cancel
          </button>
        </div>
      </Modal>

      {/* ── Screen Add-on Modal ── */}
      <Modal open={!!screenModal} onClose={() => setScreenModal(null)}
        title={screenModal?.mode === "add" ? "Add Screen Add-on" : "Edit Screen Add-on"}>
        <div className="space-y-4">
          <div>
            <label className="block mb-2 text-xs font-semibold tracking-widest uppercase text-zinc-400">Name *</label>
            <input value={screenForm.name} onChange={(e) => setScreenForm({ ...screenForm, name: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-brand transition-colors"
              placeholder="1 Extra Screen" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 text-xs font-semibold tracking-widest uppercase text-zinc-400">Price ($) *</label>
              <input type="number" value={screenForm.price} onChange={(e) => setScreenForm({ ...screenForm, price: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-brand transition-colors"
                placeholder="4.99" />
            </div>
            <div>
              <label className="block mb-2 text-xs font-semibold tracking-widest uppercase text-zinc-400">Screens Granted *</label>
              <input type="number" min={1} value={screenForm.screensGranted} onChange={(e) => setScreenForm({ ...screenForm, screensGranted: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-brand transition-colors"
                placeholder="1" />
            </div>
          </div>
          <div>
            <label className="block mb-2 text-xs font-semibold tracking-widest uppercase text-zinc-400">Description</label>
            <input value={screenForm.description} onChange={(e) => setScreenForm({ ...screenForm, description: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-brand transition-colors"
              placeholder="Add one extra concurrent screen..." />
          </div>
        </div>
        <div className="flex gap-3 pt-4 mt-6 border-t border-zinc-800">
          <button onClick={handleScreenSave} disabled={saving}
            className="flex items-center gap-2 bg-brand hover:bg-brand-dark disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-all">
            {saving ? <Spinner size={14} /> : null} {saving ? "Saving..." : "Save"}
          </button>
          <button onClick={() => setScreenModal(null)}
            className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-semibold transition-colors">
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
}