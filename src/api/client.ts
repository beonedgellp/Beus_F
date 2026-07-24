import axios from 'axios';

// Normalise the configured base URL: strip any trailing slash(es). A trailing
// slash makes `io(API_URL)` request a bogus Socket.IO namespace ("Invalid
// namespace"), and also produces double slashes in the axios baseURL.
export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/+$/, '');

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
