(() => {
  if (!window.supabase || typeof data === 'undefined') return;

  const transitionDb = window.supabase.createClient(
    'https://tckvzlizcqdxzgavjwie.supabase.co',
    'sb_publishable_MRtiWP-ErwVKXqNbGFrW_g_FwEHsob3'
  );

  const style = document.createElement('style');
  style.textContent = `
    .transition-banner{margin:0 0 18px;padding:14px 16px;border:1px solid #f1d49a;background:#fff9e8;border-radius:15px;display:flex;gap:12px;align-items:flex-start}
    .transition-banner .transition-icon{width:34px;height:34px;border-radius:10px;background:#fff0bd;display:grid;place-items:center;flex:0 0 auto}
    .transition-banner h3{font-size:12px;margin:0 0 5px;color:#7c5310}.transition-banner p{font-size:10px;color:#755f37;line-height:1.5;margin:0}
    .transition-warning-list{display:grid;gap:8px;margin-top:10px}.transition-warning{background:#fff;border:1px solid #eadcbd;border-radius:11px;padding:10px 11px;display:flex;justify-content:space-between;gap:12px;align-items:center}
    .transition-warning span{font-size:9px;line-height:1.45;color:#65583f}.transition-warning-actions{display:flex;gap:6px;flex:0 0 auto}
    .incomplete-tag{display:inline-flex;align-items:center;gap:5px;border:1px solid #f0cf83;background:#fff7dc;color:#8a5a00;padding:4px 7px;border-radius:999px;font-size:8px;font-weight:800;margin-top:5px}
    .migration-note{font-size:8px;color:#8b94a6;margin-top:4px}.transition-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin:14px 0 18px}
    .transition-kpi{border:1px solid var(--line);background:#fff;border-radius:14px;padding:13px}.transition-kpi span{display:block;color:var(--muted);font-size:8px;text-transform:uppercase;letter-spacing:.05em}.transition-kpi strong{display:block;font-size:20px;margin-top:5px}
    .gas-status{display:inline-flex;padding:4px 7px;border-radius:999px;font-size:8px;font-weight:800}.gas-status.good{background:#eaf8ef;color:#217a43}.gas-status.warn{background:#fff5d7;color:#8b6300}.gas-status.bad{background:#ffe8e8;color:#b52e2e}.gas-status.muted{background:#f1f3f6;color:#717a89}
    .transition-dashboard{margin:18px 0}.transition-dashboard .panel-body{padding-top:14px}
    @media(max-width:900px){.transition-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.transition-warning{align-items:flex-start;flex-direction:column}.transition-warning-actions{width:100%;flex-wrap:wrap}}
  `;
  document.head.appendChild(style);

  const todayIso = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const dateDiff = v => {
    if (!v) return null;
    const a = new Date(); a.setHours(0,0,0,0);
    const b = new Date(`${v}T00:00:00`);
    if (Number.isNaN(b.getTime())) return null;
    return Math.ceil((b-a)/86400000);
  };
  const addMonthsIso = (isoDate, months) => {
    const d = new Date(`${isoDate}T12:00:00`);
    const originalDay = d.getDate();
    d.setDate(1); d.setMonth(d.getMonth()+Number(months||0));
    const maxDay = new Date(d.getFullYear(), d.getMonth()+1, 0).getDate();
    d.setDate(Math.min(originalDay,maxDay));
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const addYearsIso = (isoDate, years) => addMonthsIso(isoDate, Number(years||0)*12);
  const recurrenceLabel = m => {
    const months=Number(m.recurrenceMonths||m.recurrence_months||0);
    const labels={1:'Mensal',2:'Bimestral',3:'Trimestral',4:'Quadrimestral',6:'Semestral',12:'Anual',24:'Bienal',36:'Trienal',60:'Quinquenal',120:'Decenal'};
    if(months&&labels[months])return labels[months];
    if(months)return `A cada ${months} meses`;
    const map={none:'Única',weekly:'Semanal',monthly:'Mensal',bimonthly:'Bimestral',quarterly:'Trimestral',semiannual:'Semestral',annual:'Anual',custom:'Personalizada'};
    return map[m.recurrence]||m.recurrence||'Única';
  };
  const priorityPt = p => ({low:'Baixa',normal:'Média',high:'Alta',urgent:'Urgente'})[p]||p;
  const taskStatusPt = s => ({pending:'Pendente',in_progress:'Em andamento',done:'Concluída',cancelled:'Cancelada'})[s]||s;

  async function currentUser(){ return (await transitionDb.auth.getSession()).data.session?.user || null; }

  async function loadTransitionOperations(cid=null){
    let mq=transitionDb.from('maintenances').select('id,client_ref,condominium_id,title,category,supplier,responsible,next_date,recurrence,status,priority,reminders,notes,last_completed_at,recurrence_months,source_label,is_incomplete,incomplete_reason').order('next_date',{ascending:true,nullsFirst:false});
    let tq=transitionDb.from('tasks').select('id,client_ref,condominium_id,title,description,due_date,recurrence,status,priority,reminders,responsible,completed_at,source_label,is_incomplete,incomplete_reason').order('due_date',{ascending:true});
    if(cid){mq=mq.eq('condominium_id',cid);tq=tq.eq('condominium_id',cid)}
    const [mr,tr]=await Promise.all([mq,tq]);
    if(!mr.error){
      const mapped=(mr.data||[]).map(x=>({id:x.id,clientRef:x.client_ref||'',condoId:x.condominium_id,title:x.title,category:x.category||'',supplier:x.supplier||'',responsible:x.responsible||'',nextDate:x.next_date,recurrence:x.recurrence,status:x.status,priority:x.priority,reminders:x.reminders||[2],notes:x.notes||'',lastCompletedAt:x.last_completed_at,recurrenceMonths:x.recurrence_months,sourceLabel:x.source_label||'',isIncomplete:!!x.is_incomplete,incompleteReason:x.incomplete_reason||''}));
      if(cid)data.maintenances=[...(data.maintenances||[]).filter(x=>x.condoId!==cid),...mapped]; else data.maintenances=mapped;
    }
    if(!tr.error){
      const mapped=(tr.data||[]).map(x=>({id:x.id,clientRef:x.client_ref||'',condoId:x.condominium_id,title:x.title,description:x.description||'',dueDate:x.due_date,recurrence:x.recurrence,status:x.status,priority:x.priority,reminders:x.reminders||[2],responsible:x.responsible||'',completedAt:x.completed_at,sourceLabel:x.source_label||'',isIncomplete:!!x.is_incomplete,incompleteReason:x.incomplete_reason||''}));
      if(cid)data.tasks=[...(data.tasks||[]).filter(x=>x.condoId!==cid),...mapped]; else data.tasks=mapped;
    }
  }

  async function getWarnings(cid){
    let q=transitionDb.from('data_quality_warnings').select('*').is('resolved_at',null).order('severity',{ascending:false}).order('created_at');
    if(cid)q=q.eq('condominium_id',cid);
    const {data:rows,error}=await q; if(error){console.warn(error);return []} return rows||[];
  }

  function warningActions(w){
    if(w.warning_code==='legacy_missing_registration') return `<button class="btn btn-soft" onclick="openLegacyCondoData('${w.condominium_id}')">Completar cadastro</button>`;
    if(w.warning_code==='legacy_gas_missing_dates') return `<a class="btn btn-soft" href="#/condominio/${w.condominium_id}/gas">Abrir gás</a>`;
    if(w.warning_code==='legacy_maintenance_incomplete') return `<a class="btn btn-soft" href="#/condominio/${w.condominium_id}/manutencoes">Revisar preventivas</a>`;
    return `<button class="btn btn-soft" onclick="resolveTransitionWarning('${w.id}')">Marcar conferido</button>`;
  }
  function warningBanner(rows){
    if(!rows.length)return '';
    return `<section class="transition-banner"><div class="transition-icon">⚠️</div><div style="flex:1"><h3>Dados migrados que precisam de revisão</h3><p>Nada foi descartado. O que estava incompleto na planilha antiga foi preservado e sinalizado aqui.</p><div class="transition-warning-list">${rows.map(w=>`<div class="transition-warning"><span>${esc(w.message)}</span><div class="transition-warning-actions">${warningActions(w)}</div></div>`).join('')}</div></div></section>`;
  }
  async function injectWarnings(cid){
    const rows=await getWarnings(cid); if(!rows.length)return;
    const top=$('.main .topbar'); if(top)top.insertAdjacentHTML('afterend',warningBanner(rows));
  }

  window.resolveTransitionWarning=async id=>{
    const {error}=await transitionDb.from('data_quality_warnings').update({resolved_at:new Date().toISOString()}).eq('id',id);
    if(error)return flash(error.message); flash('Aviso marcado como conferido.'); route();
  };

  const baseShell = shell;
  shell = function(content,active='dashboard',cid=null){
    let html=baseShell(content,active,cid);
    if(cid){
      const needle=`<a href="#/condominio/${cid}/arquivos"`;
      const gas=`<a href="#/condominio/${cid}/gas" class="${active==='condo-gas'?'active':''}"><span>🔥</span>Gás</a>`;
      html=html.replace(needle,gas+needle);
    }
    return html;
  };

  urgency = function(m){
    if(m.status==='done')return{level:'good',label:'Concluída'};
    if(!m.nextDate)return{level:'warn',label:'Sem próxima data'};
    const n=dateDiff(m.nextDate);
    if(n===null)return{level:'warn',label:'Data inválida'};
    if(n<0)return{level:'bad',label:`Vencida há ${Math.abs(n)} dia${Math.abs(n)===1?'':'s'}`};
    if(n===0)return{level:'bad',label:'Hoje'}; if(n===1)return{level:'bad',label:'Amanhã'};
    if(n<=2)return{level:'warn',label:`Em ${n} dias`}; if(n<=7)return{level:'attention',label:`Em ${n} dias`};
    return{level:'good',label:`Em ${n} dias`};
  };

  maintenanceTable = function(list){
    if(!list.length)return'<div class="empty">Nenhuma manutenção cadastrada.</div>';
    return `<div class="table-wrap"><table class="table"><thead><tr><th>Manutenção</th><th>Condomínio</th><th>Última</th><th>Próxima</th><th>Periodicidade</th><th>Prestador / responsável</th><th>Status</th><th>Ações</th></tr></thead><tbody>${list.map(m=>{const u=urgency(m);return `<tr><td><strong>${esc(m.title)}</strong><div class="list-sub">${esc(m.category||'Preventiva')}</div>${m.isIncomplete?`<span class="incomplete-tag">⚠ Cadastro incompleto: ${esc(m.incompleteReason||'revisar dados')}</span>`:''}${m.sourceLabel?'<div class="migration-note">Importado da planilha anterior</div>':''}</td><td>${esc(condo(m.condoId)?.name||'Condomínio')}</td><td>${m.lastCompletedAt?br(m.lastCompletedAt):'<span class="muted">Não informada</span>'}</td><td>${m.nextDate?br(m.nextDate):'<span class="badge warn">Sem data</span>'}</td><td>${esc(recurrenceLabel(m))}</td><td><strong>${esc(m.supplier||'Sem prestador')}</strong><div class="list-sub">${esc(m.responsible||'Sem responsável')}</div></td><td><span class="badge ${u.level}">${esc(u.label)}</span></td><td><div class="row-actions"><button class="btn btn-soft" onclick="openMaintenanceEdit('${m.id}','${m.condoId}')">Editar</button><button class="btn" onclick="completeMaintenance('${m.id}')">Concluir</button></div></td></tr>`}).join('')}</tbody></table></div>`;
  };

  maintenancesPage = async function(cid=null){
    await loadTransitionOperations(cid);
    const list=(data.maintenances||[]).filter(m=>!cid||m.condoId===cid).sort((a,b)=>{if(!a.nextDate)return 1;if(!b.nextDate)return-1;return a.nextDate.localeCompare(b.nextDate)});
    const c=cid?condo(cid):null;
    const incomplete=list.filter(x=>x.isIncomplete).length, noDate=list.filter(x=>!x.nextDate).length;
    $('#app').innerHTML=shell(`${topbar('Manutenções',c?`Preventivas e manutenções de ${esc(c.name)}.`:'Controle consolidado das manutenções.','Operação',`<button class="btn btn-primary" onclick="openMaintenanceModal('${cid||''}')">+ Nova manutenção</button>`)}<div class="transition-kpis"><div class="transition-kpi"><span>Total</span><strong>${list.length}</strong></div><div class="transition-kpi"><span>Cadastros incompletos</span><strong>${incomplete}</strong></div><div class="transition-kpi"><span>Sem próxima data</span><strong>${noDate}</strong></div><div class="transition-kpi"><span>Até 30 dias</span><strong>${list.filter(x=>{const n=dateDiff(x.nextDate);return n!==null&&n>=0&&n<=30}).length}</strong></div><div class="transition-kpi"><span>Atrasadas</span><strong>${list.filter(x=>{const n=dateDiff(x.nextDate);return n!==null&&n<0}).length}</strong></div></div><article class="panel"><div class="panel-head"><div><h2>Agenda preventiva</h2><div class="muted small">Registros incompletos continuam visíveis até serem revisados.</div></div></div><div class="panel-body">${maintenanceTable(list)}</div></article>`,cid?'condo-maintenance':'maintenance',cid);
    if(cid)await injectWarnings(cid);
  };

  tasksTable = function(list){
    if(!list.length)return'<div class="empty">Nenhuma tarefa cadastrada.</div>';
    return `<div class="table-wrap"><table class="table"><thead><tr><th>Pendência / tarefa</th><th>Condomínio</th><th>Responsável</th><th>Prazo</th><th>Prioridade</th><th>Status</th><th></th></tr></thead><tbody>${list.map(t=>{const n=dateDiff(t.dueDate),late=n!==null&&n<0&&!['done','cancelled'].includes(t.status);return `<tr><td><strong>${esc(t.title)}</strong><div class="list-sub">${esc((t.description||'').split('\n')[0])}</div>${t.sourceLabel?'<div class="migration-note">Importado da planilha anterior</div>':''}</td><td>${esc(condo(t.condoId)?.name||'Condomínio')}</td><td>${esc(t.responsible||'Síndico')}</td><td>${br(t.dueDate)} ${late?'<span class="badge bad">Atrasada</span>':''}</td><td>${esc(priorityPt(t.priority))}</td><td>${esc(taskStatusPt(t.status))}</td><td>${t.status!=='done'?`<button class="btn" onclick="completeTask('${t.id}')">Concluir</button>`:''}</td></tr>`}).join('')}</tbody></table></div>`;
  };

  tasksPage = async function(cid=null){
    await loadTransitionOperations(cid);
    const list=(data.tasks||[]).filter(t=>!cid||t.condoId===cid).sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999'));
    const c=cid?condo(cid):null;
    const pending=list.filter(x=>x.status==='pending').length,inProgress=list.filter(x=>x.status==='in_progress').length,late=list.filter(x=>{const n=dateDiff(x.dueDate);return n!==null&&n<0&&!['done','cancelled'].includes(x.status)}).length;
    $('#app').innerHTML=shell(`${topbar('Tarefas',c?`Rotinas e pendências de ${esc(c.name)}.`:'Tarefas e pendências de todos os condomínios.','Operação',`<button class="btn btn-primary" onclick="openTaskModal('${cid||''}')">+ Nova tarefa</button>`)}<div class="transition-kpis"><div class="transition-kpi"><span>Total</span><strong>${list.length}</strong></div><div class="transition-kpi"><span>Pendentes</span><strong>${pending}</strong></div><div class="transition-kpi"><span>Em andamento</span><strong>${inProgress}</strong></div><div class="transition-kpi"><span>Atrasadas</span><strong>${late}</strong></div><div class="transition-kpi"><span>Concluídas</span><strong>${list.filter(x=>x.status==='done').length}</strong></div></div><article class="panel"><div class="panel-head"><h2>Pendências e tarefas</h2></div><div class="panel-body">${tasksTable(list)}</div></article>`,cid?'condo-tasks':'tasks',cid);
    if(cid)await injectWarnings(cid);
  };

  function monthOptions(selected){
    return [[1,'Mensal'],[2,'Bimestral'],[3,'Trimestral'],[4,'Quadrimestral'],[6,'Semestral'],[12,'Anual'],[24,'Bienal'],[36,'Trienal'],[60,'Quinquenal'],[120,'Decenal']].map(([v,l])=>`<option value="${v}" ${Number(selected)===v?'selected':''}>${l}</option>`).join('');
  }
  function recFromMonths(m){return ({1:'monthly',2:'bimonthly',3:'quarterly',6:'semiannual',12:'annual'})[Number(m)]||'custom'}

  window.openMaintenanceEdit=async function(id,cid){
    const {data:m,error}=await transitionDb.from('maintenances').select('*').eq('id',id).single(); if(error)return flash(error.message);
    modal(`<div class="eyebrow">Revisar preventiva</div><h2 style="margin-bottom:16px">${esc(m.title)}</h2>${m.is_incomplete?`<div class="transition-banner"><div class="transition-icon">⚠️</div><div><h3>Cadastro incompleto</h3><p>${esc(m.incomplete_reason||'Revise os campos abaixo.')}</p></div></div>`:''}<form id="legacy-maint-edit" class="form-grid"><div class="field full"><label>Serviço</label><input name="title" required value="${esc(m.title)}"></div><div class="field"><label>Responsável</label><input name="responsible" value="${esc(m.responsible||'')}"></div><div class="field"><label>Empresa / prestador</label><input name="supplier" value="${esc(m.supplier||'')}"></div><div class="field"><label>Última realizada</label><input name="last" type="date" value="${m.last_completed_at||''}"></div><div class="field"><label>Próxima manutenção</label><input name="next" type="date" value="${m.next_date||''}"></div><div class="field"><label>Periodicidade</label><select name="months">${monthOptions(m.recurrence_months||12)}</select></div><div class="field full"><label>Observações</label><textarea name="notes">${esc(m.notes||'')}</textarea></div><div class="field full"><button class="btn btn-primary">Salvar revisão</button></div></form>`);
    $('#legacy-maint-edit').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),b=e.target.querySelector('button');b.disabled=true;const responsible=String(f.get('responsible')).trim(),supplier=String(f.get('supplier')).trim(),next=f.get('next')||null,missing=[];if(!responsible)missing.push('responsável');if(!supplier)missing.push('empresa/prestador');if(!next)missing.push('próxima data');const months=Number(f.get('months'));const payload={title:String(f.get('title')).trim(),responsible:responsible||null,supplier:supplier||null,last_completed_at:f.get('last')||null,next_date:next,recurrence_months:months,recurrence:recFromMonths(months),notes:String(f.get('notes')).trim()||null,is_incomplete:missing.length>0,incomplete_reason:missing.length?missing.join(', '):null};const {error:up}=await transitionDb.from('maintenances').update(payload).eq('id',id);if(up){b.disabled=false;return flash(up.message)}await refreshMaintenanceWarning(cid);closeModal();flash('Preventiva atualizada.');maintenancesPage(cid)};
  };

  window.completeMaintenance=async function(id){
    const {data:m,error}=await transitionDb.from('maintenances').select('*').eq('id',id).single(); if(error)return flash(error.message);
    const done=todayIso(),months=Number(m.recurrence_months||0),patch={last_completed_at:done};
    if(months>0){patch.next_date=addMonthsIso(done,months);patch.status='scheduled'}else if(m.recurrence&&m.recurrence!=='none'){const map={weekly:0,monthly:1,bimonthly:2,quarterly:3,semiannual:6,annual:12};if(m.recurrence==='weekly'){const d=new Date(`${done}T12:00:00`);d.setDate(d.getDate()+7);patch.next_date=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}else patch.next_date=addMonthsIso(done,map[m.recurrence]||1);patch.status='scheduled'}else patch.status='done';
    const missing=[];if(!m.responsible)missing.push('responsável');if(!m.supplier)missing.push('empresa/prestador');if(!patch.next_date&&patch.status!=='done')missing.push('próxima data');patch.is_incomplete=missing.length>0;patch.incomplete_reason=missing.length?missing.join(', '):null;
    const {error:up}=await transitionDb.from('maintenances').update(patch).eq('id',id);if(up)return flash(up.message);await refreshMaintenanceWarning(m.condominium_id);flash('Manutenção concluída e próxima data calculada.');route();
  };

  async function refreshMaintenanceWarning(cid){
    const {count}=await transitionDb.from('maintenances').select('*',{count:'exact',head:true}).eq('condominium_id',cid).eq('is_incomplete',true);
    const {data:w}=await transitionDb.from('data_quality_warnings').select('id').eq('condominium_id',cid).eq('warning_code','legacy_maintenance_incomplete').maybeSingle();
    if(w){await transitionDb.from('data_quality_warnings').update({message:count?`${count} manutenções preventivas ainda precisam de revisão.`:'Todas as preventivas migradas foram revisadas.',resolved_at:count?null:new Date().toISOString()}).eq('id',w.id)}
  }
  async function refreshGasWarning(cid){
    const {count}=await transitionDb.from('gas_controls').select('*',{count:'exact',head:true}).eq('condominium_id',cid).eq('is_incomplete',true);
    const {data:w}=await transitionDb.from('data_quality_warnings').select('id').eq('condominium_id',cid).eq('warning_code','legacy_gas_missing_dates').maybeSingle();
    if(w){await transitionDb.from('data_quality_warnings').update({message:count?`${count} unidades ainda estão sem datas completas de medidor/válvula de gás.`:'Todas as datas de gás foram revisadas.',resolved_at:count?null:new Date().toISOString()}).eq('id',w.id)}
  }

  function gasSituation(next){const n=dateDiff(next);if(n===null)return{label:'Sem data',cls:'muted'};if(n<0)return{label:'Vencido',cls:'bad'};if(n<=365)return{label:'Vence em até 12 meses',cls:'warn'};return{label:'Em dia',cls:'good'}}
  window.gasPage=async function(cid){
    const c=condo(cid);if(!c)return location.hash='#/';
    const {data:rows,error}=await transitionDb.from('gas_controls').select('*').eq('condominium_id',cid).order('unit_label');if(error)return flash(error.message);
    const all=rows||[],incomplete=all.filter(x=>x.is_incomplete).length,meterExpired=all.filter(x=>{const n=dateDiff(x.meter_next_replacement_at);return n!==null&&n<0}).length,valveExpired=all.filter(x=>{const n=dateDiff(x.valve_next_replacement_at);return n!==null&&n<0}).length;
    const table=all.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Unidade</th><th>Medidor: última</th><th>Medidor: próxima</th><th>Status</th><th>Válvula: última</th><th>Válvula: próxima</th><th>Status</th><th></th></tr></thead><tbody>${all.map(x=>{const ms=gasSituation(x.meter_next_replacement_at),vs=gasSituation(x.valve_next_replacement_at);return `<tr><td><strong>${esc(x.unit_label)}</strong>${x.is_incomplete?'<div class="incomplete-tag">⚠ Cadastro incompleto</div>':''}</td><td>${x.meter_last_replaced_at?br(x.meter_last_replaced_at):'Não informada'}</td><td>${x.meter_next_replacement_at?br(x.meter_next_replacement_at):'Não informada'}</td><td><span class="gas-status ${ms.cls}">${ms.label}</span></td><td>${x.valve_last_replaced_at?br(x.valve_last_replaced_at):'Não informada'}</td><td>${x.valve_next_replacement_at?br(x.valve_next_replacement_at):'Não informada'}</td><td><span class="gas-status ${vs.cls}">${vs.label}</span></td><td><button class="btn btn-soft" onclick="openGasEdit('${x.id}','${cid}')">Editar</button></td></tr>`}).join('')}</tbody></table></div>`:'<div class="empty">Nenhuma unidade no controle de gás.</div>';
    $('#app').innerHTML=shell(`${topbar('Gás',`${esc(c.name)} • medidores (10 anos) e válvulas (5 anos).`,'Segurança e manutenção')}<div class="transition-kpis"><div class="transition-kpi"><span>Unidades</span><strong>${all.length}</strong></div><div class="transition-kpi"><span>Cadastros incompletos</span><strong>${incomplete}</strong></div><div class="transition-kpi"><span>Medidores vencidos</span><strong>${meterExpired}</strong></div><div class="transition-kpi"><span>Válvulas vencidas</span><strong>${valveExpired}</strong></div><div class="transition-kpi"><span>Com dados completos</span><strong>${all.length-incomplete}</strong></div></div><article class="panel"><div class="panel-head"><div><h2>Medidores e válvulas por unidade</h2><div class="muted small">Ao informar a última troca, o sistema calcula automaticamente a próxima.</div></div></div><div class="panel-body">${table}</div></article>`,'condo-gas',cid);
    await injectWarnings(cid);
  };

  window.openGasEdit=async function(id,cid){
    const {data:g,error}=await transitionDb.from('gas_controls').select('*').eq('id',id).single();if(error)return flash(error.message);
    modal(`<div class="eyebrow">Controle de gás</div><h2 style="margin-bottom:16px">Unidade ${esc(g.unit_label)}</h2><form id="gas-edit-form" class="form-grid"><div class="field"><label>Última troca do medidor</label><input name="meterLast" type="date" value="${g.meter_last_replaced_at||''}"></div><div class="field"><label>Próxima troca do medidor</label><input name="meterNext" type="date" value="${g.meter_next_replacement_at||''}"></div><div class="field"><label>Última troca da válvula</label><input name="valveLast" type="date" value="${g.valve_last_replaced_at||''}"></div><div class="field"><label>Próxima troca da válvula</label><input name="valveNext" type="date" value="${g.valve_next_replacement_at||''}"></div><div class="field full"><label>Observações</label><textarea name="notes">${esc(g.notes||'')}</textarea></div><div class="field full"><button class="btn btn-primary">Salvar</button></div></form>`);
    $('#gas-edit-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),b=e.target.querySelector('button');b.disabled=true;const ml=f.get('meterLast')||null,vl=f.get('valveLast')||null,mn=f.get('meterNext')|| (ml?addYearsIso(ml,10):null),vn=f.get('valveNext')||(vl?addYearsIso(vl,5):null),missing=[];if(!ml||!mn)missing.push('medidor');if(!vl||!vn)missing.push('válvula');const {error:up}=await transitionDb.from('gas_controls').update({meter_last_replaced_at:ml,meter_next_replacement_at:mn,valve_last_replaced_at:vl,valve_next_replacement_at:vn,notes:String(f.get('notes')).trim()||null,is_incomplete:missing.length>0,incomplete_reason:missing.length?`Dados incompletos de ${missing.join(' e ')}.`:null}).eq('id',id);if(up){b.disabled=false;return flash(up.message)}await refreshGasWarning(cid);closeModal();flash('Controle de gás atualizado.');gasPage(cid)};
  };

  window.openLegacyCondoData=async function(cid){
    const {data:c,error}=await transitionDb.from('condominiums').select('*').eq('id',cid).single();if(error)return flash(error.message);
    modal(`<div class="eyebrow">Completar cadastro</div><h2 style="margin-bottom:16px">${esc(c.name)}</h2><form id="legacy-condo-data" class="form-grid"><div class="field full"><label>Endereço</label><input name="address" value="${esc(c.address_line||'')}"></div><div class="field"><label>CNPJ</label><input name="cnpj" value="${esc(c.cnpj||'')}"></div><div class="field"><label>Telefone</label><input name="phone" value="${esc(c.phone||'')}"></div><div class="field full"><label>E-mail administrativo</label><input name="email" type="email" value="${esc(c.email||'')}"></div><div class="field full"><button class="btn btn-primary">Salvar cadastro</button></div></form>`);
    $('#legacy-condo-data').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),b=e.target.querySelector('button');b.disabled=true;const patch={address_line:String(f.get('address')).trim()||null,cnpj:String(f.get('cnpj')).trim()||null,phone:String(f.get('phone')).trim()||null,email:String(f.get('email')).trim()||null};const {error:up}=await transitionDb.from('condominiums').update(patch).eq('id',cid);if(up){b.disabled=false;return flash(up.message)}const complete=patch.address_line&&patch.cnpj&&patch.phone&&patch.email;if(complete)await transitionDb.from('data_quality_warnings').update({resolved_at:new Date().toISOString()}).eq('condominium_id',cid).eq('warning_code','legacy_missing_registration');const local=condo(cid);if(local){local.address=patch.address_line||'';local.cnpj=patch.cnpj||'';local.phone=patch.phone||'';local.email=patch.email||'';save(data)}closeModal();flash(complete?'Cadastro completado.':'Dados salvos. Alguns campos ainda estão pendentes.');route()};
  };

  const baseCondoOverview=condoOverview;
  condoOverview=async function(id){await loadTransitionOperations(id);baseCondoOverview(id);await injectWarnings(id);const hero=$('.workspace-hero');if(hero)hero.insertAdjacentHTML('afterend',`<div style="margin:0 0 14px"><a class="btn btn-soft" href="#/condominio/${id}/gas">🔥 Abrir controle de gás</a></div>`)};

  const baseDashboard=dashboard;
  dashboard=async function(){
    await loadTransitionOperations();baseDashboard();
    const [gas,warnings]=await Promise.all([
      transitionDb.from('gas_controls').select('id,is_incomplete,meter_next_replacement_at,valve_next_replacement_at'),
      getWarnings(null)
    ]);
    const ms=data.maintenances||[],ts=data.tasks||[],g=gas.data||[];
    const noDate=ms.filter(x=>!x.nextDate).length,within90=ms.filter(x=>{const n=dateDiff(x.nextDate);return n!==null&&n>=0&&n<=90}).length,lateTasks=ts.filter(x=>{const n=dateDiff(x.dueDate);return n!==null&&n<0&&!['done','cancelled'].includes(x.status)}).length;
    const panel=`<section class="transition-dashboard"><article class="panel"><div class="panel-head"><div><h2>Transição da planilha</h2><div class="muted small">Visão consolidada dos dados que vieram do controle anterior.</div></div></div><div class="panel-body"><div class="transition-kpis"><div class="transition-kpi"><span>Preventivas</span><strong>${ms.length}</strong></div><div class="transition-kpi"><span>Até 90 dias</span><strong>${within90}</strong></div><div class="transition-kpi"><span>Preventivas sem data</span><strong>${noDate}</strong></div><div class="transition-kpi"><span>Pendências atrasadas</span><strong>${lateTasks}</strong></div><div class="transition-kpi"><span>Gás sem datas</span><strong>${g.filter(x=>x.is_incomplete).length}</strong></div></div>${warnings.length?`<div class="transition-banner" style="margin-bottom:0"><div class="transition-icon">⚠️</div><div><h3>${warnings.length} avisos de revisão</h3><p>Abra cada condomínio para revisar os cadastros incompletos encontrados durante a migração.</p></div></div>`:''}</div></article></section>`;
    const metrics=$('.main .metrics');if(metrics)metrics.insertAdjacentHTML('afterend',panel);
  };

  function handleGasRoute(){
    const p=(location.hash||'#/').replace(/^#\//,'').split('/').filter(Boolean);
    if(p[0]==='condominio'&&p[2]==='gas')setTimeout(()=>gasPage(p[1]),0);
  }
  window.addEventListener('hashchange',handleGasRoute);
  setTimeout(handleGasRoute,900);
})();