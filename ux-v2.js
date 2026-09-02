(() => {
  'use strict';

  let scheduled = false;
  let lastHash = '';
  const state = () => typeof data !== 'undefined' ? data : null;
  const clean = value => String(value || '').replace(/\s+/g,' ').trim();
  const normalize = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

  function condoName(cid) {
    return (state()?.condos || []).find(c => String(c.id) === String(cid))?.name || 'Condomínio';
  }

  function accessibleCondos() {
    const access = window.CondoAccess;
    return (state()?.condos || []).filter(c => !access || access.canAccessCondo?.(c.id));
  }

  function linkMarkup(item, activeId) {
    return `<a href="${item.href}" class="${item.id === activeId ? 'active' : ''}" data-nav-id="${item.id}"><span class="ux-nav-icon">${item.icon}</span><span class="ux-nav-label">${item.label}</span></a>`;
  }

  function renderSidebar() {
    const registry = window.GCNavigation;
    const sidebar = document.querySelector('.sidebar');
    if (!registry || !sidebar || sidebar.dataset.uxRegistry === 'true') return;

    const footer = sidebar.querySelector('.sidebar-footer');
    const brand = sidebar.querySelector('.brand');
    const ctx = registry.parse();
    const groups = registry.groups();
    const allItems = groups.flatMap(group => group.items);
    const activeId = registry.activeId(allItems);
    const fragment = document.createDocumentFragment();

    groups.forEach(group => {
      if (!group.items.length) return;
      const section = document.createElement('div');
      section.className = 'nav-section';
      section.textContent = group.label;
      fragment.appendChild(section);
      if (group.id === 'workspace') {
        const label = document.createElement('div');
        label.className = 'workspace-label';
        label.textContent = condoName(ctx.cid);
        fragment.appendChild(label);
      }
      const nav = document.createElement('nav');
      nav.className = 'nav';
      nav.dataset.navGroup = group.id;
      nav.innerHTML = group.items.map(item => linkMarkup(item, activeId)).join('');
      fragment.appendChild(nav);
    });

    [...sidebar.children].forEach(child => {
      if (child !== brand && child !== footer) child.remove();
    });
    if (footer) sidebar.insertBefore(fragment, footer);
    else sidebar.appendChild(fragment);
    sidebar.dataset.uxRegistry = 'true';
  }

  function currentItem() {
    const registry = window.GCNavigation;
    if (!registry) return null;
    const groups = registry.groups();
    const items = groups.flatMap(group => group.items);
    const active = registry.activeId(items);
    return items.find(item => item.id === active) || null;
  }

  function targetForCondo(newCid) {
    const ctx = window.GCNavigation?.parse?.();
    if (!ctx?.cid) return `#/condominio/${newCid}`;
    const suffix = ctx.parts.slice(2).join('/');
    return `#/condominio/${newCid}${suffix ? `/${suffix}` : ''}`;
  }

  function renderContextBar() {
    const main = document.querySelector('.main');
    const topbar = main?.querySelector('.topbar');
    const registry = window.GCNavigation;
    if (!main || !topbar || !registry || main.querySelector('.ux-contextbar')) return;

    const ctx = registry.parse();
    const item = currentItem();
    const bar = document.createElement('div');
    bar.className = `ux-contextbar ${ctx.workspace ? 'is-workspace' : 'is-global'}`;

    if (ctx.workspace) {
      const condos = accessibleCondos();
      const options = condos.map(c => `<option value="${String(c.id)}" ${String(c.id) === String(ctx.cid) ? 'selected' : ''}>${clean(c.name)}</option>`).join('');
      bar.innerHTML = `<nav class="ux-breadcrumb" aria-label="Localização"><a href="#/">Visão geral</a><span>${registry.icons.chevron}</span><a href="#/condominios">Condomínios</a><span>${registry.icons.chevron}</span><strong>${clean(condoName(ctx.cid))}</strong>${item && item.id !== 'condo-overview' ? `<span>${registry.icons.chevron}</span><em>${clean(item.label)}</em>` : ''}</nav><label class="ux-condo-switch"><span>Condomínio</span><select aria-label="Trocar condomínio">${options}</select></label>`;
      bar.querySelector('select')?.addEventListener('change', event => {
        const cid = event.target.value;
        if (cid) location.hash = targetForCondo(cid);
      });
    } else {
      bar.innerHTML = `<nav class="ux-breadcrumb" aria-label="Localização"><a href="#/">Visão geral</a>${item && item.id !== 'dashboard' ? `<span>${registry.icons.chevron}</span><strong>${clean(item.label)}</strong>` : ''}</nav>`;
    }
    topbar.insertAdjacentElement('beforebegin', bar);
  }

  const genericSearchRoutes = {
    maintenance: 'Buscar manutenção...',
    tasks: 'Buscar tarefa...',
    documents: 'Buscar documento...',
    residents: 'Buscar morador ou unidade...',
    audit: 'Buscar evento de auditoria...',
    condominiums: 'Buscar condomínio...'
  };

  function currentView() {
    return document.body.dataset.view || (() => {
      const p = (location.hash || '#/').replace(/^#\//,'').split('?')[0];
      if (p === 'condominios') return 'condominiums';
      if (p === 'manutencoes' || /\/manutencoes$/.test(p)) return 'maintenance';
      if (p === 'tarefas' || /\/tarefas$/.test(p)) return 'tasks';
      if (/\/documentos$/.test(p)) return 'documents';
      if (/\/moradores$/.test(p)) return 'residents';
      if (p === 'auditoria' || /\/auditoria$/.test(p)) return 'audit';
      return '';
    })();
  }

  function searchableItems(view) {
    if (view === 'condominiums') return [...document.querySelectorAll('.condo-grid .condo-card')];
    const table = document.querySelector('.table-wrap table, table.table');
    if (table) return [...table.querySelectorAll('tbody tr')].filter(row => row.querySelector('td'));
    if (view === 'residents') return [...document.querySelectorAll('.resident-card,.unit-card')];
    return [];
  }

  function applyGenericSearch(toolbar, view) {
    const query = normalize(toolbar.querySelector('input')?.value);
    const items = searchableItems(view);
    let visible = 0;
    items.forEach(item => {
      const show = !query || normalize(item.textContent).includes(query);
      item.classList.toggle('ux-filter-hidden', !show);
      if (show) visible += 1;
    });
    const count = toolbar.querySelector('.ux-filter-count');
    if (count) count.textContent = `${visible} resultado${visible === 1 ? '' : 's'}`;
  }

  function renderGenericSearch() {
    const view = currentView();
    const placeholder = genericSearchRoutes[view];
    if (!placeholder || document.querySelector('.view-filterbar,[data-ux-search]')) return;
    const items = searchableItems(view);
    if (items.length < 2) return;
    const anchor = document.querySelector('.table-wrap,.condo-grid,.resident-grid,.panel-body');
    if (!anchor) return;
    const toolbar = document.createElement('div');
    toolbar.className = 'ux-list-tools';
    toolbar.dataset.uxSearch = view;
    toolbar.innerHTML = `<label class="ux-search-field"><span>${window.GCNavigation?.icons.search || ''}</span><input type="search" placeholder="${placeholder}" aria-label="${placeholder.replace('...','')}"></label><span class="ux-filter-count"></span>`;
    anchor.insertAdjacentElement('beforebegin', toolbar);
    toolbar.querySelector('input')?.addEventListener('input', () => applyGenericSearch(toolbar, view));
    applyGenericSearch(toolbar, view);
  }

  function simplifyWorkspaceTables() {
    const ctx = window.GCNavigation?.parse?.();
    if (!ctx?.workspace || window.innerWidth > 700) return;
    document.querySelectorAll('.table').forEach(table => {
      const headers = [...table.querySelectorAll('thead th')];
      const index = headers.findIndex(th => normalize(th.textContent) === 'condominio');
      if (index < 0) return;
      table.classList.add('ux-hide-condo-column');
      table.querySelectorAll('tbody tr').forEach(row => row.children[index]?.classList.add('ux-redundant-condo'));
      headers[index]?.classList.add('ux-redundant-condo');
    });
  }

  function skeleton(lines=3) {
    return `<div class="ux-skeleton" aria-hidden="true">${Array.from({length:lines},(_,i)=>`<span style="--w:${i===0?'68%':i===lines-1?'48%':'88%'}"></span>`).join('')}</div>`;
  }

  function empty(title='Nada por aqui', text='Quando houver informações, elas aparecerão aqui.', action='') {
    return `<div class="ux-state ux-state-empty"><div class="ux-state-icon">${window.GCNavigation?.icons.documents || ''}</div><strong>${title}</strong><p>${text}</p>${action}</div>`;
  }

  function error(title='Não foi possível carregar', text='Tente novamente em alguns instantes.', retry='') {
    return `<div class="ux-state ux-state-error"><div class="ux-state-icon">!</div><strong>${title}</strong><p>${text}</p>${retry ? `<button class="btn" onclick="${retry}">Tentar novamente</button>` : ''}</div>`;
  }

  function confirmDialog({title='Confirmar ação',message='',confirmText='Confirmar',cancelText='Cancelar',danger=false}={}) {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'ux-confirm-overlay';
      overlay.innerHTML = `<section class="ux-confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="ux-confirm-title"><div class="ux-confirm-icon ${danger?'danger':''}">!</div><h2 id="ux-confirm-title">${title}</h2><p>${message}</p><div class="ux-confirm-actions"><button class="btn" data-confirm-cancel>${cancelText}</button><button class="btn ${danger?'ux-danger':'btn-primary'}" data-confirm-ok>${confirmText}</button></div></section>`;
      const finish = value => { overlay.remove(); resolve(value); };
      overlay.querySelector('[data-confirm-cancel]').onclick = () => finish(false);
      overlay.querySelector('[data-confirm-ok]').onclick = () => finish(true);
      overlay.addEventListener('click', e => { if (e.target === overlay) finish(false); });
      document.addEventListener('keydown', function escHandler(e){ if(e.key==='Escape'){document.removeEventListener('keydown',escHandler);finish(false);} }, {once:false});
      document.body.appendChild(overlay);
      overlay.querySelector('[data-confirm-ok]')?.focus();
    });
  }

  window.GCUI = { skeleton, empty, error, confirm: confirmDialog };

  function refresh() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      const hash = location.hash || '#/';
      if (hash !== lastHash) lastHash = hash;
      renderSidebar();
      renderContextBar();
      renderGenericSearch();
      simplifyWorkspaceTables();
    });
  }

  function resetRenderMarkers() {
    document.querySelector('.sidebar')?.removeAttribute('data-ux-registry');
  }

  const observer = new MutationObserver(() => {
    resetRenderMarkers();
    refresh();
  });

  function start() {
    refresh();
    observer.observe(document.getElementById('app') || document.body,{childList:true,subtree:true});
    window.addEventListener('hashchange',refresh,{passive:true});
    window.addEventListener('resize',refresh,{passive:true});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();