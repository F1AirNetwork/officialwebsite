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
    <section className="flex items-center justify-center w-screen min-h-screen px-4 pt-20 bg-black">
      <div className="fixed inset-0 z-0 bg-black" style={{ backgroundImage: `url(${homeBg})`, backgroundSize: "cover", backgroundPosition: "center" }} />
      <div className="fixed inset-0 z-10 bg-black/75" />

      <div className="relative z-20 w-full max-w-md p-6 mx-auto text-center border bg-black/60 backdrop-blur-md border-white/15 rounded-xl sm:p-8">

        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 border rounded-full border-white/20">
          <span className="text-2xl">✉️</span>
        </div>

        <h1 className="mb-2 text-2xl tracking-widest uppercase font-f1">Verify Email</h1>
        <p className="mb-1 text-sm font-f1_n text-white/60">We sent a 6-digit code to</p>
        <p className="mb-8 text-sm font-semibold text-white">{email}</p>

        {error   && <div className="px-4 py-3 mb-5 text-sm text-red-400 border rounded-md bg-red-500/10 border-red-500/30">{error}</div>}
        {success && <div className="px-4 py-3 mb-5 text-sm text-green-400 border rounded-md bg-green-500/10 border-green-500/30">{success}</div>}

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
              className="w-12 text-xl font-bold text-center transition bg-black border rounded-md outline-none h-14 border-white/25 focus:border-white"
            />
          ))}
        </div>

        <button
          onClick={handleVerify}
          disabled={loading || otp.join("").length < 6}
          className="w-full py-3 text-sm tracking-widest text-white uppercase transition bg-white rounded-md font-f1 hover:bg-neutral-200 disabled:opacity-60 disabled:cursor-not-allowed"
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
