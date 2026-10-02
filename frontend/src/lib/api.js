import axios from "axios";

const getBackendUrl = () => {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      // In local development, connect to local backend unless explicitly set to a custom remote URL
      const envUrl = process.env.REACT_APP_BACKEND_URL || "";
      if (!envUrl || envUrl.includes("emergentagent.com") || envUrl.includes("localhost")) {
        return "http://localhost:8000";
      }
      return envUrl.replace(/\/$/, "");
    }
  }
  // In production (Vercel, custom domains, etc.)
  const envUrl = process.env.REACT_APP_BACKEND_URL;
  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
    return envUrl.replace(/\/$/, "");
  }
  return "https://simpledsc2.onrender.com";
};

const BACKEND_URL = getBackendUrl();
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const url = config.url || "";
  let token = null;
  if (url.includes("/admin")) {
    token = localStorage.getItem("sd_admin_token");
  } else if (url.includes("/agent")) {
    token = localStorage.getItem("sd_agent_token");
  } else {
    token = localStorage.getItem("sd_token");
  }
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
