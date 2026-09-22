(() => {
  'use strict';

  if (!window.supabase || typeof data === 'undefined') return;

  const client = window.supabase.createClient(
    'https://tckvzlizcqdxzgavjwie.supabase.co',
    'sb_publishable_MRtiWP-ErwVKXqNbGFrW_g_FwEHsob3'
  );

  const safe = value => typeof esc === 'function' ? esc(value) : String(value ?? '');
  const state = () => typeof data !== 'undefined' ? data : null;
  const canOperate = cid => Boolean(window.CondoAccess?.can('operations.manage', cid));
  const condoName = cid => (state()?.condos || []).find(c => String(c.id) === String(cid))?.name || 'Condomínio';
  const dateText = value => typeof br === 'function' ? br(value) : String(value || '');
  const priorityPt = p => ({ low:'Baixa', normal:'Média', high:'Alta', urgent:'Urgente' })[p] || p || 'Média';
  const statusPt = s => ({ pending:'Pendente', in_progress:'Em andamento', done:'Concluída', cancelled:'Cancelada' })[s] || s || 'Pendente';
  const recurrencePt = r => ({ none:'Única', weekly:'Semanal', monthly:'Mensal', bimonthly:'Bimestral', quarterly:'Trimestral', semiannual:'Semestral', annual:'Anual' })[r] || r || 'Única';

  const taskStyle = document.createElement('style');
  taskStyle.textContent = `
    .task-list-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 12px}
    .task-list-toolbar input{min-width:220px;flex:1 1 240px}.task-list-toolbar select{min-width:170px}
    .task-list-count{font-size:10px;color:var(--muted);margin-left:auto;white-space:nowrap}
    .task-row--done td{background:#f5fbf7!important;color:#65756b}.task-row--done td:first-child{box-shadow:inset 3px 0 0 #53a66e}
    .task-row--done td strong{color:#3f7250}.task-row--done .list-sub{color:#7a8a80}
    .task-row--late td:first-child{box-shadow:inset 3px 0 0 #d84d58}
    .task-status-badge{display:inline-flex;align-items:center;padding:4px 7px;border-radius:999px;font-size:9px;font-weight:800;white-space:nowrap}
    .task-status-badge.done{background:#e6f6eb;color:#2c7a47}.task-status-badge.in_progress{background:#eaf0ff;color:#3b57b7}
    .task-status-badge.pending{background:#fff4d8;color:#8a6500}.task-status-badge.cancelled{background:#f0f2f5;color:#707784}
    .task-section-divider td{padding:14px 8px 7px!important;background:transparent!important;border-bottom:0!important}
    .task-section-divider span{display:inline-flex;align-items:center;gap:7px;color:#4d7259;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.05em}
    .task-section-divider span::before{content:'✓';width:19px;height:19px;border-radius:50%;display:grid;place-items:center;background:#e6f6eb;color:#2c7a47;font-size:11px}
    .task-row[hidden],.task-section-divider[hidden]{display:none!important}
    @media(max-width:700px){.task-list-toolbar{align-items:stretch}.task-list-toolbar input,.task-list-toolbar select{width:100%;min-width:0}.task-list-count{width:100%;margin-left:0}.task-row--done td:first-child,.task-row--late td:first-child{box-shadow:none}}
  `;
  document.head.appendChild(taskStyle);

  function localDateDiff(value) {
    if (!value) return null;
    const today = new Date();
    today.setHours(0,0,0,0);
    const due = new Date(`${value}T00:00:00`);
    if (Number.isNaN(due.getTime())) return null;
    return Math.ceil((due - today) / 86400000);
  }

  function taskById(id) {
    return (state()?.tasks || []).find(task => String(task.id) === String(id)) || null;
  }

  function taskSortRank(task) {
    const days = localDateDiff(task?.dueDate);
    if (!['done','cancelled'].includes(task?.status) && days !== null && days < 0) return 0;
    if (task?.status === 'in_progress') return 1;
    if (task?.status === 'pending') return 2;
    if (task?.status === 'cancelled') return 3;
    if (task?.status === 'done') return 4;
    return 2;
  }

  function compareTasks(a,b) {
    const rank = taskSortRank(a) - taskSortRank(b);
    if (rank) return rank;
    if (a.status === 'done' && b.status === 'done') {
      const aDone = a.completedAt || a.dueDate || '';
      const bDone = b.completedAt || b.dueDate || '';
      return String(bDone).localeCompare(String(aDone));
    }
    return String(a.dueDate || '9999-12-31').localeCompare(String(b.dueDate || '9999-12-31'));
  }

  function taskStatusBadge(status) {
    const cls = ['done','in_progress','pending','cancelled'].includes(status) ? status : 'pending';
    return `<span class="task-status-badge ${safe(cls)}">${safe(statusPt(status))}</span>`;
  }

  function normalizeTaskSearch(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  }

  window.filterTaskList = function(rootId='task-list-shell') {
    const root = document.getElementById(rootId);
    if (!root) return;
    const query = normalizeTaskSearch(root.querySelector('[data-task-search]')?.value);
    const status = root.querySelector('[data-task-status-filter]')?.value || '';
    const rows = [...root.querySelectorAll('tr.task-row')];
    let visible = 0;
    let visibleDone = 0;
    rows.forEach(row => {
      const textMatch = !query || normalizeTaskSearch(row.textContent).includes(query);
      const rowStatus = row.dataset.taskStatus || '';
      const rowLate = row.dataset.taskLate === 'true';
      const statusMatch = !status || (status === 'late' ? rowLate : rowStatus === status);
      const show = textMatch && statusMatch;
      row.hidden = !show;
      if (show) {
        visible += 1;
        if (rowStatus === 'done') visibleDone += 1;
      }
    });
    const divider = root.querySelector('.task-section-divider');
    if (divider) divider.hidden = visibleDone === 0;
    const count = root.querySelector('[data-task-count]');
    if (count) count.textContent = `${visible} tarefa${visible === 1 ? '' : 's'} exibida${visible === 1 ? '' : 's'}`;
  };

  window.clearTaskListFilters = function(rootId='task-list-shell') {
    const root = document.getElementById(rootId);
    if (!root) return;
    const search = root.querySelector('[data-task-search]');
    const status = root.querySelector('[data-task-status-filter]');
    if (search) search.value = '';
    if (status) status.value = '';
    window.filterTaskList(rootId);
    search?.focus();
  };

  function option(value, label, selected) {
    return `<option value="${safe(value)}" ${String(value) === String(selected) ? 'selected' : ''}>${safe(label)}</option>`;
  }

  function recurrenceOptions(selected) {
    const known = [
      ['none','Única'],
      ['weekly','Semanal'],
      ['monthly','Mensal'],
      ['bimonthly','Bimestral'],
      ['quarterly','Trimestral'],
      ['semiannual','Semestral'],
      ['annual','Anual']
    ];
    const values = new Set(known.map(([value]) => value));
    const extra = selected && !values.has(selected) ? [[selected, recurrencePt(selected)]] : [];
    return [...known, ...extra].map(([value,label]) => option(value,label,selected)).join('');
  }

  function priorityOptions(selected) {
    return [
      ['low','Baixa'],
      ['normal','Média'],
      ['high','Alta'],
      ['urgent','Urgente']
    ].map(([value,label]) => option(value,label,selected)).join('');
  }

  function parseReminders(value) {
    const parsed = String(value || '')
      .split(',')
      .map(item => Number(item.trim()))
      .filter(item => Number.isInteger(item) && item >= 0 && item <= 365);
    return [...new Set(parsed)].sort((a,b) => b-a);
  }

  window.openTaskQuickEdit = function(id) {
    const task = taskById(id);
    if (!task) return flash('Tarefa não encontrada.');
    if (!canOperate(task.condoId)) return flash('Você não tem permissão para editar esta tarefa.');

    const reminders = Array.isArray(task.reminders) && task.reminders.length ? task.reminders.join(',') : '2';

    modal(`
      <div class="eyebrow">Editar tarefa</div>
      <h2 style="margin-bottom:6px">${safe(task.title)}</h2>
      <p class="muted small" style="margin-bottom:16px">${safe(condoName(task.condoId))}. O condomínio da tarefa não é alterado por este atalho.</p>
      <form id="task-quick-edit-form" class="form-grid">
        <div class="field full"><label>Condomínio</label><input value="${safe(condoName(task.condoId))}" disabled></div>
        <div class="field full"><label>Tarefa</label><input name="title" required maxlength="240" value="${safe(task.title)}"></div>
        <div class="field full"><label>Descrição</label><textarea name="description" rows="4" placeholder="Detalhes, orientação ou contexto da tarefa">${safe(task.description || '')}</textarea></div>
        <div class="field"><label>Responsável</label><input name="responsible" maxlength="160" value="${safe(task.responsible || '')}" placeholder="Ex.: Síndico"></div>
        <div class="field"><label>Prazo</label><input name="dueDate" type="date" required value="${safe(task.dueDate || '')}"></div>
        <div class="field"><label>Recorrência</label><select name="recurrence">${recurrenceOptions(task.recurrence || 'none')}</select></div>
        <div class="field"><label>Prioridade</label><select name="priority">${priorityOptions(task.priority || 'normal')}</select></div>
        <div class="field full"><label>Lembretes em dias</label><input name="reminders" inputmode="numeric" value="${safe(reminders)}" placeholder="Ex.: 7,2"><small class="muted">Separe por vírgulas. Ex.: 30,7,2.</small></div>
        <div class="field full"><div class="muted small">Status atual: <strong>${safe(statusPt(task.status))}</strong>. Para concluir uma tarefa, continue usando o botão Concluir.</div></div>
        <div class="field full"><button class="btn btn-primary" type="submit">Salvar alterações</button></div>
      </form>`);

    const form = document.querySelector('#task-quick-edit-form');
    if (!form) return;

    form.onsubmit = async event => {
      event.preventDefault();
      const current = taskById(id);
      if (!current || !canOperate(current.condoId)) return flash('Você não tem mais permissão para editar esta tarefa.');

      const values = new FormData(form);
      const title = String(values.get('title') || '').trim();
      const dueDate = String(values.get('dueDate') || '').trim();
      if (!title) return flash('Informe o título da tarefa.');
      if (!dueDate) return flash('Informe o prazo da tarefa.');

      const remindersParsed = parseReminders(values.get('reminders'));
      const payload = {
        title,
        description: String(values.get('description') || '').trim() || null,
        responsible: String(values.get('responsible') || '').trim() || null,
        due_date: dueDate,
        recurrence: String(values.get('recurrence') || 'none'),
        priority: String(values.get('priority') || 'normal'),
        reminders: remindersParsed.length ? remindersParsed : [2]
      };

      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      button.textContent = 'Salvando...';

      try {
        const { data: updated, error } = await client
          .from('tasks')
          .update(payload)
          .eq('id', current.id)
          .eq('condominium_id', current.condoId)
          .select('id')
          .maybeSingle();

        if (error) throw error;
        if (!updated?.id) throw new Error('Tarefa não encontrada ou sem permissão para alteração.');

        closeModal();
        flash('Tarefa atualizada.');
        if (typeof route === 'function') route();
      } catch (err) {
        button.disabled = false;
        button.textContent = 'Salvar alterações';
        flash(err.message || 'Não foi possível atualizar a tarefa.');
      }
    };
  };

  if (typeof tasksTable === 'function') {
    tasksTable = function(list) {
      if (!list.length) return '<div class="empty">Nenhuma tarefa cadastrada.</div>';
      const ordered = [...list].sort(compareTasks);
      let dividerInserted = false;
      const rows = ordered.map(task => {
        const days = localDateDiff(task.dueDate);
        const late = days !== null && days < 0 && !['done','cancelled'].includes(task.status);
        const manage = canOperate(task.condoId);
        const edit = manage ? `<button class="btn btn-soft" onclick="openTaskQuickEdit('${safe(task.id)}')">Editar</button>` : '';
        const complete = manage && task.status !== 'done' && task.status !== 'cancelled' ? `<button class="btn" onclick="completeTask('${safe(task.id)}')">Concluir</button>` : '';
        const actions = edit || complete ? `<div class="row-actions">${edit}${complete}</div>` : '<span class="muted small">Somente leitura</span>';
        const row = `<tr class="task-row ${task.status === 'done' ? 'task-row--done' : ''} ${late ? 'task-row--late' : ''}" data-task-id="${safe(task.id)}" data-task-status="${safe(task.status || 'pending')}" data-task-late="${late ? 'true' : 'false'}"><td><strong>${safe(task.title)}</strong><div class="list-sub">${safe((task.description || '').split('\n')[0])}</div>${task.sourceLabel ? '<div class="migration-note">Importado da planilha anterior</div>' : ''}</td><td>${safe(condoName(task.condoId))}</td><td>${safe(task.responsible || 'Síndico')}</td><td>${dateText(task.dueDate)} ${late ? '<span class="badge bad">Atrasada</span>' : ''}</td><td>${safe(priorityPt(task.priority))}</td><td>${taskStatusBadge(task.status)}</td><td>${actions}</td></tr>`;
        if (task.status === 'done' && !dividerInserted) {
          dividerInserted = true;
          return `<tr class="task-section-divider"><td colspan="7"><span>Concluídas</span></td></tr>${row}`;
        }
        return row;
      }).join('');

      return `<div id="task-list-shell" class="task-list-shell"><div class="task-list-toolbar"><input type="search" data-task-search placeholder="Buscar tarefa, condomínio ou responsável..." aria-label="Buscar tarefas" oninput="filterTaskList()"><select data-task-status-filter aria-label="Filtrar tarefas por status" onchange="filterTaskList()"><option value="">Todos os status</option><option value="late">Atrasadas</option><option value="in_progress">Em andamento</option><option value="pending">Pendentes</option><option value="done">Concluídas</option><option value="cancelled">Canceladas</option></select><button type="button" class="btn btn-soft" onclick="clearTaskListFilters()">Limpar</button><span class="task-list-count" data-task-count>${ordered.length} tarefas exibidas</span></div><div class="table-wrap"><table class="table"><thead><tr><th>Pendência / tarefa</th><th>Condomínio</th><th>Responsável</th><th>Prazo</th><th>Prioridade</th><th>Status</th><th>Ações</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
    };
  }
})();
