// client/src/modules/customer/utils/session.js
// Reads the role from the stored JWT so the UI can show the right pages.
// This is for navigation only. The backend decides what is actually allowed.
export const getToken = () => localStorage.getItem('token');
export const setToken = (t) => localStorage.setItem('token', t.trim());
export const clearToken = () => localStorage.removeItem('token');

export function getRole() {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload.role || null;
  } catch {
    return null;
  }
}
