(() => {
  'use strict';
  if (!window.supabase || typeof shell !== 'function') return;

  const client = window.supabase.createClient(
    'https://tckvzlizcqdxzgavjwie.supabase.co',
    'sb_publishable_MRtiWP-ErwVKXqNbGFrW_g_FwEHsob3'
  );

  const statusLabels = {
    open: 'Aberto',
    analysis: 'Em análise',
    in_progress: 'Em andamento',
    waiting_supplier: 'Aguardando fornecedor',
    waiting_resident: 'Aguardando morador',
    resolved: 'Resolvido',
    cancelled: 'Cancelado'
  };

  const priorityLabels = { low: 'Baixa', normal: 'Normal', high: 'Alta', urgent: 'Urgente' };

  const canManage = cid => Boolean(window.CondoAccess?.can('operations.manage', cid));
  const canReview = cid => Boolean(window.CondoAccess?.can('operations.review', cid));
  const canManageTeam = cid => Boolean(window.CondoAccess?.can('team.manage', cid));
  const fmtDate = value => value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : 'Sem data';

  async function getUser() {
    const { data: { session } } = await client.auth.getSession();
    return session?.user || null;
  }

  async function loadRequests(cid = null) {
    let query = client.from('service_requests').select('*').order('created_at', { ascending: false });
    if (cid) query = query.eq('condominium_id', cid);
    const { data: rows, error } = await query;
    if (error) throw error;
    return rows || [];
  }

  async function loadUpdates(requestId) {
    const { data, error } = await client
      .from('service_request_updates')
      .select('*')
      .eq('service_request_id', requestId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function loadAssignees(cid) {
    if (!canManageTeam(cid)) return [];
    const { data, error } = await client.functions.invoke('manage-condo-team', {
      body: { action: 'list_team', condominium_id: cid }
    });
    if (error || data?.error) return [];
    return (data.members || []).filter(x => x.is_active && ['syndic', 'staff'].includes(x.role));
  }

  function requestRow(x) {
    const c = condo(x.condominium_id);
    return `<tr class="clickable" onclick="openServiceRequest('${x.id}','${x.condominium_id}')"><td><strong>${esc(x.title)}</strong><div class="list-sub">${esc(x.category || 'Sem categoria')}</div></td><td>${esc(c?.name || 'Condomínio')}</td><td>${esc(x.location_label || 'Área comum')}</td><td>${esc(priorityLabels[x.priority] || x.priority)}</td><td>${esc(statusLabels[x.status] || x.status)}</td><td>${x.assigned_to ? 'Com responsável' : '<span class="muted">Não atribuído</span>'}</td></tr>`;
  }

  async function callsPage(cid = null) {
    const c = cid ? condo(cid) : null;
    const canCreate = cid ? canManage(cid) : (data?.condos || []).some(x => canManage(x.id));
    const actions = canCreate && typeof window.openCallModal === 'function'
      ? `<button class="btn btn-primary" onclick="openCallModal('${cid || ''}')">+ Novo chamado</button>`
      : '';
    $('#app').innerHTML = shell(`${topbar('Chamados', c ? `Solicitações de ${esc(c.name)}.` : 'Solicitações de todos os condomínios.', 'Operação', actions)}<article class="panel"><div class="panel-body"><div class="empty">Carregando chamados...</div></div></article>`, cid ? 'condo-calls' : 'calls', cid);

    try {
      const rows = await loadRequests(cid);
      const openCount = rows.filter(x => !['resolved', 'cancelled'].includes(x.status)).length;
      const urgentCount = rows.filter(x => x.priority === 'urgent' && !['resolved', 'cancelled'].includes(x.status)).length;
      const unassignedCount = rows.filter(x => !x.assigned_to && !['resolved', 'cancelled'].includes(x.status)).length;
      const content = `${topbar('Chamados', c ? `Solicitações de ${esc(c.name)}.` : 'Solicitações de todos os condomínios.', 'Operação', actions)}<section class="metrics" style="margin-bottom:18px"><article class="metric"><div class="metric-top"><div><span>Em aberto</span><strong>${openCount}</strong></div><div class="icon blue">◉</div></div></article><article class="metric"><div class="metric-top"><div><span>Urgentes</span><strong>${urgentCount}</strong></div><div class="icon orange">!</div></div></article><article class="metric"><div class="metric-top"><div><span>Sem responsável</span><strong>${unassignedCount}</strong></div><div class="icon green">?</div></div></article></section><article class="panel"><div class="panel-head"><div><h2>Fila de chamados</h2><div class="muted small">Clique em um chamado para abrir detalhes e histórico.</div></div></div><div class="panel-body">${rows.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Chamado</th><th>Condomínio</th><th>Local</th><th>Prioridade</th><th>Status</th><th>Responsável</th></tr></thead><tbody>${rows.map(requestRow).join('')}</tbody></table></div>` : '<div class="empty">Nenhum chamado cadastrado.</div>'}</div></article>`;
      $('#app').innerHTML = shell(content, cid ? 'condo-calls' : 'calls', cid);
    } catch (err) {
      flash(err.message || 'Não foi possível carregar os chamados.');
    }
  }

  async function openServiceRequest(id, cid) {
    try {
      await window.CondoAccess?.refresh();
      if (!window.CondoAccess?.canAccessCondo(cid)) return flash('Acesso não autorizado.');

      const [{ data: request, error }, updates, assignees, user] = await Promise.all([
        client.from('service_requests').select('*').eq('id', id).eq('condominium_id', cid).single(),
        loadUpdates(id),
        loadAssignees(cid),
        getUser()
      ]);
      if (error) throw error;

      const manage = canManage(cid);
      const teamManage = canManageTeam(cid);
      const review = canReview(cid);
      const owner = request.created_by === user?.id;
      const canComment = manage || owner;
      const assignmentOptions = assignees.map(m => `<option value="${m.user_id}" ${m.user_id === request.assigned_to ? 'selected' : ''}>${esc(m.full_name || m.email || m.user_id)}</option>`).join('');
      const timeline = updates.length ? updates.map(u => `<div class="timeline-item"><strong>${u.update_type === 'status_change' ? `Status: ${esc(statusLabels[u.from_status] || u.from_status || 'Sem status')} → ${esc(statusLabels[u.to_status] || u.to_status || 'Sem status')}` : u.update_type === 'assignment' ? 'Responsável alterado' : 'Comentário'}</strong>${u.body ? `<p>${esc(u.body)}</p>` : ''}<p>${fmtDate(u.created_at)}</p></div>`).join('') : '<div class="empty">Nenhuma atualização registrada.</div>';

      const assignmentUi = !manage ? '' : teamManage
        ? `<div class="field full"><label>Responsável</label><div style="display:flex;gap:8px"><select id="request-assignee"><option value="">Não atribuído</option>${assignmentOptions}</select><button class="btn" type="button" id="take-request">Assumir</button></div></div>`
        : `<div class="field full"><label>Responsável</label><div style="display:flex;gap:8px;align-items:center"><input value="${request.assigned_to === user?.id ? 'Atribuído a você' : request.assigned_to ? 'Atribuído a outra pessoa' : 'Não atribuído'}" disabled><button class="btn" type="button" id="take-request">Assumir</button></div></div>`;

      modal(`<div class="eyebrow">Chamado</div><h2 style="margin-bottom:6px">${esc(request.title)}</h2><p class="muted" style="margin-bottom:16px">${esc(condo(cid)?.name || '')} ${request.location_label ? `• ${esc(request.location_label)}` : ''}</p><div class="form-grid"><div class="field"><label>Prioridade</label><input value="${esc(priorityLabels[request.priority] || request.priority)}" disabled></div><div class="field"><label>Status</label>${manage ? `<select id="request-status">${Object.entries(statusLabels).map(([v,l]) => `<option value="${v}" ${v === request.status ? 'selected' : ''}>${l}</option>`).join('')}</select>` : `<input value="${esc(statusLabels[request.status] || request.status)}" disabled>`}</div><div class="field full"><label>Descrição</label><textarea disabled>${esc(request.description || '')}</textarea></div>${assignmentUi}</div>${manage ? '<div style="display:flex;justify-content:flex-end;margin:12px 0 18px"><button class="btn btn-primary" id="save-request-workflow">Salvar andamento</button></div>' : ''}<article class="panel" style="margin-top:10px"><div class="panel-head"><h3>Histórico</h3></div><div class="panel-body"><div class="timeline">${timeline}</div>${canComment ? `<form id="request-comment-form" class="form-grid" style="margin-top:16px"><div class="field full"><label>Adicionar comentário</label><textarea name="body" required placeholder="Registre uma atualização do atendimento"></textarea></div><div class="field full"><button class="btn btn-primary">Adicionar ao histórico</button></div></form>` : review ? '<div class="muted small" style="margin-top:14px">Conselho possui acesso somente para acompanhamento.</div>' : ''}</div></article>`);

      if (manage) {
        const assignee = teamManage ? $('#request-assignee') : null;
        let staffTake = request.assigned_to === user?.id;
        const takeButton = $('#take-request');
        if (takeButton) takeButton.onclick = () => {
          if (!user) return;
          if (teamManage && assignee) assignee.value = user.id;
          else {
            staffTake = true;
            takeButton.textContent = '✓ Será atribuído a você';
            takeButton.disabled = true;
          }
        };
        $('#save-request-workflow').onclick = async () => {
          const nextStatus = $('#request-status').value;
          const nextAssignee = teamManage ? (assignee?.value || null) : (staffTake ? user?.id || null : request.assigned_to || null);
          const { error: updateError } = await client.from('service_requests').update({ status: nextStatus, assigned_to: nextAssignee, updated_at: new Date().toISOString() }).eq('id', id).eq('condominium_id', cid);
          if (updateError) return flash(updateError.message || 'Não foi possível atualizar o chamado.');
          closeModal();
          flash('Chamado atualizado.');
          callsPage(cid);
        };
      }

      if (canComment) {
        $('#request-comment-form').onsubmit = async event => {
          event.preventDefault();
          const body = String(new FormData(event.target).get('body') || '').trim();
          if (!body || !user) return;
          const button = event.target.querySelector('button');
          button.disabled = true;
          const { error: commentError } = await client.from('service_request_updates').insert({ service_request_id: id, condominium_id: cid, created_by: user.id, update_type: 'comment', body });
          if (commentError) {
            button.disabled = false;
            return flash(commentError.message || 'Não foi possível adicionar o comentário.');
          }
          closeModal();
          flash('Atualização registrada.');
          openServiceRequest(id, cid);
        };
      }
    } catch (err) {
      flash(err.message || 'Não foi possível abrir o chamado.');
    }
  }

  window.callsPage = callsPage;
  window.openServiceRequest = openServiceRequest;
})();