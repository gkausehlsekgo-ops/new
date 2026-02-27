(function () {
  const THEME_KEY = 'theme';

  function isDarkPreferred() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function getSavedTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch { return null; }
  }

  function saveTheme(mode) {
    try { localStorage.setItem(THEME_KEY, mode); } catch {}
  }

  function ensureGlobalThemeStyle() {
    if (document.getElementById('globalThemeStyle')) return;
    const style = document.createElement('style');
    style.id = 'globalThemeStyle';
    style.textContent = "body.dark-mode{background:#0b1220!important;color:#e2e8f0!important;}body.dark-mode nav,body.dark-mode header,body.dark-mode footer,body.dark-mode .panel,body.dark-mode .card{background-color:#121a2b!important;color:#e2e8f0!important;border-color:#243046!important;}body.dark-mode input,body.dark-mode textarea,body.dark-mode select{background:#0f172a!important;color:#e2e8f0!important;border-color:#334155!important;}body.dark-mode a{color:#93c5fd!important;}.global-theme-toggle{position:fixed;right:18px;bottom:18px;z-index:9999;border:1px solid rgba(148,163,184,.35);background:rgba(255,255,255,.92);color:#0f172a;border-radius:999px;padding:9px 12px;font-size:12px;font-weight:700;cursor:pointer;backdrop-filter:blur(8px);}body.dark-mode .global-theme-toggle{background:rgba(15,23,42,.9);color:#e2e8f0;border-color:rgba(148,163,184,.4);} ";
    document.head.appendChild(style);
  }

  function setTheme(mode) {
    const dark = mode === 'dark';
    document.body.classList.toggle('dark-mode', dark);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    const label = dark ? 'Light Mode' : 'Dark Mode';
    const icon = dark ? '\u2600\uFE0F' : '\uD83C\uDF19';

    const existing = document.getElementById('themeToggle');
    if (existing) {
      existing.textContent = icon;
      existing.setAttribute('aria-label', label);
    }

    const floating = document.getElementById('globalThemeToggle');
    if (floating) floating.textContent = label;
  }

  function toggleTheme() {
    const next = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
    setTheme(next);
    saveTheme(next);
  }

  function bindExistingToggle() {
    const existing = document.getElementById('themeToggle');
    if (!existing || existing.dataset.globalThemeBound === '1') return;
    existing.dataset.globalThemeBound = '1';
    existing.addEventListener('click', function () {
      setTimeout(function () {
        const saved = getSavedTheme();
        if (saved === 'dark' || saved === 'light') setTheme(saved);
        else saveTheme(document.body.classList.contains('dark-mode') ? 'dark' : 'light');
      }, 0);
    });
  }

  function ensureFloatingToggle() {
    if (document.getElementById('themeToggle') || document.getElementById('globalThemeToggle')) return;
    const btn = document.createElement('button');
    btn.id = 'globalThemeToggle';
    btn.className = 'global-theme-toggle';
    btn.type = 'button';
    btn.addEventListener('click', toggleTheme);
    document.body.appendChild(btn);
  }

  function init() {
    ensureGlobalThemeStyle();
    const saved = getSavedTheme();
    const initial = (saved === 'dark' || saved === 'light') ? saved : (isDarkPreferred() ? 'dark' : 'light');
    setTheme(initial);
    if (!saved) saveTheme(initial);

    bindExistingToggle();
    ensureFloatingToggle();

    window.addEventListener('storage', function (e) {
      if (e.key === THEME_KEY && (e.newValue === 'dark' || e.newValue === 'light')) setTheme(e.newValue);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
