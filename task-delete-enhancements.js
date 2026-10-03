(() => {
  'use strict';

  if (!window.supabase || typeof data === 'undefined') return;

  const client = window.supabase.createClient(
    'https://tckvzlizcqdxzgavjwie.supabase.co',
    'sb_publishable_MRtiWP-ErwVKXqNbGFrW_g_FwEHsob3'
  );

  const style = document.createElement('style');
  style.textContent = `
    .task-delete-btn{color:#a83743!important;border-color:#ebc7cb!important;background:#fffafa!important}
    .task-delete-btn:hover{color:#8e2935!important;border-color:#dfa6ad!important;background:#fff3f4!important}
    .task-delete-warning{display:grid;gap:4px;padding:12px;border:1px solid #efc5ca;border-radius:12px;background:#fff7f7}
    .task-delete-warning strong{color:#8d2d38;font-size:11px}.task-delete-warning span{color:#79676a;font-size:9px;line-height:1.45}
    .task-delete-certainty{display:flex;align-items:flex-start;gap:10px;padding:12px;border:1px solid #ead3d6;border-radius:12px;background:#fffafa;cursor:pointer}
    .task-delete-certainty input{width:18px;height:18px;margin-top:1px;accent-color:#b73543;flex:0 0 auto}
    .task-delete-certainty span{display:grid;gap:3px}.task-delete-certainty strong{color:#7f2631;font-size:11px}.task-delete-certainty small{color:#7d6a6d;font-size:9px;line-height:1.45}
    .task-delete-confirm{width:100%;background:#b73543!important;border-color:#b73543!important;color:#fff!important}
    .task-delete-confirm:hover{background:#982a36!important;border-color:#982a36!important}
    .task-delete-confirm:disabled{opacity:.48!important;cursor:not-allowed!important;box-shadow:none!important}
  `;
  document.head.appendChild(style);

  const state = () => typeof data !== 'undefined' ? data : null;
  const safe = value => typeof esc === 'function' ? esc(value) : String(value ?? '');
  const canManage = cid => Boolean(window.CondoAccess?.can('operations.manage', cid));
  const taskById = id => (state()?.tasks || []).find(item => String(item.id) === String(id)) || null;
  const condoName = cid => (state()?.condos || []).find(c => String(c.id) === String(cid))?.name || 'Condomínio';

  window.openDeleteTask = function(id) {
    const task = taskById(id);
    if (!task) return flash('Tarefa não encontrada.');
    if (!canManage(task.condoId)) return flash('Você não tem permissão para excluir esta tarefa.');

    modal(`
      <div class="eyebrow">Excluir tarefa</div>
      <h2 style="margin-bottom:6px">${safe(task.title)}</h2>
      <p class="muted small" style="margin-bottom:14px">${safe(condoName(task.condoId))}</p>
      <div class="task-delete-warning">
        <strong>Esta ação não pode ser desfeita.</strong>
        <span>A tarefa será removida permanentemente. A exclusão continuará registrada na auditoria.</span>
      </div>
      <form id="task-delete-form" class="form-grid" style="margin-top:14px">
        <label class="task-delete-certainty full">
          <input type="checkbox" name="certainty" value="yes">
          <span><strong>Sim, quero excluir esta tarefa.</strong><small>Entendo que ela será removida permanentemente.</small></span>
        </label>
        <div class="field full">
          <button class="btn task-delete-confirm" type="submit" disabled>Excluir permanentemente</button>
        </div>
      </form>
    `);

    const form = document.querySelector('#task-delete-form');
    const certainty = form?.querySelector('input[name="certainty"]');
    const button = form?.querySelector('button[type="submit"]');
    if (!form || !certainty || !button) return;

    const sync = () => { button.disabled = !certainty.checked; };
    certainty.addEventListener('change', sync);
    sync();

    form.onsubmit = async event => {
      event.preventDefault();
      const current = taskById(id);
      if (!current || !canManage(current.condoId)) return flash('Você não tem mais permissão para excluir esta tarefa.');
      if (!certainty.checked) return flash('Confirme que deseja excluir esta tarefa.');

      button.disabled = true;
      button.textContent = 'Excluindo...';

      const { error } = await client
        .from('tasks')
        .delete()
        .eq('id', current.id)
        .eq('condominium_id', current.condoId);

      if (error) {
        button.disabled = false;
        button.textContent = 'Excluir permanentemente';
        return flash(error.message || 'Não foi possível excluir a tarefa.');
      }

      state().tasks = (state()?.tasks || []).filter(item => String(item.id) !== String(current.id));
      try { if (typeof save === 'function') save(state()); } catch (_) {}

      closeModal();
      flash('Tarefa excluída.');
      if (typeof route === 'function') route();
    };
  };

  function enhanceRows() {
    document.querySelectorAll('tr.task-row[data-task-id]').forEach(row => {
      const id = row.dataset.taskId;
      const task = taskById(id);
      if (!task || !canManage(task.condoId)) return;

      const actions = row.querySelector('.row-actions');
      if (!actions || actions.querySelector('[data-task-delete]')) return;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-soft task-delete-btn';
      button.dataset.taskDelete = id;
      button.textContent = 'Excluir';
      button.addEventListener('click', () => window.openDeleteTask(id));

      const complete = [...actions.querySelectorAll('button')].find(item => item.textContent.trim() === 'Concluir');
      if (complete) actions.insertBefore(button, complete);
      else actions.appendChild(button);
    });
  }

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      enhanceRows();
    });
  };

  const observer = new MutationObserver(schedule);
  function start() {
    observer.observe(document.body, { childList:true, subtree:true });
    window.addEventListener('hashchange', schedule, { passive:true });
    schedule();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();