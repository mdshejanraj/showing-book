// Runs before first paint (loaded as a classic script) so the saved theme applies without a flash.
try {
  var t = localStorage.getItem('showingbook.theme');
  if (!t) t = matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = t;
} catch (e) { document.documentElement.dataset.theme = 'light'; }
