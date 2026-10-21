import { $, esc, iso, pd, mins, tstr, t12, addDays, monday, opts } from '../util.js';
import { H, START } from '../constants.js';
import { S, cget, cname, saveItem, removeItem, loadAll } from '../store.js';
import { nav, register, render } from '../router.js';
import { openDlg, closeDlg, warn } from '../dialog.js';
import { msgBtns } from '../messages.js';

let warned = false, dragId = null, dragOff = 0;

function calHTML() {
  const days = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(nav.wk, i)), today = iso(new Date());
  const last = days[6], opt = { month: 'short', day: 'numeric' };
  const label = `${days[0].toLocaleDateString('en-US', opt)} – ${last.toLocaleDateString('en-US', opt)}, ${last.getFullYear()}`;
  let g = '<div class="grid"><div class="head"></div>' + days.map((d) =>
    `<div class="head${iso(d) === today ? ' today' : ''}">${d.toLocaleDateString('en-US', { weekday: 'short' })}<b>${d.getDate()}</b></div>`).join('');
  let gut = '<div class="col gut">';
  for (let h = START + 1; h < START + 12; h++) gut += `<span style="top:${(h - START) * H}px">${t12(tstr(h * 60))}</span>`;
  g += gut + '</div>' + days.map((d) => {
    const key = iso(d), evs = S.viewings.filter((v) => v.date === key).sort((a, b) => mins(a.time) - mins(b.time));
    const html = evs.map((v, i) => {
      const s = mins(v.time), e = s + v.dur;
      const lap = evs.some((o, j) => j !== i && mins(o.time) < e && mins(o.time) + o.dur > s);
      const lane = lap ? evs.slice(0, i).filter((o) => mins(o.time) + o.dur > s).length % 2 : 0;
      return `<button class="ev ${esc(v.status)}" draggable="true" data-id="${esc(v.id)}" style="top:${(s - START * 60) / 60 * H}px;height:${Math.max(v.dur / 60 * H - 2, 22)}px;${lap ? `width:calc(50% - 4px);left:${lane * 50}%` : 'width:calc(100% - 4px)'}"><b>${t12(v.time)} ${esc(v.property)}</b><small>${esc(cname(v.client))}</small></button>`;
    }).join('');
    return `<div class="col${key === today ? ' today' : ''}" data-date="${key}">${html}</div>`;
  }).join('') + '</div>';

  const up = S.viewings.filter((v) => v.status === 'scheduled' && v.date >= today)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 7);
  let side = '', cur = '';
  up.forEach((v) => {
    if (v.date !== cur) {
      cur = v.date; const n = Math.round((pd(v.date) - pd(today)) / 864e5);
      side += `<div class="day">${n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : pd(v.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>`;
    }
    side += `<button class="item" data-id="${esc(v.id)}"><b>${t12(v.time)} ${esc(v.property)}</b><span>${esc(cname(v.client))}${v.confirmed ? ' – confirmed' : ' – not confirmed'}</span></button>`;
  });
  if (!up.length) side = '<p class="empty">No viewings booked. Click any slot on the calendar to add one.</p>';
  return `<div class="layout"><div class="panel"><div class="bar"><button class="btn" id="prev" aria-label="Previous week">‹</button><button class="btn" id="now">Today</button><button class="btn" id="next" aria-label="Next week">›</button><label class="jump">Go to date<input type="date" id="jump" value="${iso(nav.wk)}"></label><h2>${label}</h2></div><div class="scroll">${g}</div></div><aside class="panel side"><h3>Upcoming viewings</h3>${side}</aside></div>`;
}

