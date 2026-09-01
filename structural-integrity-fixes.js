(() => {
  'use strict';
  if (!window.supabase) return;

  const client = window.supabase.createClient(
    'https://tckvzlizcqdxzgavjwie.supabase.co',
    'sb_publishable_MRtiWP-ErwVKXqNbGFrW_g_FwEHsob3'
  );
  const state = () => typeof data !== 'undefined' ? data : null;
  const safe = value => typeof esc === 'function' ? esc(value) : String(value ?? '');
  const parts = () => (location.hash || '#/').replace(/^#\//, '').split('?')[0].split('/').filter(Boolean);
  const canOperate = cid => Boolean(window.CondoAccess?.can('operations.manage', cid));
  const manageableCondos = () => (state()?.condos || []).filter(c => canOperate(c.id));

  function fmtCnpj(value) {
    const raw = String(value || '').replace(/\D/g, '');
    if (raw.length !== 14) return String(value || '');
    return raw.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }

  function ensureCnpj() {
    document.querySelectorAll('.condo-card[href*="#/condominio/"]').forEach(card => {
      if (card.querySelector('.condo-cnpj')) return;
      const match = (card.getAttribute('href') || '').match(/#\/condominio\/([^/]+)/);
      const cid = match?.[1];
      const c = (state()?.condos || []).find(x => String(x.id) === String(cid));
      if (!c?.cnpj) return;
      const target = card.querySelector('.condo-id>div:last-child') || card.querySelector('.condo-id') || card;
      const line = document.createElement('small');
      line.className = 'condo-cnpj';
      line.textContent = `CNPJ ${fmtCnpj(c.cnpj)}`;
      target.appendChild(line);
    });
  }

  window.renameCloudFolder = async function(folderId) {
    const folder = (state()?.folders || []).find(x => String(x.id) === String(folderId));
    if (!folder) return flash('Pasta não encontrada.');
    if (!window.CondoAccess?.can('documents.manage', folder.condoId)) return flash('Você não tem permissão para renomear esta pasta.');
    modal(`<div class="eyebrow">Base de dados</div><h2 style="margin-bottom:16px">Renomear pasta</h2><form id="rename-folder-form-final"><div class="field"><label>Novo nome</label><input name="name" required autofocus value="${safe(folder.name)}"></div><div style="margin-top:14px"><button class="btn btn-primary" type="submit">Salvar nome</button></div></form>`);
    const form = document.querySelector('#rename-folder-form-final');
    form.onsubmit = async event => {
      event.preventDefault();
      const name = String(new FormData(form).get('name') || '').trim();
      if (!name) return;
      const button = form.querySelector('button');
      button.disabled = true;
      const { error } = await client.from('file_folders').update({ name }).eq('id', folder.id).eq('condominium_id', folder.condoId);
      if (error) { button.disabled = false; return flash(error.message); }
      closeModal();
      flash('Pasta renomeada.');
      if (typeof filesPage === 'function') await filesPage(folder.condoId, folder.parentId || null);
    };
  };

  window.openOfficialUnitCount = async function(cid) {
    await window.CondoAccess?.refresh();
    if (!window.CondoAccess?.can('condo.manage', cid)) return flash('Somente o síndico pode alterar a quantidade oficial de unidades.');
    const [{ data: c, error }, { count, error: countError }] = await Promise.all([
      client.from('condominiums').select('id,name,units_count').eq('id', cid).single(),
      client.from('units').select('id', { count: 'exact', head: true }).eq('condominium_id', cid)
    ]);
    if (error || countError) return flash((error || countError).message || 'Não foi possível carregar as unidades.');
    const imported = Number(count) || 0;
    modal(`<div class="eyebrow">Quantidade oficial</div><h2 style="margin-bottom:6px">${safe(c.name)}</h2><p class="muted" style="margin-bottom:14px">Hoje existem <b>${imported} registros de unidades importados</b>. Alterar a quantidade oficial não apaga esses registros automaticamente.</p><form id="official-unit-count-form-final"><div class="field"><label>Quantidade oficial de unidades</label><input name="units" type="number" min="0" required value="${Number(c.units_count) || 0}"></div><div class="legacy-rescue-note" style="margin-top:12px">A quantidade oficial é um dado cadastral. Os registros importados continuam preservados para revisão e não são excluídos silenciosamente.</div><button class="btn btn-primary" type="submit">Salvar quantidade oficial</button></form>`);
    const form = document.querySelector('#official-unit-count-form-final');
    form.onsubmit = async event => {
      event.preventDefault();
      const units = Math.max(0, Number(new FormData(form).get('units')) || 0);
      const button = form.querySelector('button');
      button.disabled = true;
      const { error: updateError } = await client.from('condominiums').update({ units_count: units }).eq('id', cid);
      if (updateError) { button.disabled = false; return flash(updateError.message); }
      const { error: warningError } = await client.from('data_quality_warnings')
        .update({ resolved_at: new Date().toISOString() })
        .eq('condominium_id', cid)
        .eq('warning_code', 'legacy_unit_count_inferred')
        .is('resolved_at', null);
      if (warningError) console.warn('[structural-integrity] unit warning', warningError);
      const local = (state()?.condos || []).find(x => String(x.id) === String(cid));
      if (local) {
        local.units = units;
        try { if (typeof save === 'function') save(data); } catch (_) {}
      }
      closeModal();
      flash(`Quantidade oficial atualizada para ${units}.`);
      if (typeof route === 'function') route();
    };
  };

  async function immutableLegacySnapshot() {
    const { data: remote, error } = await client.from('legacy_browser_snapshots')
      .select('payload,captured_at,browser_key')
      .order('captured_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (remote?.payload) return { ...remote, local: false };
    const local = window.__GC_LEGACY_BROWSER_SNAPSHOT__;
    return local ? { payload: local, captured_at: null, browser_key: window.__GC_LEGACY_BROWSER_KEY__, local: true } : null;
  }

  async function missingByClientRef(snapshot, key, table) {
    const items = Array.isArray(snapshot?.[key]) ? snapshot[key] : [];
    const refs = items.map(x => String(x.id || '')).filter(Boolean);
    if (!refs.length) return { total: items.length, matched: 0, missing: items };
    const found = new Set();
    for (let i = 0; i < refs.length; i += 100) {
      const batch = refs.slice(i, i + 100);
      const { data: rows, error } = await client.from(table).select('client_ref').in('client_ref', batch);
      if (error) throw error;
      (rows || []).forEach(x => found.add(String(x.client_ref || '')));
    }
    return { total: items.length, matched: refs.filter(x => found.has(x)).length, missing: items.filter(x => !found.has(String(x.id || ''))) };
  }

  window.legacyMigrationPage = async function() {
    if (!window.CondoAccess?.hasAnyManagementRole()) return location.hash = '#/';
    $('#app').innerHTML = shell(`${topbar('Não foi possível migrar','Conferência e recuperação dos dados que existiam somente no navegador.','Transição de dados')}<article class="panel"><div class="panel-body"><div class="empty">Conferindo o backup antigo...</div></div></article>`,'dashboard');
    try {
      const snap = await immutableLegacySnapshot();
      if (!snap?.payload) {
        $('#app').innerHTML = shell(`${topbar('Não foi possível migrar','Conferência dos dados antigos do navegador.','Transição de dados')}<article class="panel"><div class="panel-body"><div class="empty"><strong>Nenhum snapshot antigo encontrado para esta conta.</strong><span>Se o sistema antigo foi usado em outro navegador, abra o sistema naquele navegador ao menos uma vez para preservar a cópia.</span></div></div></article>`,'dashboard');
        return;
      }
      const s = snap.payload;
      const [maint,tasks,calls,docs,assemblies] = await Promise.all([
        missingByClientRef(s,'maintenances','maintenances'),
        missingByClientRef(s,'tasks','tasks'),
        missingByClientRef(s,'calls','service_requests'),
        missingByClientRef(s,'documents','documents'),
        missingByClientRef(s,'assemblies','assemblies')
      ]);
      const checks = [['Manutenções',maint],['Tarefas',tasks],['Chamados',calls],['Documentos',docs],['Assembleias',assemblies]];
      const missing = checks.flatMap(([type,res]) => res.missing.map(item => ({type,item})));
      const metaFiles = Array.isArray(s.files) ? s.files : [];
      const folders = Array.isArray(s.folders) ? s.folders : [];
      const cards = checks.map(([name,res]) => `<div class="legacy-rescue-card"><span>${safe(name)}</span><strong>${res.matched}/${res.total}</strong><small class="muted">encontrados no Supabase</small></div>`).join('');
      const list = missing.length ? missing.map(({type,item}) => `<div class="legacy-rescue-item"><strong>${safe(type)}: ${safe(item.title || item.name || item.id || 'Registro antigo')}</strong><span>ID legado: ${safe(item.id || 'sem ID')} • preservado no snapshot para recuperação manual</span></div>`).join('') : '<div class="empty"><strong>Nenhum registro operacional ficou sem correspondência.</strong><span>Todos os itens com ID legado foram encontrados na base nova.</span></div>';
      const fileNote = `<div class="legacy-rescue-note"><strong>Arquivos antigos:</strong> o snapshot preserva ${metaFiles.length} metadado(s) de arquivo e ${folders.length} pasta(s). Os binários antigos ficam no IndexedDB do navegador original e não são apagados pela migração.</div>`;
      const when = snap.captured_at ? new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(snap.captured_at)) : 'cópia local desta sessão';
      $('#app').innerHTML = shell(`${topbar('Não foi possível migrar','Cópia de segurança e conferência do sistema antigo.','Transição de dados')}<div class="legacy-rescue-note"><strong>Snapshot histórico preservado.</strong> A tela prioriza a cópia imutável mais antiga salva no Supabase. Origem: ${safe(when)}.</div>${fileNote}<section class="legacy-rescue-grid">${cards}</section><article class="panel" style="margin-top:16px"><div class="panel-head"><div><h2>Itens sem correspondência automática</h2><div class="muted small">Nada desta lista será apagado automaticamente.</div></div></div><div class="panel-body"><div class="legacy-rescue-list">${list}</div></div></article>`,'dashboard');
    } catch (err) {
      flash(err.message || 'Não foi possível conferir o backup antigo.');
    }
  };

  function restrictOperationalActions() {
    const p = parts();
    const cid = p[0] === 'condominio' ? p[1] : null;
    const anyManage = manageableCondos().length > 0;

    if ((p[0] === 'tarefas' || (p[0] === 'condominio' && p[2] === 'tarefas'))) {
      document.querySelectorAll('[onclick*="openTaskModal"]').forEach(el => {
        if (!(cid ? canOperate(cid) : anyManage)) el.remove();
      });
      document.querySelectorAll('[onclick*="completeTask("]').forEach(el => {
        const id = (el.getAttribute('onclick') || '').match(/completeTask\('([^']+)'\)/)?.[1];
        const task = (state()?.tasks || []).find(x => String(x.id) === String(id));
        if (!task || !canOperate(task.condoId)) el.remove();
      });
    }

    if (p[0] === 'condominio' && p[2] === 'gas' && !canOperate(cid)) {
      document.querySelectorAll('[onclick*="openGasEdit"]').forEach(el => el.remove());
    }
  }

  function awaitingAccessScreen() {
    const snapshot = window.CondoAccess?.getSnapshot();
    if (!snapshot?.user || snapshot.memberships.length || window.CondoAccess?.canCreateCondo()) return false;
    document.body.classList.remove('onboarding-body');
    document.body.classList.add('auth-body');
    const name = snapshot.user.user_metadata?.full_name || snapshot.user.email || 'Usuário';
    $('#app').innerHTML = `<div class="auth-page"><section class="auth-card"><div class="auth-brand"><div class="brand-mark">SG</div><div><strong>Gestão Condominial</strong><span>Portal de acesso</span></div></div><div class="eyebrow">Conta ativa</div><h1>Aguardando vínculo</h1><p class="muted">${safe(name)}, sua conta está autenticada, mas ainda não possui condomínio ou papel administrativo vinculado.</p><div class="auth-message">Um síndico ou administrador precisa vincular esta conta antes de liberar o painel.</div><button class="btn auth-secondary" type="button" onclick="cloudLogout()">Sair</button></section></div>`;
    return true;
  }

  const previousRoute = typeof route === 'function' ? route : null;
  if (previousRoute) {
    route = function structuralRouteGuard() {
      const snapshot = window.CondoAccess?.getSnapshot();
      if (snapshot?.loadedAt && awaitingAccessScreen()) return;
      return previousRoute();
    };
  }

  const baseMaintenanceModal = window.openMaintenanceModal;
  if (typeof baseMaintenanceModal === 'function') {
    window.openMaintenanceModal = function(cid='') {
      const options = manageableCondos();
      if (cid && !canOperate(cid)) return flash('Você não tem permissão para cadastrar manutenção neste condomínio.');
      if (!cid && !options.length) return flash('Você não tem permissão para cadastrar manutenções.');
      baseMaintenanceModal(cid || options[0]?.id || '');
      setTimeout(() => {
        const select = document.querySelector('#cloud-maintenance-form select[name="condoId"]');
        if (!select) return;
        [...select.options].forEach(option => { if (!options.some(c => String(c.id) === String(option.value))) option.remove(); });
      }, 0);
    };
  }

  const baseTaskModal = window.openTaskModal;
  if (typeof baseTaskModal === 'function') {
    window.openTaskModal = function(cid='') {
      const options = manageableCondos();
      if (cid && !canOperate(cid)) return flash('Você não tem permissão para cadastrar tarefa neste condomínio.');
      if (!cid && !options.length) return flash('Você não tem permissão para cadastrar tarefas.');
      baseTaskModal(cid || options[0]?.id || '');
      setTimeout(() => {
        const select = document.querySelector('#cloud-task-form select[name="condoId"]');
        if (!select) return;
        [...select.options].forEach(option => { if (!options.some(c => String(c.id) === String(option.value))) option.remove(); });
      }, 0);
    };
  }

  function enhance() {
    ensureCnpj();
    restrictOperationalActions();
  }

  const app = document.querySelector('#app');
  if (app) {
    const observer = new MutationObserver(() => {
      clearTimeout(observer._t);
      observer._t = setTimeout(enhance, 20);
    });
    observer.observe(app, { childList:true, subtree:true });
  }
  window.addEventListener('condo-access-ready', () => setTimeout(() => { if (!awaitingAccessScreen()) enhance(); }, 40));
  window.addEventListener('hashchange', () => setTimeout(enhance, 40));
  setTimeout(enhance, 500);
})();