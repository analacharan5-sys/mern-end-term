// API Client with CSRF token & credentials support

function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[2]) : null;
}

let cachedCsrfToken = null;

function getStoredToken() {
  const fromCookie = getCookie('XSRF-TOKEN');
  if (fromCookie) return fromCookie;
  if (cachedCsrfToken) return cachedCsrfToken;
  try {
    return sessionStorage.getItem('xsrf_token') || localStorage.getItem('xsrf_token') || null;
  } catch (e) {
    return null;
  }
}

function storeToken(token) {
  if (!token) return;
  cachedCsrfToken = token;
  try {
    sessionStorage.setItem('xsrf_token', token);
    localStorage.setItem('xsrf_token', token);
  } catch (e) {
    // Ignore storage quota/permission errors
  }
}

export async function fetchCsrfToken() {
  try {
    const res = await fetch('/api/auth/csrf-token', {
      credentials: 'include'
    });
    const data = await res.json();
    if (data.csrfToken) {
      storeToken(data.csrfToken);
    }
    return data.csrfToken || getStoredToken();
  } catch (err) {
    console.warn('Failed to fetch CSRF token:', err);
    return getStoredToken();
  }
}

export async function apiRequest(endpoint, options = {}, isRetry = false) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  // State-changing requests need CSRF header
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    let token = getStoredToken();
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
    data = { success: response.ok, message: response.statusText };
  }

  // Update cached CSRF token if returned in response payload
  if (data?.csrfToken) {
    storeToken(data.csrfToken);
  }

  // If a state-changing operation failed due to CSRF token mismatch, auto-refresh token and retry once
  if (
    response.status === 403 &&
    !isRetry &&
    data?.message &&
    data.message.toLowerCase().includes('csrf')
  ) {
    console.log('[API Client] CSRF token expired or mismatched. Refreshing token and retrying request...');
    const freshToken = await fetchCsrfToken();
    if (freshToken) {
      return apiRequest(endpoint, options, true);
    }
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
