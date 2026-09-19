(() => {
  'use strict';

  if (!window.supabase || typeof window.auditPage !== 'function') return;

  const client = window.supabase.createClient(
    'https://tckvzlizcqdxzgavjwie.supabase.co',
    'sb_publishable_MRtiWP-ErwVKXqNbGFrW_g_FwEHsob3'
  );

  const baseAuditPage = window.auditPage;
  const actionLabel = { insert:'Criou', update:'Alterou', delete:'Excluiu' };
  const entityLabel = {
    condominiums:'Condomínio',
    units:'Unidade',
    condominium_members:'Acesso / vínculo',
    service_requests:'Chamado',
    maintenances:'Manutenção',
    tasks:'Tarefa',
    gas_controls:'Controle de gás',
    documents:'Documento',
    announcements:'Comunicado',
    finance_categories:'Categoria financeira',
    finance_transactions:'Lançamento financeiro',
    assemblies:'Assembleia',
    assembly_agenda_items:'Pauta',
    assembly_attendance:'Presença',
    assembly_votes:'Voto'
  };

  const safe = value => typeof esc === 'function'
    ? esc(value)
    : String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char]));

  const fmt = value => value
    ? new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(value))
    : '—';

  function startOfToday() {
    const date = new Date();
    date.setHours(0,0,0,0);
    return date;
  }

  function rangeStart(range) {
    if (range === 'all') return null;
    const date = startOfToday();
    if (range === '7') date.setDate(date.getDate() - 6);
    if (range === '30') date.setDate(date.getDate() - 29);
    return date;
  }

  function actorName(row, profileMap) {
    return profileMap.get(row.actor_user_id) || 'Sistema';
  }

  function initials(name) {
    return String(name || 'S').trim().split(/\s+/).slice(0,2).map(part => part[0]?.toUpperCase() || '').join('') || 'S';
  }

  function describe(row) {
    const action = actionLabel[row.action] || row.action || 'Alterou';
    const entity = entityLabel[row.entity_type] || row.entity_type || 'registro';
    const label = row.entity_label ? ` “${safe(row.entity_label)}”` : '';
    if (row.action === 'insert') return `${action} ${entity}${label}`;
    if (row.action === 'delete') return `${action} ${entity}${label}`;
    const keys = Object.keys(row.changes || {});
    const detail = keys.length ? ` • ${keys.slice(0,3).join(', ')}${keys.length > 3 ? ` +${keys.length-3}` : ''}` : '';
    return `${action} ${entity}${label}${safe(detail)}`;
  }

  async function loadProfiles(rows) {
    const ids = [...new Set(rows.map(row => row.actor_user_id).filter(Boolean))];
    if (!ids.length) return new Map();
    const { data, error } = await client.from('profiles').select('id,full_name').in('id', ids);
    if (error) {
      console.warn('[team-activity] profiles', error);
      return new Map();
    }
    return new Map((data || []).map(profile => [profile.id, profile.full_name || 'Usuário']));
  }

  function filteredRows(rows, range, actor) {
    const start = rangeStart(range);
    return rows.filter(row => {
      const dateOk = !start || new Date(row.created_at) >= start;
      const actorOk = !actor || row.actor_user_id === actor;
      return dateOk && actorOk;
    });
  }

  function renderSummary(rows, profileMap, range='30', actor='') {
    const filtered = filteredRows(rows, range, actor);
    const host = document.querySelector('#team-activity-dashboard');
    if (!host) return;

    const totals = {
      all: filtered.length,
      insert: filtered.filter(row => row.action === 'insert').length,
      update: filtered.filter(row => row.action === 'update').length,
      delete: filtered.filter(row => row.action === 'delete').length
    };

    const actors = new Map();
    filtered.forEach(row => {
      const key = row.actor_user_id || 'system';
      if (!actors.has(key)) actors.set(key, { id:key, name:actorName(row, profileMap), total:0, insert:0, update:0, delete:0, last:null });
      const item = actors.get(key);
      item.total += 1;
      if (row.action in item) item[row.action] += 1;
      if (!item.last || new Date(row.created_at) > new Date(item.last)) item.last = row.created_at;
    });

    const actorCards = [...actors.values()].sort((a,b) => b.total - a.total).map(item => `
      <article class="team-activity-person">
        <div class="team-activity-avatar">${safe(initials(item.name))}</div>
        <div class="team-activity-person-copy">
          <strong>${safe(item.name)}</strong>
          <span>${item.total} alteração${item.total === 1 ? '' : 'ões'} • última ${fmt(item.last)}</span>
          <small>${item.insert} criaç${item.insert === 1 ? 'ão' : 'ões'} • ${item.update} ediç${item.update === 1 ? 'ão' : 'ões'} • ${item.delete} exclus${item.delete === 1 ? 'ão' : 'ões'}</small>
        </div>
      </article>
    `).join('');

    const feed = filtered.slice(0,12).map(row => `
      <article class="team-activity-feed-item">
        <div class="team-activity-dot team-activity-dot--${safe(row.action)}"></div>
        <div>
          <strong>${safe(actorName(row, profileMap))}</strong>
          <p>${describe(row)}</p>
          <small>${fmt(row.created_at)}</small>
        </div>
      </article>
    `).join('');

    host.querySelector('[data-activity-total]').textContent = totals.all;
    host.querySelector('[data-activity-created]').textContent = totals.insert;
    host.querySelector('[data-activity-updated]').textContent = totals.update;
    host.querySelector('[data-activity-deleted]').textContent = totals.delete;
    host.querySelector('[data-activity-people]').innerHTML = actorCards || '<div class="empty">Nenhuma atividade neste período.</div>';
    host.querySelector('[data-activity-feed]').innerHTML = feed || '<div class="empty">Nenhuma atividade neste período.</div>';
  }

  async function enhance() {
    const rows = Array.isArray(window.__GC_AUDIT_ROWS__) ? window.__GC_AUDIT_ROWS__ : [];
    if (!rows.length && document.querySelector('#team-activity-dashboard')) return;

    const profileMap = await loadProfiles(rows);
    const panel = document.createElement('section');
    panel.id = 'team-activity-dashboard';
    panel.className = 'team-activity-dashboard';
    panel.innerHTML = `
      <div class="team-activity-head">
        <div>
          <div class="eyebrow">ATIVIDADE DA EQUIPE</div>
          <h2>Quem alterou o quê</h2>
          <p class="muted small">Resumo das ações registradas automaticamente pelo banco.</p>
        </div>
        <div class="team-activity-filters">
          <select id="activity-actor" aria-label="Filtrar atividade por usuário">
            <option value="">Todos os usuários</option>
            ${[...profileMap.entries()].sort((a,b)=>String(a[1]).localeCompare(String(b[1]),'pt-BR')).map(([id,name]) => `<option value="${safe(id)}">${safe(name)}</option>`).join('')}
          </select>
          <div class="team-activity-range" role="group" aria-label="Período da atividade">
            <button type="button" data-range="today">Hoje</button>
            <button type="button" data-range="7">7 dias</button>
            <button type="button" data-range="30" class="active">30 dias</button>
            <button type="button" data-range="all">Tudo</button>
          </div>
        </div>
      </div>
      <div class="team-activity-metrics">
        <article><span>Alterações</span><strong data-activity-total>0</strong></article>
        <article><span>Criações</span><strong data-activity-created>0</strong></article>
        <article><span>Edições</span><strong data-activity-updated>0</strong></article>
        <article><span>Exclusões</span><strong data-activity-deleted>0</strong></article>
      </div>
      <div class="team-activity-grid">
        <div>
          <div class="team-activity-section-title"><strong>Por usuário</strong><span>Volume de ações no período</span></div>
          <div class="team-activity-people" data-activity-people></div>
        </div>
        <div>
          <div class="team-activity-section-title"><strong>Atividade recente</strong><span>Últimas ações registradas</span></div>
          <div class="team-activity-feed" data-activity-feed></div>
        </div>
      </div>
    `;

    const explainer = document.querySelector('.database-explainer');
    const firstPanel = document.querySelector('.main article.panel');
    if (explainer?.parentNode) explainer.insertAdjacentElement('afterend', panel);
    else if (firstPanel?.parentNode) firstPanel.insertAdjacentElement('beforebegin', panel);
    else document.querySelector('.main')?.appendChild(panel);

    let range = '30';
    let actor = '';
    const apply = () => renderSummary(rows, profileMap, range, actor);
    panel.querySelector('#activity-actor')?.addEventListener('change', event => {
      actor = event.target.value;
      apply();
    });
    panel.querySelectorAll('[data-range]').forEach(button => button.addEventListener('click', () => {
      range = button.dataset.range;
      panel.querySelectorAll('[data-range]').forEach(item => item.classList.toggle('active', item === button));
      apply();
    }));
    apply();
  }

  window.auditPage = async function activityAuditPage(cid=null) {
    await baseAuditPage(cid);
    await enhance();
  };
})();