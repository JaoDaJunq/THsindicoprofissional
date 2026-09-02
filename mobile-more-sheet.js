(() => {
  'use strict';

  const BREAKPOINT = 700;
  let bound = false;

  function closeSheet() {
    document.body.classList.remove('mobile-more-open');
    document.querySelector('.mobile-dock-more')?.setAttribute('aria-expanded', 'false');
  }

  function sourceLinks() {
    const navs = [...document.querySelectorAll('.sidebar .nav')];
    if (!navs.length) return [];
    const workspaceNav = navs.length > 1 && navs.slice(1).some(nav => nav.querySelector('a.active'))
      ? navs.find((nav, index) => index > 0 && nav.querySelector('a.active')) || navs[1]
      : navs[0];

    return [...workspaceNav.querySelectorAll('a')].map(link => {
      const icon = link.querySelector('span')?.textContent.trim() || '•';
      const raw = link.textContent.trim();
      return {
        href: link.getAttribute('href') || '#/',
        icon,
        label: raw.startsWith(icon) ? raw.slice(icon.length).trim() : raw,
        active: link.classList.contains('active')
      };
    });
  }

  function dockHrefs() {
    return new Set(
      [...document.querySelectorAll('.mobile-bottom-dock .mobile-dock-item[href]')]
        .map(item => item.getAttribute('href'))
        .filter(Boolean)
    );
  }

  function extraLinks() {
    const visible = dockHrefs();
    return sourceLinks().filter(link => !visible.has(link.href));
  }

  function ensureSheet() {
    let backdrop = document.querySelector('.mobile-more-backdrop');
    let sheet = document.querySelector('.mobile-more-sheet');

    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'mobile-more-backdrop';
      backdrop.setAttribute('aria-hidden', 'true');
      backdrop.addEventListener('click', closeSheet);
      document.body.appendChild(backdrop);
    }

    if (!sheet) {
      sheet = document.createElement('section');
      sheet.className = 'mobile-more-sheet';
      sheet.setAttribute('role', 'dialog');
      sheet.setAttribute('aria-modal', 'true');
      sheet.setAttribute('aria-label', 'Mais opções de navegação');
      document.body.appendChild(sheet);
    }

    return sheet;
  }

  function renderSheet() {
    const sheet = ensureSheet();
    const links = extraLinks();
    const workspace = document.querySelectorAll('.sidebar .nav').length > 1 && [...document.querySelectorAll('.sidebar .nav')].slice(1).some(nav => nav.querySelector('a.active'));

    sheet.innerHTML = `
      <div class="mobile-more-handle" aria-hidden="true"></div>
      <div class="mobile-more-head">
        <div class="mobile-more-title-wrap">
          <span class="mobile-more-kicker">${workspace ? 'Condomínio' : 'Navegação'}</span>
          <h2 class="mobile-more-title">Mais opções</h2>
        </div>
        <button type="button" class="mobile-more-close" aria-label="Fechar mais opções">×</button>
      </div>
      <nav class="mobile-more-list" aria-label="Opções adicionais">
        ${links.length ? links.map(link => `
          <a class="mobile-more-item${link.active ? ' active' : ''}" href="${link.href}"${link.active ? ' aria-current="page"' : ''}>
            <span class="mobile-more-icon" aria-hidden="true">${link.icon}</span>
            <span class="mobile-more-label">${link.label}</span>
            <span class="mobile-more-chevron" aria-hidden="true">›</span>
          </a>
        `).join('') : '<div class="mobile-more-empty">Todas as opções principais já estão na barra inferior.</div>'}
      </nav>`;

    sheet.querySelector('.mobile-more-close')?.addEventListener('click', closeSheet);
    sheet.querySelectorAll('a').forEach(link => link.addEventListener('click', closeSheet));
  }

  function openSheet() {
    if (window.innerWidth > BREAKPOINT) return;
    renderSheet();
    document.body.classList.remove('nav-open');
    document.querySelector('.mobile-nav-toggle')?.setAttribute('aria-expanded', 'false');
    document.body.classList.add('mobile-more-open');
    document.querySelector('.mobile-dock-more')?.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => document.querySelector('.mobile-more-close')?.focus({ preventScroll: true }));
  }

  function bind() {
    if (bound) return;
    bound = true;

    document.addEventListener('click', event => {
      const more = event.target.closest?.('.mobile-dock-more');
      if (!more || window.innerWidth > BREAKPOINT) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openSheet();
    }, true);

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && document.body.classList.contains('mobile-more-open')) closeSheet();
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > BREAKPOINT) closeSheet();
    }, { passive: true });

    window.addEventListener('hashchange', closeSheet, { passive: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
})();
