export const $ = (s) => document.querySelector(s);
export const pad = (n) => String(n).padStart(2, '0');
export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const pd = (s) => { const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
export const mins = (t) => { const p = t.split(':').map(Number); return p[0] * 60 + p[1]; };
export const tstr = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
export const t12 = (t) => {
  const m = mins(t); let h = Math.floor(m / 60); const s = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12;
  return h + (m % 60 ? ':' + pad(m % 60) : '') + s;
};
const ENT = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ENT[c]);
export const addDays = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; };
export const monday = (d) => addDays(d, -((d.getDay() + 6) % 7));
export const opts = (arr, sel) => arr.map((a) => `<option value="${esc(a[0])}"${a[0] === sel ? ' selected' : ''}>${esc(a[1])}</option>`).join('');
export const telNum = (p) => String(p || '').replace(/[^\d+]/g, '');
export const waNum = (p) => {
  const d = String(p || '').replace(/\D/g, '');
  if (/^01\d{9}$/.test(d)) return '880' + d.slice(1);
  if (d.indexOf('00') === 0) return d.slice(2);
  return d;
};
export const isHttp = (s) => /^https?:\/\//i.test(s || '');
