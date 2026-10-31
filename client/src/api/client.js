
const BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000'
).replace(/\/+$/, '');

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

  const normalizedEndpoint =
    endpoint.startsWith('/api/') || endpoint === '/api' || endpoint.startsWith('http')
      ? endpoint
      : `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const targetUrl = endpoint.startsWith('http')
    ? endpoint
    : `${BASE_URL}${normalizedEndpoint}`;

  try {
    const response = await fetch(targetUrl, config);
    const json = await response.json().catch(() => null);

    if (!response.ok) {
      const error = new Error(json?.message || `HTTP ${response.status}`);
      error.status = response.status;
      error.data = json;
      throw error;
    }

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(config.method.toUpperCase())) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('anova_records_updated', {
            detail: { endpoint: normalizedEndpoint, method: config.method },
          })
        );
      }
    }

    return json;
  } catch (error) {
    console.warn(`[ANOVA API] Request to ${endpoint} failed:`, error.message);
    throw error;
  }
}

apiClient.get = (endpoint, options = {}) =>
  apiClient(endpoint, { ...options, method: 'GET' });

apiClient.post = (endpoint, body, options = {}) =>
  apiClient(endpoint, { ...options, method: 'POST', body });

apiClient.put = (endpoint, body, options = {}) =>
  apiClient(endpoint, { ...options, method: 'PUT', body });

apiClient.patch = (endpoint, body, options = {}) =>
  apiClient(endpoint, { ...options, method: 'PATCH', body });

apiClient.delete = (endpoint, options = {}) =>
  apiClient(endpoint, { ...options, method: 'DELETE' });
