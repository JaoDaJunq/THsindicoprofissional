(() => {
  'use strict';

  if (!window.supabase || typeof data === 'undefined' || typeof shell !== 'function' || typeof topbar !== 'function') return;

  const client = window.supabase.createClient(
    'https://tckvzlizcqdxzgavjwie.supabase.co',
    'sb_publishable_MRtiWP-ErwVKXqNbGFrW_g_FwEHsob3'
  );

  const canManage = cid => Boolean(window.CondoAccess?.can?.('condo.manage', cid));
  const safe = value => typeof esc === 'function' ? esc(value) : String(value ?? '');
  const archivedList = () => Array.isArray(data.archivedCondos) ? data.archivedCondos : [];

  function icon(name) {
    const paths = {
      archive: '<path d="M4 7h16M5 7l1 13h12l1-13M9 11h6M4 3h16v4H4z" />',
      restore: '<path d="M4 7v5h5M5.5 16a7 7 0 1 0 .5-8.5L4 12" />',
      trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths[name] || ''}</svg>`;
  }

  function moveToArchived(cid, archivedAt) {
    const index = (data.condos || []).findIndex(item => String(item.id) === String(cid));
    if (index < 0) return;
    const [item] = data.condos.splice(index, 1);
    item.archivedAt = archivedAt;
    data.archivedCondos = archivedList().filter(x => String(x.id) !== String(cid));
    data.archivedCondos.push(item);
    if (typeof save === 'function') save(data);
  }

  function restoreLocal(cid) {
    const list = archivedList();
    const index = list.findIndex(item => String(item.id) === String(cid));
    if (index < 0) return;
    const [item] = list.splice(index, 1);
    item.archivedAt = null;
    data.condos = (data.condos || []).filter(x => String(x.id) !== String(cid));
    data.condos.push(item);
    if (typeof save === 'function') save(data);
  }

  function removeLocal(cid) {
    data.condos = (data.condos || []).filter(x => String(x.id) !== String(cid));
    data.archivedCondos = archivedList().filter(x => String(x.id) !== String(cid));
    for (const key of ['maintenances','tasks','calls','documents','timeline','folders','files','events','assemblies']) {
      if (Array.isArray(data[key])) data[key] = data[key].filter(x => String(x.condoId) !== String(cid));
    }
    if (typeof save === 'function') save(data);
  }

  window.archiveCondominium = async function(cid) {
    const item = (data.condos || []).find(x => String(x.id) === String(cid));
    if (!item || !canManage(cid)) return flash('Você não tem permissão para arquivar este condomínio.');
    const ok = window.confirm(`Arquivar "${item.name}"?\n\nEle sairá das visões operacionais, mas nenhum dado será apagado. Você poderá restaurá-lo depois.`);
    if (!ok) return;
    const archivedAt = new Date().toISOString();
    const { error } = await client.from('condominiums').update({ archived_at: archivedAt }).eq('id', cid);
    if (error) return flash(error.message || 'Não foi possível arquivar o condomínio.');
    moveToArchived(cid, archivedAt);
    await window.CondoAccess?.refresh?.();
    flash('Condomínio arquivado. Nenhum dado foi apagado.');
    condosPage();
  };

  window.restoreCondominium = async function(cid) {
    const item = archivedList().find(x => String(x.id) === String(cid));
    if (!item || !canManage(cid)) return flash('Você não tem permissão para restaurar este condomínio.');
    const { error } = await client.from('condominiums').update({ archived_at: null }).eq('id', cid);
    if (error) return flash(error.message || 'Não foi possível restaurar o condomínio.');
    restoreLocal(cid);
    await window.CondoAccess?.refresh?.();
    flash('Condomínio restaurado.');
    condosPage();
  };

  window.deleteCondominiumSafely = async function(cid) {
    const item = [...(data.condos || []), ...archivedList()].find(x => String(x.id) === String(cid));
    if (!item || !canManage(cid)) return flash('Você não tem permissão para excluir este condomínio.');

    modal(`
      <div class="eyebrow">Exclusão permanente</div>
      <h2 style="margin-bottom:6px">Excluir ${safe(item.name)}?</h2>
      <p class="muted" style="margin-bottom:14px">A exclusão só será permitida se o condomínio não tiver unidades, moradores ou registros operacionais vinculados. Caso tenha dados, use Arquivar.</p>
      <div class="condo-delete-warning">Esta ação não pode ser desfeita.</div>
      <form id="condo-delete-form" class="form-grid" style="margin-top:14px">
        <div class="field full">
          <label>Digite o nome do condomínio para confirmar</label>
          <input name="confirmation" autocomplete="off" required placeholder="${safe(item.name)}">
        </div>
        <div class="field full">
          <button class="btn condo-danger-button" type="submit">Excluir permanentemente</button>
        </div>
      </form>
    `);

    const form = document.querySelector('#condo-delete-form');
    if (!form) return;
    form.onsubmit = async event => {
      event.preventDefault();
      const confirmation = String(new FormData(form).get('confirmation') || '').trim();
      if (confirmation !== item.name) return flash('O nome digitado não corresponde ao condomínio.');
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      button.textContent = 'Verificando...';

      const { error } = await client.rpc('delete_condominium_if_empty', { p_condominium_id: cid });
      if (error) {
        button.disabled = false;
        button.textContent = 'Excluir permanentemente';
        if (String(error.message || '').includes('condominium_has_linked_data')) {
          return flash('Este condomínio possui dados vinculados. Arquive-o para preservar o histórico.');
        }
        return flash(error.message || 'Não foi possível excluir o condomínio.');
      }

      removeLocal(cid);
      await window.CondoAccess?.refresh?.();
      closeModal();
      flash('Condomínio excluído permanentemente.');
      condosPage();
    };
  };

  function actionButton(kind, cid, label, handler, danger=false) {
    return `<button type="button" class="condo-lifecycle-action ${danger ? 'is-danger' : ''}" onclick="event.preventDefault();event.stopPropagation();${handler}('${safe(cid)}')" aria-label="${safe(label)}" title="${safe(label)}">${icon(kind)}</button>`;
  }

  function activeCard(c) {
    const folderCount = Array.isArray(data.folders) ? data.folders.filter(f => f.condoId === c.id).length : 0;
    const actions = canManage(c.id)
      ? `<div class="condo-lifecycle-actions">${actionButton('archive', c.id, 'Arquivar condomínio', 'archiveCondominium')}${actionButton('trash', c.id, 'Excluir condomínio', 'deleteCondominiumSafely', true)}</div>`
      : '';
    return `<article class="condo-card-shell"><a class="condo-card" href="#/condominio/${c.id}"><div class="condo-top"><div class="condo-id"><div class="building">🏢</div><div><strong>${safe(c.name)}</strong><small>${safe(c.address)}</small></div></div><span class="badge ${safe(c.status)}">${typeof statusLabel === 'function' ? safe(statusLabel(c.status)) : 'Ativo'}</span></div><div class="mini-stats"><div class="mini"><strong>${Number(c.units)||0}</strong><span>Unidades</span></div><div class="mini"><strong>${Number(c.residents)||0}</strong><span>Moradores</span></div><div class="mini"><strong>${folderCount}</strong><span>Pastas</span></div></div></a>${actions}</article>`;
  }

  function archivedCard(c) {
    const date = c.archivedAt ? new Intl.DateTimeFormat('pt-BR').format(new Date(c.archivedAt)) : '';
    const actions = canManage(c.id)
      ? `<div class="condo-lifecycle-actions">${actionButton('restore', c.id, 'Restaurar condomínio', 'restoreCondominium')}${actionButton('trash', c.id, 'Excluir condomínio', 'deleteCondominiumSafely', true)}</div>`
      : '';
    return `<article class="condo-card-shell is-archived"><div class="condo-card condo-card-static"><div class="condo-top"><div class="condo-id"><div class="building">🏢</div><div><strong>${safe(c.name)}</strong><small>${safe(c.address || 'Sem endereço')}</small></div></div><span class="badge">Arquivado</span></div><div class="condo-archived-note">Arquivado${date ? ` em ${date}` : ''}. Os dados permanecem preservados.</div></div>${actions}</article>`;
  }

  window.condosPage = function lifecycleCondosPage() {
    const active = data.condos || [];
    const archived = archivedList();
    const activeCards = active.map(activeCard).join('');
    const archivedCards = archived.map(archivedCard).join('');
    const archivedSection = archived.length
      ? `<details class="condo-archive-section"><summary>Arquivados <span>${archived.length}</span></summary><div class="condo-grid condo-grid-archived">${archivedCards}</div></details>`
      : '';

    $('#app').innerHTML = shell(`${topbar('Condomínios','Todos os condomínios administrados em uma única visão.','Gestão','<button class="btn btn-primary" onclick="openCondoModal()">+ Novo condomínio</button>')}<article class="panel"><div class="panel-head"><div><h2>Condomínios ativos</h2><div class="muted small">Arquive operações encerradas sem apagar o histórico.</div></div></div><div class="panel-body"><div class="condo-grid">${activeCards || '<div class="empty">Nenhum condomínio ativo.</div>'}</div>${archivedSection}</div></article>`, 'condos');
  };
})();