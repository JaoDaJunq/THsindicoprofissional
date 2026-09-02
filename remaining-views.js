(() => {
  'use strict';

  let scheduled = false;

  const normalize = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  const routePath = () => (location.hash || '#/').replace(/^#\//, '').split('?')[0];

  function currentView() {
    const path = routePath();
    if (path === 'condominios') return 'condominiums';
    if (path === 'chamados' || /\/chamados$/.test(path)) return 'calls';
    if (/\/documentos$/.test(path)) return 'documents';
    if (/\/(?:arquivos|base-de-dados)$/.test(path)) return 'files';
    if (/\/assembleias(?:\/|$)/.test(path)) return 'assemblies';
    if (/\/equipe$/.test(path)) return 'team';
    if (/\/moradores$/.test(path)) return 'residents';
    if (/\/comunicados$/.test(path)) return 'announcements';
    if (path === 'auditoria' || /\/auditoria$/.test(path)) return 'audit';
    if (path === 'integracoes' || /\/integracoes$/.test(path)) return 'integrations';
    if (path === 'notificacoes' || /\/notificacoes$/.test(path)) return 'notifications';
    if (path === 'tarefas' || /\/tarefas$/.test(path)) return 'tasks';
    if (/\/(?:gas|gás)$/.test(path)) return 'gas';
    return '';
  }

  function syncView() {
    const view = currentView();
    if (view) document.body.dataset.view = view;
    else delete document.body.dataset.view;
  }

  function tableRows() {
    const table = document.querySelector('.table-wrap table, table.table');
    if (!table) return [];
    table.classList.add('table');
    return [...table.querySelectorAll('tbody tr')].filter(row => row.querySelectorAll('td').length > 1);
  }

  function option(value, label) {
    const el = document.createElement('option');
    el.value = value;
    el.textContent = label;
    return el;
  }

  function ensureCallsFilters() {
    if (currentView() !== 'calls') return;
    const table = document.querySelector('.table-wrap table, table.table');
    if (!table || !table.querySelector('tbody')) return;
    table.classList.add('table');

    let toolbar = document.querySelector('[data-view-filter="calls"]');
    if (!toolbar) {
      toolbar = document.createElement('div');
      toolbar.className = 'view-filterbar';
      toolbar.dataset.viewFilter = 'calls';

      const search = document.createElement('input');
      search.type = 'search';
      search.className = 'view-search';
      search.placeholder = 'Buscar chamado, condomínio, local ou responsável...';
      search.setAttribute('aria-label', 'Buscar chamados');
      search.dataset.filterSearch = 'calls';

      const priority = document.createElement('select');
      priority.setAttribute('aria-label', 'Filtrar por prioridade');
      priority.dataset.filterPriority = 'calls';
      priority.append(
        option('', 'Todas as prioridades'),
        option('urgente', 'Urgente'),
        option('alta', 'Alta'),
        option('normal', 'Normal'),
        option('baixa', 'Baixa')
      );

      const status = document.createElement('select');
      status.setAttribute('aria-label', 'Filtrar por status');
      status.dataset.filterStatus = 'calls';
      status.append(option('', 'Todos os status'));

      const count = document.createElement('span');
      count.className = 'view-filter-count';
      count.dataset.filterCount = 'calls';

      toolbar.append(search, priority, status, count);
      table.closest('.table-wrap')?.insertAdjacentElement('beforebegin', toolbar);
      search.addEventListener('input', filterCalls);
      priority.addEventListener('change', filterCalls);
      status.addEventListener('change', filterCalls);
    }

    const statuses = new Map();
    tableRows().forEach(row => {
      const cells = row.querySelectorAll('td');
      const priorityText = normalize(cells[3]?.textContent);
      const statusText = normalize(cells[4]?.textContent);
      row.dataset.priority = priorityText;
      row.dataset.status = statusText;
      row.dataset.viewSearch = normalize(row.textContent);
      if (statusText) statuses.set(statusText, String(cells[4]?.textContent || '').trim());
    });

    const statusSelect = toolbar.querySelector('[data-filter-status="calls"]');
    const selected = statusSelect?.value || '';
    if (statusSelect) {
      [...statusSelect.options].slice(1).forEach(item => item.remove());
      [...statuses.entries()].sort((a,b) => a[1].localeCompare(b[1], 'pt-BR')).forEach(([value,label]) => statusSelect.append(option(value,label)));
      if ([...statusSelect.options].some(item => item.value === selected)) statusSelect.value = selected;
    }
    filterCalls();
  }

  function filterCalls() {
    const toolbar = document.querySelector('[data-view-filter="calls"]');
    if (!toolbar) return;
    const query = normalize(toolbar.querySelector('[data-filter-search="calls"]')?.value);
    const priority = normalize(toolbar.querySelector('[data-filter-priority="calls"]')?.value);
    const status = normalize(toolbar.querySelector('[data-filter-status="calls"]')?.value);
    let visible = 0;
    tableRows().forEach(row => {
      const matchSearch = !query || String(row.dataset.viewSearch || normalize(row.textContent)).includes(query);
      const rowPriority = normalize(row.dataset.priority);
      const matchPriority = !priority || rowPriority === priority || (priority === 'urgente' && rowPriority === 'urgent') || (priority === 'alta' && rowPriority === 'high') || (priority === 'baixa' && rowPriority === 'low');
      const matchStatus = !status || normalize(row.dataset.status) === status;
      const show = matchSearch && matchPriority && matchStatus;
      row.classList.toggle('view-filter-hidden', !show);
      if (show) visible += 1;
    });
    const count = toolbar.querySelector('[data-filter-count="calls"]');
    if (count) count.textContent = `${visible} chamado${visible === 1 ? '' : 's'}`;
  }

  function ensureFileSearch() {
    if (currentView() !== 'files') return;
    const grid = document.querySelector('.file-grid');
    if (!grid) return;

    let toolbar = document.querySelector('[data-view-filter="files"]');
    if (!toolbar) {
      toolbar = document.createElement('div');
      toolbar.className = 'view-filterbar';
      toolbar.dataset.viewFilter = 'files';
      const search = document.createElement('input');
      search.type = 'search';
      search.className = 'view-search';
      search.placeholder = 'Buscar nesta pasta...';
      search.setAttribute('aria-label', 'Buscar pastas e arquivos');
      search.dataset.filterSearch = 'files';
      const count = document.createElement('span');
      count.className = 'view-filter-count';
      count.dataset.filterCount = 'files';
      toolbar.append(search, count);
      grid.insertAdjacentElement('beforebegin', toolbar);
      search.addEventListener('input', filterFiles);
    }

    [...grid.querySelectorAll('.file-card')].forEach(card => {
      card.dataset.viewSearch = normalize(card.textContent);
    });
    filterFiles();
  }

  function filterFiles() {
    const toolbar = document.querySelector('[data-view-filter="files"]');
    const grid = document.querySelector('.file-grid');
    if (!toolbar || !grid) return;
    const query = normalize(toolbar.querySelector('[data-filter-search="files"]')?.value);
    let visible = 0;
    [...grid.querySelectorAll('.file-card')].forEach(card => {
      const show = !query || String(card.dataset.viewSearch || normalize(card.textContent)).includes(query);
      card.classList.toggle('view-filter-hidden', !show);
      if (show) visible += 1;
    });
    const count = toolbar.querySelector('[data-filter-count="files"]');
    if (count) count.textContent = visible === 1 ? '1 item' : `${visible} itens`;
  }

  function normalizeLegacyTables() {
    document.querySelectorAll('.table-wrap > table').forEach(table => table.classList.add('table'));
  }

  function refresh() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      syncView();
      normalizeLegacyTables();
      ensureCallsFilters();
      ensureFileSearch();
    });
  }

  const observer = new MutationObserver(refresh);

  function start() {
    refresh();
    observer.observe(document.getElementById('app') || document.body, { childList:true, subtree:true });
    window.addEventListener('hashchange', refresh, { passive:true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();