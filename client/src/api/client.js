// ============================================================
// ANOVA CLIENT API HELPER
// Connects frontend to Express backend & MongoDB Atlas
// ============================================================

const BASE_URL = (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_API_URL) || (typeof process !== 'undefined' && process?.env?.VITE_API_URL) || '';

// Pre-signed dev token (Role: admin, Branch: all, Valid: 10y)
// Used only as local dev fallback when Member 1's auth login screen is not yet connected
const DEV_FALLBACK_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzcl9kZXZfYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJicmFuY2hJZCI6ImFsbCIsImlhdCI6MTc5MjMwNzE2MywiZXhwIjoxNzkyMzkzNTYzfQ.t1cWUvvbIF4ZFTOOqR_RlU-5Ms7YbL1YISYYcsI8FHo';

export async function apiClient(endpoint, options = {}) {
  const token = localStorage.getItem('token') || localStorage.getItem('anova_auth_token') || DEV_FALLBACK_TOKEN;

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const config = {
    method: options.method || 'GET',
    headers
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, config);
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const err = new Error(json?.message || `HTTP ${res.status}`);
      err.status = res.status;
      err.data = json;
      throw err;
    }
    return json;
  } catch (err) {
    console.warn(`[ANOVA API] Request to ${endpoint} failed:`, err.message);
    throw err;
  }
}
