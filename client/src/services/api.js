const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

export async function apiRequest(endpoint, options = {}) {
  const token =
    sessionStorage.getItem("mbrems_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("anova_auth_token");

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...(options.body !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message || "Something went wrong with the API request."
    );
  }

  const method = (options.method || "GET").toUpperCase();
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("anova_records_updated", {
          detail: { endpoint, method },
        })
      );
    }
  }

  return data;
}

export default API_BASE_URL;