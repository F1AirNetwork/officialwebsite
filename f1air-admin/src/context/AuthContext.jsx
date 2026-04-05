import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { authApi } from "../api/api.js";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin]     = useState(null);
  const [token, setToken]     = useState(() => localStorage.getItem("adminToken"));
  const [loading, setLoading] = useState(true);
  const refreshTimer          = useRef(null);

  // ── Refresh access token using httpOnly cookie ──────────────────────────
  const refreshAccessToken = useCallback(async () => {
    try {
      const res = await authApi.refresh();
      const newToken = res.data.accessToken;
      localStorage.setItem("adminToken", newToken);
      setToken(newToken);
      return newToken;
    } catch {
      // Refresh failed — log out
      localStorage.removeItem("adminToken");
      setToken(null);
      setAdmin(null);
      return null;
    }
  }, []);

  // ── Schedule next refresh 1 minute before expiry (token lasts 15 min) ──
  const scheduleRefresh = useCallback((delay = 14 * 60 * 1000) => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(async () => {
      const newToken = await refreshAccessToken();
      if (newToken) scheduleRefresh(); // keep refreshing while logged in
    }, delay);
  }, [refreshAccessToken]);

  // ── Verify token on mount ───────────────────────────────────────────────
  useEffect(() => {
    const verify = async () => {
      if (!token) { setLoading(false); return; }
      try {
        const res = await authApi.me(token);
        if (res.data.role !== "admin") throw new Error("Not an admin");
        setAdmin(res.data);
        scheduleRefresh(); // start refresh cycle
      } catch {
        // Token may be expired — try refresh first
        const newToken = await refreshAccessToken();
        if (newToken) {
          try {
            const res = await authApi.me(newToken);
            if (res.data.role !== "admin") throw new Error("Not an admin");
            setAdmin(res.data);
            scheduleRefresh();
          } catch {
            localStorage.removeItem("adminToken");
            setToken(null);
            setAdmin(null);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    verify();
    return () => { if (refreshTimer.current) clearTimeout(refreshTimer.current); };
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authApi.login({ email, password });
    if (res.data.user.role !== "admin") {
      throw new Error("Access denied. Admin accounts only.");
    }
    const accessToken = res.data.accessToken;
    localStorage.setItem("adminToken", accessToken);
    setToken(accessToken);
    setAdmin(res.data.user);
    scheduleRefresh();
    return res.data.user;
  }, [scheduleRefresh]);

  const logout = useCallback(async () => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    try { await authApi.logout(token); } catch {}
    localStorage.removeItem("adminToken");
    setToken(null);
    setAdmin(null);
  }, [token]);

  return (
    <AuthContext.Provider value={{ admin, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);