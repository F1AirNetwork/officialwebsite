import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { featuredApi, streamApi } from "../api/api.js";
import { Home, Save, ImagePlus, X, Eye, Monitor, ToggleLeft, ToggleRight } from "lucide-react";
import Spinner from "../components/ui/Spinner.jsx";

export default function Homepage() {
  const { token } = useAuth();

  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState(null);
  const [streams, setStreams]    = useState([]);

  // Form state
  const [title, setTitle]               = useState("");
  const [subtitle, setSubtitle]         = useState("");
  const [linkedStream, setLinkedStream] = useState("");
  const [buttonText, setButtonText]     = useState("");
  const [buttonLink, setButtonLink]     = useState("");
  const [showButton, setShowButton]     = useState(true);
  const [active, setActive]             = useState(true);

  // Thumbnail state
  const [imageFile, setImageFile]                       = useState(null);
  const [imagePreview, setImagePreview]                 = useState(null);
  const [serverThumbnail, setServerThumbnail]           = useState(null);
  const [removedServerThumbnail, setRemovedServerThumbnail] = useState(false);
  const fileInputRef = useRef(null);

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3500);
  };

  const inputCls = "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/50 transition-colors";
  const labelCls = "block mb-2 text-xs font-semibold tracking-widest uppercase text-zinc-400";

  // ─── Load data on mount ─────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [featuredRes, streamsRes] = await Promise.all([
          featuredApi.get(token),
          streamApi.getAll(token),
        ]);

        const d = featuredRes.data || {};
        setTitle(d.title || "");
        setSubtitle(d.subtitle || "");
        setLinkedStream(d.streamId?._id || d.streamId || "");
        setButtonText(d.buttonText || "");
        setButtonLink(d.buttonLink || "");
        setShowButton(d.showButton ?? true);
        setActive(d.isActive ?? true);
        setServerThumbnail(d.thumbnail || null);
        setImagePreview(d.thumbnail || null);

        const list = Array.isArray(streamsRes.data) ? streamsRes.data : [streamsRes.data].filter(Boolean);
        setStreams(list);
      } catch {
        flash("error", "Failed to load homepage config.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  // ─── Image handlers ─────────────────────────
  const handleImagePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setRemovedServerThumbnail(false);
  };

  const handleRemoveImage = () => {
    if (serverThumbnail && !imageFile) {
      setRemovedServerThumbnail(true);
    }
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ─── Stream selection handler ───────────────
  const handleStreamSelect = (e) => {
    const id = e.target.value;
    setLinkedStream(id);
    if (id) {
      setButtonLink(`/livestream/${id}`);
    }
  };

  // ─── Save handler ───────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {
        title:        title.trim(),
        subtitle:     subtitle.trim(),
        streamId:     linkedStream || null,
        buttonText:   buttonText.trim(),
        buttonLink:   buttonLink.trim(),
        showButton,
        isActive:     active,
      };

      await featuredApi.update(body, token);

      // Upload new thumbnail if selected
      if (imageFile) {
        try {
          const uploadRes = await featuredApi.uploadThumbnail(imageFile, token);
          const newUrl = uploadRes.data?.thumbnail || uploadRes.data?.image;
          if (newUrl) {
            setServerThumbnail(newUrl);
            setImagePreview(newUrl);
          }
          setImageFile(null);
          setRemovedServerThumbnail(false);
        } catch {
          flash("error", "Settings saved but thumbnail upload failed.");
          setSaving(false);
          return;
        }
      }

      // Delete thumbnail if user explicitly removed it
      if (removedServerThumbnail && !imageFile) {
        try {
          await featuredApi.deleteThumbnail(token);
          setServerThumbnail(null);
          setRemovedServerThumbnail(false);
        } catch {
          flash("error", "Settings saved but thumbnail removal failed.");
          setSaving(false);
          return;
        }
      }

      flash("success", "Homepage settings saved.");
    } catch (err) {
      flash("error", err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>;

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-4xl tracking-wide text-white font-display">HOMEPAGE</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage the featured stream section on the homepage
        </p>
      </div>

      {/* Flash */}
      {msg && (
        <div className={`rounded-xl px-5 py-3 text-sm font-medium border ${
          msg.type === "success"
            ? "bg-green-500/10 text-green-400 border-green-500/20"
            : "bg-red-500/10 text-red-400 border-red-500/20"
        }`}>{msg.text}</div>
      )}

      {/* Two-column layout */}
      <div className="grid gap-8 lg:grid-cols-2">

        {/* ─── Left: Form ──────────────────────── */}
        <div className="p-6 border bg-zinc-900 border-zinc-800 rounded-2xl space-y-5">

          {/* Thumbnail upload */}
          <div>
            <label className={labelCls}>Thumbnail</label>
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

          {/* Title */}
          <div>
            <label className={labelCls}>Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Rally TV"
              className={inputCls}
            />
          </div>

          {/* Subtitle */}
          <div>
            <label className={labelCls}>Subtitle</label>
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="e.g. Rally TV Live"
              className={inputCls}
            />
          </div>

          {/* Linked Stream */}
          <div>
            <label className={labelCls}>
              Linked Stream <span className="tracking-normal normal-case text-zinc-600">(optional)</span>
            </label>
            <select
              value={linkedStream}
              onChange={handleStreamSelect}
              className={inputCls}
            >
              <option value="">— None (manual link) —</option>
              {streams.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Button Text */}
          <div>
            <label className={labelCls}>Button Text</label>
            <input
              value={buttonText}
              onChange={(e) => setButtonText(e.target.value)}
              placeholder="e.g. Join Live Stream"
              className={inputCls}
            />
          </div>

          {/* Button Link */}
          <div>
            <label className={labelCls}>Button Link</label>
            <input
              value={buttonLink}
              onChange={(e) => setButtonLink(e.target.value)}
              placeholder="e.g. /livestream"
              className={inputCls}
            />
            <p className="mt-1 text-[10px] text-zinc-600">
              Where the button navigates to. Auto-set when you select a linked stream.
            </p>
          </div>

          {/* Show Button toggle */}
          <div className="flex items-center justify-between py-3 border-t border-zinc-800">
            <div className="flex items-center gap-3">
              {showButton ? <ToggleRight size={20} className="text-brand" /> : <ToggleLeft size={20} className="text-zinc-500" />}
              <div>
                <p className="text-sm font-medium text-zinc-200">Show Button</p>
                <p className="text-[10px] text-zinc-600">Display the CTA button on the homepage</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={showButton}
              onChange={(e) => setShowButton(e.target.checked)}
              className="w-4 h-4 rounded accent-brand cursor-pointer"
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between py-3 border-t border-zinc-800">
            <div className="flex items-center gap-3">
              {active ? <ToggleRight size={20} className="text-green-400" /> : <ToggleLeft size={20} className="text-zinc-500" />}
              <div>
                <p className="text-sm font-medium text-zinc-200">Active</p>
                <p className="text-[10px] text-zinc-600">Show the featured section on the homepage</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4 rounded accent-brand cursor-pointer"
            />
          </div>

          {/* Save button */}
          <div className="pt-4 border-t border-zinc-800">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-brand hover:bg-brand-dark disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-all"
            >
              {saving ? <Spinner size={14} /> : <Save size={14} />}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {/* ─── Right: Live Preview ─────────────── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-zinc-400">
            <Eye size={14} />
            <span className="text-xs font-semibold tracking-widest uppercase">Live Preview</span>
          </div>

          <div className="overflow-hidden border bg-zinc-900 border-zinc-800 rounded-2xl">
            {/* Preview thumbnail */}
            <div className="relative w-full overflow-hidden aspect-video bg-zinc-800">
              {imagePreview ? (
                <img src={imagePreview} alt="Featured" className="object-cover w-full h-full" />
              ) : (
                <div className="flex flex-col items-center justify-center w-full h-full gap-2 text-zinc-600">
                  <Monitor size={32} />
                  <span className="text-xs">No thumbnail</span>
                </div>
              )}

              {/* Overlay with title / subtitle */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                {active && (
                  <span className="inline-block px-2 py-0.5 mb-2 text-[10px] font-bold tracking-widest uppercase rounded bg-brand/90 text-white">
                    Live
                  </span>
                )}
                <h3 className="text-lg font-semibold text-white font-display tracking-wide">
                  {title || "Featured Title"}
                </h3>
                <p className="mt-0.5 text-sm text-zinc-300">
                  {subtitle || "Featured subtitle"}
                </p>
                {showButton && (
                  <button className="mt-3 px-4 py-2 bg-brand hover:bg-brand-dark text-white text-xs font-semibold rounded-lg transition-colors">
                    {buttonText || "Watch Now"}
                  </button>
                )}
              </div>
            </div>

            {/* Preview meta */}
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Home size={12} className="text-zinc-500" />
                <span className="text-xs text-zinc-500">Homepage Featured Section</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                  active
                    ? "bg-green-500/10 text-green-400 border-green-500/20"
                    : "bg-zinc-800 text-zinc-500 border-zinc-700"
                }`}>
                  {active ? "Active" : "Inactive"}
                </span>
                {showButton && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold border bg-blue-500/10 text-blue-400 border-blue-500/20">
                    Button visible
                  </span>
                )}
                {linkedStream && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold border bg-purple-500/10 text-purple-400 border-purple-500/20">
                    Linked to stream
                  </span>
                )}
              </div>
              {buttonLink && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/60">
                  <code className="font-mono text-[10px] text-zinc-400 truncate">{buttonLink}</code>
                  <span className="ml-auto text-[9px] uppercase tracking-widest text-zinc-600 shrink-0">Link</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
