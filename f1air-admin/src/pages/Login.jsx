import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Eye, EyeOff, LogIn } from "lucide-react";
import Spinner from "../components/ui/Spinner.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm]       = useState({ email: "", password: "" });
  const [showPw, setShowPw]   = useState(false);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-zinc-950">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center mb-4 shadow-lg w-14 h-14 bg-brand rounded-2xl shadow-brand/30">
            <span className="text-2xl text-white font-display">F1</span>
          </div>
          <h1 className="text-3xl tracking-wide text-white font-display">F1 AIR ADMIN</h1>
          <p className="mt-1 font-mono text-sm text-zinc-500">Restricted access</p>
        </div>

        {/* Card */}
        <div className="p-8 border bg-zinc-900 border-zinc-800 rounded-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block mb-2 text-xs font-semibold tracking-widest uppercase text-zinc-400">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="admin@f1air.com"
                required
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5
                           text-zinc-100 text-sm placeholder-zinc-600
                           focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/50
                           transition-colors"
              />
            </div>

            <div>
              <label className="block mb-2 text-xs font-semibold tracking-widest uppercase text-zinc-400">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 pr-10
                             text-zinc-100 text-sm placeholder-zinc-600
                             focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/50
                             transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute -translate-y-1/2 right-3 top-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 text-sm text-red-400 border rounded-lg bg-red-500/10 border-red-500/20">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center w-full gap-2 py-3 text-sm font-semibold text-white transition-all rounded-lg bg-brand hover:bg-brand-dark disabled:opacity-50"
            >
              {loading ? <Spinner size={16} /> : <LogIn size={16} />}
              {loading ? "Signing in..." : "Sign in to Admin"}
            </button>
          </form>
        </div>

        <p className="mt-6 font-mono text-xs text-center text-zinc-600">
          F1 Air Network © 2025
        </p>
      </div>
    </div>
  );
}
