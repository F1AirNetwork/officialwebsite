import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import homeBg from "../assets/home-bg.png";
import { authApi } from "../api/api.js";
import { useAuth } from "../context/AuthContext.jsx";

const OtpVerify = () => {
  const location           = useLocation();
  const navigate           = useNavigate();
  const { loginWithToken } = useAuth();

  const email = location.state?.email || "";

  const [otp, setOtp]         = useState(["", "", "", "", "", ""]);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs             = useRef([]);

  useEffect(() => { if (!email) navigate("/signup"); }, [email]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const handleChange = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[i] = val.slice(-1);
    setOtp(next);
    if (val && i < 5) inputRefs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) inputRefs.current[i - 1]?.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length < 6) return setError("Please enter all 6 digits.");
    setError("");
    setLoading(true);
    try {
      const res = await authApi.verifyEmail({ email, otp: code });
      await loginWithToken(res.data.accessToken);
      setSuccess("Email verified! Redirecting...");
      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      setError(err.message || "Invalid OTP. Please try again.");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true); setError("");
    try {
      await authApi.resendOtp({ email, type: "verify_email" });
      setSuccess("New OTP sent!");
      setCountdown(60);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to resend OTP.");
    } finally {
      setResending(false);
    }
  };

  return (
    <section className="w-screen min-h-screen flex items-center justify-center bg-black pt-20 px-4">
      <div className="fixed inset-0 z-0 bg-black" style={{ backgroundImage: `url(${homeBg})`, backgroundSize: "cover", backgroundPosition: "center" }} />
      <div className="fixed inset-0 bg-black/75 z-10" />

      <div className="relative z-20 w-full max-w-md mx-auto bg-black/60 backdrop-blur-md border border-white/15 rounded-xl p-6 sm:p-8 text-center">

        <div className="w-16 h-16 rounded-full border border-white/20 flex items-center justify-center mx-auto mb-6">
          <span className="text-2xl">✉️</span>
        </div>

        <h1 className="font-f1 text-2xl uppercase tracking-widest mb-2">Verify Email</h1>
        <p className="font-f1_n text-white/60 text-sm mb-1">We sent a 6-digit code to</p>
        <p className="text-white font-semibold text-sm mb-8">{email}</p>

        {error   && <div className="mb-5 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-md">{error}</div>}
        {success && <div className="mb-5 bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-4 py-3 rounded-md">{success}</div>}

        {/* OTP boxes */}
        <div className="flex justify-center gap-3 mb-8" onPaste={handlePaste}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-12 h-14 text-center text-xl font-bold bg-black border border-white/25 rounded-md outline-none focus:border-white transition"
            />
          ))}
        </div>

        <button
          onClick={handleVerify}
          disabled={loading || otp.join("").length < 6}
          className="w-full font-f1 bg-white text-black py-3 rounded-md uppercase tracking-widest text-sm hover:bg-neutral-200 transition disabled:opacity-50 disabled:cursor-not-allowed mb-4"
        >
          {loading ? "Verifying..." : "Verify OTP"}
        </button>

        <div className="text-sm text-white/60">
          Didn't receive it?{" "}
          {countdown > 0
            ? <span className="text-white/40">Resend in {countdown}s</span>
            : <button onClick={handleResend} disabled={resending} className="text-white hover:underline disabled:opacity-50">
                {resending ? "Sending..." : "Resend OTP"}
              </button>
          }
        </div>
      </div>
    </section>
  );
};

export default OtpVerify;
