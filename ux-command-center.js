(() => {
  'use strict';

  let scheduled = false;
  let overlay = null;
  let activeIndex = 0;
  let currentResults = [];

  const state = () => typeof data !== 'undefined' ? data : null;
  const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
  const normalize = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const access = () => window.CondoAccess || null;
  const registry = () => window.GCNavigation || null;

  function condoIdOf(item) {
    return item?.condoId || item?.condominium_id || item?.condominiumId || null;
  }

  function condoName(cid) {
    return (state()?.condos || []).find(c => String(c.id) === String(cid))?.name || 'Condomínio';
  }

  function canAccess(cid) {
    if (!cid) return false;
    const a = access();
    return a ? Boolean(a.canAccessCondo?.(cid)) : false;
  }

  function can(capability, cid) {
    const a = access();
    if (!a) return false;
    if (cid) return Boolean(a.can?.(capability, cid));
    const memberships = a.getSnapshot?.()?.memberships || [];
    return memberships.some(m => a.can?.(capability, m.condominium_id));
  }

  function icon(key) {
    return registry()?.icons?.[key] || '';
  }

  function currentCid() {
    return registry()?.parse?.()?.cid || null;
  }

  function result(type, title, subtitle, href, iconKey, keywords='') {
    return { type, title: clean(title), subtitle: clean(subtitle), href, iconKey, keywords: normalize(keywords) };
  }

  function navigationResults() {
    const groups = registry()?.groups?.() || [];
    return groups.flatMap(group => group.items.map(item => result(
      'Navegação', item.label, group.id === 'workspace' ? condoName(currentCid()) : 'Gestão Condominial', item.href,
      item.id.includes('finance') ? 'finance' : item.id.includes('maintenance') ? 'maintenance' : item.id.includes('calls') ? 'calls' : item.id.includes('tasks') ? 'tasks' : item.id.includes('documents') || item.id.includes('docs') ? 'documents' : item.id.includes('assembl') ? 'assemblies' : item.id.includes('resident') ? 'residents' : item.id.includes('team') ? 'team' : item.id.includes('calendar') ? 'calendar' : item.id.includes('condo') ? 'condos' : 'home',
      `${group.label} ${item.label}`
    )));
  }

  function recordResults() {
    const d = state();
    if (!d) return [];
    const items = [];

    (d.condos || []).forEach(c => {
      if (!canAccess(c.id)) return;
      items.push(result('Condomínio', c.name, clean(c.address || c.address_line || ''), `#/condominio/${c.id}`, 'condos', `${c.name} condomínio workspace`));
    });

    (d.tasks || []).forEach(x => {
      const cid = condoIdOf(x); if (!cid || !can('operations.review', cid)) return;
      items.push(result('Tarefa', x.title, condoName(cid), `#/condominio/${cid}/tarefas`, 'tasks', `${x.description || ''} ${x.responsible || ''} ${x.status || ''}`));
    });

    (d.maintenances || []).forEach(x => {
      const cid = condoIdOf(x); if (!cid || !can('operations.review', cid)) return;
      items.push(result('Manutenção', x.title, condoName(cid), `#/condominio/${cid}/manutencoes`, 'maintenance', `${x.category || ''} ${x.supplier || ''} ${x.responsible || ''}`));
    });

    (d.calls || []).forEach(x => {
      const cid = condoIdOf(x); if (!cid || !can('operations.review', cid)) return;
      items.push(result('Chamado', x.title, condoName(cid), `#/condominio/${cid}/chamados`, 'calls', `${x.description || ''} ${x.category || ''} ${x.location_label || ''}`));
    });

    (d.documents || []).forEach(x => {
      const cid = condoIdOf(x); if (!cid || !can('documents.manage', cid)) return;
      items.push(result('Documento', x.title || x.name, condoName(cid), `#/condominio/${cid}/documentos`, 'documents', `${x.category || ''} ${x.notes || ''}`));
    });

    (d.files || []).forEach(x => {
      const cid = condoIdOf(x); if (!cid || !can('documents.manage', cid)) return;
      items.push(result('Arquivo', x.name || x.title, condoName(cid), `#/condominio/${cid}/arquivos`, 'files', `${x.category || ''}`));
    });

    (d.assemblies || []).forEach(x => {
      const cid = condoIdOf(x); if (!cid || !can('assemblies.manage', cid)) return;
      const href = x.id ? `#/condominio/${cid}/assembleias/${x.id}` : `#/condominio/${cid}/assembleias`;
      items.push(result('Assembleia', x.title || x.name || 'Assembleia', condoName(cid), href, 'assemblies', `${x.status || ''} ${x.description || ''}`));
    });

    return items;
  }

  function searchIndex() {
    const seen = new Set();
    return [...navigationResults(), ...recordResults()].filter(item => {
      const key = `${item.type}|${item.title}|${item.href}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function score(item, query) {
    if (!query) return item.type === 'Navegação' ? 60 : 20;
    const title = normalize(item.title);
    const subtitle = normalize(item.subtitle);
    const type = normalize(item.type);
    const haystack = `${title} ${subtitle} ${type} ${item.keywords}`;
    if (title === query) return 150;
    if (title.startsWith(query)) return 120;
    if (title.includes(query)) return 95;
    if (subtitle.startsWith(query)) return 75;
    if (haystack.includes(query)) return 55;
    const words = query.split(' ').filter(Boolean);
    if (words.length > 1 && words.every(word => haystack.includes(word))) return 45;
    return -1;
  }

  function matches(query) {
    const q = normalize(query);
    return searchIndex()
      .map(item => ({ item, score: score(item, q) }))
      .filter(row => row.score >= 0)
      .sort((a,b) => b.score - a.score || a.item.title.localeCompare(b.item.title, 'pt-BR'))
      .slice(0, 12)
      .map(row => row.item);
  }

  function availableCreateActions() {
    const cid = currentCid();
    const actions = [];
    const operationAllowed = cid ? can('operations.manage', cid) : can('operations.manage');

    if (operationAllowed && typeof window.openTaskModal === 'function') {
      actions.push({ id:'task', label:'Nova tarefa', hint: cid ? condoName(cid) : 'Escolher condomínio', iconKey:'tasks', run:() => window.openTaskModal(cid || '') });
    }
    if (operationAllowed && typeof window.openMaintenanceModal === 'function') {
      actions.push({ id:'maintenance', label:'Nova manutenção', hint: cid ? condoName(cid) : 'Escolher condomínio', iconKey:'maintenance', run:() => window.openMaintenanceModal(cid || '') });
    }
    if (operationAllowed && typeof window.openCallModal === 'function') {
      actions.push({ id:'call', label:'Novo chamado', hint: cid ? condoName(cid) : 'Escolher condomínio', iconKey:'calls', run:() => window.openCallModal(cid || '') });
    }
    if (cid && can('documents.manage', cid) && typeof window.openDocumentModal === 'function') {
      actions.push({ id:'document', label:'Novo documento', hint: condoName(cid), iconKey:'documents', run:() => window.openDocumentModal(cid) });
    }
    if (cid && can('communications.manage', cid) && typeof window.openAnnouncementModal === 'function') {
      actions.push({ id:'announcement', label:'Novo comunicado', hint: condoName(cid), iconKey:'announcements', run:() => window.openAnnouncementModal(cid) });
    }
    return actions;
  }

  function close() {
    overlay?.remove();
    overlay = null;
    currentResults = [];
    activeIndex = 0;
    document.body.classList.remove('ux-command-open');
  }

  function executeAction(action) {
    close();
    requestAnimationFrame(() => action.run());
  }

  function navigate(item) {
    close();
    if ((location.hash || '#/') === item.href) {
      if (typeof route === 'function') route();
      return;
    }
    location.hash = item.href;
  }

  function setActive(index) {
    if (!overlay || !currentResults.length) return;
    activeIndex = Math.max(0, Math.min(index, currentResults.length - 1));
    overlay.querySelectorAll('.ux-command-result').forEach((node, i) => {
      node.classList.toggle('active', i === activeIndex);
      if (i === activeIndex) node.scrollIntoView({ block:'nearest' });
    });
  }

  function renderResults(query='') {
    if (!overlay) return;
    const list = overlay.querySelector('.ux-command-results');
    const meta = overlay.querySelector('.ux-command-meta');
    currentResults = matches(query);
    activeIndex = 0;
    list.innerHTML = '';

    if (!currentResults.length) {
      const empty = document.createElement('div');
      empty.className = 'ux-command-empty';
      empty.innerHTML = `<span>${icon('search')}</span><strong>Nenhum resultado</strong><p>Tente buscar por condomínio, tarefa, manutenção ou chamado.</p>`;
      list.appendChild(empty);
      meta.textContent = '0 resultados';
      return;
    }

    currentResults.forEach((item, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `ux-command-result${index === 0 ? ' active' : ''}`;
      button.innerHTML = `<span class="ux-command-result-icon">${icon(item.iconKey)}</span><span class="ux-command-result-copy"><strong></strong><small></small></span><span class="ux-command-result-type"></span>`;
      button.querySelector('strong').textContent = item.title;
      button.querySelector('small').textContent = item.subtitle || item.type;
      button.querySelector('.ux-command-result-type').textContent = item.type;
      button.addEventListener('mouseenter', () => setActive(index));
      button.addEventListener('click', () => navigate(item));
      list.appendChild(button);
    });
    meta.textContent = `${currentResults.length} resultado${currentResults.length === 1 ? '' : 's'}`;
  }

  function buildOverlay(mode='search') {
    close();
    overlay = document.createElement('div');
    overlay.className = 'ux-command-overlay';
    overlay.innerHTML = `
      <section class="ux-command-panel" role="dialog" aria-modal="true" aria-label="Busca e ações rápidas">
        <div class="ux-command-search">
          <span class="ux-command-search-icon">${icon('search')}</span>
          <input type="search" autocomplete="off" spellcheck="false" placeholder="Buscar no sistema..." aria-label="Buscar no sistema">
          <kbd>ESC</kbd>
        </div>
        <div class="ux-command-create" hidden>
          <div class="ux-command-section-head"><strong>Criar rapidamente</strong><small></small></div>
          <div class="ux-command-actions"></div>
        </div>
        <div class="ux-command-section-head ux-command-results-head"><strong>Resultados</strong><small class="ux-command-meta"></small></div>
        <div class="ux-command-results"></div>
        <footer class="ux-command-footer"><span><kbd>↑</kbd><kbd>↓</kbd> navegar</span><span><kbd>↵</kbd> abrir</span><span class="ux-command-shortcut">Ctrl K</span></footer>
      </section>`;

    overlay.addEventListener('mousedown', event => { if (event.target === overlay) close(); });
    document.body.appendChild(overlay);
    document.body.classList.add('ux-command-open');

    const actions = availableCreateActions();
    const createSection = overlay.querySelector('.ux-command-create');
    const actionGrid = overlay.querySelector('.ux-command-actions');
    if (actions.length) {
      createSection.hidden = false;
      createSection.querySelector('small').textContent = currentCid() ? condoName(currentCid()) : 'Ações disponíveis';
      actions.forEach(action => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'ux-command-action';
        button.innerHTML = `<span>${icon(action.iconKey)}</span><span><strong></strong><small></small></span>`;
        button.querySelector('strong').textContent = action.label;
        button.querySelector('small').textContent = action.hint;
        button.addEventListener('click', () => executeAction(action));
        actionGrid.appendChild(button);
      });
    }

    const input = overlay.querySelector('input');
    input.addEventListener('input', () => renderResults(input.value));
    input.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown') { event.preventDefault(); setActive(activeIndex + 1); }
      if (event.key === 'ArrowUp') { event.preventDefault(); setActive(activeIndex - 1); }
      if (event.key === 'Enter' && currentResults[activeIndex]) { event.preventDefault(); navigate(currentResults[activeIndex]); }
    });
    renderResults('');

    if (mode === 'create' && actions.length) {
      overlay.querySelector('.ux-command-panel').classList.add('prefer-create');
      requestAnimationFrame(() => actionGrid.querySelector('button')?.focus({preventScroll:true}));
    } else {
      requestAnimationFrame(() => input.focus({preventScroll:true}));
    }
  }

  function ensureTriggers() {
    const topActions = document.querySelector('.topbar .top-actions');
    if (topActions && !topActions.querySelector('.ux-command-trigger')) {
      const search = document.createElement('button');
      search.type = 'button';
      search.className = 'btn btn-soft ux-command-trigger';
      search.innerHTML = `${icon('search')}<span>Buscar</span><kbd>Ctrl K</kbd>`;
      search.addEventListener('click', () => buildOverlay('search'));
      topActions.prepend(search);

      if (availableCreateActions().length && !topActions.querySelector('.ux-create-trigger')) {
        const create = document.createElement('button');
        create.type = 'button';
        create.className = 'btn btn-primary ux-create-trigger';
        create.textContent = '+ Criar';
        create.addEventListener('click', () => buildOverlay('create'));
        search.insertAdjacentElement('afterend', create);
      }
    }

    const mobileTop = document.querySelector('.mobile-top');
    if (mobileTop && !mobileTop.querySelector('.ux-command-mobile')) {
      const search = document.createElement('button');
      search.type = 'button';
      search.className = 'ux-command-mobile';
      search.setAttribute('aria-label', 'Buscar no sistema');
      search.innerHTML = icon('search');
      search.addEventListener('click', () => buildOverlay('search'));
      mobileTop.appendChild(search);
    }

    const dock = document.querySelector('.mobile-bottom-dock');
    const actions = availableCreateActions();
    if (dock && actions.length && !dock.querySelector('.ux-quick-create-dock')) {
      const create = document.createElement('button');
      create.type = 'button';
      create.className = 'ux-quick-create-dock';
      create.setAttribute('aria-label', 'Criar rapidamente');
      create.textContent = '+';
      create.addEventListener('click', () => buildOverlay('create'));
      dock.appendChild(create);
    }
  }

  function refresh() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      ensureTriggers();
    });
  }

  document.addEventListener('keydown', event => {
    const target = event.target;
    const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target?.isContentEditable;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      overlay ? close() : buildOverlay('search');
      return;
    }
    if (event.key === '/' && !typing && !overlay) {
      event.preventDefault();
      buildOverlay('search');
      return;
    }
    if (event.key === 'Escape' && overlay) close();
  });

  window.addEventListener('hashchange', close, {passive:true});
  const observer = new MutationObserver(refresh);
  function start() {
    refresh();
    observer.observe(document.getElementById('app') || document.body, {childList:true, subtree:true});
    window.addEventListener('resize', refresh, {passive:true});
  }

  window.GCCommandCenter = { open: buildOverlay, close, search: matches, actions: availableCreateActions };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
