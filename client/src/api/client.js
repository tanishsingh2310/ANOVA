// ============================================================
// ANOVA CLIENT API HELPER
// Connects frontend to Express backend & MongoDB Atlas
// ============================================================

const BASE_URL = (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_API_URL) || (typeof process !== 'undefined' && process?.env?.VITE_API_URL) || '';

export async function apiClient(endpoint, options = {}) {
  const token = localStorage.getItem('token') || localStorage.getItem('anova_auth_token');
  const role = localStorage.getItem('anova_user_role') || 'admin';
  const branch = localStorage.getItem('anova_user_branch') || 'b_downtown';

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {
      'x-user-role': role,
      'x-user-branch': branch
    }),
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
