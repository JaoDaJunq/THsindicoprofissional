(() => {
  if (!window.supabase) return;
  const URL='https://tckvzlizcqdxzgavjwie.supabase.co';
  const KEY='sb_publishable_MRtiWP-ErwVKXqNbGFrW_g_FwEHsob3';
  const cloud=window.supabase.createClient(URL,KEY);
  let applying=false, syncTimer=null;
  const uuid=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v||''));
  const currentUser=async()=>{const {data:{session}}=await cloud.auth.getSession();return session?.user||null};
  const asDate=v=>v?String(v).slice(0,10):null;

  function mapMaintenance(x){return{id:x.id,clientRef:x.client_ref||'',condoId:x.condominium_id,title:x.title,category:x.category||'',supplier:x.supplier||'',responsible:x.responsible||'',nextDate:x.next_date,recurrence:x.recurrence,status:x.status,priority:x.priority,reminders:x.reminders||[2],notes:x.notes||''}}
  function mapTask(x){return{id:x.id,clientRef:x.client_ref||'',condoId:x.condominium_id,title:x.title,description:x.description||'',dueDate:x.due_date,recurrence:x.recurrence,status:x.status,priority:x.priority,reminders:x.reminders||[2]}}
  function mapCall(x){return{id:x.id,clientRef:x.client_ref||'',condoId:x.condominium_id,title:x.title,description:x.description||'',unit:x.location_label||'',priority:x.priority,status:x.status,createdAt:x.created_at}}
  function mapDocument(x){return{id:x.id,clientRef:x.client_ref||'',condoId:x.condominium_id,title:x.title,category:x.category||'',issue:x.issue_date,expiry:x.expiry_date,visibility:x.visibility,notes:x.notes||''}}
  function mapAssembly(x){return{id:x.id,clientRef:x.client_ref||'',condoId:x.condominium_id,title:x.title,date:asDate(x.scheduled_at),scheduledAt:x.scheduled_at,location:x.location||'',agenda:x.agenda||'',status:x.status,visibility:x.visibility}}
  function mapTimeline(x){return{id:x.id,clientRef:x.client_ref||'',condoId:x.condominium_id,text:x.text,date:asDate(x.happened_at),happenedAt:x.happened_at}}
  function mapEvent(x){return{id:x.id,condoId:x.condominium_id,title:x.title,description:x.description||'',type:x.event_type,date:asDate(x.starts_at),startsAt:x.starts_at,visibility:x.visibility,reminders:x.reminders||[2],sourceType:x.source_type,sourceId:x.source_id,syncStatus:x.sync_status,googleEventId:x.google_event_id}}

  async function refreshOperations(render=true){
    const user=await currentUser(); if(!user||typeof data==='undefined')return;
    const allowed=new Set((data.condos||[]).map(c=>c.id));
    const [m,t,c,d,a,tl,e,n]=await Promise.all([
      cloud.from('maintenances').select('*').order('next_date',{ascending:true}),
      cloud.from('tasks').select('*').order('due_date',{ascending:true}),
      cloud.from('service_requests').select('*').order('created_at',{ascending:false}),
      cloud.from('documents').select('*').order('created_at',{ascending:false}),
      cloud.from('assemblies').select('*').order('scheduled_at',{ascending:true}),
      cloud.from('timeline_entries').select('*').order('happened_at',{ascending:false}),
      cloud.from('events').select('*').order('starts_at',{ascending:true}),
      cloud.from('notifications').select('*').eq('user_id',user.id).order('created_at',{ascending:false})
    ]);
    [m,t,c,d,a,tl,e,n].forEach(r=>{if(r.error)console.warn('Supabase operational sync',r.error)});
    applying=true;
    data.maintenances=(m.data||[]).filter(x=>allowed.has(x.condominium_id)).map(mapMaintenance);
    data.tasks=(t.data||[]).filter(x=>allowed.has(x.condominium_id)).map(mapTask);
    data.calls=(c.data||[]).filter(x=>allowed.has(x.condominium_id)).map(mapCall);
    data.documents=(d.data||[]).filter(x=>allowed.has(x.condominium_id)).map(mapDocument);
    data.assemblies=(a.data||[]).filter(x=>allowed.has(x.condominium_id)).map(mapAssembly);
    data.timeline=(tl.data||[]).filter(x=>allowed.has(x.condominium_id)).map(mapTimeline);
    data.events=(e.data||[]).filter(x=>allowed.has(x.condominium_id)).map(mapEvent);
    data.notifications=(n.data||[]).map(x=>({id:x.id,condoId:x.condominium_id,eventId:x.event_id,title:x.title,message:x.message||'',channel:x.channel,status:x.status,scheduledAt:x.scheduled_at,sentAt:x.sent_at,readAt:x.read_at}));
    try{originalSave(data)}catch(err){console.warn(err)}
    applying=false;
    if(render&&typeof route==='function')route();
  }

  async function pushLocal(d){
    if(applying)return;
    const user=await currentUser(); if(!user)return;
    const maint=(d.maintenances||[]).filter(x=>uuid(x.condoId)&&!uuid(x.id));
    const tasks=(d.tasks||[]).filter(x=>uuid(x.condoId)&&!uuid(x.id));
    if(!maint.length&&!tasks.length)return;
    for(const x of maint){
      const payload={client_ref:x.id,condominium_id:x.condoId,title:x.title,category:x.category||null,supplier:x.supplier||null,responsible:x.responsible||null,next_date:x.nextDate,recurrence:x.recurrence||'none',status:x.status||'scheduled',priority:x.priority||'normal',reminders:x.reminders||[2],notes:x.notes||null,created_by:user.id};
      const {error}=await cloud.from('maintenances').upsert(payload,{onConflict:'condominium_id,client_ref'}); if(error)console.warn(error);
    }
    for(const x of tasks){
      const payload={client_ref:x.id,condominium_id:x.condoId,title:x.title,description:x.description||null,due_date:x.dueDate,recurrence:x.recurrence||'none',status:x.status||'pending',priority:x.priority||'normal',reminders:x.reminders||[2],created_by:user.id};
      const {error}=await cloud.from('tasks').upsert(payload,{onConflict:'condominium_id,client_ref'}); if(error)console.warn(error);
    }
    await refreshOperations(false);
  }

  const originalSave=typeof save==='function'?save:null;
  if(originalSave){
    save=function(d){
      originalSave(d);
      if(applying)return;
      clearTimeout(syncTimer);
      syncTimer=setTimeout(()=>pushLocal(d).catch(console.warn),250);
    };
  }

  async function insertMaintenance(x){
    const user=await currentUser();if(!user)throw new Error('Sessão expirada.');
    const {data:r,error}=await cloud.from('maintenances').insert({client_ref:x.id,condominium_id:x.condoId,title:x.title,category:x.category||null,supplier:x.supplier||null,responsible:x.responsible||null,next_date:x.nextDate,recurrence:x.recurrence||'none',status:'scheduled',priority:'normal',reminders:x.reminders||[2],notes:x.notes||null,created_by:user.id}).select().single();
    if(error)throw error;return r;
  }
  async function insertTask(x){
    const user=await currentUser();if(!user)throw new Error('Sessão expirada.');
    const {data:r,error}=await cloud.from('tasks').insert({client_ref:x.id,condominium_id:x.condoId,title:x.title,due_date:x.dueDate,recurrence:x.recurrence||'none',status:'pending',priority:x.priority||'normal',reminders:x.reminders||[2],created_by:user.id}).select().single();
    if(error)throw error;return r;
  }
  async function timeline(condoId,text,sourceType=null,sourceId=null){
    const user=await currentUser();if(!user)return;
    const {error}=await cloud.from('timeline_entries').insert({condominium_id:condoId,text,source_type:sourceType,source_id:sourceId,created_by:user.id});if(error)console.warn(error);
  }

  window.openMaintenanceModal=function(cid=''){
    modal(`<div class="eyebrow">Nova manutenção</div><h2 style="margin-bottom:16px">Cadastrar manutenção</h2><form id="cloud-maintenance-form" class="form-grid"><div class="field full"><label>Condomínio</label><select name="condoId">${data.condos.map(c=>`<option value="${c.id}" ${c.id===cid?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div><div class="field full"><label>Serviço</label><input name="title" required placeholder="Ex.: Inspeção dos elevadores"></div><div class="field"><label>Categoria</label><select name="category"><option>Elevadores</option><option>Extintores</option><option>Hidráulica</option><option>Dedetização</option><option>Portões</option><option>Bombas</option><option>Elétrica</option><option>Outros</option></select></div><div class="field"><label>Fornecedor</label><input name="supplier"></div><div class="field"><label>Próxima data</label><input name="nextDate" type="date" required value="${addDays(7)}"></div><div class="field"><label>Recorrência</label><select name="recurrence"><option value="none">Única</option><option value="weekly">Semanal</option><option value="monthly" selected>Mensal</option><option value="bimonthly">Bimestral</option><option value="quarterly">Trimestral</option><option value="semiannual">Semestral</option><option value="annual">Anual</option></select></div><div class="field"><label>Responsável</label><input name="responsible" value="${esc(data.user.name)}"></div><div class="field"><label>Lembretes em dias</label><input name="reminders" value="7,2"></div><div class="field full"><label>Observações</label><textarea name="notes"></textarea></div><div class="field full"><button class="btn btn-primary" type="submit">Salvar manutenção</button></div></form>`);
    $('#cloud-maintenance-form').onsubmit=async ev=>{ev.preventDefault();const f=new FormData(ev.target),b=ev.target.querySelector('button');b.disabled=true;b.textContent='Salvando...';const x={id:uid('m'),condoId:f.get('condoId'),title:String(f.get('title')).trim(),category:f.get('category'),supplier:String(f.get('supplier')).trim(),responsible:String(f.get('responsible')).trim(),nextDate:f.get('nextDate'),recurrence:f.get('recurrence'),reminders:String(f.get('reminders')).split(',').map(v=>Number(v.trim())).filter(Number.isFinite),notes:String(f.get('notes')).trim()};try{const r=await insertMaintenance(x);await timeline(x.condoId,`Manutenção cadastrada: ${x.title}.`,'maintenances',r.id);await refreshOperations(false);closeModal();flash('Manutenção salva no Supabase.');route()}catch(err){b.disabled=false;b.textContent='Salvar manutenção';flash(err.message||'Erro ao salvar.')}};
  };

  window.openTaskModal=function(cid=''){
    modal(`<div class="eyebrow">Nova tarefa</div><h2 style="margin-bottom:16px">Cadastrar tarefa</h2><form id="cloud-task-form" class="form-grid"><div class="field full"><label>Condomínio</label><select name="condoId">${data.condos.map(c=>`<option value="${c.id}" ${c.id===cid?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div><div class="field full"><label>Tarefa</label><input name="title" required></div><div class="field"><label>Prazo</label><input name="dueDate" type="date" required value="${addDays(7)}"></div><div class="field"><label>Recorrência</label><select name="recurrence"><option value="none">Única</option><option value="weekly">Semanal</option><option value="monthly">Mensal</option><option value="quarterly">Trimestral</option><option value="annual">Anual</option></select></div><div class="field"><label>Prioridade</label><select name="priority"><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></div><div class="field full"><button class="btn btn-primary" type="submit">Salvar tarefa</button></div></form>`);
    $('#cloud-task-form').onsubmit=async ev=>{ev.preventDefault();const f=new FormData(ev.target),b=ev.target.querySelector('button');b.disabled=true;b.textContent='Salvando...';const x={id:uid('t'),condoId:f.get('condoId'),title:String(f.get('title')).trim(),dueDate:f.get('dueDate'),recurrence:f.get('recurrence'),priority:f.get('priority'),reminders:[2]};try{const r=await insertTask(x);await timeline(x.condoId,`Tarefa cadastrada: ${x.title}.`,'tasks',r.id);await refreshOperations(false);closeModal();flash('Tarefa salva no Supabase.');route()}catch(err){b.disabled=false;b.textContent='Salvar tarefa';flash(err.message||'Erro ao salvar.')}};
  };

  window.completeMaintenance=async id=>{const m=data.maintenances.find(x=>x.id===id);if(!m)return;try{if(m.recurrence&&m.recurrence!=='none'){const nd=nextDate(m.nextDate,m.recurrence);const {error}=await cloud.from('maintenances').update({next_date:nd,status:'scheduled'}).eq('id',id);if(error)throw error;await timeline(m.condoId,`Manutenção concluída: ${m.title}. Próxima ocorrência: ${br(nd)}.`,'maintenances',id)}else{const {error}=await cloud.from('maintenances').update({status:'done'}).eq('id',id);if(error)throw error;await timeline(m.condoId,`Manutenção concluída: ${m.title}.`,'maintenances',id)}await refreshOperations(false);flash('Manutenção concluída.');route()}catch(err){flash(err.message||'Erro ao concluir.')}};
  window.completeTask=async id=>{const t=data.tasks.find(x=>x.id===id);if(!t)return;try{if(t.recurrence&&t.recurrence!=='none'){const nd=nextDate(t.dueDate,t.recurrence);const {error}=await cloud.from('tasks').update({due_date:nd,status:'pending'}).eq('id',id);if(error)throw error;await timeline(t.condoId,`Tarefa concluída: ${t.title}. Próxima ocorrência: ${br(nd)}.`,'tasks',id)}else{const {error}=await cloud.from('tasks').update({status:'done'}).eq('id',id);if(error)throw error;await timeline(t.condoId,`Tarefa concluída: ${t.title}.`,'tasks',id)}await refreshOperations(false);flash('Tarefa concluída.');route()}catch(err){flash(err.message||'Erro ao concluir.')}};

  calendarEvents=function(cid=null){
    if(data.events?.length)return data.events.filter(x=>!cid||x.condoId===cid).map(x=>({date:x.date,title:x.title,type:x.type}));
    const out=[];data.maintenances.filter(x=>!cid||x.condoId===cid).forEach(x=>out.push({date:x.nextDate,title:x.title,type:'maintenance'}));data.tasks.filter(x=>!cid||x.condoId===cid).forEach(x=>out.push({date:x.dueDate,title:x.title,type:'task'}));return out;
  };

  async function init(){const user=await currentUser();if(!user)return;setTimeout(()=>refreshOperations(true).catch(console.warn),700)}
  cloud.auth.onAuthStateChange((event,session)=>{if(session?.user&&event!=='SIGNED_OUT')setTimeout(()=>refreshOperations(true).catch(console.warn),700)});
  init();
})();