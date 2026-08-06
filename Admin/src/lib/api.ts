export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Global fetch interceptor to attach Admin JWT token to all outgoing requests
if (typeof window !== 'undefined' && !(window as any).__admin_fetch_intercepted__) {
  (window as any).__admin_fetch_intercepted__ = true;
  const originalFetch = window.fetch;
  window.fetch = async function(input, init) {
    const token = localStorage.getItem('admin_token');
    if (token) {
      init = init || {};
      const headers = new Headers(init.headers || {});
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      init.headers = headers;
    }
    return originalFetch(input, init);
  };
}

export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
) {
  const token = localStorage.getItem('admin_token');
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401 && data.expired) {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_authenticated');
    localStorage.removeItem('admin_user');
    window.location.href = '/login';
  }

  if (!response.ok) {
    const errorMsg = data.error || `API Error: ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}
