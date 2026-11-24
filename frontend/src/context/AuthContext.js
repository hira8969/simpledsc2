import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api, { refreshCustomerSession } from "@/lib/api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem("sd_cached_user");
      if (cached) return JSON.parse(cached);
    } catch (_) {}
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [afterAuth, setAfterAuth] = useState(null);

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem("sd_token");
    if (!token) { setLoading(false); return; }
    try {
      const { data } = await api.get("/auth/me");
      if (data?.user) {
        setUser(data.user);
        localStorage.setItem("sd_cached_user", JSON.stringify(data.user));
      }
      if (data?.token) {
        localStorage.setItem("sd_token", data.token);
      }
    } catch (e) {
      const cached = localStorage.getItem("sd_cached_user");
      if (cached) {
        try {
          setUser(JSON.parse(cached));
        } catch (_) {}
      } else {
        try {
          const fresh = await refreshCustomerSession();
          if (fresh) {
            const { data } = await api.get("/auth/me");
            if (data?.user) {
              setUser(data.user);
              localStorage.setItem("sd_cached_user", JSON.stringify(data.user));
            }
          }
        } catch (_) {}
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const loginWithToken = (token, u) => {
    localStorage.setItem("sd_token", token);
    if (u) {
      setUser(u);
      localStorage.setItem("sd_cached_user", JSON.stringify(u));
    }
  };

  const logout = () => {
    localStorage.removeItem("sd_token");
    localStorage.removeItem("sd_cached_user");
    setUser(null);
  };

  const requireAuth = (cb) => {
    const token = localStorage.getItem("sd_token");
    if (user && (user.id || user.mobile) && token && token !== "null" && token !== "undefined") {
      cb && cb();
      return;
    }
    setAfterAuth(() => cb);
    setAuthOpen(true);
  };

  return (
    <AuthContext.Provider value={{
      user, setUser, loading, logout, loginWithToken,
      authOpen, setAuthOpen, requireAuth, afterAuth, setAfterAuth, refresh: fetchMe,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
