(() => {
  'use strict';
  if (!window.supabase || typeof shell !== 'function') return;

  const client=window.supabase.createClient('https://tckvzlizcqdxzgavjwie.supabase.co','sb_publishable_MRtiWP-ErwVKXqNbGFrW_g_FwEHsob3');
  const safe=s=>typeof esc==='function'?esc(s):String(s??'');
  const brl=c=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format((Number(c)||0)/100);
  const date=v=>v?new Intl.DateTimeFormat('pt-BR').format(new Date(`${String(v).slice(0,10)}T12:00:00`)):'Sem data';
  const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  const firstDay=()=>today().slice(0,7)+'-01';
  const accessIds=()=>[...new Set((window.CondoAccess?.getSnapshot()?.memberships||[]).map(x=>x.condominium_id).filter(Boolean))];
  const canFinance=cid=>Boolean(window.CondoAccess?.can('finance.review',cid));
  const openCall=x=>!['resolved','cancelled'].includes(x.status);
  const activeMaintenance=x=>!['done','cancelled'].includes(x.status);
  const daysUntil=iso=>{if(!iso)return null;const a=new Date();a.setHours(0,0,0,0);const b=new Date(`${String(iso).slice(0,10)}T00:00:00`);return Math.ceil((b-a)/86400000)};

  async function rows(table,select,ids){
    if(!ids.length)return [];
    const {data,error}=await client.from(table).select(select).in('condominium_id',ids);
    if(error)throw error;return data||[];
  }
  async function condos(ids){
    if(!ids.length)return [];
    const {data,error}=await client.from('condominiums').select('id,name,address_line,city,state').in('id',ids);
    if(error)throw error;return data||[];
  }
  async function scope(cid=null){
    const ids=cid?[cid]:accessIds();
    const financeIds=ids.filter(canFinance);
    const [c,calls,maint,occ,docs,assemblies,ann,units,finance]=await Promise.all([
      condos(ids),
      rows('service_requests','id,condominium_id,title,priority,status,created_at,updated_at',ids),
      rows('maintenances','id,condominium_id,title,next_date,status,priority,last_completed_at',ids),
      rows('maintenance_occurrences','id,condominium_id,maintenance_id,scheduled_for,completed_at,completion_type',ids),
      rows('documents','id,condominium_id,title,category,expiry_date,visibility',ids),
      rows('assemblies','id,condominium_id,title,scheduled_at,status,location',ids),
      rows('announcements','id,condominium_id,title,priority,published_at,expires_at',ids),
      rows('units','id,condominium_id',ids),
      financeIds.length?rows('finance_transactions','id,condominium_id,kind,description,due_date,competence_month,expected_amount_cents,paid_amount_cents,status,paid_date,counterparty',financeIds):Promise.resolve([])
    ]);
    return {ids,financeIds,condos:c,calls,maint,occ,docs,assemblies,ann,units,finance};
  }
  function financeStats(data){
    const valid=data.filter(x=>x.status!=='cancelled');
    const received=valid.filter(x=>x.kind==='income').reduce((s,x)=>s+Number(x.paid_amount_cents||0),0);
    const paid=valid.filter(x=>x.kind==='expense').reduce((s,x)=>s+Number(x.paid_amount_cents||0),0);
    const overdue=valid.filter(x=>x.status!=='paid'&&x.due_date&&daysUntil(x.due_date)<0).reduce((s,x)=>s+Math.max(0,Number(x.expected_amount_cents||0)-Number(x.paid_amount_cents||0)),0);
    return {received,paid,balance:received-paid,overdue};
  }
  function cards(d){
    const names=new Map(d.condos.map(x=>[x.id,x.name]));
    return d.ids.map(cid=>{
      const calls=d.calls.filter(x=>x.condominium_id===cid&&openCall(x)).length;
      const maint=d.maint.filter(x=>x.condominium_id===cid&&activeMaintenance(x)&&daysUntil(x.next_date)!==null&&daysUntil(x.next_date)<=7).length;
      const docs=d.docs.filter(x=>x.condominium_id===cid&&x.expiry_date&&daysUntil(x.expiry_date)!==null&&daysUntil(x.expiry_date)<=30).length;
      const units=d.units.filter(x=>x.condominium_id===cid).length;
      const fs=financeStats(d.finance.filter(x=>x.condominium_id===cid));
      return `<a class="condo-card" href="#/condominio/${cid}"><div class="condo-top"><div class="condo-id"><div class="building">🏢</div><div><strong>${safe(names.get(cid)||'Condomínio')}</strong><small>${units} unidade(s)</small></div></div></div><div class="mini-stats"><div class="mini"><strong>${calls}</strong><span>Chamados</span></div><div class="mini"><strong>${maint}</strong><span>Manut. 7d</span></div><div class="mini"><strong>${docs}</strong><span>Docs 30d</span></div></div>${canFinance(cid)?`<div class="muted small" style="margin-top:10px">Saldo realizado: <strong>${brl(fs.balance)}</strong></div>`:''}</a>`;
    }).join('');
  }
  function attention(d){
    const names=new Map(d.condos.map(x=>[x.id,x.name])),list=[];
    d.maint.filter(activeMaintenance).forEach(x=>{const n=daysUntil(x.next_date);if(n!==null&&n<=7)list.push({rank:n<0?0:1,title:x.title,meta:`Manutenção • ${names.get(x.condominium_id)||'Condomínio'} • ${date(x.next_date)}`,label:n<0?'Vencida':n===0?'Hoje':`Em ${n}d`,href:`#/condominio/${x.condominium_id}/manutencoes`})});
    d.calls.filter(openCall).filter(x=>['urgent','high'].includes(x.priority)).forEach(x=>list.push({rank:x.priority==='urgent'?0:1,title:x.title,meta:`Chamado • ${names.get(x.condominium_id)||'Condomínio'}`,label:x.priority==='urgent'?'Urgente':'Alta prioridade',href:`#/condominio/${x.condominium_id}/chamados`}));
    d.docs.filter(x=>x.expiry_date).forEach(x=>{const n=daysUntil(x.expiry_date);if(n!==null&&n<=30)list.push({rank:n<0?0:2,title:x.title,meta:`Documento • ${names.get(x.condominium_id)||'Condomínio'} • ${date(x.expiry_date)}`,label:n<0?'Vencido':`Em ${n}d`,href:`#/condominio/${x.condominium_id}/documentos`})});
    d.finance.filter(x=>x.status!=='paid'&&x.status!=='cancelled'&&x.due_date&&daysUntil(x.due_date)<0).forEach(x=>list.push({rank:0,title:x.description,meta:`Financeiro • ${names.get(x.condominium_id)||'Condomínio'} • ${date(x.due_date)}`,label:'Vencido',href:`#/condominio/${x.condominium_id}/financeiro`}));
    return list.sort((a,b)=>a.rank-b.rank).slice(0,10);
  }

  async function dashboard(){
    if(!window.CondoAccess?.hasAnyManagementRole())return;
    $('#app').innerHTML=shell(`${topbar('Visão geral','Carregando indicadores da sua gestão.','Painel de Gestão','<button class="btn" onclick="location.hash=\'#/relatorios\'">Relatórios</button>')}<article class="panel"><div class="panel-body"><div class="empty">Carregando dashboard...</div></div></article>`,'dashboard');
    try{
      const d=await scope(),fs=financeStats(d.finance),alerts=attention(d);
      const open=d.calls.filter(openCall).length;
      const maint7=d.maint.filter(x=>activeMaintenance(x)&&daysUntil(x.next_date)!==null&&daysUntil(x.next_date)<=7).length;
      const overdueMaint=d.maint.filter(x=>activeMaintenance(x)&&daysUntil(x.next_date)!==null&&daysUntil(x.next_date)<0).length;
      const docs30=d.docs.filter(x=>x.expiry_date&&daysUntil(x.expiry_date)!==null&&daysUntil(x.expiry_date)<=30).length;
      const asm=d.assemblies.filter(x=>!['held','cancelled'].includes(x.status)&&new Date(x.scheduled_at)>=new Date()).length;
      const alertHtml=alerts.length?alerts.map(x=>`<a class="alert-card ${x.rank===0?'critical':x.rank===1?'soon':'watch'}" href="${x.href}" style="display:block;text-decoration:none"><div class="alert-head"><div><strong>${safe(x.title)}</strong><p>${safe(x.meta)}</p></div><span class="badge ${x.rank===0?'bad':x.rank===1?'warn':'attention'}">${safe(x.label)}</span></div></a>`).join(''):'<div class="empty">Nenhuma pendência crítica encontrada.</div>';
      const financeMetric=d.financeIds.length?`<article class="metric"><div class="metric-top"><div><span>Saldo realizado</span><strong>${brl(fs.balance)}</strong><small>${d.financeIds.length===d.ids.length?'Todos os condomínios':'Somente autorizados'}</small></div><div class="icon green">$</div></div></article>`:'';
      $('#app').innerHTML=shell(`${topbar('Visão geral','Indicadores consolidados da operação.','Painel de Gestão','<button class="btn" onclick="location.hash=\'#/relatorios\'">Relatórios</button>')}<section class="metrics"><article class="metric"><div class="metric-top"><div><span>Condomínios</span><strong>${d.ids.length}</strong><small>${d.units.length} unidades</small></div><div class="icon blue">🏢</div></div></article><article class="metric"><div class="metric-top"><div><span>Chamados abertos</span><strong>${open}</strong></div><div class="icon orange">🎫</div></div></article><article class="metric"><div class="metric-top"><div><span>Manutenções em 7 dias</span><strong>${maint7}</strong><small>${overdueMaint} vencida(s)</small></div><div class="icon red">⚒</div></div></article><article class="metric"><div class="metric-top"><div><span>Documentos em 30 dias</span><strong>${docs30}</strong></div><div class="icon orange">📄</div></div></article>${financeMetric}<article class="metric"><div class="metric-top"><div><span>Assembleias futuras</span><strong>${asm}</strong></div><div class="icon blue">🏛️</div></div></article></section><section class="grid-2" style="margin-top:18px"><article class="panel"><div class="panel-head"><div><h2>Condomínios</h2><div class="muted small">Resumo rápido por operação.</div></div></div><div class="panel-body"><div class="condo-grid">${cards(d)||'<div class="empty">Nenhum condomínio disponível.</div>'}</div></div></article><article class="panel"><div class="panel-head"><div><h2>Atenção necessária</h2><div class="muted small">Itens vencidos, urgentes ou próximos do prazo.</div></div></div><div class="panel-body">${alertHtml}</div></article></section>`,'dashboard');
    }catch(err){flash(err.message||'Não foi possível carregar o dashboard.')}
  }

  async function condoDashboard(cid){
    if(!window.CondoAccess?.canAccessCondo(cid)||!window.CondoAccess?.hasAnyManagementRole(cid))return;
    try{
      const d=await scope(cid),c=d.condos[0],fs=financeStats(d.finance),open=d.calls.filter(openCall).length,urgent=d.calls.filter(x=>openCall(x)&&x.priority==='urgent').length;
      const maint7=d.maint.filter(x=>activeMaintenance(x)&&daysUntil(x.next_date)!==null&&daysUntil(x.next_date)<=7).length;
      const docs30=d.docs.filter(x=>x.expiry_date&&daysUntil(x.expiry_date)!==null&&daysUntil(x.expiry_date)<=30).length;
      const nextMaint=d.maint.filter(activeMaintenance).sort((a,b)=>String(a.next_date||'9999').localeCompare(String(b.next_date||'9999'))).slice(0,5);
      const nextAsm=d.assemblies.filter(x=>!['held','cancelled'].includes(x.status)).sort((a,b)=>String(a.scheduled_at).localeCompare(String(b.scheduled_at))).slice(0,3);
      $('#app').innerHTML=shell(`${topbar(safe(c?.name||'Condomínio'),'Resumo operacional do condomínio.','Workspace',`<button class="btn" onclick="location.hash='#/condominio/${cid}/relatorios'">Relatório</button>`)}<section class="metrics"><article class="metric"><div class="metric-top"><div><span>Unidades</span><strong>${d.units.length}</strong></div><div class="icon blue">🏠</div></div></article><article class="metric"><div class="metric-top"><div><span>Chamados abertos</span><strong>${open}</strong><small>${urgent} urgente(s)</small></div><div class="icon orange">🎫</div></div></article><article class="metric"><div class="metric-top"><div><span>Manutenções em 7 dias</span><strong>${maint7}</strong></div><div class="icon red">⚒</div></div></article><article class="metric"><div class="metric-top"><div><span>Documentos em 30 dias</span><strong>${docs30}</strong></div><div class="icon orange">📄</div></div></article>${canFinance(cid)?`<article class="metric"><div class="metric-top"><div><span>Saldo realizado</span><strong>${brl(fs.balance)}</strong><small>Em atraso ${brl(fs.overdue)}</small></div><div class="icon green">$</div></div></article>`:''}</section><section class="grid-2" style="margin-top:18px"><article class="panel"><div class="panel-head"><h2>Próximas manutenções</h2></div><div class="panel-body">${nextMaint.length?nextMaint.map(x=>`<a class="list-row" href="#/condominio/${cid}/manutencoes"><div><strong>${safe(x.title)}</strong><div class="list-sub">${date(x.next_date)}</div></div></a>`).join(''):'<div class="empty">Nenhuma manutenção programada.</div>'}</div></article><article class="panel"><div class="panel-head"><h2>Próximas assembleias</h2></div><div class="panel-body">${nextAsm.length?nextAsm.map(x=>`<a class="list-row" href="#/condominio/${cid}/assembleias"><div><strong>${safe(x.title)}</strong><div class="list-sub">${date(String(x.scheduled_at).slice(0,10))}</div></div></a>`).join(''):'<div class="empty">Nenhuma assembleia futura.</div>'}</div></article></section>`,'condo-overview',cid);
    }catch(err){flash(err.message||'Não foi possível carregar o condomínio.')}
  }

  function inPeriod(v,start,end){if(!v)return false;const d=String(v).slice(0,10);return d>=start&&d<=end}
  function csvCell(v){return `"${String(v??'').replace(/"/g,'""')}"`}
  window.exportManagementReportCsv=function(){
    const rows=window.__GC_REPORT_ROWS__||[];
    const body=['Data;Condomínio;Tipo;Descrição;Status;Valor',...rows.map(x=>[x.date,x.condo,x.type,x.description,x.status,x.value].map(csvCell).join(';'))].join('\r\n');
    const blob=new Blob(['\ufeff'+body],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`relatorio-${today()}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };

  async function reports(cid=null,start=firstDay(),end=today()){
    if(!window.CondoAccess?.hasAnyManagementRole())return;
    if(cid&&!window.CondoAccess?.hasAnyManagementRole(cid))return;
    try{
      const d=await scope(cid),names=new Map(d.condos.map(x=>[x.id,x.name])),detail=[];
      d.calls.filter(x=>inPeriod(x.created_at,start,end)).forEach(x=>detail.push({date:String(x.created_at).slice(0,10),condo:names.get(x.condominium_id)||'',type:'Chamado',description:x.title,status:x.status,value:''}));
      d.occ.filter(x=>inPeriod(x.completed_at||x.scheduled_for,start,end)).forEach(x=>detail.push({date:String(x.completed_at||x.scheduled_for).slice(0,10),condo:names.get(x.condominium_id)||'',type:'Manutenção concluída',description:'Ocorrência de manutenção',status:x.completion_type,value:''}));
      d.documents=d.docs;
      d.docs.filter(x=>x.expiry_date&&inPeriod(x.expiry_date,start,end)).forEach(x=>detail.push({date:x.expiry_date,condo:names.get(x.condominium_id)||'',type:'Documento',description:x.title,status:'Vencimento',value:''}));
      d.assemblies.filter(x=>inPeriod(x.scheduled_at,start,end)).forEach(x=>detail.push({date:String(x.scheduled_at).slice(0,10),condo:names.get(x.condominium_id)||'',type:'Assembleia',description:x.title,status:x.status,value:''}));
      d.ann.filter(x=>inPeriod(x.published_at,start,end)).forEach(x=>detail.push({date:String(x.published_at).slice(0,10),condo:names.get(x.condominium_id)||'',type:'Comunicado',description:x.title,status:x.priority||'',value:''}));
      d.finance.forEach(x=>{if(x.due_date&&inPeriod(x.due_date,start,end))detail.push({date:x.due_date,condo:names.get(x.condominium_id)||'',type:x.kind==='income'?'Receita prevista':'Despesa prevista',description:x.description,status:x.status,value:brl(x.expected_amount_cents)});if(x.paid_date&&inPeriod(x.paid_date,start,end)&&Number(x.paid_amount_cents)>0)detail.push({date:x.paid_date,condo:names.get(x.condominium_id)||'',type:x.kind==='income'?'Receita realizada':'Despesa realizada',description:x.description,status:x.status,value:brl(x.paid_amount_cents)})});
      detail.sort((a,b)=>String(a.date).localeCompare(String(b.date)));window.__GC_REPORT_ROWS__=detail;
      const callCount=d.calls.filter(x=>inPeriod(x.created_at,start,end)).length,occCount=d.occ.filter(x=>inPeriod(x.completed_at,start,end)).length,docCount=d.docs.filter(x=>x.expiry_date&&inPeriod(x.expiry_date,start,end)).length,asmCount=d.assemblies.filter(x=>inPeriod(x.scheduled_at,start,end)).length;
      const finExpectedIn=d.finance.filter(x=>x.kind==='income'&&x.status!=='cancelled'&&inPeriod(x.due_date,start,end)).reduce((s,x)=>s+Number(x.expected_amount_cents||0),0),finExpectedOut=d.finance.filter(x=>x.kind==='expense'&&x.status!=='cancelled'&&inPeriod(x.due_date,start,end)).reduce((s,x)=>s+Number(x.expected_amount_cents||0),0),finIn=d.finance.filter(x=>x.kind==='income'&&x.status!=='cancelled'&&inPeriod(x.paid_date,start,end)).reduce((s,x)=>s+Number(x.paid_amount_cents||0),0),finOut=d.finance.filter(x=>x.kind==='expense'&&x.status!=='cancelled'&&inPeriod(x.paid_date,start,end)).reduce((s,x)=>s+Number(x.paid_amount_cents||0),0);
      const body=detail.length?detail.slice(0,200).map(x=>`<tr><td>${date(x.date)}</td><td>${safe(x.condo)}</td><td>${safe(x.type)}</td><td>${safe(x.description)}</td><td>${safe(x.status)}</td><td>${safe(x.value)}</td></tr>`).join(''):'<tr><td colspan="6"><div class="empty">Nenhum evento no período.</div></td></tr>';
      $('#app').innerHTML=shell(`${topbar('Relatórios',`${cid?safe(names.get(cid)||'Condomínio'):'Gestão consolidada'} • ${date(start)} a ${date(end)}`,'Gestão',`<button class="btn" onclick="exportManagementReportCsv()">CSV</button><button class="btn" onclick="window.print()">Imprimir / PDF</button>`)}<article class="panel" style="margin-bottom:18px"><div class="panel-body"><form id="report-period" class="row-actions"><label>De <input type="date" name="start" value="${safe(start)}"></label><label>Até <input type="date" name="end" value="${safe(end)}"></label><button class="btn btn-primary">Aplicar</button></form></div></article><section class="metrics"><article class="metric"><div class="metric-top"><div><span>Chamados criados</span><strong>${callCount}</strong></div></div></article><article class="metric"><div class="metric-top"><div><span>Manutenções concluídas</span><strong>${occCount}</strong></div></div></article><article class="metric"><div class="metric-top"><div><span>Docs no prazo</span><strong>${docCount}</strong></div></div></article><article class="metric"><div class="metric-top"><div><span>Assembleias</span><strong>${asmCount}</strong></div></div></article>${d.financeIds.length?`<article class="metric"><div class="metric-top"><div><span>Realizado</span><strong>${brl(finIn-finOut)}</strong><small>Previsto líquido ${brl(finExpectedIn-finExpectedOut)}</small></div></div></article>`:''}</section><article class="panel" style="margin-top:18px"><div class="panel-head"><div><h2>Detalhamento</h2><div class="muted small">Até 200 linhas na tela. O CSV contém todo o período carregado.</div></div></div><div class="panel-body"><div class="table-wrap"><table class="table"><thead><tr><th>Data</th><th>Condomínio</th><th>Tipo</th><th>Descrição</th><th>Status</th><th>Valor</th></tr></thead><tbody>${body}</tbody></table></div></div></article>`,'reports',cid);
      const form=document.querySelector('#report-period');if(form)form.onsubmit=e=>{e.preventDefault();const f=new FormData(form),s=f.get('start'),en=f.get('end');if(!s||!en||s>en)return flash('Revise o período informado.');location.hash=cid?`#/condominio/${cid}/relatorios?start=${s}&end=${en}`:`#/relatorios?start=${s}&end=${en}`};
    }catch(err){flash(err.message||'Não foi possível gerar o relatório.')}
  }

  window.managementDashboard=dashboard;
  window.condoManagementDashboard=condoDashboard;
  window.managementReportsPage=reports;
})();