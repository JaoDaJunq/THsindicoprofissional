(() => {
  'use strict';

  const TABLE_BREAKPOINT = 700;
  const NAV_BREAKPOINT = 960;
  const DOCK_BREAKPOINT = 700;
  let navigationEventsBound = false;
  let scheduled = false;

  function closeMenu() {
    document.body.classList.remove('nav-open');
    document.querySelector('.mobile-nav-toggle')?.setAttribute('aria-expanded', 'false');
  }

  function toggleMenu() {
    const next = !document.body.classList.contains('nav-open');
    document.body.classList.toggle('nav-open', next);
    document.querySelector('.mobile-nav-toggle')?.setAttribute('aria-expanded', String(next));
  }

  function ensureMobileNavigation() {
    if (!document.querySelector('.sidebar')) return;

    let backdrop = document.querySelector('.mobile-nav-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'mobile-nav-backdrop';
      backdrop.setAttribute('aria-hidden', 'true');
      document.body.appendChild(backdrop);
    }

    const mount = document.querySelector('.mobile-top') || document.querySelector('.topbar');
    if (mount && !mount.querySelector('.mobile-nav-toggle')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mobile-nav-toggle';
      button.setAttribute('aria-label', 'Abrir menu de navegação');
      button.setAttribute('aria-expanded', 'false');
      button.innerHTML = '<span aria-hidden="true">☰</span>';
      button.addEventListener('click', toggleMenu);
      mount.prepend(button);
    }

    if (!navigationEventsBound) {
      backdrop.addEventListener('click', closeMenu);
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeMenu();
      });
      navigationEventsBound = true;
    }

    document.querySelectorAll('.sidebar a').forEach(link => {
      if (link.dataset.mobileNavBound === 'true') return;
      link.dataset.mobileNavBound = 'true';
      link.addEventListener('click', closeMenu);
    });
  }

  function linkParts(link) {
    const icon = link.querySelector('span')?.textContent.trim() || '•';
    const raw = link.textContent.trim();
    const label = raw.startsWith(icon) ? raw.slice(icon.length).trim() : raw;
    return {
      href: link.getAttribute('href') || '#/',
      icon,
      label,
      active: link.classList.contains('active')
    };
  }

  function dockSource() {
    const navs = [...document.querySelectorAll('.sidebar .nav')];
    if (!navs.length) return null;
    const workspace = navs.length > 1 && navs.slice(1).some(nav => nav.querySelector('a.active'));
    const nav = workspace ? navs.find((item, index) => index > 0 && item.querySelector('a.active')) || navs[1] : navs[0];
    return { workspace, links: [...nav.querySelectorAll('a')].map(linkParts) };
  }

  function preferredDockLinks(source) {
    const preferred = source.workspace
      ? ['Resumo', 'Manutenções', 'Chamados', 'Documentos']
      : ['Visão geral', 'Condomínios', 'Manutenções', 'Chamados'];
    const selected = [];

    preferred.forEach(label => {
      const match = source.links.find(link => link.label === label && !selected.includes(link));
      if (match) selected.push(match);
    });

    source.links.forEach(link => {
      if (selected.length >= 4) return;
      if (!selected.some(item => item.href === link.href)) selected.push(link);
    });

    return selected.slice(0, 4);
  }

  function syncBottomDockState(dock, selected, source) {
    const activeHref = source.links.find(link => link.active)?.href || '';
    let visibleActive = false;

    dock.querySelectorAll('.mobile-dock-item[href]').forEach(item => {
      const active = item.getAttribute('href') === activeHref;
      item.classList.toggle('active', active);
      if (active) {
        item.setAttribute('aria-current', 'page');
        visibleActive = true;
      } else {
        item.removeAttribute('aria-current');
      }
    });

    const more = dock.querySelector('.mobile-dock-more');
    const moreActive = Boolean(activeHref) && !selected.some(link => link.href === activeHref) && !visibleActive;
    more?.classList.toggle('active', moreActive);
    if (moreActive) more?.setAttribute('aria-current', 'page');
    else more?.removeAttribute('aria-current');
  }

  function ensureBottomDock() {
    const source = dockSource();
    const existing = document.querySelector('.mobile-bottom-dock');

    if (!source) {
      existing?.remove();
      document.body.classList.remove('has-mobile-dock');
      return;
    }

    const selected = preferredDockLinks(source);
    if (!selected.length) return;

    const signature = `${source.workspace ? 'workspace' : 'main'}|${selected.map(link => `${link.href}:${link.label}:${link.icon}`).join('|')}`;
    let dock = existing;

    if (!dock || dock.dataset.signature !== signature) {
      dock?.remove();
      dock = document.createElement('nav');
      dock.className = 'mobile-bottom-dock';
      dock.dataset.signature = signature;
      dock.setAttribute('aria-label', source.workspace ? 'Navegação do condomínio' : 'Navegação principal');

      selected.forEach(link => {
        const item = document.createElement('a');
        item.className = 'mobile-dock-item';
        item.href = link.href;
        item.innerHTML = `<span class="mobile-dock-icon" aria-hidden="true">${link.icon}</span><span class="mobile-dock-label">${link.label}</span>`;
        item.addEventListener('click', closeMenu);
        dock.appendChild(item);
      });

      const more = document.createElement('button');
      more.type = 'button';
      more.className = 'mobile-dock-item mobile-dock-more';
      more.setAttribute('aria-label', 'Abrir todas as opções');
      more.innerHTML = '<span class="mobile-dock-icon" aria-hidden="true">•••</span><span class="mobile-dock-label">Mais</span>';
      more.addEventListener('click', toggleMenu);
      dock.appendChild(more);
      document.body.appendChild(dock);
    }

    syncBottomDockState(dock, selected, source);
    document.body.classList.toggle('has-mobile-dock', window.innerWidth <= DOCK_BREAKPOINT);
  }

  function enhanceTable(table) {
    if (!table) return;
    if (table.classList.contains('calendar') || table.closest('.calendar-card')) return;

    const headers = [...table.querySelectorAll('thead th')].map(th => th.textContent.trim());
    if (!headers.length) return;

    table.querySelectorAll('tbody tr').forEach(row => {
      [...row.children].forEach((cell, index) => {
        if (cell.tagName !== 'TD') return;
        const label = headers[index] || 'Detalhe';
        if (cell.dataset.label !== label) cell.dataset.label = label;
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
    if (window.innerWidth > NAV_BREAKPOINT) closeMenu();
    document.body.classList.toggle('compact-data-cards', window.innerWidth <= TABLE_BREAKPOINT);
    document.body.classList.toggle('has-mobile-dock', window.innerWidth <= DOCK_BREAKPOINT && Boolean(document.querySelector('.mobile-bottom-dock')));
  }

  function refresh() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      ensureMobileNavigation();
      ensureBottomDock();
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