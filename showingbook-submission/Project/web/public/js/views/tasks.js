import { $, esc, iso, pd, t12, opts } from '../util.js';
import { S, cname, saveItem, removeItem } from '../store.js';
import { register, render } from '../router.js';
import { openDlg, closeDlg, warn } from '../dialog.js';
import { links } from '../messages.js';
import { mins } from '../util.js';

function tskHTML() {
  const today = iso(new Date()), now = Date.now();
  let q = '';
  S.viewings.forEach((v) => {
    if (v.status !== 'scheduled' || !v.client || !S.clients.some((c) => c.id === v.client)) return;
    const hrs = (pd(v.date).getTime() + mins(v.time) * 6e4 - now) / 36e5;
    if (hrs < 0) return;
    const k = !v.confirmed ? 'conf' : (hrs <= 26 && !v.reminded ? 'rem' : '');
    if (!k) return;
    q += `<div class="item"><b>${k === 'conf' ? 'Confirm: ' : 'Remind: '}${esc(v.property)}</b><span>${esc(cname(v.client))}, ${pd(v.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} ${t12(v.time)}</span><div class="mrow">${links(v, k)}</div></div>`;
  });
  const tl = S.tasks.slice().sort((a, b) => (a.done - b.done) || a.due.localeCompare(b.due));
  const tk = tl.map((t) => {
    const late = !t.done && t.due < today;
    return `<div class="task${t.done ? ' done' : ''}${late ? ' late' : ''}"><input type="checkbox" data-tid="${esc(t.id)}"${t.done ? ' checked' : ''} aria-label="Mark done"><div><b>${esc(t.title)}</b><small>${esc(cname(t.client))}, ${late ? 'overdue since ' : 'due '}${pd(t.due).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</small></div><button class="btn" data-eid="${esc(t.id)}">Edit</button></div>`;
  }).join('');
  return `<div class="two"><section class="panel side"><h3>Messages to send</h3>${q || '<p class="empty">All confirmations and reminders are sent.</p>'}<p class="empty">Each button opens your messaging app with the text filled in. Moving a viewing resets its confirmation.</p></section><section class="panel side"><h3>Follow-ups</h3><div class="vb"><button class="btn pri" data-act="addT">New follow-up</button></div>${tk || '<p class="empty">No follow-ups yet.</p>'}</section></div>`;
}

export function taskForm(t) {
  const isNew = !t.id, cl = [['', 'No lead']].concat(S.clients.map((c) => [c.id, c.name]));
  openDlg(`<h2>${isNew ? 'New follow-up' : 'Edit follow-up'}</h2><label>What needs doing<input name="title" required maxlength="200" value="${esc(t.title || '')}" placeholder="Call about the offer"></label>
   <div class="row"><label>Due date<input type="date" name="due" required value="${esc(t.due)}"></label><label>Lead<select name="client">${opts(cl, t.client || '')}</select></label></div><div id="w"></div>
   <div class="actions">${isNew ? '' : '<button type="button" class="btn del" id="del">Delete follow-up</button>'}<button type="button" class="btn" id="cancel">Cancel</button><button class="btn pri">Save follow-up</button></div>`,
  async (f) => {
    await saveItem('tasks', { id: t.id, title: f.get('title').trim(), due: f.get('due'), client: f.get('client'), done: !!t.done });
    closeDlg(); render();
  });
  const d = $('#del');
  if (d) d.onclick = async () => { try { await removeItem('tasks', t.id); closeDlg(); render(); } catch (e) { warn(e.message); } };
}

register('tsk', tskHTML);
const main = $('#main');
main.addEventListener('click', (e) => {
  if (e.target.closest('[data-act="addT"]')) return taskForm({ due: iso(new Date()) });
  const te = e.target.closest('[data-eid]');
  if (te) { const k = S.tasks.find((x) => x.id === te.dataset.eid); if (k) taskForm(k); }
});
main.addEventListener('change', async (e) => {
  const c = e.target.closest('[data-tid]');
  if (!c) return;
  const t = S.tasks.find((x) => x.id === c.dataset.tid);
  if (t) { try { await saveItem('tasks', { ...t, done: c.checked }); } catch { /* reverted by render */ } }
  render();
});
