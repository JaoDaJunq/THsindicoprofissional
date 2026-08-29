(() => {
  if (!window.supabase) return;
  const sbAnnouncements = window.supabase.createClient('https://tckvzlizcqdxzgavjwie.supabase.co','sb_publishable_MRtiWP-ErwVKXqNbGFrW_g_FwEHsob3');
  const safe=s=>typeof esc==='function'?esc(s):String(s??'');
  const fmt=v=>v?new Intl.DateTimeFormat('pt-BR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v)):'Sem data';
  const priority={low:'Baixa',normal:'Normal',high:'Alta',urgent:'Urgente'};

  async function adminAnnouncementsPage(cid){
    const c=condo(cid);if(!c)return;
    $('#app').innerHTML=shell(`${topbar('Comunicados',`${safe(c.name)} • avisos para os moradores.`,'Workspace',`<button class="btn btn-primary" onclick="openAnnouncementModal('${cid}')">+ Novo comunicado</button>`)}<article class="panel"><div class="panel-body"><div class="empty">Carregando comunicados...</div></div></article>`,'condo-announcements',cid);
    const {data:rows,error}=await sbAnnouncements.from('announcements').select('*').eq('condominium_id',cid).order('published_at',{ascending:false});
    if(error)return flash(error.message);
    const list=(rows||[]).length?(rows||[]).map(x=>`<article class="card" style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;gap:12px"><div><div class="eyebrow">${fmt(x.published_at)}</div><h3 style="margin:5px 0">${safe(x.title)}</h3><p>${safe(x.body)}</p>${x.expires_at?`<small class="muted">Expira em ${fmt(x.expires_at)}</small>`:''}</div><span class="badge ${x.priority==='urgent'?'bad':x.priority==='high'?'warn':'good'}">${safe(priority[x.priority]||x.priority)}</span></div></article>`).join(''):'<div class="empty">Nenhum comunicado publicado.</div>';
    $('#app').innerHTML=shell(`${topbar('Comunicados',`${safe(c.name)} • avisos para os moradores.`,'Workspace',`<button class="btn btn-primary" onclick="openAnnouncementModal('${cid}')">+ Novo comunicado</button>`)}<article class="panel"><div class="panel-head"><div><h2>Publicações</h2><div class="muted small">Moradores recebem notificação interna quando um comunicado é publicado.</div></div></div><div class="panel-body">${list}</div></article>`,'condo-announcements',cid);
  }
  window.adminAnnouncementsPage=adminAnnouncementsPage;

  window.openAnnouncementModal=function(cid){
    modal(`<div class="eyebrow">Novo comunicado</div><h2 style="margin-bottom:16px">Publicar comunicado</h2><form id="announcement-form" class="form-grid"><div class="field full"><label>Título</label><input name="title" required></div><div class="field"><label>Prioridade</label><select name="priority"><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></div><div class="field"><label>Expira em</label><input type="date" name="expires"></div><div class="field full"><label>Mensagem</label><textarea name="body" required></textarea></div><div class="field full"><button class="btn btn-primary">Publicar</button></div></form>`);
    $('#announcement-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),b=e.target.querySelector('button'),user=(await sbAnnouncements.auth.getSession()).data.session?.user;if(!user)return flash('Sessão expirada.');b.disabled=true;const expires=f.get('expires')?new Date(String(f.get('expires'))+'T23:59:59').toISOString():null;const {error}=await sbAnnouncements.from('announcements').insert({condominium_id:cid,title:String(f.get('title')).trim(),body:String(f.get('body')).trim(),priority:f.get('priority'),visibility:'residents',expires_at:expires,created_by:user.id});if(error){b.disabled=false;return flash(error.message)}closeModal();flash('Comunicado publicado.');adminAnnouncementsPage(cid)};
  };

  const prevShell=typeof shell==='function'?shell:null;
  if(prevShell){shell=function(content,active='dashboard',cid=null){let html=prevShell(content,active,cid);if(cid&&!html.includes(`/condominio/${cid}/comunicados`)){const marker=`<a href="#/condominio/${cid}/assembleias"`;const item=`<a href="#/condominio/${cid}/comunicados" class="${active==='condo-announcements'?'active':''}"><span>📢</span><span>Comunicados</span></a>`;if(html.includes(marker))html=html.replace(marker,item+marker)}return html}}

  const prevRoute=typeof route==='function'?route:null;
  if(prevRoute){route=function(){const p=(location.hash||'#/').replace(/^#\//,'').split('/').filter(Boolean);if(p[0]==='condominio'&&p[2]==='comunicados')return adminAnnouncementsPage(p[1]);return prevRoute()};window.addEventListener('hashchange',route)}
})();