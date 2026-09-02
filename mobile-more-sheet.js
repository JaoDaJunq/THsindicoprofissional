(() => {
  'use strict';

  const DOCK_BREAKPOINT = 700;
  const SHEET_BREAKPOINT = 960;
  let bound = false;
  let contextFrame = 0;

  function linkParts(link) {
    const icon = link.querySelector('span')?.textContent.trim() || '•';
    const raw = link.textContent.trim();
    return {
      href: link.getAttribute('href') || '#/',
      icon,
      label: raw.startsWith(icon) ? raw.slice(icon.length).trim() : raw,
      active: link.classList.contains('active')
    };
  }

  function navGroups() {
    const navs = [...document.querySelectorAll('.sidebar .nav')];
    const workspaceName = document.querySelector('.workspace-label')?.textContent.trim() || 'Condomínio';
    return navs.map((nav, index) => ({
      label: index === 0 ? 'Principal' : index === 1 ? `Workspace · ${workspaceName}` : 'Opções',
      links: [...nav.querySelectorAll('a')].map(linkParts)
    })).filter(group => group.links.length);
  }

  function isWorkspaceContext() {
    return /^#\/condominio\/[^/]+/.test(location.hash || '') && !/^#\/condominios(?:\?|$)/.test(location.hash || '');
  }

  function workspaceName() {
    return document.querySelector('.workspace-label')?.textContent.trim() || 'Condomínio';
  }

  function activeSourceLinks() {
    const groups = navGroups();
    if (!groups.length) return [];
    if (isWorkspaceContext() && groups[1]) return groups[1].links;
    return groups.find(group => group.links.some(link => link.active))?.links || groups[0].links;
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
    return activeSourceLinks().filter(link => !visible.has(link.href));
  }

  function syncContext() {
    contextFrame = 0;
    const workspace = isWorkspaceContext();
    document.body.classList.toggle('context-workspace', workspace);
    document.body.classList.toggle('context-main', !workspace);

    const strong = document.querySelector('.mobile-top .brand strong');
    const subtitle = document.querySelector('.mobile-top .brand span');
    if (!strong || !subtitle) return;

    const title = workspace ? workspaceName() : 'Gestão Condominial';
    const sub = workspace ? 'Workspace do condomínio' : 'Portal do Síndico';
    if (strong.textContent !== title) strong.textContent = title;
    if (subtitle.textContent !== sub) subtitle.textContent = sub;
  }

  function scheduleContextSync() {
    if (contextFrame) return;
    contextFrame = requestAnimationFrame(syncContext);
  }

  function scrollRouteToTop() {
    try { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); } catch (_) { window.scrollTo(0, 0); }
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
    document.querySelector('.main')?.scrollTo?.({ top: 0, left: 0, behavior: 'auto' });
    document.querySelector('.resident-main')?.scrollTo?.({ top: 0, left: 0, behavior: 'auto' });
  }

  function closeLegacyDrawer() {
    document.body.classList.remove('nav-open');
    document.querySelector('.mobile-nav-toggle')?.setAttribute('aria-expanded', 'false');
  }

  function closeSheet() {
    document.body.classList.remove('mobile-more-open');
    const sheet = document.querySelector('.mobile-more-sheet');
    sheet?.classList.remove('is-expanded', 'is-dragging');
    if (sheet) sheet.style.transform = '';
    document.querySelector('.mobile-dock-more')?.setAttribute('aria-expanded', 'false');
    document.querySelector('.mobile-nav-toggle')?.setAttribute('aria-expanded', 'false');
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
      sheet.setAttribute('aria-label', 'Opções de navegação');
      document.body.appendChild(sheet);
    }

    return sheet;
  }

  function linkMarkup(link) {
    return `
      <a class="mobile-more-item${link.active ? ' active' : ''}" href="${link.href}"${link.active ? ' aria-current="page"' : ''}>
        <span class="mobile-more-icon" aria-hidden="true">${link.icon}</span>
        <span class="mobile-more-label">${link.label}</span>
        <span class="mobile-more-chevron" aria-hidden="true">›</span>
      </a>`;
  }

  function groupsMarkup(groups) {
    return groups.map(group => `
      <section class="mobile-more-group">
        <div class="mobile-more-group-title">${group.label}</div>
        ${group.links.map(linkMarkup).join('')}
      </section>`).join('');
  }

  function bindDrag(sheet) {
    const handle = sheet.querySelector('.mobile-more-handle');
    if (!handle) return;

    let startY = 0;
    let deltaY = 0;
    let dragging = false;

    const finish = () => {
      if (!dragging) return;
      dragging = false;
      sheet.classList.remove('is-dragging');
      sheet.style.transform = '';

      if (deltaY > 140) {
        closeSheet();
      } else if (deltaY < -50) {
        sheet.classList.add('is-expanded');
      } else if (sheet.classList.contains('is-expanded') && deltaY > 55) {
        sheet.classList.remove('is-expanded');
      }
      deltaY = 0;
    };

    handle.addEventListener('pointerdown', event => {
      dragging = true;
      startY = event.clientY;
      deltaY = 0;
      sheet.classList.add('is-dragging');
      handle.setPointerCapture?.(event.pointerId);
    });

    handle.addEventListener('pointermove', event => {
      if (!dragging) return;
      deltaY = event.clientY - startY;
      const visualDelta = Math.max(-72, Math.min(280, deltaY));
      sheet.style.transform = `translateY(${visualDelta}px)`;
    });

    handle.addEventListener('pointerup', finish);
    handle.addEventListener('pointercancel', finish);
    handle.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      sheet.classList.toggle('is-expanded');
    });
  }

  function renderSheet(mode = 'extra') {
    const sheet = ensureSheet();
    const workspace = isWorkspaceContext();
    const extras = extraLinks();
    const allGroups = navGroups();
    const title = mode === 'all' ? (workspace ? workspaceName() : 'Navegação') : 'Mais opções';
    const kicker = mode === 'all' ? (workspace ? 'Gestão + Workspace' : 'Gestão Condominial') : (workspace ? 'Workspace' : 'Navegação');

    sheet.dataset.mode = mode;
    sheet.classList.remove('is-expanded', 'is-dragging');
    sheet.style.transform = '';
    sheet.innerHTML = `
      <div class="mobile-more-handle" role="button" tabindex="0" aria-label="Arraste para expandir ou recolher"></div>
      <div class="mobile-more-head">
        <div class="mobile-more-title-wrap">
          <span class="mobile-more-kicker">${kicker}</span>
          <h2 class="mobile-more-title">${title}</h2>
        </div>
        <button type="button" class="mobile-more-close" aria-label="Fechar navegação">×</button>
      </div>
      <nav class="mobile-more-list" aria-label="${mode === 'all' ? 'Navegação completa' : 'Opções adicionais'}">
        ${mode === 'all'
          ? groupsMarkup(allGroups)
          : (extras.length ? extras.map(linkMarkup).join('') : '<div class="mobile-more-empty">Todas as opções principais já estão na barra inferior.</div>')}
      </nav>`;

    sheet.querySelector('.mobile-more-close')?.addEventListener('click', closeSheet);
    sheet.querySelectorAll('a').forEach(link => link.addEventListener('click', closeSheet));
    bindDrag(sheet);
  }

  function openSheet(mode = 'extra') {
    const limit = mode === 'all' ? SHEET_BREAKPOINT : DOCK_BREAKPOINT;
    if (window.innerWidth > limit) return;
    renderSheet(mode);
    closeLegacyDrawer();
    document.body.classList.add('mobile-more-open');
    document.querySelector('.mobile-dock-more')?.setAttribute('aria-expanded', String(mode === 'extra'));
    document.querySelector('.mobile-nav-toggle')?.setAttribute('aria-expanded', String(mode === 'all'));
    requestAnimationFrame(() => document.querySelector('.mobile-more-close')?.focus({ preventScroll: true }));
  }

  function handleRouteChange() {
    closeSheet();
    closeLegacyDrawer();
    scrollRouteToTop();
    scheduleContextSync();
    requestAnimationFrame(scrollRouteToTop);
  }

  function bind() {
    if (bound) return;
    bound = true;

    document.addEventListener('click', event => {
      const more = event.target.closest?.('.mobile-dock-more');
      if (more && window.innerWidth <= DOCK_BREAKPOINT) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openSheet('extra');
        return;
      }

      const menu = event.target.closest?.('.mobile-nav-toggle');
      if (menu && window.innerWidth <= SHEET_BREAKPOINT) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openSheet('all');
      }
    }, true);

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && document.body.classList.contains('mobile-more-open')) closeSheet();
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > SHEET_BREAKPOINT) closeSheet();
      closeLegacyDrawer();
      scheduleContextSync();
    }, { passive: true });

    window.addEventListener('hashchange', handleRouteChange, { passive: true });

    const app = document.querySelector('#app');
    if (app) new MutationObserver(scheduleContextSync).observe(app, { childList: true, subtree: true });

    syncContext();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
})();
