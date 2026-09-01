(() => {
  'use strict';
  if (!window.supabase) return;

  const client = window.supabase.createClient(
    'https://tckvzlizcqdxzgavjwie.supabase.co',
    'sb_publishable_MRtiWP-ErwVKXqNbGFrW_g_FwEHsob3'
  );
  const safe = value => typeof esc === 'function' ? esc(value) : String(value ?? '');
  const fmtCnpj = value => {
    const raw = String(value || '').replace(/\D/g, '');
    if (raw.length !== 14) return String(value || '');
    return raw.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };
  const p = () => (location.hash || '#/').replace(/^#\//, '').split('?')[0].split('/').filter(Boolean);

  const style = document.createElement('style');
  style.textContent = `
    .clickable-metric{cursor:pointer;transition:transform .14s ease,box-shadow .14s ease}.clickable-metric:hover{transform:translateY(-1px)}
    .condo-cnpj{display:block;margin-top:4px;font-size:9px;color:var(--muted)}
    .file-folder-wrap{position:relative;min-width:0}.file-folder-wrap>.folder-card{width:100%;height:100%;padding-right:48px}.folder-rename-btn{position:absolute;right:10px;top:50%;transform:translateY(-50%);z-index:2}
    .legacy-rescue-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.legacy-rescue-card{border:1px solid var(--line);border-radius:14px;padding:14px;background:#fff}.legacy-rescue-card strong{display:block;font-size:20px;margin-top:5px}.legacy-rescue-list{display:grid;gap:8px;margin-top:12px}.legacy-rescue-item{border:1px solid var(--line);border-radius:11px;padding:10px 12px;background:#fff}.legacy-rescue-item strong{display:block;font-size:11px}.legacy-rescue-item span{display:block;color:var(--muted);font-size:9px;margin-top:3px}.legacy-rescue-note{border:1px solid #f1d49a;background:#fff9e8;border-radius:14px;padding:13px 14px;font-size:10px;line-height:1.5;color:#755f37;margin-bottom:14px}
    @media(max-width:700px){.legacy-rescue-grid{grid-template-columns:1fr}.file-folder-wrap>.folder-card{padding-right:44px}}
  `;
  document.head.appendChild(style);

  function currentCondoId() {
    const parts = p();
    return parts[0] === 'condominio' ? parts[1] || null : null;
  }

  function enhanceCnpj() {
    document.querySelectorAll('.condo-card[href*="#/condominio/"]').forEach(card => {
      if (card.querySelector('.condo-cnpj')) return;
      const match = (card.getAttribute('href') || '').match(/#\/condominio\/([^/]+)/);
      const cid = match?.[1];
      const c = (window.data?.condos || []).find(x => String(x.id) === String(cid));
      if (!c?.cnpj) return;
      const target = card.querySelector('.condo-id>div:last-child') || card.querySelector('.condo-id') || card;
      const line = document.createElement('small');
      line.className = 'condo-cnpj';
      line.textContent = `CNPJ ${fmtCnpj(c.cnpj)}`;
      target.appendChild(line);
    });
  }

  async function injectPendingTasksMetric() {
    const parts = p();
    if (parts.length || !window.CondoAccess?.hasAnyManagementRole()) return;
    const metrics = document.querySelector('.main .metrics');
    if (!metrics || metrics.querySelector('[data-pending-tasks-metric]')) return;
    const ids = [...new Set((window.CondoAccess.getSnapshot()?.memberships || []).map(x => x.condominium_id).filter(Boolean))];
    if (!ids.length) return;
    const { data: rows, error } = await client.from('tasks').select('id,status').in('condominium_id', ids);
    if (error) return console.warn('[premerge-ux] tasks metric', error);
    const count = (rows || []).filter(x => !['done','cancelled'].includes(x.status)).length;
    const card = document.createElement('article');
    card.className = 'metric clickable-metric';
    card.dataset.pendingTasksMetric = 'true';
    card.setAttribute('role', 'link');
    card.tabIndex = 0;
    card.innerHTML = `<div class="metric-top"><div><span>Tarefas pendentes</span><strong>${count}</strong><small>Clique para abrir as tarefas</small></div><div class="icon green">✓</div></div>`;
    const go = () => { location.hash = '#/tarefas'; };
    card.onclick = go;
    card.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
    metrics.appendChild(card);
  }

  function makeExistingTaskMetricClickable() {
    document.querySelectorAll('.metric').forEach(card => {
      if (card.dataset.pendingTasksMetric) return;
      const label = card.querySelector('span')?.textContent?.trim().toLowerCase();
      if (label !== 'tarefas pendentes') return;
      card.classList.add('clickable-metric');
      card.setAttribute('role','link');
      card.tabIndex = 0;
      card.onclick = () => { location.hash = '#/tarefas'; };
      card.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); location.hash = '#/tarefas'; } };
    });
  }

  window.openOfficialUnitCount = async function(cid, warningId = '') {
    await window.CondoAccess?.refresh();
    if (!window.CondoAccess?.can('condo.manage', cid)) return flash('Somente o síndico pode alterar a quantidade oficial de unidades.');
    const [{ data: c, error }, { count, error: countError }] = await Promise.all([
      client.from('condominiums').select('id,name,units_count').eq('id', cid).single(),
      client.from('units').select('id', { count: 'exact', head: true }).eq('condominium_id', cid)
    ]);
    if (error || countError) return flash((error || countError).message || 'Não foi possível carregar as unidades.');
    const imported = Number(count) || 0;
    modal(`<div class="eyebrow">Quantidade oficial</div><h2 style="margin-bottom:6px">${safe(c.name)}</h2><p class="muted" style="margin-bottom:14px">Hoje existem <b>${imported} registros de unidades importados</b>. Alterar a quantidade oficial não apaga esses registros automaticamente.</p><form id="official-unit-count-form"><div class="field"><label>Quantidade oficial de unidades</label><input name="units" type="number" min="0" required value="${Number(c.units_count) || 0}"></div><div class="legacy-rescue-note" style="margin-top:12px">Exemplo: se a planilha de gás trouxe 41 registros, mas o condomínio possui oficialmente 12 unidades, informe 12 aqui. Os 41 registros importados continuam preservados para revisão, em vez de serem excluídos silenciosamente.</div><button class="btn btn-primary" type="submit">Salvar quantidade oficial</button></form>`);
    $('#official-unit-count-form').onsubmit = async event => {
      event.preventDefault();
      const form = new FormData(event.target);
      const units = Math.max(0, Number(form.get('units')) || 0);
      const button = event.target.querySelector('button');
      button.disabled = true;
      const { error: updateError } = await client.from('condominiums').update({ units_count: units }).eq('id', cid);
      if (updateError) { button.disabled = false; return flash(updateError.message); }
      let q = client.from('data_quality_warnings').update({ resolved_at: new Date().toISOString() }).eq('condominium_id', cid).eq('warning_code', 'legacy_unit_count_inferred').is('resolved_at', null);
      if (warningId) q = q.eq('id', warningId);
      await q;
      const local = (window.data?.condos || []).find(x => String(x.id) === String(cid));
      if (local) { local.units = units; try { save(data); } catch (_) {} }
      closeModal();
      flash(`Quantidade oficial atualizada para ${units}.`);
      route();
    };
  };

  function enhanceUnitWarnings() {
    document.querySelectorAll('.transition-warning').forEach(row => {
      const text = row.querySelector('span')?.textContent || '';
      if (!text.includes('Quantidade de unidades foi inferida')) return;
      const cid = currentCondoId();
      if (!cid) return;
      const actions = row.querySelector('.transition-warning-actions');
      if (!actions || actions.dataset.unitFix) return;
      actions.dataset.unitFix = 'true';
      actions.innerHTML = `<button class="btn btn-soft" type="button">Corrigir unidades</button>`;
      actions.querySelector('button').onclick = () => window.openOfficialUnitCount(cid);
    });
  }

  window.renameCloudFolder = async function(folderId) {
    const folder = (window.data?.folders || []).find(x => String(x.id) === String(folderId));
    if (!folder) return flash('Pasta não encontrada.');
    if (!window.CondoAccess?.can('documents.manage', folder.condoId)) return flash('Você não tem permissão para renomear esta pasta.');
    modal(`<div class="eyebrow">Base de dados</div><h2 style="margin-bottom:16px">Renomear pasta</h2><form id="rename-folder-form"><div class="field"><label>Novo nome</label><input name="name" required autofocus value="${safe(folder.name)}"></div><div style="margin-top:14px"><button class="btn btn-primary" type="submit">Salvar nome</button></div></form>`);
    $('#rename-folder-form').onsubmit = async event => {
      event.preventDefault();
      const name = String(new FormData(event.target).get('name') || '').trim();
      if (!name) return;
      const button = event.target.querySelector('button');
      button.disabled = true;
      const { error } = await client.from('file_folders').update({ name }).eq('id', folder.id).eq('condominium_id', folder.condoId);
      if (error) { button.disabled = false; return flash(error.message); }
      closeModal();
      flash('Pasta renomeada.');
      if (typeof filesPage === 'function') await filesPage(folder.condoId, folder.parentId || null);
    };
  };

  function enhanceFolderRename() {
    document.querySelectorAll('.folder-card').forEach(card => {
      if (card.closest('.file-folder-wrap')) return;
      const open = card.getAttribute('onclick') || '';
      const match = open.match(/openFolder\('([^']+)'\s*,\s*'([^']+)'\)/);
      if (!match) return;
      const [, cid, fid] = match;
      if (!window.CondoAccess?.can('documents.manage', cid)) return;
      const wrapper = document.createElement('div');
      wrapper.className = 'file-folder-wrap';
      card.parentNode.insertBefore(wrapper, card);
      wrapper.appendChild(card);
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'icon-btn small-icon folder-rename-btn';
      edit.title = 'Renomear pasta';
      edit.textContent = '✎';
      edit.onclick = event => { event.preventDefault(); event.stopPropagation(); window.renameCloudFolder(fid); };
      wrapper.appendChild(edit);
    });
  }

  async function getLegacySnapshot() {
    const local = window.__GC_LEGACY_BROWSER_SNAPSHOT__;
    if (local) return { payload: local, captured_at: null, browser_key: window.__GC_LEGACY_BROWSER_KEY__, local: true };
    const { data, error } = await client.from('legacy_browser_snapshots').select('payload,captured_at,browser_key').order('captured_at',{ascending:false}).limit(1).maybeSingle();
    if (error) throw error;
    return data ? { ...data, local: false } : null;
  }

  async function missingByClientRef(snapshot, key, table) {
    const items = Array.isArray(snapshot?.[key]) ? snapshot[key] : [];
    const refs = items.map(x => String(x.id || '')).filter(Boolean);
    if (!refs.length) return { total: items.length, matched: 0, missing: items };
    const { data: rows, error } = await client.from(table).select('client_ref').in('client_ref', refs);
    if (error) throw error;
    const found = new Set((rows || []).map(x => String(x.client_ref || '')));
    return { total: items.length, matched: refs.filter(x => found.has(x)).length, missing: items.filter(x => !found.has(String(x.id || ''))) };
  }

  window.legacyMigrationPage = async function() {
    if (!window.CondoAccess?.hasAnyManagementRole()) return location.hash = '#/';
    $('#app').innerHTML = shell(`${topbar('Não foi possível migrar','Conferência e recuperação dos dados que existiam somente no navegador.','Transição de dados')}<article class="panel"><div class="panel-body"><div class="empty">Conferindo o backup antigo...</div></div></article>`,'dashboard');
    try {
      const snap = await getLegacySnapshot();
      if (!snap?.payload) {
        $('#app').innerHTML = shell(`${topbar('Não foi possível migrar','Conferência dos dados antigos do navegador.','Transição de dados')}<article class="panel"><div class="panel-body"><div class="empty"><strong>Nenhum snapshot antigo encontrado para esta conta.</strong><span>Se o sistema antigo foi usado em outro navegador, abra este sistema naquele navegador ao menos uma vez para preservar a cópia local.</span></div></div></article>`,'dashboard');
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
      const checks = [
        ['Manutenções',maint],['Tarefas',tasks],['Chamados',calls],['Documentos',docs],['Assembleias',assemblies]
      ];
      const missing = checks.flatMap(([type,res]) => res.missing.map(item => ({type,item})));
      const metaFiles = Array.isArray(s.files) ? s.files : [];
      const folders = Array.isArray(s.folders) ? s.folders : [];
      const cards = checks.map(([name,res]) => `<div class="legacy-rescue-card"><span>${safe(name)}</span><strong>${res.matched}/${res.total}</strong><small class="muted">encontrados no Supabase</small></div>`).join('');
      const list = missing.length ? missing.map(({type,item}) => `<div class="legacy-rescue-item"><strong>${safe(type)}: ${safe(item.title || item.name || item.id || 'Registro antigo')}</strong><span>ID legado: ${safe(item.id || 'sem ID')} • mantido no snapshot para recuperação manual</span></div>`).join('') : '<div class="empty"><strong>Nenhum registro operacional ficou sem correspondência.</strong><span>Todos os itens com ID legado foram encontrados na base nova.</span></div>';
      const fileNote = `<div class="legacy-rescue-note"><strong>Arquivos antigos:</strong> o snapshot preserva ${metaFiles.length} metadado(s) de arquivo e ${folders.length} pasta(s). Os binários antigos ficavam no IndexedDB do navegador e não dentro do localStorage. Por segurança, o sistema não apaga esse armazenamento local. Se algum arquivo não estiver na nuvem, abra esta tela no navegador original para recuperar o arquivo de lá.</div>`;
      const when = snap.captured_at ? new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(snap.captured_at)) : 'capturado nesta sessão antes da sincronização';
      $('#app').innerHTML = shell(`${topbar('Não foi possível migrar','Cópia de segurança e conferência do sistema antigo.','Transição de dados')}<div class="legacy-rescue-note"><strong>Snapshot preservado.</strong> Esta cópia é somente leitura e não substitui automaticamente nenhum dado atual. Origem: ${safe(when)}.</div>${fileNote}<section class="legacy-rescue-grid">${cards}</section><article class="panel" style="margin-top:16px"><div class="panel-head"><div><h2>Itens sem correspondência automática</h2><div class="muted small">Nada desta lista será apagado automaticamente.</div></div></div><div class="panel-body"><div class="legacy-rescue-list">${list}</div></div></article>`,'dashboard');
    } catch (err) {
      flash(err.message || 'Não foi possível conferir o backup antigo.');
    }
  };

  const baseShell = typeof shell === 'function' ? shell : null;
  if (baseShell) {
    shell = function(content, active='dashboard', cid=null) {
      let html = baseShell(content, active, cid);
      if (!cid && !html.includes('#/nao-migrado')) {
        const needle = '<div class="nav-section">Principal</div><nav class="nav">';
        const link = '<a href="#/nao-migrado"><span>🛟</span>Não foi possível migrar</a>';
        const end = '</nav>';
        const start = html.indexOf(needle);
        if (start >= 0) {
          const navEnd = html.indexOf(end, start + needle.length);
          if (navEnd >= 0) html = html.slice(0, navEnd) + link + html.slice(navEnd);
        }
      }
      return html;
    };
  }

  function enhanceAll() {
    enhanceCnpj();
    makeExistingTaskMetricClickable();
    injectPendingTasksMetric();
    enhanceUnitWarnings();
    enhanceFolderRename();
  }

  const observer = new MutationObserver(() => {
    clearTimeout(observer._timer);
    observer._timer = setTimeout(enhanceAll, 30);
  });
  const app = document.querySelector('#app');
  if (app) observer.observe(app, { childList: true, subtree: true });
  window.addEventListener('hashchange', () => setTimeout(enhanceAll, 80));
  window.addEventListener('condo-access-ready', () => setTimeout(enhanceAll, 80));
  setTimeout(enhanceAll, 500);
})();