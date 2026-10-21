import { $ } from './util.js';
import { api, getToken, setToken, setUnauthorizedHandler } from './api.js';
import { session, loadAll, clearAll } from './store.js';
import { nav, render, go } from './router.js';
import { initTheme } from './theme.js';
import { initPwa } from './pwa.js';
import { showLogin, bindLogin, openAccount } from './auth.js';
import './messages.js';
import { newViewing } from './views/calendar.js';
import { clientForm } from './views/leads.js';
import './views/listings.js';
import './views/tasks.js';
import './views/reports.js';
import { loadTeam } from './views/team.js';

async function enterApp() {
  clearAll();
  await loadAll();
  const admin = session.user.role === 'admin';
  $('#t-team').hidden = !admin;
  if (admin) await loadTeam();
  $('#account').textContent = session.user.name.split(' ')[0];
  document.body.dataset.state = 'app';
  if (nav.view === 'team' && !admin) nav.view = 'cal';
  render();
}

async function start() {
  initTheme(); initPwa();
  bindLogin(enterApp);
  setUnauthorizedHandler(() => { setToken(''); session.user = null; showLogin('Your session ended. Please sign in again.'); });

  document.querySelectorAll('nav.tabs [data-view]').forEach((b) => { b.onclick = () => go(b.dataset.view); });
  $('#addV').onclick = () => newViewing();
  $('#addC').onclick = () => clientForm({});
  $('#account').onclick = openAccount;

  if (!getToken()) return showLogin();
  try { session.user = (await api.me()).user; await enterApp(); }
  catch (e) { if (e.status === 0) showLogin(e.message); else showLogin(); }
}
start();
