(() => {
  'use strict';

  let scheduled = false;
  const iconFor = href => {
    const icons = window.GCNavigation?.icons || {};
    if (/announcements/.test(href)) return icons.announcements || '';
    if (/calls/.test(href)) return icons.calls || '';
    if (/calendar/.test(href)) return icons.calendar || '';
    if (/documents/.test(href)) return icons.documents || '';
    if (/unit/.test(href)) return icons.condos || '';
    if (/notifications/.test(href)) return icons.notifications || '';
    return icons.home || '';
  };

  function parseLabel(link) {
    const clone = link.cloneNode(true);
    clone.querySelectorAll('svg,.ux-icon,.resident-v2-badge').forEach(node => node.remove());
    return String(clone.textContent || '')
      .replace(/^[⌂📢🎫📅📄🏠🔔]\s*/u, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function notificationCount(label) {
    const match = String(label || '').match(/\((\d+)\)/);
    return match ? Number(match[1]) : 0;
  }

  function links() {
    return [...document.querySelectorAll('.resident-nav a')].map(link => {
      const href = link.getAttribute('href') || '#/morador/home';
      const rawLabel = parseLabel(link);
      const storedCount = Number(link.dataset.notificationCount || link.querySelector('.resident-v2-badge')?.textContent || 0);
      const count = storedCount || notificationCount(rawLabel);
      const label = rawLabel.replace(/\s*\(\d+\)\s*$/, '').trim();
      return { link, href, label, count, active: link.classList.contains('active'), icon: iconFor(href) };
    });
  }

  function enhanceSidebar() {
    links().forEach(item => {
      if (item.link.dataset.residentV2 === 'true') return;
      item.link.dataset.residentV2 = 'true';
      item.link.dataset.notificationCount = String(item.count || 0);
      item.link.innerHTML = `<span class="resident-v2-nav-icon">${item.icon}</span><span class="resident-v2-nav-label"></span>${item.count ? `<span class="resident-v2-badge">${item.count > 99 ? '99+' : item.count}</span>` : ''}`;
      item.link.querySelector('.resident-v2-nav-label').textContent = item.label;
    });
  }

  function closeMore() {
    document.body.classList.remove('resident-more-open');
    document.querySelector('.resident-more-overlay')?.remove();
  }

  function openMore() {
    closeMore();
    const all = links();
    const extra = all.filter(item => /calendar|unit|notifications/.test(item.href));
    const overlay = document.createElement('div');
    overlay.className = 'resident-more-overlay';
    overlay.innerHTML = `<section class="resident-more-sheet" role="dialog" aria-modal="true" aria-label="Mais opções"><div class="resident-more-handle"></div><header><div><span>Portal do Morador</span><h2>Mais opções</h2></div><button type="button" aria-label="Fechar">×</button></header><nav></nav></section>`;
    overlay.addEventListener('click', event => { if (event.target === overlay) closeMore(); });
    overlay.querySelector('header button').addEventListener('click', closeMore);
    const nav = overlay.querySelector('nav');
    extra.forEach(item => {
      const a = document.createElement('a');
      a.href = item.href;
      a.className = item.active ? 'active' : '';
      a.innerHTML = `<span class="resident-more-icon">${item.icon}</span><span><strong></strong><small></small></span><em>›</em>`;
      a.querySelector('strong').textContent = item.label;
      a.querySelector('small').textContent = item.href.includes('notifications') && item.count ? `${item.count} não lida${item.count === 1 ? '' : 's'}` : item.href.includes('unit') ? 'Dados do seu vínculo' : 'Eventos do condomínio';
      a.addEventListener('click', closeMore);
      nav.appendChild(a);
    });
    document.body.appendChild(overlay);
    document.body.classList.add('resident-more-open');
    requestAnimationFrame(() => overlay.querySelector('header button')?.focus({preventScroll:true}));
  }

  function ensureDock() {
    const app = document.querySelector('.resident-app');
    if (!app) {
      document.querySelector('.resident-mobile-dock')?.remove();
      return;
    }
    const all = links();
    if (!all.length) return;
    const preferred = ['home','announcements','calls','documents'];
    const picked = preferred.map(key => all.find(item => item.href.endsWith('/' + key))).filter(Boolean);
    const signature = picked.map(item => `${item.href}:${item.active}:${item.count}`).join('|') + `|more:${all.some(item => item.active && !picked.includes(item))}`;
    let dock = document.querySelector('.resident-mobile-dock');
    if (dock?.dataset.signature === signature) return;
    dock?.remove();
    dock = document.createElement('nav');
    dock.className = 'resident-mobile-dock';
    dock.dataset.signature = signature;
    dock.setAttribute('aria-label', 'Navegação do morador');
    picked.forEach(item => {
      const a = document.createElement('a');
      a.href = item.href;
      a.className = `resident-dock-item${item.active ? ' active' : ''}`;
      if (item.active) a.setAttribute('aria-current','page');
      a.innerHTML = `<span class="resident-dock-icon">${item.icon}</span><span class="resident-dock-label"></span>${item.count ? `<b>${item.count > 9 ? '9+' : item.count}</b>` : ''}`;
      a.querySelector('.resident-dock-label').textContent = item.label.replace('Meus ', '');
      dock.appendChild(a);
    });
    const moreActive = all.some(item => item.active && !picked.includes(item));
    const more = document.createElement('button');
    more.type = 'button';
    more.className = `resident-dock-item resident-dock-more${moreActive ? ' active' : ''}`;
    more.setAttribute('aria-label','Abrir mais opções');
    more.innerHTML = `<span class="resident-dock-icon"><i></i><i></i><i></i></span><span class="resident-dock-label">Mais</span>`;
    more.addEventListener('click', openMore);
    dock.appendChild(more);
    document.body.appendChild(dock);
  }

  function enhanceCards() {
    document.querySelectorAll('.resident-card[onclick]').forEach(card => {
      if (card.dataset.keyboardLink === 'true') return;
      card.dataset.keyboardLink = 'true';
      card.setAttribute('role','link');
      card.setAttribute('tabindex','0');
      card.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        card.click();
      });
    });
  }

  function syncContext() {
    const app = document.querySelector('.resident-app');
    document.body.classList.toggle('resident-v2-active', Boolean(app));
    if (!app) return;
    const top = app.querySelector('.resident-top');
    const sidebarBrand = app.querySelector('.resident-sidebar .brand');
    if (top && sidebarBrand && !top.querySelector('.resident-v2-mobile-brand')) {
      const brand = sidebarBrand.cloneNode(true);
      brand.classList.add('resident-v2-mobile-brand');
      top.prepend(brand);
    }
  }

  function refresh() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      syncContext();
      enhanceSidebar();
      enhanceCards();
      ensureDock();
    });
  }

  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMore(); });
  window.addEventListener('hashchange', closeMore, {passive:true});
  const observer = new MutationObserver(refresh);
  function start() {
    refresh();
    observer.observe(document.getElementById('app') || document.body, {childList:true,subtree:true});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
