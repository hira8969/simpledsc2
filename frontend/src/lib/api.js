import axios from "axios";

const getBackendUrl = () => {
  const envUrl = process.env.REACT_APP_BACKEND_URL;
  if (envUrl && !envUrl.includes("emergentagent.com")) {
    return envUrl.replace(/\/$/, "");
  }
  return "https://simpledsc2.onrender.com";
};

const BACKEND_URL = getBackendUrl();
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ 
  baseURL: API,
  timeout: 60000,
});

// Helper: Check if token is expired or expiring in next 30 seconds
function isJwtExpired(token) {
  if (!token || token === "null" || token === "undefined") return true;
  if (token.startsWith("sd_verified_")) return false;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) return false;
    return Date.now() >= (payload.exp * 1000 - 30000);
  } catch (_) {
    return false;
  }
}

// Proactive session refresh lock to prevent stampedes
let refreshPromise = null;
export async function refreshCustomerSession(customMobile = null) {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const curToken = localStorage.getItem("sd_token");
      let mobile = customMobile || "";
      if (!mobile) {
        const cached = localStorage.getItem("sd_cached_user");
        if (cached) {
          try {
            const u = JSON.parse(cached);
            mobile = u.mobile || "";
          } catch (_) {}
        }
      }

      if (!curToken && !mobile) return null;

      const res = await axios.post(`${API}/auth/refresh-session`, {
        token: curToken && curToken !== "null" ? curToken : undefined,
        mobile: mobile || undefined,
      }, { timeout: 15000 });

      if (res.data?.token) {
        localStorage.setItem("sd_token", res.data.token);
        if (res.data.user) {
          localStorage.setItem("sd_cached_user", JSON.stringify(res.data.user));
        }
        return res.data.token;
      }
    } catch (e) {
      console.warn("[Session refresh attempt notice]:", e?.response?.data?.detail || e?.message);
    } finally {
      refreshPromise = null;
    }
    return null;
  })();
  return refreshPromise;
}

api.interceptors.request.use(async (config) => {
  const url = config.url || "";
  let token = null;

  if (url.includes("/admin")) {
    token = localStorage.getItem("sd_admin_token");
  } else if (url.includes("/agent")) {
    token = localStorage.getItem("sd_agent_token");
  } else {
    token = localStorage.getItem("sd_token");
    // Proactive refresh if token is expired on checkout or customer endpoints
    if (
      (!token || isJwtExpired(token)) &&
      (url.includes("/orders") || url.includes("/customer") || url.includes("/auth/me") || url.includes("/coupons"))
    ) {
      const refreshed = await refreshCustomerSession();
      if (refreshed) token = refreshed;
    }
  }

  if (token && token !== "null" && token !== "undefined") {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    // Automatically capture and store freshly issued tokens
    if (response?.data?.token && !response.config?.url?.includes("/admin") && !response.config?.url?.includes("/agent")) {
      localStorage.setItem("sd_token", response.data.token);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    if (error.response && error.response.status === 401 && originalRequest && !originalRequest._retry) {
      const url = originalRequest.url || "";
      if (url.includes("/admin")) {
        localStorage.removeItem("sd_admin_token");
      } else if (url.includes("/agent")) {
        localStorage.removeItem("sd_agent_token");
      } else {
        // Customer 401: attempt seamless session recovery once
        originalRequest._retry = true;
        const newToken = await refreshCustomerSession();
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
        // If recovery failed, clear stale customer token to avoid loop
        localStorage.removeItem("sd_token");
      }
    }
    return Promise.reject(error);
  }
);

export default api;
