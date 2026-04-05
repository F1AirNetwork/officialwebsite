import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

// Google OAuth redirects back to: http://localhost:5173/auth/callback?token=ACCESS_TOKEN
// (Make sure your backend authController redirects to this URL after Google login)

const AuthCallback = () => {
  const [searchParams]     = useSearchParams();
  const { loginWithToken } = useAuth();
  const navigate           = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      navigate("/login?error=google_failed");
      return;
    }
    loginWithToken(token)
      .then(() => navigate("/"))
      .catch(() => navigate("/login?error=google_failed"));
  }, []);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-f1 uppercase tracking-widest text-sm text-white/70">Signing you in...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
