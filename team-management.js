(() => {
  'use strict';
  if (!window.supabase || typeof shell !== 'function') return;

  const client = window.supabase.createClient(
    'https://tckvzlizcqdxzgavjwie.supabase.co',
    'sb_publishable_MRtiWP-ErwVKXqNbGFrW_g_FwEHsob3'
  );

  const roleLabel = { syndic: 'Síndico', staff: 'Equipe', council: 'Conselho' };
  const roleBadge = { syndic: 'attention', staff: 'good', council: 'warn' };
  const canManageTeam = cid => Boolean(window.CondoAccess?.can('team.manage', cid));

  const oldShell = shell;
  shell = function(content, active = 'dashboard', cid = null) {
    let html = oldShell(content, active, cid);
    if (cid && canManageTeam(cid) && !html.includes(`/condominio/${cid}/equipe`)) {
      const marker = `<a href="#/condominio/${cid}/moradores"`;
      const item = `<a href="#/condominio/${cid}/equipe" class="${active === 'condo-team' ? 'active' : ''}"><span>♙</span><span>Equipe</span></a>`;
      html = html.includes(marker) ? html.replace(marker, item + marker) : html;
    }
    return html;
  };

  async function invoke(action, condominiumId, payload = {}) {
    const { data: { session } } = await client.auth.getSession();
    if (!session) throw new Error('Sessão expirada.');
    const { data, error } = await client.functions.invoke('manage-condo-team', {
      body: { action, condominium_id: condominiumId, ...payload }
    });
    if (error) throw error;
    if (data?.error) {
      const err = new Error(data.error);
      err.code = data.error;
      throw err;
    }
    return data;
  }

  function friendlyError(err) {
    const code = err?.code || err?.message;
    return ({
      forbidden: 'Somente o síndico pode administrar a equipe.',
      cannot_change_self: 'Seu próprio papel não pode ser alterado por esta tela.',
      cannot_remove_self: 'Seu próprio acesso não pode ser removido por esta tela.',
      cannot_remove_last_syndic: 'O condomínio precisa manter pelo menos um síndico ativo.',
      invalid_fields: 'Revise os dados informados.',
      membership_not_found: 'Este vínculo não foi encontrado.'
    })[code] || err?.message || 'Não foi possível concluir a operação.';
  }

  async function teamPage(cid) {
    const c = condo(cid);
    if (!c) return dashboard();
    await window.CondoAccess?.refresh();
    if (!canManageTeam(cid)) {
      $('#app').innerHTML = shell(`<article class="panel"><div class="panel-body"><div class="empty"><strong>Acesso restrito.</strong><p>Somente o síndico administra a equipe deste condomínio.</p></div></div></article>`, 'condo-team', cid);
      return;
    }

    $('#app').innerHTML = shell(`${topbar('Equipe', `${esc(c.name)} • acessos administrativos do condomínio.`, 'Workspace', `<button class="btn btn-primary" onclick="openTeamInvite('${cid}')">+ Adicionar pessoa</button>`)}<article class="panel"><div class="panel-body"><div class="empty">Carregando equipe...</div></div></article>`, 'condo-team', cid);

    try {
      const result = await invoke('list_team', cid);
      const members = result.members || [];
      const active = members.filter(m => m.is_active);
      const rows = members.length ? members.map(m => `<tr><td><strong>${esc(m.full_name || 'Sem nome')}</strong><div class="list-sub">${esc(m.email || '')}</div></td><td><span class="badge ${roleBadge[m.role] || 'good'}">${esc(roleLabel[m.role] || m.role)}</span></td><td><span class="badge ${m.is_active ? 'good' : 'bad'}">${m.is_active ? 'Ativo' : 'Inativo'}</span></td><td>${m.user_id === window.CondoAccess?.getSnapshot().user?.id ? '<span class="muted">Seu acesso</span>' : `<div class="row-actions"><button class="btn btn-soft" onclick="openTeamRole('${cid}','${m.id}','${m.role}')">Alterar papel</button>${m.is_active ? `<button class="btn" onclick="deactivateTeamMember('${cid}','${m.id}')">Desativar</button>` : ''}</div>`}</td></tr>`).join('') : `<tr><td colspan="4" class="muted">Nenhuma pessoa cadastrada.</td></tr>`;

      $('#app').innerHTML = shell(`${topbar('Equipe', `${esc(c.name)} • acessos administrativos do condomínio.`, 'Workspace', `<button class="btn btn-primary" onclick="openTeamInvite('${cid}')">+ Adicionar pessoa</button>`)}<section class="metrics" style="margin-bottom:18px"><article class="metric"><div class="metric-top"><div><span>Síndicos</span><strong>${active.filter(x => x.role === 'syndic').length}</strong></div><div class="icon blue">♙</div></div></article><article class="metric"><div class="metric-top"><div><span>Equipe</span><strong>${active.filter(x => x.role === 'staff').length}</strong></div><div class="icon green">✓</div></div></article><article class="metric"><div class="metric-top"><div><span>Conselho</span><strong>${active.filter(x => x.role === 'council').length}</strong></div><div class="icon orange">◉</div></div></article></section><article class="panel"><div class="panel-head"><div><h2>Acessos do condomínio</h2><div class="muted small">Papéis são locais: uma pessoa pode ter funções diferentes em condomínios diferentes.</div></div></div><div class="panel-body"><div class="table-wrap"><table class="table"><thead><tr><th>Pessoa</th><th>Papel</th><th>Status</th><th>Ações</th></tr></thead><tbody>${rows}</tbody></table></div></div></article>`, 'condo-team', cid);
    } catch (err) {
      flash(friendlyError(err));
    }
  }

  window.openTeamInvite = function(cid) {
    if (!canManageTeam(cid)) return flash('Somente o síndico pode administrar a equipe.');
    modal(`<div class="eyebrow">Novo acesso</div><h2 style="margin-bottom:8px">Adicionar à equipe</h2><p class="muted" style="margin-bottom:16px">Se o e-mail ainda não tiver conta, a pessoa receberá um convite para criar o acesso.</p><form id="team-invite-form" class="form-grid"><div class="field full"><label>Nome completo</label><input name="name" required></div><div class="field full"><label>E-mail</label><input name="email" type="email" required></div><div class="field full"><label>Papel</label><select name="role"><option value="staff">Equipe operacional</option><option value="council">Conselho</option><option value="syndic">Síndico adicional</option></select></div><div class="field full"><button class="btn btn-primary" type="submit">Adicionar acesso</button></div></form>`);
    $('#team-invite-form').onsubmit = async event => {
      event.preventDefault();
      const form = new FormData(event.target);
      const button = event.target.querySelector('button');
      button.disabled = true;
      button.textContent = 'Salvando...';
      try {
        await invoke('invite_member', cid, {
          email: String(form.get('email') || '').trim(),
          full_name: String(form.get('name') || '').trim(),
          role: String(form.get('role') || ''),
          redirect_to: `${location.origin}${location.pathname}`
        });
        await window.CondoAccess?.refresh();
        closeModal();
        flash('Acesso adicionado.');
        teamPage(cid);
      } catch (err) {
        button.disabled = false;
        button.textContent = 'Adicionar acesso';
        flash(friendlyError(err));
      }
    };
  };

  window.openTeamRole = function(cid, membershipId, currentRole) {
    if (!canManageTeam(cid)) return;
    modal(`<div class="eyebrow">Permissões</div><h2 style="margin-bottom:16px">Alterar papel</h2><form id="team-role-form" class="form-grid"><div class="field full"><label>Novo papel</label><select name="role">${[['staff','Equipe operacional'],['council','Conselho'],['syndic','Síndico']].map(([v,l]) => `<option value="${v}" ${v === currentRole ? 'selected' : ''}>${l}</option>`).join('')}</select></div><div class="field full"><button class="btn btn-primary">Salvar papel</button></div></form>`);
    $('#team-role-form').onsubmit = async event => {
      event.preventDefault();
      const role = new FormData(event.target).get('role');
      try {
        await invoke('update_role', cid, { membership_id: membershipId, role });
        closeModal();
        flash('Papel atualizado.');
        teamPage(cid);
      } catch (err) { flash(friendlyError(err)); }
    };
  };

  window.deactivateTeamMember = async function(cid, membershipId) {
    if (!canManageTeam(cid)) return;
    if (!confirm('Desativar este acesso ao condomínio?')) return;
    try {
      await invoke('deactivate_member', cid, { membership_id: membershipId });
      flash('Acesso desativado.');
      teamPage(cid);
    } catch (err) { flash(friendlyError(err)); }
  };

  window.teamPage = teamPage;
})();