(() => {
  if (!window.supabase) return;

  const sbOps = window.supabase.createClient(
    'https://tckvzlizcqdxzgavjwie.supabase.co',
    'sb_publishable_MRtiWP-ErwVKXqNbGFrW_g_FwEHsob3'
  );

  const statusText = {
    open:'Aberto', analysis:'Em análise', in_progress:'Em andamento', waiting_supplier:'Aguardando fornecedor',
    waiting_resident:'Aguardando morador', resolved:'Resolvido', cancelled:'Cancelado',
    planned:'Planejada', called:'Convocada', held:'Realizada'
  };
  const priorityText = {low:'Baixa',normal:'Normal',high:'Alta',urgent:'Urgente'};
  const memberVisibility = {management:'Somente gestão',residents:'Moradores',all:'Todos'};
  const requestStatusClass = s => s==='resolved'?'good':s==='cancelled'?'bad':['in_progress','analysis'].includes(s)?'warn':'attention';
  const priorityClass = p => p==='urgent'?'bad':p==='high'?'warn':p==='low'?'good':'attention';
  const assemblyClass = s => s==='held'?'good':s==='cancelled'?'bad':s==='called'?'warn':'attention';
  const currentUser = async()=> (await sbOps.auth.getSession()).data.session?.user || null;

  async function addTimeline(condominiumId,text,sourceType=null,sourceId=null){
    const user=await currentUser(); if(!user)return;
    const {error}=await sbOps.from('timeline_entries').insert({condominium_id:condominiumId,text,source_type:sourceType,source_id:sourceId,created_by:user.id});
    if(error) console.warn(error);
  }

  async function getUnits(cid){
    let q=sbOps.from('units').select('id,block_name,unit_number').order('block_name').order('unit_number');
    if(cid)q=q.eq('condominium_id',cid);
    const {data,error}=await q; if(error)throw error; return data||[];
  }

  async function getCalls(cid=null){
    let q=sbOps.from('service_requests').select('*').order('created_at',{ascending:false});
    if(cid)q=q.eq('condominium_id',cid);
    const {data,error}=await q; if(error)throw error; return data||[];
  }

  callsPage = async function(cid=null){
    const c=cid?condo(cid):null;
    $('#app').innerHTML=shell(`${topbar('Chamados',c?`Solicitações de ${esc(c.name)}.`:'Solicitações de todos os condomínios.','Operação',`<button class="btn btn-primary" onclick="openCallModal('${cid||''}')">+ Novo chamado</button>`)}<article class="panel"><div class="panel-body"><div class="empty">Carregando chamados...</div></div></article>`,cid?'condo-calls':'calls',cid);
    try{
      const [rows,units]=await Promise.all([getCalls(cid),getUnits(cid)]);
      const um=new Map(units.map(u=>[u.id,u]));
      const open=rows.filter(x=>!['resolved','cancelled'].includes(x.status)).length;
      const urgent=rows.filter(x=>x.priority==='urgent'&&!['resolved','cancelled'].includes(x.status)).length;
      const table=rows.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Chamado</th><th>Condomínio</th><th>Unidade</th><th>Prioridade</th><th>Status</th><th>Ação</th></tr></thead><tbody>${rows.map(x=>{const u=um.get(x.unit_id);const cn=condo(x.condominium_id);return `<tr><td><strong>${esc(x.title)}</strong><div class="list-sub">${esc(x.description||x.category||'Sem descrição')}</div></td><td>${esc(cn?.name||'Condomínio')}</td><td>${esc(u?[u.block_name,u.unit_number].filter(Boolean).join(' / '):(x.location_label||'Área comum'))}</td><td><span class="badge ${priorityClass(x.priority)}">${esc(priorityText[x.priority]||x.priority)}</span></td><td><span class="badge ${requestStatusClass(x.status)}">${esc(statusText[x.status]||x.status)}</span></td><td><button class="btn btn-soft" onclick="openCallStatusModal('${x.id}')">Atualizar</button></td></tr>`}).join('')}</tbody></table></div>`:'<div class="empty">Nenhum chamado cadastrado.</div>';
      $('#app').innerHTML=shell(`${topbar('Chamados',c?`Solicitações de ${esc(c.name)}.`:'Solicitações de todos os condomínios.','Operação',`<button class="btn btn-primary" onclick="openCallModal('${cid||''}')">+ Novo chamado</button>`)}<section class="metrics" style="margin-bottom:18px"><article class="metric"><div class="metric-top"><div><span>Chamados</span><strong>${rows.length}</strong></div><div class="icon blue">🎫</div></div></article><article class="metric"><div class="metric-top"><div><span>Em aberto</span><strong>${open}</strong></div><div class="icon orange">◉</div></div></article><article class="metric"><div class="metric-top"><div><span>Urgentes</span><strong>${urgent}</strong></div><div class="icon red">!</div></div></article></section><article class="panel"><div class="panel-head"><div><h2>Solicitações</h2><div class="muted small">Acompanhe o atendimento do início até a resolução.</div></div></div><div class="panel-body">${table}</div></article>`,cid?'condo-calls':'calls',cid);
    }catch(err){flash(err.message||'Erro ao carregar chamados.')}
  };

  window.openCallModal=async function(cid=''){
    const targetCid=cid||data.condos[0]?.id||'';
    const units=targetCid?await getUnits(targetCid):[];
    modal(`<div class="eyebrow">Novo chamado</div><h2 style="margin-bottom:16px">Registrar solicitação</h2><form id="cloud-call-form" class="form-grid"><div class="field full"><label>Condomínio</label><select name="condoId" id="call-condo">${data.condos.map(c=>`<option value="${c.id}" ${c.id===targetCid?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div><div class="field full"><label>Título</label><input name="title" required placeholder="Ex.: Vazamento no corredor"></div><div class="field"><label>Categoria</label><select name="category"><option>Manutenção</option><option>Elétrica</option><option>Hidráulica</option><option>Limpeza</option><option>Segurança</option><option>Barulho</option><option>Área comum</option><option>Outros</option></select></div><div class="field"><label>Prioridade</label><select name="priority"><option value="normal">Normal</option><option value="low">Baixa</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></div><div class="field"><label>Unidade</label><select name="unitId" id="call-unit"><option value="">Área comum / sem unidade</option>${units.map(u=>`<option value="${u.id}">${esc([u.block_name,u.unit_number].filter(Boolean).join(' / '))}</option>`).join('')}</select></div><div class="field"><label>Local</label><input name="location" placeholder="Ex.: Hall do 2º andar"></div><div class="field full"><label>Descrição</label><textarea name="description" required></textarea></div><div class="field full"><button class="btn btn-primary" type="submit">Criar chamado</button></div></form>`);
    $('#call-condo').onchange=async e=>{const us=await getUnits(e.target.value);$('#call-unit').innerHTML=`<option value="">Área comum / sem unidade</option>${us.map(u=>`<option value="${u.id}">${esc([u.block_name,u.unit_number].filter(Boolean).join(' / '))}</option>`).join('')}`};
    $('#cloud-call-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),b=e.target.querySelector('button'),user=await currentUser();if(!user)return flash('Sessão expirada.');b.disabled=true;b.textContent='Salvando...';const payload={condominium_id:f.get('condoId'),unit_id:f.get('unitId')||null,created_by:user.id,title:String(f.get('title')).trim(),description:String(f.get('description')).trim(),location_label:String(f.get('location')).trim()||null,category:f.get('category'),priority:f.get('priority'),status:'open'};const {data:r,error}=await sbOps.from('service_requests').insert(payload).select().single();if(error){b.disabled=false;b.textContent='Criar chamado';return flash(error.message)}await addTimeline(payload.condominium_id,`Chamado aberto: ${payload.title}.`,'service_requests',r.id);closeModal();flash('Chamado registrado.');callsPage(cid||null)};
  };

  window.openCallStatusModal=async function(id){
    const {data:x,error}=await sbOps.from('service_requests').select('*').eq('id',id).single();if(error)return flash(error.message);
    modal(`<div class="eyebrow">Atendimento</div><h2 style="margin-bottom:16px">${esc(x.title)}</h2><form id="call-status-form" class="form-grid"><div class="field"><label>Status</label><select name="status">${[['open','Aberto'],['analysis','Em análise'],['in_progress','Em andamento'],['waiting_supplier','Aguardando fornecedor'],['waiting_resident','Aguardando morador'],['resolved','Resolvido'],['cancelled','Cancelado']].map(([v,l])=>`<option value="${v}" ${x.status===v?'selected':''}>${l}</option>`).join('')}</select></div><div class="field"><label>Prioridade</label><select name="priority">${[['low','Baixa'],['normal','Normal'],['high','Alta'],['urgent','Urgente']].map(([v,l])=>`<option value="${v}" ${x.priority===v?'selected':''}>${l}</option>`).join('')}</select></div><div class="field full"><button class="btn btn-primary">Salvar atualização</button></div></form>`);
    $('#call-status-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),b=e.target.querySelector('button');b.disabled=true;const status=f.get('status'),priority=f.get('priority');const {error:up}=await sbOps.from('service_requests').update({status,priority}).eq('id',id);if(up){b.disabled=false;return flash(up.message)}await addTimeline(x.condominium_id,`Chamado atualizado: ${x.title} → ${statusText[status]||status}.`,'service_requests',id);closeModal();flash('Chamado atualizado.');const p=(location.hash||'').split('/');callsPage(p[1]==='condominio'?p[2]:null)};
  };

  docsPage = async function(cid){
    const c=condo(cid);if(!c)return;
    $('#app').innerHTML=shell(`${topbar('Documentos',`${esc(c.name)} • documentos e vencimentos.`,'Workspace',`<button class="btn btn-primary" onclick="openDocumentModal('${cid}')">+ Novo documento</button>`)}<article class="panel"><div class="panel-body"><div class="empty">Carregando documentos...</div></div></article>`,'condo-docs',cid);
    const {data:rows,error}=await sbOps.from('documents').select('*').eq('condominium_id',cid).order('expiry_date',{ascending:true,nullsFirst:false});if(error)return flash(error.message);
    const today=new Date();today.setHours(0,0,0,0);
    const table=(rows||[]).length?`<div class="table-wrap"><table class="table"><thead><tr><th>Documento</th><th>Categoria</th><th>Emissão</th><th>Vencimento</th><th>Visibilidade</th><th></th></tr></thead><tbody>${rows.map(x=>{let badge='good',txt='Sem vencimento';if(x.expiry_date){const d=new Date(x.expiry_date+'T00:00:00'),left=Math.ceil((d-today)/86400000);txt=left<0?`Vencido há ${Math.abs(left)}d`:left===0?'Vence hoje':left<=30?`Vence em ${left}d`:'Em dia';badge=left<0?'bad':left<=7?'bad':left<=30?'warn':'good'}return `<tr><td><strong>${esc(x.title)}</strong><div class="list-sub">${esc(x.notes||'')}</div></td><td>${esc(x.category||'Geral')}</td><td>${x.issue_date?br(x.issue_date):'Sem data'}</td><td>${x.expiry_date?`${br(x.expiry_date)} <span class="badge ${badge}" style="margin-left:6px">${txt}</span>`:'Sem vencimento'}</td><td>${esc(memberVisibility[x.visibility]||x.visibility)}</td><td><button class="icon-btn small-icon danger-icon" onclick="deleteDocument('${x.id}','${cid}')" title="Excluir">×</button></td></tr>`}).join('')}</tbody></table></div>`:'<div class="empty">Nenhum documento controlado ainda.</div>';
    $('#app').innerHTML=shell(`${topbar('Documentos',`${esc(c.name)} • documentos e vencimentos.`,'Workspace',`<button class="btn btn-primary" onclick="openDocumentModal('${cid}')">+ Novo documento</button>`)}<div class="database-explainer"><div class="database-icon">📄</div><div><strong>Controle de validade.</strong><p>Quando um documento tem vencimento, o sistema cria automaticamente um evento no calendário e pode disparar os alertas configurados.</p></div></div><article class="panel"><div class="panel-head"><h2>Documentos controlados</h2></div><div class="panel-body">${table}</div></article>`,'condo-docs',cid);
  };

  window.openDocumentModal=function(cid){
    modal(`<div class="eyebrow">Novo documento</div><h2 style="margin-bottom:16px">Cadastrar documento</h2><form id="cloud-document-form" class="form-grid"><div class="field full"><label>Documento</label><input name="title" required placeholder="Ex.: AVCB"></div><div class="field"><label>Categoria</label><select name="category"><option>Licenças</option><option>Seguros</option><option>Contratos</option><option>Laudos</option><option>Certificados</option><option>Atas</option><option>Outros</option></select></div><div class="field"><label>Visibilidade</label><select name="visibility"><option value="management">Somente gestão</option><option value="residents">Moradores</option><option value="all">Todos</option></select></div><div class="field"><label>Data de emissão</label><input type="date" name="issue"></div><div class="field"><label>Data de vencimento</label><input type="date" name="expiry"></div><div class="field full"><label>Observações</label><textarea name="notes"></textarea></div><div class="field full"><button class="btn btn-primary">Salvar documento</button></div></form>`);
    $('#cloud-document-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),b=e.target.querySelector('button'),user=await currentUser();if(!user)return flash('Sessão expirada.');b.disabled=true;const payload={condominium_id:cid,title:String(f.get('title')).trim(),category:f.get('category'),issue_date:f.get('issue')||null,expiry_date:f.get('expiry')||null,visibility:f.get('visibility'),notes:String(f.get('notes')).trim()||null,created_by:user.id};const {data:r,error}=await sbOps.from('documents').insert(payload).select().single();if(error){b.disabled=false;return flash(error.message)}await addTimeline(cid,`Documento cadastrado: ${payload.title}.`,'documents',r.id);closeModal();flash('Documento cadastrado.');docsPage(cid)};
  };

  window.deleteDocument=async function(id,cid){if(!confirm('Excluir este documento do controle?'))return;const {data:x}=await sbOps.from('documents').select('title').eq('id',id).maybeSingle();const {error}=await sbOps.from('documents').delete().eq('id',id);if(error)return flash(error.message);await sbOps.from('events').delete().eq('source_type','documents').eq('source_id',id);await addTimeline(cid,`Documento removido: ${x?.title||'documento'}.`,'documents',id);flash('Documento removido.');docsPage(cid)};

  async function assembliesPage(cid){
    const c=condo(cid);if(!c)return;
    $('#app').innerHTML=shell(`${topbar('Assembleias',`${esc(c.name)} • reuniões e assembleias.`,'Workspace',`<button class="btn btn-primary" onclick="openAssemblyModal('${cid}')">+ Nova assembleia</button>`)}<article class="panel"><div class="panel-body"><div class="empty">Carregando assembleias...</div></div></article>`,'condo-assemblies',cid);
    const {data:rows,error}=await sbOps.from('assemblies').select('*').eq('condominium_id',cid).order('scheduled_at',{ascending:true});if(error)return flash(error.message);
    const list=(rows||[]).length?(rows||[]).map(x=>`<article class="card" style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start"><div><div class="eyebrow">${new Intl.DateTimeFormat('pt-BR',{dateStyle:'long',timeStyle:'short'}).format(new Date(x.scheduled_at))}</div><h3 style="margin:5px 0">${esc(x.title)}</h3><p class="muted">📍 ${esc(x.location||'Local a definir')}</p>${x.agenda?`<p style="margin-top:10px">${esc(x.agenda)}</p>`:''}<small class="muted">Visibilidade: ${esc(memberVisibility[x.visibility]||x.visibility)}</small></div><div style="display:flex;gap:8px;align-items:center"><span class="badge ${assemblyClass(x.status)}">${esc(statusText[x.status]||x.status)}</span><button class="btn btn-soft" onclick="openAssemblyStatusModal('${x.id}')">Atualizar</button></div></div></article>`).join(''):'<div class="empty">Nenhuma assembleia cadastrada.</div>';
    $('#app').innerHTML=shell(`${topbar('Assembleias',`${esc(c.name)} • reuniões e assembleias.`,'Workspace',`<button class="btn btn-primary" onclick="openAssemblyModal('${cid}')">+ Nova assembleia</button>`)}<div class="database-explainer"><div class="database-icon">🏛️</div><div><strong>Integrado ao calendário.</strong><p>Ao cadastrar uma assembleia, o evento entra automaticamente no calendário central e fica disponível para os alertas do sistema.</p></div></div><section>${list}</section>`,'condo-assemblies',cid);
  }
  window.assembliesPage=assembliesPage;

  window.openAssemblyModal=function(cid){
    modal(`<div class="eyebrow">Nova assembleia</div><h2 style="margin-bottom:16px">Cadastrar assembleia</h2><form id="cloud-assembly-form" class="form-grid"><div class="field full"><label>Título</label><input name="title" required placeholder="Ex.: Assembleia Geral Ordinária"></div><div class="field"><label>Data e horário</label><input name="scheduled" type="datetime-local" required></div><div class="field"><label>Local</label><input name="location" placeholder="Salão de festas"></div><div class="field"><label>Status</label><select name="status"><option value="planned">Planejada</option><option value="called">Convocada</option></select></div><div class="field"><label>Visibilidade</label><select name="visibility"><option value="residents">Moradores</option><option value="management">Somente gestão</option><option value="all">Todos</option></select></div><div class="field full"><label>Pauta</label><textarea name="agenda" placeholder="Assuntos da assembleia"></textarea></div><div class="field full"><button class="btn btn-primary">Salvar assembleia</button></div></form>`);
    $('#cloud-assembly-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),b=e.target.querySelector('button'),user=await currentUser();if(!user)return flash('Sessão expirada.');b.disabled=true;const dt=new Date(String(f.get('scheduled')));const payload={condominium_id:cid,title:String(f.get('title')).trim(),scheduled_at:dt.toISOString(),location:String(f.get('location')).trim()||null,agenda:String(f.get('agenda')).trim()||null,status:f.get('status'),visibility:f.get('visibility'),created_by:user.id};const {data:r,error}=await sbOps.from('assemblies').insert(payload).select().single();if(error){b.disabled=false;return flash(error.message)}await addTimeline(cid,`Assembleia cadastrada: ${payload.title}.`,'assemblies',r.id);closeModal();flash('Assembleia cadastrada.');assembliesPage(cid)};
  };

  window.openAssemblyStatusModal=async function(id){
    const {data:x,error}=await sbOps.from('assemblies').select('*').eq('id',id).single();if(error)return flash(error.message);
    modal(`<div class="eyebrow">Assembleia</div><h2 style="margin-bottom:16px">${esc(x.title)}</h2><form id="assembly-status-form" class="form-grid"><div class="field"><label>Status</label><select name="status">${[['planned','Planejada'],['called','Convocada'],['held','Realizada'],['cancelled','Cancelada']].map(([v,l])=>`<option value="${v}" ${x.status===v?'selected':''}>${l}</option>`).join('')}</select></div><div class="field full"><button class="btn btn-primary">Salvar</button></div></form>`);
    $('#assembly-status-form').onsubmit=async e=>{e.preventDefault();const status=new FormData(e.target).get('status'),b=e.target.querySelector('button');b.disabled=true;const {error:up}=await sbOps.from('assemblies').update({status}).eq('id',id);if(up){b.disabled=false;return flash(up.message)}await addTimeline(x.condominium_id,`Assembleia atualizada: ${x.title} → ${statusText[status]||status}.`,'assemblies',id);closeModal();flash('Assembleia atualizada.');assembliesPage(x.condominium_id)};
  };

  const previousShell=typeof shell==='function'?shell:null;
  if(previousShell){
    shell=function(content,active='dashboard',cid=null){
      let html=previousShell(content,active,cid);
      if(cid&&!html.includes(`/condominio/${cid}/assembleias`)){
        const marker=`<a href="#/condominio/${cid}/documentos"`;
        const item=`<a href="#/condominio/${cid}/assembleias" class="${active==='condo-assemblies'?'active':''}"><span>🏛</span><span>Assembleias</span></a>`;
        html=html.replace(marker,item+marker);
      }
      return html;
    };
  }

  const previousRoute=typeof route==='function'?route:null;
  if(previousRoute){
    route=function(){
      const p=(location.hash||'#/').replace(/^#\//,'').split('/').filter(Boolean);
      if(p[0]==='condominio'&&p[2]==='assembleias')return assembliesPage(p[1]);
      return previousRoute();
    };
    window.addEventListener('hashchange',route);
  }

  // O portal do morador existente recebe uma ação funcional de abertura de chamado sem expor a área administrativa.
  function enhanceResidentPortal(){
    const app=document.querySelector('.resident-app'); if(!app||app.dataset.opsEnhanced)return;
    app.dataset.opsEnhanced='1';
    const cards=[...app.querySelectorAll('.resident-card')];
    const callCard=cards.find(el=>el.textContent.includes('Meus chamados'));
    if(callCard){callCard.style.cursor='pointer';callCard.title='Abrir um chamado';callCard.addEventListener('click',openResidentCallModal)}
  }

  async function openResidentCallModal(){
    const user=await currentUser();if(!user)return;
    const {data:member,error}=await sbOps.from('condominium_members').select('condominium_id,unit_id').eq('user_id',user.id).eq('role','resident').eq('is_active',true).limit(1).maybeSingle();if(error||!member)return flash(error?.message||'Vínculo de morador não encontrado.');
    modal(`<div class="eyebrow">Portal do morador</div><h2 style="margin-bottom:16px">Abrir chamado</h2><form id="resident-call-form" class="form-grid"><div class="field full"><label>Assunto</label><input name="title" required></div><div class="field"><label>Categoria</label><select name="category"><option>Manutenção</option><option>Elétrica</option><option>Hidráulica</option><option>Limpeza</option><option>Barulho</option><option>Segurança</option><option>Outros</option></select></div><div class="field"><label>Prioridade</label><select name="priority"><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></div><div class="field full"><label>Descrição</label><textarea name="description" required></textarea></div><div class="field full"><button class="btn btn-primary">Enviar solicitação</button></div></form>`);
    $('#resident-call-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),b=e.target.querySelector('button');b.disabled=true;const payload={condominium_id:member.condominium_id,unit_id:member.unit_id||null,created_by:user.id,title:String(f.get('title')).trim(),description:String(f.get('description')).trim(),category:f.get('category'),priority:f.get('priority'),status:'open'};const {error:ins}=await sbOps.from('service_requests').insert(payload);if(ins){b.disabled=false;return flash(ins.message)}closeModal();flash('Chamado enviado ao síndico.')};
  }

  new MutationObserver(enhanceResidentPortal).observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(enhanceResidentPortal,500);
})();