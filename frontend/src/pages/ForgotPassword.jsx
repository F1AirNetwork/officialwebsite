import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import homeBg from "../assets/home-bg.png";
import { authApi } from "../api/api.js";

const ForgotPassword = () => {
  const navigate  = useNavigate();
  const [step, setStep]               = useState(1);
  const [email, setEmail]             = useState("");
  const [otp, setOtp]                 = useState("");
  const [resetToken, setResetToken]   = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState("");
  const [loading, setLoading]         = useState(false);

  const handleSendOtp = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      await authApi.forgotPassword({ email });
      setSuccess("OTP sent to your email.");
      setStep(2);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res = await authApi.verifyResetOtp({ email, otp });
      setResetToken(res.data.resetToken);
      setStep(3);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return setError("Passwords do not match.");
    setError(""); setLoading(true);
    try {
      await authApi.resetPassword({ email, newPassword, confirmPassword, resetToken });
      setSuccess("Password reset! Redirecting to login...");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const titles = ["Forgot Password", "Verify OTP", "New Password"];
  const subtitles = [
    "Enter your email to receive a reset code",
    `Enter the 6-digit code sent to ${email}`,
    "Choose your new password",
  ];

  return (
    <section className="flex items-center justify-center w-screen min-h-screen px-4 pt-20 bg-black">
      <div className="fixed inset-0 z-0 bg-black" style={{ backgroundImage: `url(${homeBg})`, backgroundSize: "cover", backgroundPosition: "center" }} />
      <div className="fixed inset-0 z-10 bg-black/75" />

      <div className="relative z-20 w-full max-w-md p-6 mx-auto border bg-black/60 backdrop-blur-md border-white/15 rounded-xl sm:p-8">
        <h1 className="mb-2 text-2xl tracking-widest text-center uppercase font-f1">{titles[step - 1]}</h1>
        <p className="mb-6 text-sm text-center font-f1_n text-white/60">{subtitles[step - 1]}</p>

        {error   && <div className="px-4 py-3 mb-4 text-sm text-red-400 border rounded-md bg-red-500/10 border-red-500/30">{error}</div>}
        {success && <div className="px-4 py-3 mb-4 text-sm text-green-400 border rounded-md bg-green-500/10 border-green-500/30">{success}</div>}

        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block mb-1 text-xs tracking-widest uppercase font-f1_n text-white/70">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full px-4 py-3 text-sm bg-black border rounded-md outline-none border-white/20 focus:border-white" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 text-sm tracking-widest text-black uppercase transition bg-white rounded-md font-f1 hover:bg-neutral-200 disabled:opacity-60">
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block mb-1 text-xs tracking-widest uppercase font-f1_n text-white/70">OTP Code</label>
              <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} required
                className="w-full bg-black border border-white/20 px-4 py-3 rounded-md text-sm outline-none focus:border-white text-center tracking-[0.5em] text-lg" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 text-sm tracking-widest text-black uppercase transition bg-white rounded-md font-f1 hover:bg-neutral-200 disabled:opacity-60">
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block mb-1 text-xs tracking-widest uppercase font-f1_n text-white/70">New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required
                className="w-full px-4 py-3 text-sm bg-black border rounded-md outline-none border-white/20 focus:border-white" />
            </div>
            <div>
              <label className="block mb-1 text-xs tracking-widest uppercase font-f1_n text-white/70">Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                className="w-full px-4 py-3 text-sm bg-black border rounded-md outline-none border-white/20 focus:border-white" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 text-sm tracking-widest text-black uppercase transition bg-white rounded-md font-f1 hover:bg-neutral-200 disabled:opacity-60">
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link to="/login" className="text-xs transition text-white/50 hover:text-white">← Back to Login</Link>
        </div>
      </div>
    </section>
  );
};

export default ForgotPassword;