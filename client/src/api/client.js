
const BASE_URL = import.meta.env.VITE_API_URL || '';

export async function apiClient(endpoint, options = {}) {
  const token =
    sessionStorage.getItem('mbrems_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('anova_auth_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const config = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body !== undefined) {
    config.body =
      typeof options.body === 'string'
        ? options.body
        : JSON.stringify(options.body);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);
    const json = await response.json().catch(() => null);

    if (!response.ok) {
      const error = new Error(json?.message || `HTTP ${response.status}`);
      error.status = response.status;
      error.data = json;
      throw error;
    }

    return json;
  } catch (error) {
    console.warn(`[ANOVA API] Request to ${endpoint} failed:`, error.message);
    throw error;
  }
}
