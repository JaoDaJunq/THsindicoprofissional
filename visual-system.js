(() => {
  'use strict';

  const TABLE_BREAKPOINT = 700;

  function ensureMobileNavigation() {
    if (!document.querySelector('.sidebar')) return;

    let backdrop = document.querySelector('.mobile-nav-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'mobile-nav-backdrop';
      backdrop.setAttribute('aria-hidden', 'true');
      document.body.appendChild(backdrop);
    }

    function closeMenu() {
      document.body.classList.remove('nav-open');
      const button = document.querySelector('.mobile-nav-toggle');
      button?.setAttribute('aria-expanded', 'false');
    }

    function toggleMenu() {
      const next = !document.body.classList.contains('nav-open');
      document.body.classList.toggle('nav-open', next);
      document.querySelector('.mobile-nav-toggle')?.setAttribute('aria-expanded', String(next));
    }

    backdrop.onclick = closeMenu;

    const mount = document.querySelector('.mobile-top') || document.querySelector('.topbar');
    if (mount && !mount.querySelector('.mobile-nav-toggle')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mobile-nav-toggle';
      button.setAttribute('aria-label', 'Abrir menu de navegação');
      button.setAttribute('aria-expanded', 'false');
      button.innerHTML = '<span aria-hidden="true">☰</span>';
      button.onclick = toggleMenu;
      mount.prepend(button);
    }

    document.querySelectorAll('.sidebar a').forEach(link => {
      if (link.dataset.mobileNavBound === 'true') return;
      link.dataset.mobileNavBound = 'true';
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeMenu();
    }, { passive: true });
  }

  function enhanceTable(table) {
    if (!table || table.dataset.mobileEnhanced === 'true') return;
    if (table.classList.contains('calendar') || table.closest('.calendar-card')) return;

    const headers = [...table.querySelectorAll('thead th')].map(th => th.textContent.trim());
    if (!headers.length) return;

    table.querySelectorAll('tbody tr').forEach(row => {
      [...row.children].forEach((cell, index) => {
        if (cell.tagName !== 'TD') return;
        if (!cell.dataset.label) cell.dataset.label = headers[index] || 'Detalhe';
      });
    });

    const wrapper = table.closest('.table-wrap');
    if (wrapper) wrapper.classList.add('mobile-card-table');
    table.dataset.mobileEnhanced = 'true';
  }

  function enhanceTables(root = document) {
    root.querySelectorAll?.('.table, .table-wrap > table').forEach(enhanceTable);
  }

  function syncResponsiveState() {
    if (window.innerWidth > 960) {
      document.body.classList.remove('nav-open');
      document.querySelector('.mobile-nav-toggle')?.setAttribute('aria-expanded', 'false');
    }

    document.body.classList.toggle('compact-data-cards', window.innerWidth <= TABLE_BREAKPOINT);
  }

  let scheduled = false;
  function refresh() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      ensureMobileNavigation();
      enhanceTables();
      syncResponsiveState();
    });
  }

  const observer = new MutationObserver(refresh);

  function start() {
    refresh();
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', refresh, { passive: true });
    window.addEventListener('hashchange', refresh, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();