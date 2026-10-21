// Admin area: manage team accounts. The server enforces the admin role; this screen is only shown to admins.
import { $, esc, opts } from '../util.js';
import { api } from '../api.js';
import { session } from '../store.js';
import { register, render } from '../router.js';
import { openDlg, closeDlg, warn } from '../dialog.js';

let users = [];

export async function loadTeam() { users = (await api.users()).users; }

function teamHTML() {
  const rows = users.map((u) => `<tr><td><b>${esc(u.name)}</b><br><small>${esc(u.email)}</small></td><td><span class="pill ${u.role === 'admin' ? 'admin' : ''}">${esc(u.role)}</span></td><td>${u.leads}</td><td>${u.viewings}</td><td>${u.listings}</td><td><button class="btn" data-uid="${esc(u.id)}">Edit</button></td></tr>`).join('');
  return `<section class="panel side"><h3>Team accounts</h3><div class="vb"><button class="btn pri" data-act="addU">Add user</button> <span class="empty">Agents only see their own leads, viewings, listings and follow-ups.</span></div><div class="tscroll"><table class="tbl"><thead><tr><th>User</th><th>Role</th><th>Leads</th><th>Viewings</th><th>Listings</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}

function userForm(u) {
  const isNew = !u.id, self = u.id === session.user.id;
  openDlg(`<h2>${isNew ? 'Add user' : 'Edit user'}</h2>
   <label>Name<input name="name" required maxlength="120" value="${esc(u.name || '')}"></label>
   <label>Email<input name="email" type="email" required maxlength="200" value="${esc(u.email || '')}"${isNew ? '' : ' disabled'}></label>
   <label>Role<select name="role">${opts([['agent', 'Agent'], ['admin', 'Admin']], u.role || 'agent')}</select></label>
   <label>${isNew ? 'Password' : 'New password (leave empty to keep)'}<input name="password" type="password" autocomplete="new-password" minlength="10" maxlength="200"${isNew ? ' required' : ''} placeholder="At least 10 characters"></label><div id="w"></div>
   <div class="actions">${isNew || self ? '' : '<button type="button" class="btn del" id="del">Delete user</button>'}<button type="button" class="btn" id="cancel">Cancel</button><button class="btn pri">Save user</button></div>`,
  async (f) => {
    if (isNew) await api.create('users', { email: f.get('email').trim(), name: f.get('name').trim(), role: f.get('role'), password: f.get('password') });
    else await api.update('users', u.id, { name: f.get('name').trim(), role: f.get('role'), password: f.get('password') || '' });
    await loadTeam(); closeDlg(); render();
  });
  const d = $('#del');
  if (d) d.onclick = async () => {
    if (!confirm(`Delete ${u.name}? All of their leads, viewings, listings and follow-ups are deleted too.`)) return;
    try { await api.remove('users', u.id); await loadTeam(); closeDlg(); render(); } catch (e) { warn(e.message); }
  };
}

register('team', teamHTML);
$('#main').addEventListener('click', (e) => {
  if (e.target.closest('[data-act="addU"]')) return userForm({});
  const b = e.target.closest('[data-uid]');
  if (b) { const u = users.find((x) => x.id === b.dataset.uid); if (u) userForm(u); }
});
