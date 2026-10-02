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
