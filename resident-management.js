(() => {
  if (!window.supabase || typeof shell !== 'function') return;

  const sbResidents = window.supabase.createClient(
    'https://tckvzlizcqdxzgavjwie.supabase.co',
    'sb_publishable_MRtiWP-ErwVKXqNbGFrW_g_FwEHsob3'
  );

  const can = (capability,cid) => Boolean(window.CondoAccess?.can(capability,cid));

  const oldShell = shell;
  shell = function(content, active='dashboard', cid=null) {
    let html = oldShell(content, active, cid);
    if (cid && !html.includes(`/condominio/${cid}/moradores`)) {
      const marker = `<a href="#/condominio/${cid}/documentos"`;
      const item = `<a href="#/condominio/${cid}/moradores" class="${active==='condo-residents'?'active':''}"><span>♟</span><span>Moradores</span></a>`;
      html = html.replace(marker, item + marker);
    }
    return html;
  };

  const oldRouteResidents = route;
  route = function() {
    const p=(location.hash||'#/').replace(/^#\//,'').split('/').filter(Boolean);
    if (p[0]==='condominio' && p[2]==='moradores') return residentsPage(p[1]);
    return oldRouteResidents();
  };
  window.addEventListener('hashchange', route);

  async function loadResidentData(cid, includeResidents) {
    const {data:units,error:ue}=await sbResidents.from('units').select('*').eq('condominium_id',cid).order('block_name').order('unit_number');
    if(ue)throw ue;
    if(!includeResidents)return{units:units||[],members:[],invites:[],profiles:[]};

    const [{data:members,error:me},{data:invites,error:ie}] = await Promise.all([
      sbResidents.from('condominium_members').select('id,user_id,role,unit_id,member_type,is_active,created_at').eq('condominium_id',cid).order('created_at'),
      sbResidents.from('resident_invites').select('*').eq('condominium_id',cid).order('created_at',{ascending:false})
    ]);
    if(me)throw me;if(ie)throw ie;
    const ids=[...new Set((members||[]).map(x=>x.user_id).filter(Boolean))];
    let profiles=[];
    if(ids.length){const {data,error}=await sbResidents.from('profiles').select('id,full_name,phone').in('id',ids);if(error)throw error;profiles=data||[]}
    return {units:units||[],members:members||[],invites:invites||[],profiles};
  }

  async function residentsPage(cid) {
    const c=condo(cid);if(!c)return dashboard();
    try{await window.CondoAccess?.refresh()}catch(err){return flash(err.message||'Não foi possível validar o acesso.')}
    const manageResidents=can('residents.manage',cid);
    const manageUnits=can('units.manage',cid);
    if(!manageResidents&&!manageUnits){flash('Você não tem permissão para acessar a gestão de moradores.');return location.hash=`#/condominio/${cid}`}

    const actions=`<div style="display:flex;gap:8px">${manageUnits?'<button class="btn" id="new-unit">+ Unidade</button>':''}${manageResidents?'<button class="btn btn-primary" id="invite-resident">+ Convidar morador</button>':''}</div>`;
    $('#app').innerHTML=shell(`<main class="content"><div class="page-head"><div><div class="eyebrow">${esc(c.name)}</div><h1>Moradores e unidades</h1><p class="muted">${manageResidents?'Gerencie unidades, acessos e convites do condomínio.':'Gerencie as unidades cadastradas neste condomínio.'}</p></div>${actions}</div><div id="resident-content"><section class="card"><p class="muted">Carregando...</p></section></div></main>`,'condo-residents',cid);
    if(manageUnits&&$('#new-unit'))$('#new-unit').onclick=()=>openUnitModal(cid);
    if(manageResidents&&$('#invite-resident'))$('#invite-resident').onclick=()=>openInviteResidentModal(cid);

    try {
      const r=await loadResidentData(cid,manageResidents);
      const unitCards=r.units.length?r.units.map(u=>`<article class="card" style="padding:14px"><strong>${esc(u.block_name?`${u.block_name} • ${u.unit_number}`:`Unidade ${u.unit_number}`)}</strong><p class="muted" style="margin-top:4px">${esc(u.floor?`Andar ${u.floor}`:'Unidade cadastrada')}</p></article>`).join(''):`<p class="muted">Nenhuma unidade cadastrada.</p>`;

      if(!manageResidents){
        $('#resident-content').innerHTML=`<section class="stats-grid" style="margin-bottom:16px"><article class="stat-card"><span>Unidades</span><strong>${r.units.length}</strong></article></section><section><div class="section-title"><h2>Unidades</h2></div><div class="cards-grid">${unitCards}</div></section>`;
        return;
      }

      const unitsMap=new Map(r.units.map(u=>[u.id,u]));
      const profilesMap=new Map(r.profiles.map(p=>[p.id,p]));
      const residents=r.members.filter(m=>m.role==='resident');
      const residentRows=residents.length?residents.map(m=>{const p=profilesMap.get(m.user_id)||{};const u=unitsMap.get(m.unit_id)||{};return `<tr><td><strong>${esc(p.full_name||'Morador')}</strong></td><td>${esc([u.block_name,u.unit_number].filter(Boolean).join(' / ')||'Sem unidade')}</td><td>${esc(({owner:'Proprietário',tenant:'Inquilino',dependent:'Dependente'})[m.member_type]||'Morador')}</td><td><span class="badge ${m.is_active?'good':'bad'}">${m.is_active?'Ativo':'Inativo'}</span></td></tr>`}).join(''):`<tr><td colspan="4" class="muted">Nenhum morador vinculado ainda.</td></tr>`;
      const inviteRows=r.invites.length?r.invites.map(i=>{const u=unitsMap.get(i.unit_id)||{};return `<tr><td>${esc(i.full_name||i.email)}<small style="display:block" class="muted">${esc(i.email)}</small></td><td>${esc([u.block_name,u.unit_number].filter(Boolean).join(' / ')||'Sem unidade')}</td><td><span class="badge ${i.status==='pending'?'warn':i.status==='accepted'?'good':'bad'}">${esc(({pending:'Pendente',accepted:'Aceito',cancelled:'Cancelado',expired:'Expirado'})[i.status]||i.status)}</span></td></tr>`}).join(''):`<tr><td colspan="3" class="muted">Nenhum convite enviado.</td></tr>`;
      $('#resident-content').innerHTML=`<section class="stats-grid" style="margin-bottom:16px"><article class="stat-card"><span>Unidades</span><strong>${r.units.length}</strong></article><article class="stat-card"><span>Moradores ativos</span><strong>${residents.filter(x=>x.is_active).length}</strong></article><article class="stat-card"><span>Convites pendentes</span><strong>${r.invites.filter(x=>x.status==='pending').length}</strong></article></section><section class="card" style="margin-bottom:16px"><div class="section-title"><h2>Moradores</h2></div><div class="table-wrap"><table><thead><tr><th>Nome</th><th>Unidade</th><th>Tipo</th><th>Status</th></tr></thead><tbody>${residentRows}</tbody></table></div></section><section class="card" style="margin-bottom:16px"><div class="section-title"><h2>Convites</h2></div><div class="table-wrap"><table><thead><tr><th>Morador</th><th>Unidade</th><th>Status</th></tr></thead><tbody>${inviteRows}</tbody></table></div></section><section><div class="section-title"><h2>Unidades</h2></div><div class="cards-grid">${unitCards}</div></section>`;
    } catch(err) {
      $('#resident-content').innerHTML=`<section class="card"><strong>Não foi possível carregar.</strong><p class="muted">${esc(err.message||String(err))}</p></section>`;
    }
  }

  function openUnitModal(cid) {
    if(!can('units.manage',cid))return flash('Você não tem permissão para cadastrar unidades.');
    modal(`<div class="eyebrow">Nova unidade</div><h2 style="margin-bottom:16px">Cadastrar unidade</h2><form id="unit-form" class="form-grid"><div class="field"><label>Bloco / torre</label><input name="block" placeholder="Ex.: Bloco A"></div><div class="field"><label>Número da unidade</label><input name="number" required placeholder="Ex.: 205"></div><div class="field"><label>Andar</label><input name="floor" placeholder="Ex.: 2"></div><div class="field full"><label>Observações</label><textarea name="notes"></textarea></div><div class="field full"><button class="btn btn-primary">Salvar unidade</button></div></form>`);
    $('#unit-form').onsubmit=async e=>{e.preventDefault();if(!can('units.manage',cid))return flash('Você não tem permissão para cadastrar unidades.');const f=new FormData(e.target),b=e.target.querySelector('button');b.disabled=true;b.textContent='Salvando...';const {error}=await sbResidents.from('units').insert({condominium_id:cid,block_name:String(f.get('block')).trim()||null,unit_number:String(f.get('number')).trim(),floor:String(f.get('floor')).trim()||null,notes:String(f.get('notes')).trim()||null});if(error){b.disabled=false;b.textContent='Salvar unidade';return flash(error.message)}closeModal();flash('Unidade cadastrada.');residentsPage(cid)};
  }

  async function openInviteResidentModal(cid) {
    if(!can('residents.manage',cid))return flash('Você não tem permissão para convidar moradores.');
    const {data:units,error}=await sbResidents.from('units').select('id,block_name,unit_number').eq('condominium_id',cid).order('block_name').order('unit_number');
    if(error)return flash(error.message);
    modal(`<div class="eyebrow">Novo acesso</div><h2 style="margin-bottom:16px">Convidar morador</h2><p class="muted" style="margin-bottom:14px">O morador receberá um e-mail do Supabase para criar/definir a própria senha.</p><form id="invite-resident-form" class="form-grid"><div class="field full"><label>Nome completo</label><input name="name" required></div><div class="field full"><label>E-mail</label><input name="email" type="email" required></div><div class="field"><label>Unidade</label><select name="unit"><option value="">Sem unidade</option>${(units||[]).map(u=>`<option value="${u.id}">${esc([u.block_name,u.unit_number].filter(Boolean).join(' / '))}</option>`).join('')}</select></div><div class="field"><label>Tipo</label><select name="type"><option value="owner">Proprietário</option><option value="tenant">Inquilino</option><option value="dependent">Dependente</option></select></div><div class="field full"><button class="btn btn-primary">Enviar convite</button></div></form>`);
    $('#invite-resident-form').onsubmit=async e=>{e.preventDefault();if(!can('residents.manage',cid))return flash('Você não tem permissão para convidar moradores.');const f=new FormData(e.target),b=e.target.querySelector('button');b.disabled=true;b.textContent='Enviando...';const {data:{session}}=await sbResidents.auth.getSession();if(!session){b.disabled=false;return flash('Sessão expirada. Entre novamente.')}const {data,error}=await sbResidents.functions.invoke('invite-resident',{body:{condominium_id:cid,unit_id:f.get('unit')||null,email:String(f.get('email')).trim(),full_name:String(f.get('name')).trim(),member_type:f.get('type'),redirect_to:`${location.origin}${location.pathname}`}});if(error||data?.error){b.disabled=false;b.textContent='Enviar convite';return flash(data?.error||error.message)}closeModal();flash('Convite enviado para o morador.');residentsPage(cid)};
  }
})();