import { $ } from './util.js';
const KEY = 'showingbook.theme';

export function setTheme(t, keep) {
  document.documentElement.dataset.theme = t;
  if (!keep) { try { localStorage.setItem(KEY, t); } catch { /* storage blocked */ } }
  $('#theme').textContent = t === 'dark' ? '☀ Light' : '☾ Dark';
  $('#theme').setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
}
export function initTheme() {
  setTheme(document.documentElement.dataset.theme || 'light', true);
  $('#theme').onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
}
