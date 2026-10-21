// Sign-in screen, account dialog and sign-out.
import { $, esc } from './util.js';
import { api, setToken } from './api.js';
import { session } from './store.js';
import { openDlg, closeDlg } from './dialog.js';

export function showLogin(message = '') {
  document.body.dataset.state = 'anon';
  $('#main').innerHTML = '';
  $('#login-error').textContent = message;
  $('#login-error').hidden = !message;
  const pw = $('#login-password'); if (pw) pw.value = '';
}

export function bindLogin(onSignedIn) {
  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#login-submit'); btn.disabled = true;
    $('#login-error').hidden = true;
    try {
      const r = await api.login($('#login-email').value.trim(), $('#login-password').value);
      setToken(r.token); session.user = r.user;
      await onSignedIn();
    } catch (err) {
      $('#login-error').textContent = err.message; $('#login-error').hidden = false;
    } finally { btn.disabled = false; }
  });
}

export function signOut() {
  setToken(''); session.user = null;
  showLogin();
}

export function openAccount() {
  const u = session.user;
  openDlg(`<h2>My account</h2><p class="empty">${esc(u.name)} · ${esc(u.email)} · ${esc(u.role)}</p>
   <label>Current password<input name="current" type="password" autocomplete="current-password" required></label>
   <label>New password (at least 10 characters)<input name="next" type="password" autocomplete="new-password" minlength="10" required></label><div id="w"></div>
   <div class="actions"><button type="button" class="btn del" id="out">Sign out</button><button type="button" class="btn" id="cancel">Close</button><button class="btn pri">Change password</button></div>`,
  async (f) => {
    await api.changePassword(f.get('current'), f.get('next'));
    closeDlg();
  });
  $('#out').onclick = () => { closeDlg(); signOut(); };
}
