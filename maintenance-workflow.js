(() => {
  'use strict';
  if (!window.supabase || typeof shell !== 'function') return;

  const client = window.supabase.createClient(
    'https://tckvzlizcqdxzgavjwie.supabase.co',
    'sb_publishable_MRtiWP-ErwVKXqNbGFrW_g_FwEHsob3'
  );

  const recurrenceLabel = value => ({
    none: 'Única', weekly: 'Semanal', monthly: 'Mensal', bimonthly: 'Bimestral',
    quarterly: 'Trimestral', semiannual: 'Semestral', annual: 'Anual', custom: 'Personalizada'
  })[value] || value;

  const priorityLabel = value => ({ low: 'Baixa', normal: 'Normal', high: 'Alta', urgent: 'Urgente' })[value] || value;
  const canManage = cid => Boolean(window.CondoAccess?.can('operations.manage', cid));
  const canReview = cid => Boolean(window.CondoAccess?.can('operations.review', cid));
  const fmt = value => value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(`${String(value).slice(0,10)}T12:00:00`)) : 'Sem data';
  const fmtDateTime = value => value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : 'Sem data';

  async function refreshLocal() {
    const { data: rows, error } = await client.from('maintenances').select('*').order('next_date', { ascending: true });
    if (error) throw error;
    const allowed = new Set((data.condos || []).map(c => c.id));
    data.maintenances = (rows || []).filter(x => allowed.has(x.condominium_id)).map(x => ({
      id: x.id,
      clientRef: x.client_ref || '',
      condoId: x.condominium_id,
      title: x.title,
      category: x.category || '',
      supplier: x.supplier || '',
      responsible: x.responsible || '',
      assignedTo: x.assigned_to || null,
      nextDate: x.next_date,
      recurrence: x.recurrence,
      recurrenceMonths: x.recurrence_months,
      status: x.status,
      priority: x.priority,
      reminders: x.reminders || [2],
      notes: x.notes || '',
      lastCompletedAt: x.last_completed_at,
      sourceLabel: x.source_label || '',
      isIncomplete: Boolean(x.is_incomplete),
      incompleteReason: x.incomplete_reason || ''
    }));
    if (typeof save === 'function') save(data);
  }

  async function loadOccurrences(maintenanceId) {
    const { data: rows, error } = await client
      .from('maintenance_occurrences')
      .select('*')
      .eq('maintenance_id', maintenanceId)
      .order('completed_at', { ascending: false });
    if (error) throw error;
    return rows || [];
  }

  function maintenanceRow(m) {
    const u = typeof urgency === 'function' ? urgency(m) : { level: 'good', label: m.status };
    return `<tr><td><strong>${esc(m.title)}</strong><div class="list-sub">${esc(m.category || 'Sem categoria')}</div>${m.isIncomplete ? `<div class="list-sub">⚠ ${esc(m.incompleteReason || 'Cadastro incompleto')}</div>` : ''}</td><td>${esc(condo(m.condoId)?.name || '—')}</td><td>${fmt(m.nextDate)}</td><td>${esc(recurrenceLabel(m.recurrence))}${m.recurrence === 'custom' && m.recurrenceMonths ? ` (${m.recurrenceMonths} meses)` : ''}</td><td>${esc(priorityLabel(m.priority))}</td><td><span class="badge ${u.level}">${esc(u.label)}</span></td><td><div class="row-actions"><button class="btn btn-soft" onclick="openMaintenanceHistory('${m.id}')">Histórico</button>${canManage(m.condoId) ? `<button class="btn btn-primary" onclick="openCompleteMaintenance('${m.id}')">Concluir</button>` : ''}</div></td></tr>`;
  }

  function enhancedMaintenancesPage(cid = null) {
    const list = data.maintenances.filter(m => !cid || m.condoId === cid).sort((a,b) => String(a.nextDate || '9999').localeCompare(String(b.nextDate || '9999')));
    const c = cid ? condo(cid) : null;
    const today = new Date(); today.setHours(0,0,0,0);
    const overdue = list.filter(m => m.nextDate && new Date(`${m.nextDate}T00:00:00`) < today && m.status !== 'done').length;
    const incomplete = list.filter(m => m.isIncomplete).length;
    const upcoming = list.filter(m => m.nextDate && (() => { const d = new Date(`${m.nextDate}T00:00:00`); const diff = Math.ceil((d - today) / 86400000); return diff >= 0 && diff <= 7; })()).length;
    const addButton = canManage(cid || list[0]?.condoId) || !cid ? `<button class="btn btn-primary" onclick="openMaintenanceModal('${cid || ''}')">+ Nova manutenção</button>` : '';
    const content = `${topbar('Manutenções', c ? `Rotinas preventivas e corretivas de ${esc(c.name)}.` : 'Controle consolidado das manutenções.', 'Operação', addButton)}<section class="metrics" style="margin-bottom:18px"><article class="metric"><div class="metric-top"><div><span>Total</span><strong>${list.length}</strong></div><div class="icon blue">⚒</div></div></article><article class="metric"><div class="metric-top"><div><span>Atrasadas</span><strong>${overdue}</strong></div><div class="icon orange">!</div></div></article><article class="metric"><div class="metric-top"><div><span>Próx. 7 dias</span><strong>${upcoming}</strong></div><div class="icon green">◫</div></div></article><article class="metric"><div class="metric-top"><div><span>Cadastro incompleto</span><strong>${incomplete}</strong></div><div class="icon orange">?</div></div></article></section><article class="panel"><div class="panel-head"><div><h2>Agenda de manutenção</h2><div class="muted small">Cada conclusão passa a gerar uma execução histórica própria, sem apagar a agenda recorrente.</div></div></div><div class="panel-body">${list.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Manutenção</th><th>Condomínio</th><th>Próxima data</th><th>Recorrência</th><th>Prioridade</th><th>Status</th><th>Ações</th></tr></thead><tbody>${list.map(maintenanceRow).join('')}</tbody></table></div>` : '<div class="empty">Nenhuma manutenção cadastrada.</div>'}</div></article>`;
    $('#app').innerHTML = shell(content, cid ? 'condo-maintenance' : 'maintenance', cid);
  }

  window.openMaintenanceHistory = async function(id) {
    const m = data.maintenances.find(x => x.id === id);
    if (!m || !canReview(m.condoId)) return flash('Acesso não autorizado.');
    try {
      const rows = await loadOccurrences(id);
      const history = rows.length ? rows.map(x => `<div class="timeline-item"><strong>Manutenção concluída</strong><p>${fmtDateTime(x.completed_at)}${x.scheduled_for ? ` • prevista para ${fmt(x.scheduled_for)}` : ''}</p>${x.notes ? `<p>${esc(x.notes)}</p>` : ''}${x.next_date_after ? `<p>Próxima: ${fmt(x.next_date_after)}</p>` : ''}</div>`).join('') : '<div class="empty">Nenhuma execução detalhada registrada ainda.</div>';
      modal(`<div class="eyebrow">Histórico de manutenção</div><h2 style="margin-bottom:6px">${esc(m.title)}</h2><p class="muted" style="margin-bottom:16px">${esc(condo(m.condoId)?.name || '')}</p><div class="kpi-strip" style="margin-bottom:16px"><div class="kpi-pill"><strong>${fmt(m.lastCompletedAt)}</strong><span>Última conclusão conhecida</span></div><div class="kpi-pill"><strong>${fmt(m.nextDate)}</strong><span>Próxima execução</span></div><div class="kpi-pill"><strong>${rows.length}</strong><span>Execuções detalhadas</span></div></div><div class="timeline">${history}</div>`);
    } catch (err) {
      flash(err.message || 'Não foi possível carregar o histórico.');
    }
  };

  window.openCompleteMaintenance = function(id) {
    const m = data.maintenances.find(x => x.id === id);
    if (!m || !canManage(m.condoId)) return flash('Acesso não autorizado.');
    modal(`<div class="eyebrow">Concluir manutenção</div><h2 style="margin-bottom:6px">${esc(m.title)}</h2><p class="muted" style="margin-bottom:16px">Prevista para ${fmt(m.nextDate)} • ${esc(recurrenceLabel(m.recurrence))}</p><form id="maintenance-complete-form" class="form-grid"><div class="field full"><label>Observações da execução</label><textarea name="notes" placeholder="Ex.: inspeção realizada, item substituído, fornecedor presente..."></textarea></div><div class="field full"><button class="btn btn-primary">Concluir e avançar agenda</button></div></form>`);
    $('#maintenance-complete-form').onsubmit = async event => {
      event.preventDefault();
      const button = event.target.querySelector('button');
      button.disabled = true;
      button.textContent = 'Concluindo...';
      const notes = String(new FormData(event.target).get('notes') || '').trim();
      const { error } = await client.rpc('complete_maintenance', { p_maintenance_id: id, p_notes: notes || null });
      if (error) {
        button.disabled = false;
        button.textContent = 'Concluir e avançar agenda';
        return flash(error.message || 'Não foi possível concluir a manutenção.');
      }
      try {
        await refreshLocal();
        closeModal();
        flash('Manutenção concluída e registrada no histórico.');
        enhancedMaintenancesPage(m.condoId);
      } catch (err) {
        closeModal();
        flash('Manutenção concluída. Atualize a tela para recarregar os dados.');
      }
    };
  };

  window.completeMaintenance = id => window.openCompleteMaintenance(id);
  window.maintenancesPage = enhancedMaintenancesPage;
  maintenancesPage = enhancedMaintenancesPage;
})();
