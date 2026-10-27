// API Client with CSRF token & credentials support

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

let cachedCsrfToken = null;

export async function fetchCsrfToken() {
  try {
    const res = await fetch('/api/auth/csrf-token', {
      credentials: 'include'
    });
    const data = await res.json();
    if (data.csrfToken) {
      cachedCsrfToken = data.csrfToken;
    }
    return cachedCsrfToken;
  } catch (err) {
    console.warn('Failed to fetch CSRF token:', err);
    return null;
  }
}

export async function apiRequest(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  // State-changing requests need CSRF header
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    let token = getCookie('XSRF-TOKEN') || cachedCsrfToken;
    if (!token) {
      token = await fetchCsrfToken();
    }
    if (token) {
      headers['x-csrf-token'] = token;
    }
  }

  const response = await fetch(endpoint, {
    ...options,
    method,
    headers,
    credentials: 'include' // Send and receive HttpOnly cookies
  });

  let data = null;
  try {
    data = await response.json();
  } catch (err) {
    // If response was not JSON
    data = { success: response.ok, message: response.statusText };
  }

  if (!response.ok) {
    const errorMsg = data?.message || data?.error || `Request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  get: (url, options) => apiRequest(url, { ...options, method: 'GET' }),
  post: (url, body, options) => apiRequest(url, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: (url, body, options) => apiRequest(url, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  patch: (url, body, options) => apiRequest(url, { ...options, method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: (url, options) => apiRequest(url, { ...options, method: 'DELETE' })
};
