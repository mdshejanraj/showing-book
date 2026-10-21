import { $, esc, opts } from '../util.js';
import { LST } from '../constants.js';
import { S, saveItem, removeItem } from '../store.js';
import { register, render } from '../router.js';
import { openDlg, closeDlg, warn } from '../dialog.js';

let dragL = null;

function lstHTML() {
  return '<div class="vb"><button class="btn pri" data-act="addL">Add listing</button> <span class="empty">Drag a listing to another column to change its status.</span></div><div class="board">' +
    LST.map((st) => {
      const ls = S.listings.filter((l) => l.status === st);
      return `<section class="stage" data-st="${esc(st)}"><h3>${st}<span>${ls.length}</span></h3>` + (ls.map((l) => {
        const n = S.viewings.filter((v) => v.property === l.address && v.status === 'scheduled').length;
        return `<button class="card" draggable="true" data-lid="${esc(l.id)}"><b>${esc(l.address)}</b><span>${esc(l.price)}</span>${n ? `<span class="nx">${n} viewing${n > 1 ? 's' : ''} booked</span>` : ''}</button>`;
      }).join('') || '<p class="empty">No listings.</p>') + '</section>';
    }).join('') + '</div>';
}

export function listingForm(l) {
  const isNew = !l.id;
  openDlg(`<h2>${isNew ? 'Add listing' : 'Edit listing'}</h2><label>Address<input name="address" required maxlength="200" value="${esc(l.address || '')}"></label>
   <div class="row"><label>Asking price<input name="price" maxlength="40" value="${esc(l.price || '')}" placeholder="$450,000"></label><label>Status<select name="status">${opts(LST.map((s) => [s, s]), l.status || 'Active')}</select></label></div><div id="w"></div>
   <div class="actions">${isNew ? '' : '<button type="button" class="btn del" id="del">Delete listing</button>'}<button type="button" class="btn" id="cancel">Cancel</button><button class="btn pri">Save listing</button></div>`,
  async (f) => {
    await saveItem('listings', { id: l.id, address: f.get('address').trim(), price: f.get('price'), status: f.get('status') });
    closeDlg(); render();
  });
  const d = $('#del');
  if (d) d.onclick = async () => { try { await removeItem('listings', l.id); closeDlg(); render(); } catch (e) { warn(e.message); } };
}

register('lst', lstHTML);
const main = $('#main');
main.addEventListener('click', (e) => {
  const a = e.target.closest('[data-act="addL"]');
  if (a) return listingForm({});
  const l = e.target.closest('[data-lid]');
  if (l) { const o = S.listings.find((x) => x.id === l.dataset.lid); if (o) listingForm(o); }
});
main.addEventListener('dragstart', (e) => {
  const l = e.target.closest && e.target.closest('[data-lid]');
  if (!l) return;
  dragL = l.dataset.lid; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragL);
});
main.addEventListener('dragover', (e) => { if (dragL && e.target.closest('.stage[data-st]')) e.preventDefault(); });
main.addEventListener('dragend', () => { dragL = null; });
main.addEventListener('drop', async (e) => {
  const s = e.target.closest('.stage[data-st]');
  if (!dragL || !s) return;
  e.preventDefault();
  const l = S.listings.find((x) => x.id === dragL); dragL = null;
  if (l) { try { await saveItem('listings', { ...l, status: s.dataset.st }); } catch { /* shown on next load */ } }
  render();
});
