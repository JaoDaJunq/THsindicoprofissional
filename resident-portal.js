(() => {
  if (!window.supabase) return;
  const sbResident = window.supabase.createClient('https://tckvzlizcqdxzgavjwie.supabase.co','sb_publishable_MRtiWP-ErwVKXqNbGFrW_g_FwEHsob3');
  const safe=s=>typeof esc==='function'?esc(s):String(s??'');
  const fmt=v=>v?new Intl.DateTimeFormat('pt-BR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v)):'Sem data';
  const first=n=>(n||'').trim().split(/\s+/)[0]||'Morador';
  const initials=n=>(n||'M').trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()||'').join('');
  const status={open:'Aberto',analysis:'Em análise',in_progress:'Em andamento',waiting_supplier:'Aguardando fornecedor',waiting_resident:'Aguardando morador',resolved:'Resolvido',cancelled:'Cancelado'};

  async function ctx(){
    const user=(await sbResident.auth.getSession()).data.session?.user;if(!user)return null;
    const {data:m}=await sbResident.from('condominium_members').select('condominium_id,unit_id,member_type').eq('user_id',user.id).eq('role','resident').eq('is_active',true).limit(1).maybeSingle();
    if(!m)return null;
    const [p,c,u]=await Promise.all([
      sbResident.from('profiles').select('full_name,phone').eq('id',user.id).maybeSingle(),
      sbResident.from('condominiums').select('id,name,address_line,city,state').eq('id',m.condominium_id).single(),
      m.unit_id?sbResident.from('units').select('id,block_name,unit_number,floor,notes').eq('id',m.unit_id).maybeSingle():Promise.resolve({data:null})
    ]);
    return {user,member:m,profile:p.data||{},condo:c.data||{},unit:u.data||null};
  }

  async function unread(userId){const {count}=await sbResident.from('notifications').select('id',{count:'exact',head:true}).eq('user_id',userId).is('read_at',null);return count||0}

  function shellResident(c,content,active,count){
    const name=c.profile.full_name||c.user.user_metadata?.full_name||c.user.email?.split('@')[0]||'Morador';
    const unit=c.unit?[c.unit.block_name,c.unit.unit_number].filter(Boolean).join(' / '):'Sem unidade';
    const nav=[['home','⌂','Início'],['announcements','📢','Comunicados'],['calls','🎫','Meus chamados'],['calendar','📅','Calendário'],['documents','📄','Documentos'],['unit','🏠','Minha unidade'],['notifications','🔔',`Notificações${count?` (${count})`:''}`]];
    return `<div class="resident-app"><aside class="resident-sidebar"><div class="brand"><div class="brand-mark">SG</div><div><strong>Portal do Morador</strong><span>${safe(c.condo.name)}</span></div></div><nav class="resident-nav">${nav.map(([id,ic,l])=>`<a href="#/morador/${id}" class="${active===id?'active':''}">${ic} ${safe(l)}</a>`).join('')}</nav><div class="sidebar-footer"><small>${safe(unit)}</small><strong>${safe(name)}</strong><button class="cloud-logout" onclick="cloudLogout()">Sair</button></div></aside><main class="resident-main"><header class="resident-top"><div><div class="eyebrow">${safe(c.condo.name)}</div><h1>${active==='home'?`Buenas, ${safe(first(name))} 👋`:'Portal do Morador'}</h1><p class="muted">${safe([c.condo.address_line,c.condo.city,c.condo.state].filter(Boolean).join(' • '))}</p></div><div class="avatar">${safe(initials(name))}</div></header>${content}</main></div>`;
  }

  async function render(section='home'){
    const c=await ctx();if(!c)return;
    const count=await unread(c.user.id);
    if(section==='home'){
      const [a,r,e,d]=await Promise.all([
        sbResident.from('announcements').select('*').eq('condominium_id',c.member.condominium_id).order('published_at',{ascending:false}).limit(3),
        sbResident.from('service_requests').select('*').eq('created_by',c.user.id).order('created_at',{ascending:false}),
        sbResident.from('events').select('*').eq('condominium_id',c.member.condominium_id).gte('starts_at',new Date().toISOString()).order('starts_at').limit(4),
        sbResident.from('documents').select('*').eq('condominium_id',c.member.condominium_id).in('visibility',['residents','all']).limit(4)
      ]);
      const ann=a.data||[],calls=r.data||[],events=e.data||[],docs=d.data||[],open=calls.filter(x=>!['resolved','cancelled'].includes(x.status)).length,next=events[0],unit=c.unit?[c.unit.block_name,c.unit.unit_number].filter(Boolean).join(' / '):'Sem unidade vinculada';
      $('#app').innerHTML=shellResident(c,`<section class="resident-grid"><article class="resident-card resident-highlight"><span>🏠</span><div><strong>${safe(c.condo.name)}</strong><p>${safe(unit)}</p></div></article><article class="resident-card" onclick="location.hash='#/morador/announcements'" style="cursor:pointer"><span>📢</span><div><strong>${ann.length} comunicado(s)</strong><p>${ann[0]?safe(ann[0].title):'Nenhum comunicado recente.'}</p></div></article><article class="resident-card" onclick="location.hash='#/morador/calls'" style="cursor:pointer"><span>🎫</span><div><strong>${open} chamado(s) em aberto</strong><p>Acompanhe suas solicitações.</p></div></article><article class="resident-card" onclick="location.hash='#/morador/calendar'" style="cursor:pointer"><span>📅</span><div><strong>${next?'Próximo evento':'Agenda tranquila'}</strong><p>${next?`${safe(next.title)} • ${fmt(next.starts_at)}`:'Nenhum evento próximo.'}</p></div></article><article class="resident-card" onclick="location.hash='#/morador/documents'" style="cursor:pointer"><span>📄</span><div><strong>${docs.length} documento(s)</strong><p>Documentos liberados pela gestão.</p></div></article><article class="resident-card" onclick="location.hash='#/morador/notifications'" style="cursor:pointer"><span>🔔</span><div><strong>${count} não lida(s)</strong><p>Atualizações e avisos do condomínio.</p></div></article></section>`,'home',count);return;
    }
    if(section==='announcements'){
      const {data:rows}=await sbResident.from('announcements').select('*').eq('condominium_id',c.member.condominium_id).order('published_at',{ascending:false});
      $('#app').innerHTML=shellResident(c,`<section>${(rows||[]).length?(rows||[]).map(x=>`<article class="card" style="margin-bottom:12px"><div class="eyebrow">${fmt(x.published_at)}</div><h2 style="margin:6px 0 8px">${safe(x.title)}</h2><p>${safe(x.body)}</p></article>`).join(''):'<div class="empty">Nenhum comunicado disponível.</div>'}</section>`,'announcements',count);return;
    }
    if(section==='calls'){
      const {data:rows}=await sbResident.from('service_requests').select('*').eq('created_by',c.user.id).order('created_at',{ascending:false});
      $('#app').innerHTML=shellResident(c,`<div style="display:flex;justify-content:flex-end;margin-bottom:14px"><button class="btn btn-primary" onclick="openResidentPortalCall()">+ Abrir chamado</button></div><section>${(rows||[]).length?(rows||[]).map(x=>`<article class="card" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;gap:12px"><div><h3>${safe(x.title)}</h3><p class="muted">${safe(x.description||'')}</p><small class="muted">${fmt(x.created_at)}</small></div><span class="badge ${x.status==='resolved'?'good':x.status==='cancelled'?'bad':'warn'}">${safe(status[x.status]||x.status)}</span></div></article>`).join(''):'<div class="empty">Nenhum chamado aberto por você.</div>'}</section>`,'calls',count);return;
    }
    if(section==='calendar'){
      const {data:rows}=await sbResident.from('events').select('*').eq('condominium_id',c.member.condominium_id).order('starts_at');
      const vis=(rows||[]).filter(x=>['residents','all'].includes(x.visibility));
      $('#app').innerHTML=shellResident(c,`<section>${vis.length?vis.map(x=>`<article class="card" style="margin-bottom:10px"><div class="eyebrow">${fmt(x.starts_at)}</div><h3>${safe(x.title)}</h3><p class="muted">${safe(x.description||'')}</p></article>`).join(''):'<div class="empty">Nenhum evento público.</div>'}</section>`,'calendar',count);return;
    }
    if(section==='documents'){
      const [{data:docs},{data:files}]=await Promise.all([sbResident.from('documents').select('*').eq('condominium_id',c.member.condominium_id).in('visibility',['residents','all']).order('created_at',{ascending:false}),sbResident.from('file_entries').select('*').eq('condominium_id',c.member.condominium_id).in('visibility',['residents','all']).order('created_at',{ascending:false})]);
      $('#app').innerHTML=shellResident(c,`<section><div class="section-title"><h2>Documentos</h2></div>${(docs||[]).map(x=>`<article class="card" style="margin-bottom:10px"><strong>${safe(x.title)}</strong><p class="muted">${safe(x.category||'Documento')}</p></article>`).join('')||'<div class="empty">Nenhum documento liberado.</div>'}<div class="section-title" style="margin-top:20px"><h2>Arquivos</h2></div>${(files||[]).map(x=>`<article class="card" style="margin-bottom:10px;display:flex;justify-content:space-between;align-items:center"><strong>${safe(x.name)}</strong><button class="btn btn-soft" onclick="openResidentFile('${x.id}')">Abrir</button></article>`).join('')||'<div class="empty">Nenhum arquivo liberado.</div>'}</section>`,'documents',count);return;
    }
    if(section==='unit'){
      $('#app').innerHTML=shellResident(c,`<section class="card"><h2>Minha unidade</h2><div class="kpi-strip" style="margin-top:18px"><div class="kpi-pill"><strong>${safe(c.unit?.block_name||'Sem bloco')}</strong><span>Bloco</span></div><div class="kpi-pill"><strong>${safe(c.unit?.unit_number||'Não vinculada')}</strong><span>Unidade</span></div><div class="kpi-pill"><strong>${safe(c.unit?.floor||'Não informado')}</strong><span>Andar</span></div><div class="kpi-pill"><strong>${safe(({owner:'Proprietário',tenant:'Inquilino',dependent:'Dependente'})[c.member.member_type]||'Morador')}</strong><span>Vínculo</span></div></div></section>`,'unit',count);return;
    }
    if(section==='notifications'){
      const {data:rows}=await sbResident.from('notifications').select('*').eq('user_id',c.user.id).order('created_at',{ascending:false});
      await sbResident.from('notifications').update({read_at:new Date().toISOString()}).eq('user_id',c.user.id).is('read_at',null);
      $('#app').innerHTML=shellResident(c,`<section>${(rows||[]).length?(rows||[]).map(x=>`<article class="card" style="margin-bottom:10px"><div class="eyebrow">${fmt(x.created_at)}</div><strong>${safe(x.title)}</strong><p class="muted">${safe(x.message||'')}</p></article>`).join(''):'<div class="empty">Nenhuma notificação.</div>'}</section>`,'notifications',0);return;
    }
  }

  window.openResidentPortalCall=async()=>{
    const c=await ctx();if(!c)return;
    modal(`<div class="eyebrow">Novo chamado</div><h2 style="margin-bottom:16px">Enviar solicitação</h2><form id="resident-call-full" class="form-grid"><div class="field full"><label>Assunto</label><input name="title" required></div><div class="field"><label>Categoria</label><select name="category"><option>Manutenção</option><option>Elétrica</option><option>Hidráulica</option><option>Limpeza</option><option>Barulho</option><option>Segurança</option><option>Outros</option></select></div><div class="field"><label>Prioridade</label><select name="priority"><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></div><div class="field full"><label>Descrição</label><textarea name="description" required></textarea></div><div class="field full"><button class="btn btn-primary">Enviar chamado</button></div></form>`);
    $('#resident-call-full').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),b=e.target.querySelector('button');b.disabled=true;const {error}=await sbResident.from('service_requests').insert({condominium_id:c.member.condominium_id,unit_id:c.member.unit_id||null,created_by:c.user.id,title:String(f.get('title')).trim(),description:String(f.get('description')).trim(),category:f.get('category'),priority:f.get('priority'),status:'open'});if(error){b.disabled=false;return flash(error.message)}closeModal();flash('Chamado enviado.');render('calls')};
  };

  window.openResidentFile=async id=>{const {data:x,error}=await sbResident.from('file_entries').select('storage_path').eq('id',id).single();if(error)return flash(error.message);const {data:s,error:se}=await sbResident.storage.from('condo-files').createSignedUrl(x.storage_path,300);if(se)return flash(se.message);window.open(s.signedUrl,'_blank','noopener')};

  const previousRoute=typeof route==='function'?route:null;
  if(previousRoute){route=function(){const p=(location.hash||'#/').replace(/^#\//,'').split('/').filter(Boolean);if(p[0]==='morador')return render(p[1]||'home');return previousRoute()};window.addEventListener('hashchange',route)}

  function detect(){if(document.querySelector('.resident-app')&&!location.hash.startsWith('#/morador/'))location.hash='#/morador/home'}
  new MutationObserver(()=>setTimeout(detect,0)).observe(document.documentElement,{childList:true,subtree:true});setTimeout(detect,700);
})();