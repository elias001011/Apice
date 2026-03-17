(() => {
  const STORAGE_KEY = 'apice:theme';

  function applyTheme(theme) {
    const html = document.documentElement;
    if (theme === 'dark') {
      html.setAttribute('data-theme', 'dark');
    } else {
      html.removeAttribute('data-theme');
    }
    try { localStorage.setItem(STORAGE_KEY, theme); } catch {}
    syncIcons(theme === 'dark');
  }

  function getSaved() {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === 'dark' || v === 'light') return v;
    } catch {}
    return 'light';
  }

  function syncIcons(isDark) {
    document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
      // Mostrar/esconder ícones
      const moon = btn.querySelector('.icon-moon');
      const sun  = btn.querySelector('.icon-sun');
      if (moon) moon.style.display = isDark ? 'none' : 'inline-flex';
      if (sun)  sun.style.display  = isDark ? 'inline-flex' : 'none';
    });
  }

  // Aplicar tema salvo imediatamente
  applyTheme(getSaved());

  // Toggle ao clicar
  document.addEventListener('click', e => {
    const btn = e.target instanceof Element ? e.target.closest('[data-theme-toggle]') : null;
    if (!btn) return;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    applyTheme(isDark ? 'light' : 'dark');
  });

  // Toggle via teclado (acessibilidade)
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const btn = e.target instanceof Element ? e.target.closest('[data-theme-toggle]') : null;
    if (!btn) return;
    e.preventDefault();
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    applyTheme(isDark ? 'light' : 'dark');
  });
})();
