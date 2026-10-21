import { $, monday } from './util.js';

export const nav = { view: 'cal', wk: monday(new Date()) };
const views = {};
export const register = (name, fn) => { views[name] = fn; };

export function render() {
  document.querySelectorAll('nav.tabs [data-view]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.view === nav.view)));
  $('#main').innerHTML = (views[nav.view] || views.cal)();
}
export function go(view) { nav.view = view; render(); }
