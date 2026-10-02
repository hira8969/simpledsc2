import axios from "axios";

const getBackendUrl = () => {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      // In local development, always connect to the local backend unless explicitly pointing to another localhost port
      const envUrl = process.env.REACT_APP_BACKEND_URL || "";
      if (!envUrl || envUrl.includes("emergentagent.com")) {
        return "http://localhost:8000";
      }
      return envUrl.replace(/\/$/, "");
    }
  }
  return (process.env.REACT_APP_BACKEND_URL || "http://localhost:8000").replace(/\/$/, "");
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
