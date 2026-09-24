import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

const AdminAuthContext = createContext(null);
export const useAdminAuth = () => useContext(AdminAuthContext);

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem("sd_admin_token");
    if (!token) { setLoading(false); return; }
    try { const { data } = await api.get("/admin/me"); setAdmin(data.admin); }
    catch (e) { localStorage.removeItem("sd_admin_token"); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const login = (token, a) => { localStorage.setItem("sd_admin_token", token); setAdmin(a); };
  const logout = () => { localStorage.removeItem("sd_admin_token"); setAdmin(null); };

  return <AdminAuthContext.Provider value={{ admin, loading, login, logout }}>{children}</AdminAuthContext.Provider>;
}
