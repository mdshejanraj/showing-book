// Confirmation / reminder links: they open the device's SMS or email app with the text filled in.
import { esc, t12, pd, telNum } from './util.js';
import { cget, S, saveItem } from './store.js';
import { render } from './router.js';

export function msgText(v, k) {
  const c = cget(v.client) || {}, n = (c.name || 'there').split(' ')[0];
  const d = pd(v.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  return k === 'rem'
    ? `Hi ${n}, a reminder that your viewing at ${v.property} is on ${d} at ${t12(v.time)}. Reply if you need to change it.`
    : `Hi ${n}, your viewing at ${v.property} is booked for ${d} at ${t12(v.time)}. Please reply YES to confirm.`;
}

export function links(v, k) {
  const c = cget(v.client) || {}, tx = msgText(v, k), w = k === 'conf' ? ' confirmation' : ' reminder';
  let h = '';
  if (c.phone) h += `<a class="btn" data-vid="${esc(v.id)}" data-k="${k}" href="sms:${esc(telNum(c.phone))}?&body=${encodeURIComponent(tx)}">Text${w}</a>`;
  if (c.email) h += `<a class="btn" data-vid="${esc(v.id)}" data-k="${k}" href="mailto:${esc(c.email)}?subject=${encodeURIComponent('Your viewing at ' + v.property)}&body=${encodeURIComponent(tx)}">Email${w}</a>`;
  return h || '<span class="empty">Add a phone or email to this lead to message them.</span>';
}

export const msgBtns = (v) => (v.id && v.client && cget(v.client)) ? `<div class="mrow">${links(v, 'conf')}${links(v, 'rem')}</div>` : '';

// Opening a message link marks the viewing as confirmed / reminded.
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-vid]');
  if (!a) return;
  const v = S.viewings.find((x) => x.id === a.dataset.vid);
  if (!v) return;
  const patch = a.dataset.k === 'conf' ? { confirmed: true } : { reminded: true };
  saveItem('viewings', { ...v, ...patch }).then(() => setTimeout(render, 400)).catch(() => {});
});