export function viewingForm(v) {
  const isNew = !v.id; warned = false;
  const clients = [['', 'No client']].concat(S.clients.map((c) => [c.id, c.name]));
  const datalist = S.listings.map((l) => `<option value="${esc(l.address)}">`).join('');
  openDlg(`<h2>${isNew ? 'New viewing' : 'Edit viewing'}</h2>
   <label>Client<select name="client">${opts(clients, v.client || '')}</select></label>
   <label>Client phone number<input name="cphone" id="cph" type="tel" value="${esc((cget(v.client) || {}).phone || '')}" placeholder="Add or update the number"></label>
   <label>Property address<input name="property" required maxlength="200" value="${esc(v.property || '')}" placeholder="14 Alder Court" list="lstl"><datalist id="lstl">${datalist}</datalist></label>
   <div class="row"><label>Date<input type="date" name="date" required value="${esc(v.date)}"></label><label>Start time<input type="time" name="time" step="900" min="08:00" max="19:45" required value="${esc(v.time)}"></label></div>
   <div class="row"><label>Length<select name="dur">${opts([30, 45, 60, 90, 120].map((m) => [String(m), m + ' min']), String(v.dur || 60))}</select></label>
   <label>Status<select name="status">${opts([['scheduled', 'Scheduled'], ['done', 'Done'], ['cancelled', 'Cancelled']], v.status || 'scheduled')}</select></label></div>
   <label>Notes<textarea name="notes" rows="3" maxlength="2000">${esc(v.notes || '')}</textarea></label><div id="w"></div>${msgBtns(v)}
   <div class="actions">${isNew ? '' : '<button type="button" class="btn del" id="del">Delete viewing</button>'}<button type="button" class="btn" id="cancel">Cancel</button><button class="btn pri">Save viewing</button></div>`,
  async (f) => {
    const same = v.date === f.get('date') && v.time === f.get('time');
    const n = { id: v.id, client: f.get('client'), property: f.get('property').trim(), date: f.get('date'), time: f.get('time'),
      dur: +f.get('dur'), status: f.get('status'), notes: f.get('notes'), confirmed: !!v.confirmed && same, reminded: !!v.reminded && same };
    if (mins(n.time) < START * 60 || mins(n.time) + n.dur > 20 * 60) return warn('Viewings must fit between 8:00am and 8:00pm.');
    const clash = S.viewings.find((o) => o.id !== n.id && o.status === 'scheduled' && n.status === 'scheduled' && o.date === n.date
      && mins(o.time) < mins(n.time) + n.dur && mins(n.time) < mins(o.time) + o.dur);
    if (clash && !warned) { warned = true; return warn(`This overlaps with ${clash.property} at ${t12(clash.time)}. Select Save viewing again to keep both.`); }
    const cc = cget(n.client), phone = (f.get('cphone') || '').trim();
    if (cc && cc.phone !== phone) await saveItem('clients', clientPayload(cc, { phone }));
    await saveItem('viewings', n);
    closeDlg(); render();
  });
  const d = $('#del');
  if (d) d.onclick = async () => { try { await removeItem('viewings', v.id); closeDlg(); render(); } catch (e) { warn(e.message); } };
}

// Client objects from the server have nested social links and the form posts them flat.
export function clientPayload(c, patch = {}) {
  const s = c.social || {};
  return { id: c.id, name: c.name, phone: c.phone, email: c.email, stage: c.stage, budget: c.budget, notes: c.notes,
    fb: s.fb || '', ig: s.ig || '', li: s.li || '', ot: s.ot || '', tags: c.tags || [], ...patch };
}

export const newViewing = (date, time) => viewingForm({ date: date || iso(new Date()), time: time || '10:00' });

register('cal', calHTML);

const main = $('#main');
main.addEventListener('click', (e) => {
  const t = e.target;
  if (t.closest('#prev')) { nav.wk = addDays(nav.wk, -7); return render(); }
  if (t.closest('#next')) { nav.wk = addDays(nav.wk, 7); return render(); }
  if (t.closest('#now')) { nav.wk = monday(new Date()); return render(); }
  const ev = t.closest('[data-id]');
  if (ev) { const v = S.viewings.find((x) => x.id === ev.dataset.id); if (v) viewingForm(v); return; }
  const col = t.closest('.col[data-date]');
  if (col) {
    const y = e.clientY - col.getBoundingClientRect().top, m = START * 60 + Math.floor(y / H * 2) * 30;
    newViewing(col.dataset.date, tstr(Math.min(m, 19 * 60)));
  }
});
main.addEventListener('change', (e) => { if (e.target.id === 'jump' && e.target.value) { nav.wk = monday(pd(e.target.value)); render(); } });
$('#frm').addEventListener('change', (e) => {
  if (e.target.name === 'client') { const c = cget(e.target.value), p = $('#cph'); if (p) p.value = (c && c.phone) || ''; }
});

main.addEventListener('dragstart', (e) => {
  const ev = e.target.closest && e.target.closest('.ev');
  if (!ev) return;
  dragId = ev.dataset.id; dragOff = e.clientY - ev.getBoundingClientRect().top;
  e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId);
});
main.addEventListener('dragover', (e) => { if (dragId && e.target.closest('.col[data-date]')) e.preventDefault(); });
main.addEventListener('dragend', () => { dragId = null; });
main.addEventListener('drop', async (e) => {
  const col = e.target.closest('.col[data-date]');
  if (!dragId || !col) return;
  e.preventDefault();
  const v = S.viewings.find((x) => x.id === dragId); dragId = null;
  if (!v) return;
  const y = e.clientY - dragOff - col.getBoundingClientRect().top;
  let m = START * 60 + Math.round(y / H * 4) * 15; m = Math.max(START * 60, Math.min(m, 20 * 60 - v.dur));
  try { await saveItem('viewings', { ...v, date: col.dataset.date, time: tstr(m), confirmed: false, reminded: false }); }
  catch { await loadAll().catch(() => {}); }
  render();
});
