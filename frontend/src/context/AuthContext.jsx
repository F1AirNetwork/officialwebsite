import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authApi } from "../api/api.js";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]     = useState(null);
  const [token, setToken]   = useState(() => localStorage.getItem("f1airToken"));
  const [loading, setLoading] = useState(true);

  // On mount: verify existing token
  useEffect(() => {
    const verify = async () => {
      if (!token) { setLoading(false); return; }
      try {
        const res = await authApi.me(token);
        setUser(res.data);
      } catch {
        // Try refresh via httpOnly cookie
        try {
          const refreshRes = await authApi.refresh();
          const newToken = refreshRes.data.accessToken;
          localStorage.setItem("f1airToken", newToken);
          setToken(newToken);
          const meRes = await authApi.me(newToken);
          setUser(meRes.data);
        } catch {
          localStorage.removeItem("f1airToken");
          setToken(null);
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authApi.login({ email, password });
    const accessToken = res.data.accessToken;
    localStorage.setItem("f1airToken", accessToken);
    setToken(accessToken);
    setUser(res.data.user);
    return res.data;
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(token); } catch {}
    localStorage.removeItem("f1airToken");
    setToken(null);
    setUser(null);
  }, [token]);

  // Fetches fresh user data from backend — call after purchase, gift, etc.
  const refreshUser = useCallback(async () => {
    const t = localStorage.getItem("f1airToken");
    if (!t) return;
    try {
      const res = await authApi.me(t);
      setUser(res.data);
    } catch {
      // Token may have expired — try refresh
      try {
        const refreshRes = await authApi.refresh();
        const newToken = refreshRes.data.accessToken;
        localStorage.setItem("f1airToken", newToken);
        setToken(newToken);
        const meRes = await authApi.me(newToken);
        setUser(meRes.data);
      } catch {
        // Silently fail — user stays logged in with stale data
      }
    }
  }, []);

  // For Google OAuth callback or post-OTP auto-login
  const loginWithToken = useCallback(async (accessToken) => {
    localStorage.setItem("f1airToken", accessToken);
    setToken(accessToken);
    const res = await authApi.me(accessToken);
    setUser(res.data);
    return res.data;
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, loginWithToken, setUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);