import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const isAdmin = (config.url || "").includes("/admin");
  const token = isAdmin ? localStorage.getItem("sd_admin_token") : localStorage.getItem("sd_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
