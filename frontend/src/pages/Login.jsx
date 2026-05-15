import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import homeBg from "../assets/home-bg.png";
import btnGoogleSignIn from "../assets/btn_google_signin.svg";
import { useAuth } from "../context/AuthContext.jsx";
import { authApi } from "../api/api.js";

const Login = () => {
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      // Unverified account → send to OTP page
      if (err.message?.toLowerCase().includes("verif")) {
        navigate("/verify-email", { state: { email } });
      } else {
        setError(err.message || "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="flex items-center justify-center w-screen min-h-screen px-4 pt-20 bg-black">

      {/* Background */}
      <div
        className="fixed inset-0 z-0 bg-black"
        style={{ backgroundImage: `url(${homeBg})`, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }}
      />
      <div className="fixed inset-0 z-10 bg-black/70" />

      {/* Card */}
      <div className="relative z-20 w-full max-w-md p-6 mx-auto -mt-10 border lg:-mt-40 bg-black/60 backdrop-blur-md border-white/15 rounded-xl sm:p-8">

        <h1 className="mb-2 text-2xl tracking-widest text-center uppercase font-f1 sm:text-3xl">Login</h1>
        <p className="mb-6 text-sm text-center font-f1_n text-white/70">Access your F1 Air Network account</p>

        {/* Google */}
        <div className="flex justify-center mb-6">
          <button
            type="button"
            onClick={() => authApi.googleLogin()}
            className="transition-opacity hover:opacity-80 active:opacity-60 border-none outline-none bg-transparent p-0 focus:outline-none focus:ring-0 [border:none!important] [box-shadow:none!important] overflow-hidden rounded-full block leading-none"
          >
            <img src={btnGoogleSignIn} alt="Sign in with Google" className="w-auto h-auto" />
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs tracking-widest uppercase text-white/50">Or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 mb-4 text-sm text-red-400 border rounded-md bg-red-500/10 border-red-500/30">
            {error}
          </div>
        )}

        {/* Form */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block mb-1 text-xs tracking-widest uppercase font-f1_n text-white/70">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 text-sm bg-black border rounded-md outline-none border-white/20 focus:border-white"
            />
          </div>

          <div>
            <label className="block mb-1 text-xs tracking-widest uppercase font-f1_n text-white/70">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 text-sm bg-black border rounded-md outline-none border-white/20 focus:border-white"
            />
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="text-xs transition text-white/60 hover:text-white"
              >
                Forgot Password?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-sm tracking-widest text-white uppercase transition bg-white rounded-md font-f1 hover:bg-neutral-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="mt-6 text-sm text-center text-white/70">
          Don't have an account?{" "}
          <Link to="/signup" className="text-white hover:underline">Sign up</Link>
        </div>
      </div>
    </section>
  );
};

export default Login;