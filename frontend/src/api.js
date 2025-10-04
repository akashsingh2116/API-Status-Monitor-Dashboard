// src/api.js - central API service
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/api/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function fetchLogs(from, to, page = 1) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  params.set('page', page);
  const res = await fetch(`${API_BASE}/api/logs?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch logs');
  return res.json();
}

export async function fetchConfigs() {
  const res = await fetch(`${API_BASE}/api/config`);
  if (!res.ok) throw new Error('Failed to fetch configs');
  return res.json();
}

export async function upsertConfig(apiName, configObj) {
  const res = await fetch(`${API_BASE}/api/config/${encodeURIComponent(apiName)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(configObj)
  });
  if (!res.ok) throw new Error('Failed to save config');
  return res.json();
}
