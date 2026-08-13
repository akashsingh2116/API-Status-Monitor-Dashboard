// src/api.js - central API client
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const TOKEN_KEY = "token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth) {
    onUnauthorized();
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

// --- Auth ---
export const register = (email, password) =>
  request("/api/auth/register", { method: "POST", body: { email, password }, auth: false });

export const login = (email, password) =>
  request("/api/auth/login", { method: "POST", body: { email, password }, auth: false });

export const fetchMe = () => request("/api/auth/me");

// --- APIs (ApiConfig) ---
export const listApis = () => request("/api/config");

export const createApi = (name) => request("/api/config", { method: "POST", body: { name } });

export const updateApi = (id, updates) =>
  request(`/api/config/${id}`, { method: "PUT", body: updates });

export const regenerateApiKey = (id) =>
  request(`/api/config/${id}/regenerate-key`, { method: "POST" });

export const deleteApi = (id) => request(`/api/config/${id}`, { method: "DELETE" });

// --- Stats / Logs ---
export const fetchStats = (apiId, days = 7) =>
  request(`/api/stats?apiId=${encodeURIComponent(apiId)}&days=${days}`);

export const fetchLogs = ({ apiId, from, to, page = 1 } = {}) => {
  const params = new URLSearchParams();
  if (apiId) params.set("apiId", apiId);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  params.set("page", page);
  return request(`/api/logs?${params.toString()}`);
};

export const fetchGroupedLogs = (month, apiId) => {
  const params = new URLSearchParams({ month });
  if (apiId) params.set("apiId", apiId);
  return request(`/api/logs/grouped?${params.toString()}`);
};

export const API_BASE_URL = API_BASE;
