import { $, esc } from './util.js';

export function warn(msg) {
  const w = $('#w');
  if (w) w.innerHTML = `<div class="warn">${esc(msg)}</div>`;
}

// Opens the shared dialog. onSubmit may be async; thrown errors are shown inside the dialog.
export function openDlg(html, onSubmit) {
  const frm = $('#frm');
  frm.innerHTML = html;
  frm.onsubmit = async (e) => {
    e.preventDefault();
    const btn = frm.querySelector('button:not([type="button"])');
    if (btn) btn.disabled = true;
    try { await onSubmit(new FormData(frm)); }
    catch (err) { warn(err.message || 'Something went wrong'); }
    finally { if (btn) btn.disabled = false; }
  };
  const c = $('#cancel');
  if (c) c.onclick = () => $('#dlg').close();
  if (!$('#dlg').open) $('#dlg').showModal();
}
export const closeDlg = () => $('#dlg').close();
