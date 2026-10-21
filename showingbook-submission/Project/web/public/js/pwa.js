import { $ } from './util.js';
import { openDlg, closeDlg } from './dialog.js';

let dip = null;
const isApp = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const showInstall = () => { $('#install').hidden = isApp(); };

export function initPwa() {
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); dip = e; showInstall(); });
  addEventListener('appinstalled', () => { dip = null; $('#install').hidden = true; });
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) showInstall();
  $('#install').onclick = () => {
    if (dip) { dip.prompt(); dip.userChoice.then(() => { dip = null; $('#install').hidden = true; }, () => {}); }
    else {
      openDlg('<h2>Install ShowingBook on iPhone</h2><p>Tap the Share button in Safari, then choose <b>Add to Home Screen</b>.</p><div class="actions"><button class="btn pri" id="cancel" type="button">Got it</button></div>', closeDlg);
    }
  };
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
}
