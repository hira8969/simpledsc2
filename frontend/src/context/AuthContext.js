import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [afterAuth, setAfterAuth] = useState(null);

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem("sd_token");
    if (!token) { setLoading(false); return; }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
    } catch (e) {
      localStorage.removeItem("sd_token");
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const loginWithToken = (token, u) => {
    localStorage.setItem("sd_token", token);
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem("sd_token");
    setUser(null);
  };

  const requireAuth = (cb) => {
    if (user && user.name) { cb && cb(); return; }
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
