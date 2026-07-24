import axios from 'axios';

// The configured backend URL (VITE_API_URL) can take several shapes:
//   - an absolute origin (e.g. "http://localhost:4000") for local dev, where
//     the frontend (5173) and backend (4000) are on different origins;
//   - a relative path (e.g. "/api") or empty, for production where nginx serves
//     the app and proxies "/api" + "/socket.io" on the SAME origin.
const RAW_API = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
const IS_ABSOLUTE = /^https?:\/\//i.test(RAW_API);

// Base for REST calls. Absolute in dev; empty (same-origin) in production so
// axios resolves to a relative "/api/..." that nginx proxies to the backend.
export const API_URL = IS_ABSOLUTE ? RAW_API : '';

// Socket.IO must connect to an ORIGIN, never a path. A path (like "/api") is
// interpreted by Socket.IO as a NAMESPACE and rejected with "Invalid
// namespace". Use the configured origin in dev, else the current site origin.
export const SOCKET_URL = IS_ABSOLUTE ? new URL(RAW_API).origin : window.location.origin;

const TOKEN_KEY = 'beus_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export const api = axios.create({
  baseURL: `${API_URL}/api`,
});

api.interceptors.request.use((cfg) => {
  const token = getToken();
  if (token) {
    cfg.headers.set('Authorization', `Bearer ${token}`);
  }
  return cfg;
});

// Optional: react to 401 by clearing the token (except during login).
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error?.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      setToken(null);
    }
    return Promise.reject(error);
  },
);

/** Fetch a protected binary resource as an object URL (for <img>/download). */
export async function fetchBlobUrl(path: string): Promise<string> {
  const res = await api.get(path, { responseType: 'blob' });
  return URL.createObjectURL(res.data as Blob);
}

/** Trigger a browser download of a protected resource. */
export async function downloadFile(path: string, fileName: string): Promise<void> {
  const res = await api.get(path, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function extractError(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as { error?: string })?.error || err.message || fallback;
  }
  return fallback;
}
