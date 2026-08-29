(() => {
  'use strict';
  if (!window.supabase || typeof shell !== 'function') return;

  const client=window.supabase.createClient('https://tckvzlizcqdxzgavjwie.supabase.co','sb_publishable_MRtiWP-ErwVKXqNbGFrW_g_FwEHsob3');
  const safe=s=>typeof esc==='function'?esc(s):String(s??'');
  const fmt=v=>v?new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(v)):'—';
  const actionLabel={insert:'Criou',update:'Alterou',delete:'Excluiu'};
  const entityLabel={condominiums:'Condomínio',units:'Unidade',condominium_members:'Acesso / vínculo',service_requests:'Chamado',maintenances:'Manutenção',documents:'Documento',announcements:'Comunicado',finance_categories:'Categoria financeira',finance_transactions:'Lançamento financeiro',assemblies:'Assembleia',assembly_agenda_items:'Pauta',assembly_attendance:'Presença',assembly_votes:'Voto'};
  const sensitivityLabel={operational:'Operação',financial:'Financeiro',governance:'Governança',access:'Acessos',document:'Documentos',communication:'Comunicação'};
  const ids=()=>[...new Set((window.CondoAccess?.getSnapshot()?.memberships||[]).map(x=>x.condominium_id).filter(Boolean))];

  function valueText(v){
    if(v===null||v===undefined)return 'vazio';
    if(typeof v==='object')return JSON.stringify(v);
    return String(v);
  }
  function summarizeChanges(row){
    const c=row.changes||{};
    if(row.action==='insert')return 'Registro criado';
    if(row.action==='delete')return 'Registro excluído';
    const keys=Object.keys(c);if(!keys.length)return 'Alteração registrada';
    return keys.slice(0,3).join(', ')+(keys.length>3?` +${keys.length-3}`:'');
  }
  function detailsHtml(row){
    const c=row.changes||{};
    if(row.action==='insert'||row.action==='delete'){
      const obj=c.new||c.old||{};
      const entries=Object.entries(obj).filter(([k])=>!['id','condominium_id','created_by','updated_by'].includes(k));
      return `<div class="table-wrap"><table class="table"><thead><tr><th>Campo</th><th>Valor</th></tr></thead><tbody>${entries.map(([k,v])=>`<tr><td>${safe(k)}</td><td>${safe(valueText(v))}</td></tr>`).join('')||'<tr><td colspan="2">Sem detalhes adicionais.</td></tr>'}</tbody></table></div>`;
    }
    return `<div class="table-wrap"><table class="table"><thead><tr><th>Campo</th><th>Antes</th><th>Depois</th></tr></thead><tbody>${Object.entries(c).map(([k,v])=>`<tr><td>${safe(k)}</td><td>${safe(valueText(v?.old))}</td><td>${safe(valueText(v?.new))}</td></tr>`).join('')||'<tr><td colspan="3">Sem diferenças visíveis.</td></tr>'}</tbody></table></div>`;
  }

  async function load(cid=null){
    const scope=cid?[cid]:ids(); if(!scope.length)return {rows:[],profiles:[],condos:[]};
    let q=client.from('audit_events').select('*').in('condominium_id',scope).order('created_at',{ascending:false}).limit(500);
    const {data:rows,error}=await q;if(error)throw error;
    const actors=[...new Set((rows||[]).map(x=>x.actor_user_id).filter(Boolean))];
    const [{data:profiles},{data:condos}]=await Promise.all([
      actors.length?client.from('profiles').select('id,full_name').in('id',actors):Promise.resolve({data:[]}),
      client.from('condominiums').select('id,name').in('id',scope)
    ]);
    return {rows:rows||[],profiles:profiles||[],condos:condos||[]};
  }

  async function page(cid=null){
    if(cid&&!window.CondoAccess?.canAccessCondo(cid))return;
    const title=cid?`Auditoria • ${safe(condo(cid)?.name||'Condomínio')}`:'Auditoria';
    $('#app').innerHTML=shell(`${topbar(title,'Carregando histórico de alterações.','Gestão','')}<article class="panel"><div class="panel-body"><div class="empty">Carregando auditoria...</div></div></article>`,'audit',cid);
    try{
      const {rows,profiles,condos}=await load(cid), pm=new Map(profiles.map(x=>[x.id,x.full_name])), cm=new Map(condos.map(x=>[x.id,x.name]));
      window.__GC_AUDIT_ROWS__=rows;
      const table=rows.length?rows.map((x,i)=>`<tr data-audit-index="${i}" data-search="${safe([x.entity_label,entityLabel[x.entity_type],pm.get(x.actor_user_id),cm.get(x.condominium_id),sensitivityLabel[x.sensitivity],actionLabel[x.action]].filter(Boolean).join(' ').toLowerCase())}" data-action="${safe(x.action)}" data-sensitivity="${safe(x.sensitivity)}"><td>${fmt(x.created_at)}</td><td><strong>${safe(pm.get(x.actor_user_id)||'Sistema')}</strong></td><td>${safe(cm.get(x.condominium_id)||'Condomínio')}</td><td><span class="badge attention">${safe(sensitivityLabel[x.sensitivity]||x.sensitivity)}</span></td><td><strong>${safe(actionLabel[x.action]||x.action)} ${safe(entityLabel[x.entity_type]||x.entity_type)}</strong><div class="list-sub">${safe(x.entity_label||'Sem identificação')} • ${safe(summarizeChanges(x))}</div></td><td><button class="btn btn-soft" onclick="openAuditDetails(${i})">Detalhes</button></td></tr>`).join(''):'<tr><td colspan="6"><div class="empty">Nenhum evento de auditoria registrado ainda.</div></td></tr>';
      $('#app').innerHTML=shell(`${topbar(title,'Histórico imutável das alterações relevantes do sistema.','Gestão','')}<div class="database-explainer"><div class="database-icon">🧾</div><div><strong>Registro automático.</strong><p>Novas alterações são registradas diretamente no banco. A visibilidade respeita o papel do usuário, inclusive para dados financeiros e de governança.</p></div></div><article class="panel"><div class="panel-head"><div><h2>Eventos</h2><div class="muted small">Mostrando até 500 eventos mais recentes.</div></div><div class="row-actions"><input id="audit-search" placeholder="Buscar..."><select id="audit-action"><option value="">Todas as ações</option><option value="insert">Criação</option><option value="update">Alteração</option><option value="delete">Exclusão</option></select><select id="audit-sensitivity"><option value="">Todas as áreas</option>${Object.entries(sensitivityLabel).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></div></div><div class="panel-body"><div class="table-wrap"><table class="table"><thead><tr><th>Quando</th><th>Quem</th><th>Condomínio</th><th>Área</th><th>Alteração</th><th></th></tr></thead><tbody id="audit-body">${table}</tbody></table></div></div></article>`,'audit',cid);
      const apply=()=>{const q=$('#audit-search').value.trim().toLowerCase(),a=$('#audit-action').value,s=$('#audit-sensitivity').value;$$('#audit-body tr[data-audit-index]').forEach(tr=>{tr.style.display=(!q||tr.dataset.search.includes(q))&&(!a||tr.dataset.action===a)&&(!s||tr.dataset.sensitivity===s)?'':'none'})};
      $('#audit-search').oninput=apply;$('#audit-action').onchange=apply;$('#audit-sensitivity').onchange=apply;
    }catch(err){flash(err.message||'Não foi possível carregar a auditoria.')}
  }

  window.openAuditDetails=function(index){
    const row=window.__GC_AUDIT_ROWS__?.[index];if(!row)return;
    modal(`<div class="eyebrow">Evento de auditoria</div><h2 style="margin-bottom:6px">${safe(actionLabel[row.action]||row.action)} ${safe(entityLabel[row.entity_type]||row.entity_type)}</h2><p class="muted" style="margin-bottom:16px">${fmt(row.created_at)} • ${safe(row.entity_label||'Registro')}</p>${detailsHtml(row)}`);
  };

  const previousShell=window.shell||shell;
  window.shell=shell=function(content,active='dashboard',cid=null){
    let out=previousShell(content,active,cid);
    if(!cid&&!out.includes('href="#/auditoria"')){
      const anchor='<a href="#/relatorios"';
      out=out.replace(anchor,`<a href="#/auditoria" class="${active==='audit'?'active':''}"><span>🧾</span>Auditoria</a>`+anchor);
    }
    if(cid&&!out.includes(`/condominio/${cid}/auditoria`)){
      const anchor=`<a href="#/condominio/${cid}/historico"`;
      out=out.replace(anchor,`<a href="#/condominio/${cid}/auditoria" class="${active==='audit'?'active':''}"><span>🧾</span>Auditoria</a>`+anchor);
    }
    return out;
  };

  window.auditPage=page;
})();