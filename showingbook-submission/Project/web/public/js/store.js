// In-memory copy of the signed-in user's data. The server is the source of truth.
import { api } from './api.js';

export const S = { clients: [], viewings: [], listings: [], tasks: [] };
export const session = { user: null };

export async function loadAll() {
  const d = await api.bootstrap();
  S.clients = d.clients; S.viewings = d.viewings; S.listings = d.listings; S.tasks = d.tasks;
}
export function clearAll() { S.clients = []; S.viewings = []; S.listings = []; S.tasks = []; }

export const cget = (id) => S.clients.find((c) => c.id === id);
export const cname = (id) => { const c = cget(id); return c ? c.name : 'No client'; };

// Create (no id) or update (has id), then mirror the server's answer locally.
export async function saveItem(kind, item) {
  const saved = item.id ? await api.update(kind, item.id, item) : await api.create(kind, item);
  const list = S[kind], i = list.findIndex((x) => x.id === saved.id);
  if (i >= 0) list[i] = saved; else list.push(saved);
  return saved;
}

export async function removeItem(kind, id) {
  await api.remove(kind, id);
  S[kind] = S[kind].filter((x) => x.id !== id);
  if (kind === 'clients') {
    S.viewings.forEach((v) => { if (v.client === id) v.client = ''; });
    S.tasks.forEach((t) => { if (t.client === id) t.client = ''; });
  }
}
