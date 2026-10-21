import { $, esc, iso, pd, t12, opts, telNum, waNum, isHttp } from '../util.js';
import { STAGES } from '../constants.js';
import { S, cget, saveItem, removeItem } from '../store.js';
import { register, render } from '../router.js';
import { openDlg, closeDlg, warn } from '../dialog.js';


const tagsHTML = (c) => (c.tags && c.tags.length) ? `<span class="tgs">${c.tags.map((t) => `<span class="tg">${esc(t)}</span>`).join('')}</span>` : '';

function socialBtns(c) {
  const s = c.social || {};
  return [['fb', 'Facebook'], ['ig', 'Instagram'], ['li', 'LinkedIn'], ['ot', 'Link']]
    .map((x) => isHttp(s[x[0]]) ? `<a class="mini" href="${esc(s[x[0]])}" target="_blank" rel="noopener noreferrer">${x[1]}</a>` : '').join('');
}

function callBtns(c) {
  const p = (c.phone || '').trim();
  if (!p) return `<div class="cl"><button type="button" class="mini" data-cid="${esc(c.id)}">Add number</button>${socialBtns(c)}</div>`;
  const w = waNum(p);
  return `<div class="cl"><a class="mini" href="tel:${esc(telNum(p))}">Call</a>${w ? `<a class="mini" href="https://wa.me/${esc(w)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}${socialBtns(c)}</div>`;
}

function cliHTML() {
  const today = iso(new Date());
  return '<div class="board">' + STAGES.map((st) => {
    const cs = S.clients.filter((c) => c.stage === st);
    return `<section class="stage"><h3>${st}<span>${cs.length}</span></h3>` + (cs.map((c) => {
      const nx = S.viewings.filter((v) => v.client === c.id && v.status === 'scheduled' && v.date >= today)
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];
      return `<div class="cw"><button class="card" data-cid="${esc(c.id)}"><b>${esc(c.name)}</b><span>${esc(c.budget)}</span><span>${c.phone ? esc(c.phone) : 'No number added'}</span>${tagsHTML(c)}${nx ? `<span class="nx">Next: ${pd(nx.date).toLocaleDateString('en-US', { weekday: 'short' })} ${t12(nx.time)}</span>` : ''}</button>${callBtns(c)}</div>`;
    }).join('') || '<p class="empty">Nobody here yet.</p>') + '</section>';
  }).join('') + '</div>';
}

export function clientForm(c) {
  const isNew = !c.id, s = c.social || {};
  openDlg(`<h2>${isNew ? 'Add lead' : 'Edit lead'}</h2>
   <label>Name<input name="name" required maxlength="120" value="${esc(c.name || '')}"></label>
   <label>Phone number (for calls and messages)<input name="phone" type="tel" maxlength="40" value="${esc(c.phone || '')}" placeholder="+8801XXXXXXXXX"></label><label>Email<input name="email" type="email" maxlength="200" value="${esc(c.email || '')}"></label>
   <div class="row"><label>Stage<select name="stage">${opts(STAGES.map((x) => [x, x]), c.stage || 'Lead')}</select></label><label>Budget and wants<input name="budget" maxlength="200" value="${esc(c.budget || '')}" placeholder="$400k, 2-bed"></label></div>
   <label>Property interest tags (comma separated)<input name="tags" value="${esc((c.tags || []).join(', '))}" placeholder="3-bed, garden, near schools"></label>
   <div class="row"><label>Facebook link<input name="fb" maxlength="300" value="${esc(s.fb || '')}" placeholder="facebook.com/name"></label><label>Instagram link<input name="ig" maxlength="300" value="${esc(s.ig || '')}" placeholder="instagram.com/name"></label></div>
   <div class="row"><label>LinkedIn link<input name="li" maxlength="300" value="${esc(s.li || '')}" placeholder="linkedin.com/in/name"></label><label>Other link (TikTok, X, website)<input name="ot" maxlength="300" value="${esc(s.ot || '')}"></label></div>
   <label>Notes<textarea name="notes" rows="3" maxlength="4000">${esc(c.notes || '')}</textarea></label><div id="w"></div>
   <div class="actions">${isNew ? '' : '<button type="button" class="btn del" id="del">Delete lead</button>'}<button type="button" class="btn" id="cancel">Cancel</button><button class="btn pri">Save lead</button></div>`,
  async (f) => {
    const n = { id: c.id, name: f.get('name').trim(), phone: f.get('phone'), email: f.get('email'), stage: f.get('stage'), budget: f.get('budget'),
      notes: f.get('notes'), fb: f.get('fb'), ig: f.get('ig'), li: f.get('li'), ot: f.get('ot'),
      tags: f.get('tags').split(',').map((x) => x.trim()).filter(Boolean) };
    await saveItem('clients', n);
    closeDlg(); render();
  });
  const d = $('#del');
  if (d) d.onclick = async () => { try { await removeItem('clients', c.id); closeDlg(); render(); } catch (e) { warn(e.message); } };
}

register('cli', cliHTML);
$('#main').addEventListener('click', (e) => {
  const cd = e.target.closest('[data-cid]');
  if (cd) { const c = cget(cd.dataset.cid); if (c) clientForm(c); }
});

