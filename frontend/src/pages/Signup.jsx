import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import homeBg from "../assets/home-bg.png";
import btnGoogleSignUp from "../assets/btn_google_signup.svg";
import { authApi } from "../api/api.js";

// ─── Country list (inlined — no separate file needed) ─────────────────────────
const COUNTRIES = [
  { code: "AF", name: "Afghanistan" },
  { code: "AL", name: "Albania" },
  { code: "DZ", name: "Algeria" },
  { code: "AR", name: "Argentina" },
  { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" },
  { code: "BD", name: "Bangladesh" },
  { code: "BE", name: "Belgium" },
  { code: "BT", name: "Bhutan" },
  { code: "BA", name: "Bosnia and Herzegovina" },
  { code: "BR", name: "Brazil" },
  { code: "BG", name: "Bulgaria" },
  { code: "KH", name: "Cambodia" },
  { code: "CA", name: "Canada" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CO", name: "Colombia" },
  { code: "HR", name: "Croatia" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czech Republic" },
  { code: "DK", name: "Denmark" },
  { code: "EG", name: "Egypt" },
  { code: "EE", name: "Estonia" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "GH", name: "Ghana" },
  { code: "GR", name: "Greece" },
  { code: "HU", name: "Hungary" },
  { code: "IS", name: "Iceland" },
  { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" },
  { code: "IE", name: "Ireland" },
  { code: "IL", name: "Israel" },
  { code: "IT", name: "Italy" },
  { code: "JP", name: "Japan" },
  { code: "KE", name: "Kenya" },
  { code: "KR", name: "South Korea" },
  { code: "LA", name: "Laos" },
  { code: "LV", name: "Latvia" },
  { code: "LI", name: "Liechtenstein" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MY", name: "Malaysia" },
  { code: "MT", name: "Malta" },
  { code: "MX", name: "Mexico" },
  { code: "ME", name: "Montenegro" },
  { code: "MM", name: "Myanmar" },
  { code: "NP", name: "Nepal" },
  { code: "NL", name: "Netherlands" },
  { code: "NZ", name: "New Zealand" },
  { code: "NG", name: "Nigeria" },
  { code: "MK", name: "North Macedonia" },
  { code: "NO", name: "Norway" },
  { code: "PK", name: "Pakistan" },
  { code: "PH", name: "Philippines" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "RO", name: "Romania" },
  { code: "RS", name: "Serbia" },
  { code: "SG", name: "Singapore" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "ZA", name: "South Africa" },
  { code: "ES", name: "Spain" },
  { code: "LK", name: "Sri Lanka" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "TH", name: "Thailand" },
  { code: "TR", name: "Turkey" },
  { code: "UA", name: "Ukraine" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "VN", name: "Vietnam" },
];

const INR_SET = new Set(["IN","NP","BD","LK","BT","PK","MM","TH","KH","LA","VN","ID","MY","PH","SG"]);
const EUR_SET = new Set(["AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE","NO","IS","LI","CH","AL","BA","ME","MK","RS"]);

const getCurrencyForCountry = (code) => {
  if (INR_SET.has(code)) return { code: "INR", symbol: "₹", name: "Indian Rupee" };
  if (EUR_SET.has(code)) return { code: "EUR", symbol: "€", name: "Euro" };
  return                        { code: "USD", symbol: "$", name: "US Dollar" };
};
// ─────────────────────────────────────────────────────────────────────────────

const INPUT = "w-full bg-black/80 border border-white/25 px-4 py-3 rounded-md text-sm outline-none focus:border-white transition";
const LABEL = "font-f1_n block text-xs uppercase tracking-widest mb-1 text-white/70";

const Signup = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "",
    password: "", confirmPassword: "", country: "",
  });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const getStrength = () => {
    const { password } = form;
    if (password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password))
      return { label: "Strong", color: "bg-green-500", width: "w-full" };
    if (password.length >= 4 && /[A-Za-z]/.test(password) && /\d/.test(password))
      return { label: "Medium", color: "bg-yellow-400", width: "w-2/3" };
    return { label: "Weak", color: "bg-red-500", width: "w-1/3" };
  };
  const strength = getStrength();

  const currencyInfo = form.country ? getCurrencyForCountry(form.country) : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.country) return setError("Please select your country.");
    if (form.password !== form.confirmPassword) return setError("Passwords do not match.");
    setLoading(true);
    try {
      await authApi.register({
        firstName:       form.firstName,
        lastName:        form.lastName,
        email:           form.email,
        password:        form.password,
        confirmPassword: form.confirmPassword,
        country:         form.country,
      });
      navigate("/verify-email", { state: { email: form.email } });
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative flex items-center justify-center w-screen min-h-screen px-4 pt-20 bg-black">

      {/* Background */}
      <div className="fixed inset-0 z-0"
        style={{ backgroundImage: `url(${homeBg})`, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }} />
      <div className="fixed inset-0 z-10 bg-black/70" />

      {/* Card */}
      <div className="relative z-20 w-full max-w-md p-6 mx-auto -mt-10 border lg:-mt-14 bg-black/60 backdrop-blur-md border-white/15 rounded-xl sm:p-8">

        <h1 className="mb-2 text-2xl tracking-widest text-center uppercase font-f1 sm:text-3xl">Sign Up</h1>
        <p className="mb-6 text-sm text-center font-f1_n text-white/70">Create your F1 Air Network account</p>

        {/* Google */}
        <div className="flex justify-center mb-6">
          <button
            type="button"
            onClick={() => authApi.googleLogin()}
            className="transition-opacity hover:opacity-80 active:opacity-60 border-none outline-none bg-transparent p-0 focus:outline-none focus:ring-0 [border:none!important] [box-shadow:none!important] overflow-hidden rounded-full block leading-none"
          >
            <img src={btnGoogleSignUp} alt="Sign up with Google" className="w-auto h-auto" />
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-white/15" />
          <span className="text-xs tracking-widest uppercase text-white/50">Or</span>
          <div className="flex-1 h-px bg-white/15" />
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 mb-4 text-sm text-red-400 border rounded-md bg-red-500/10 border-red-500/30">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>

          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>First Name</label>
              <input type="text" value={form.firstName} onChange={set("firstName")} required
                placeholder="Lewis" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Last Name</label>
              <input type="text" value={form.lastName} onChange={set("lastName")} required
                placeholder="Hamilton" className={INPUT} />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className={LABEL}>Email</label>
            <input type="email" value={form.email} onChange={set("email")} required
              placeholder="you@email.com" className={INPUT} />
          </div>

          {/* Country */}
          <div>
            <label className={LABEL}>Country</label>
            <select
              value={form.country}
              onChange={set("country")}
              required
              className={`${INPUT} appearance-none cursor-pointer`}
              style={{ color: form.country ? "white" : "rgba(255,255,255,0.35)" }}
            >
              <option value="" disabled style={{ color: "#666" }}>Select your country…</option>
              {COUNTRIES.map(({ code, name }) => (
                <option key={code} value={code} style={{ color: "white", background: "#111" }}>
                  {name}
                </option>
              ))}
            </select>

            {/* Live currency preview */}
            {currencyInfo && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-white/40">Pricing currency:</span>
                <span className="inline-flex items-center gap-1 bg-white/5 border border-white/15 rounded px-2 py-0.5">
                  <span className="text-xs font-semibold text-white">{currencyInfo.symbol} {currencyInfo.code}</span>
                  <span className="text-xs text-white/40">— {currencyInfo.name}</span>
                </span>
              </div>
            )}
          </div>

          {/* Password */}
          <div>
            <label className={LABEL}>Password</label>
            <input type="password" value={form.password} onChange={set("password")} required className={INPUT} />
            {form.password.length > 0 && (
              <div className="mt-2">
                <div className="w-full h-1 rounded bg-white/10">
                  <div className={`h-1 rounded ${strength.color} ${strength.width} transition-all`} />
                </div>
                <p className="mt-1 text-xs text-white/70">Strength: <span className="uppercase font-f1">{strength.label}</span></p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className={LABEL}>Confirm Password</label>
            <input type="password" value={form.confirmPassword} onChange={set("confirmPassword")} required className={INPUT} />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-sm tracking-widest text-white uppercase transition bg-white rounded-md font-f1 hover:bg-neutral-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div className="mt-6 text-sm text-center text-white/70">
          Already have an account?{" "}
          <Link to="/login" className="text-white hover:underline">Login</Link>
        </div>
      </div>
    </section>
  );
};

export default Signup;