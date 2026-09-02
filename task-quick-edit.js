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
      return `<div class="table-wrap"><table class="table"><thead><tr><th>Pendência / tarefa</th><th>Condomínio</th><th>Responsável</th><th>Prazo</th><th>Prioridade</th><th>Status</th><th>Ações</th></tr></thead><tbody>${list.map(task => {
        const days = localDateDiff(task.dueDate);
        const late = days !== null && days < 0 && !['done','cancelled'].includes(task.status);
        const manage = canOperate(task.condoId);
        const edit = manage ? `<button class="btn btn-soft" onclick="openTaskQuickEdit('${safe(task.id)}')">Editar</button>` : '';
        const complete = manage && task.status !== 'done' ? `<button class="btn" onclick="completeTask('${safe(task.id)}')">Concluir</button>` : '';
        const actions = edit || complete ? `<div class="row-actions">${edit}${complete}</div>` : '<span class="muted small">Somente leitura</span>';
        return `<tr><td><strong>${safe(task.title)}</strong><div class="list-sub">${safe((task.description || '').split('\n')[0])}</div>${task.sourceLabel ? '<div class="migration-note">Importado da planilha anterior</div>' : ''}</td><td>${safe(condoName(task.condoId))}</td><td>${safe(task.responsible || 'Síndico')}</td><td>${dateText(task.dueDate)} ${late ? '<span class="badge bad">Atrasada</span>' : ''}</td><td>${safe(priorityPt(task.priority))}</td><td>${safe(statusPt(task.status))}</td><td>${actions}</td></tr>`;
      }).join('')}</tbody></table></div>`;
    };
  }
})();
