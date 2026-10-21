import { esc, iso } from '../util.js';
import { STAGES, LST } from '../constants.js';
import { S } from '../store.js';
import { register } from '../router.js';

function bars(title, rows) {
  const mx = Math.max.apply(null, rows.map((r) => r[1]).concat(1));
  return `<section class="panel side"><h3>${title}</h3>${rows.map((r) => `<div class="br"><span>${esc(r[0])}</span><i style="width:${r[1] / mx * 100}%"></i><b>${r[1]}</b></div>`).join('') || '<p class="empty">No data yet.</p>'}</section>`;
}

function repHTML() {
  const today = iso(new Date()), m = today.slice(0, 7), vm = S.viewings.filter((v) => v.date.slice(0, 7) === m);
  const cnt = (k) => vm.filter((v) => v.status === k).length, done = cnt('done'), can = cnt('cancelled'), tg = {};
  S.clients.forEach((c) => (c.tags || []).forEach((t) => { tg[t] = (tg[t] || 0) + 1; }));
  const tags = Object.keys(tg).map((k) => [k, tg[k]]).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const closed = S.clients.filter((c) => c.stage === 'Closed').length;
  const open = S.tasks.filter((t) => !t.done), late = open.filter((t) => t.due < today).length;
  const st = (n, l) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`;
  return `<div class="stats">${st(S.clients.length, 'Total leads')}${st(vm.length, 'Viewings this month')}${st((done + can) ? Math.round(done / (done + can) * 100) + '%' : '–', 'Show rate (done vs cancelled)')}${st(S.clients.length ? Math.round(closed / S.clients.length * 100) + '%' : '–', 'Leads closed')}${st(open.length, 'Open follow-ups')}${st(late, 'Overdue follow-ups')}</div><div class="two">${
    bars('Leads by stage', STAGES.map((s) => [s, S.clients.filter((c) => c.stage === s).length]))}${
    bars('Viewings this month', [['Scheduled', cnt('scheduled')], ['Done', done], ['Cancelled', can]])}${
    bars('Listings by status', LST.map((s) => [s, S.listings.filter((l) => l.status === s).length]))}${
    bars('Top interest tags', tags)}</div>`;
}
register('rep', repHTML);
