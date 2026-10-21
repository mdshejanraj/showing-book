import { API_BASE } from './config.js';

const TOKEN_KEY = 'showingbook.token';
let onUnauthorized = () => {};

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } };
export const setToken = (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked */ } };
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

export async function request(method, path, body) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch(`${API_BASE}/api${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.');
  }
  if (res.status === 204) return null;
  let data = null;
  try { data = await res.json(); } catch { /* empty or non-JSON body */ }
  if (!res.ok) {
    if (res.status === 401 && token && path !== '/auth/login') onUnauthorized();
    throw new ApiError(res.status, (data && data.error) || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  login: (email, password) => request('POST', '/auth/login', { email, password }),
  me: () => request('GET', '/auth/me'),
  changePassword: (current, next) => request('POST', '/auth/change-password', { current, next }),
  bootstrap: () => request('GET', '/bootstrap'),
  create: (kind, body) => request('POST', `/${kind}`, body),
  update: (kind, id, body) => request('PUT', `/${kind}/${encodeURIComponent(id)}`, body),
  remove: (kind, id) => request('DELETE', `/${kind}/${encodeURIComponent(id)}`),
  users: () => request('GET', '/users'),
};
