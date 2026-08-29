(() => {
  'use strict';
  if (!window.supabase || typeof shell !== 'function') return;

  const client = window.supabase.createClient(
    'https://tckvzlizcqdxzgavjwie.supabase.co',
    'sb_publishable_MRtiWP-ErwVKXqNbGFrW_g_FwEHsob3'
  );

  const safe = s => typeof esc === 'function' ? esc(s) : String(s ?? '');
  const brl = cents => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format((Number(cents)||0)/100);
  const date = v => v ? new Intl.DateTimeFormat('pt-BR').format(new Date(`${String(v).slice(0,10)}T12:00:00`)) : '—';
  const dateTime = v => v ? new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(v)) : '—';
  const today = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const addDaysIso = n => { const d=new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()+n); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const firstDay = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`; };
  const daysUntil = iso => { if(!iso) return null; const a=new Date(); a.setHours(0,0,0,0); const b=new Date(`${String(iso).slice(0,10)}T00:00:00`); return Math.ceil((b-a)/86400000); };
  const openCall = x => !['resolved','cancelled'].includes(x.status);
  const activeMaintenance = x => x.status !== 'done';
  const canFinance = cid => Boolean(window.CondoAccess?.can('finance.review',cid));
  const accessIds = () => [...new Set((window.CondoAccess?.getSnapshot()?.memberships||[]).map(x=>x.condominium_id).filter(Boolean))];

  async function queryAll(table, select, ids, order=null) {
    if (!ids.length) return [];
    let q = client.from(table).select(select).in('condominium_id', ids);
    if (order) q=q.order(order.column,{ascending:order.ascending ?? true});
    const {data,error}=await q; if(error) throw error; return data||[];
  }

  async function loadScope(cid=null) {
    const ids = cid ? [cid] : accessIds();
    const financeIds = ids.filter(canFinance);
    const base = await Promise.all([
      queryAll('condominiums','id,name,address_line,city,state',ids),
      queryAll('service_requests','id,condominium_id,title,category,priority,status,created_at,updated_at',ids),
      queryAll('maintenances','id,condominium_id,title,category,next_date,status,priority,supplier,last_completed_at,is_incomplete',ids),
      queryAll('maintenance_occurrences','id,condominium_id,maintenance_id,scheduled_for,completed_at,completion_type,notes',ids),
      queryAll('documents','id,condominium_id,title,category,expiry_date,visibility',ids),
      queryAll('assemblies','id,condominium_id,title,scheduled_at,status,location',ids),
      queryAll('announcements','id,condominium_id,title,priority,published_at,expires_at',ids),
      queryAll('units','id,condominium_id',ids)
    ]);
    let finance=[];
    if(financeIds.length) finance=await queryAll('finance_transactions','id,condominium_id,kind,description,due_date,competence_month,expected_amount_cents,paid_amount_cents,status,paid_date,counterparty',financeIds);
    return {ids,financeIds,condos:base[0],calls:base[1],maint:base[2],occ:base[3],docs:base[4],assemblies:base[5],ann:base[6],units:base[7],finance};
  }

  function financeStats(rows) {
    const valid=rows.filter(x=>x.status!=='cancelled');
    const received=valid.filter(x=>x.kind==='income').reduce((s,x)=>s+Number(x.paid_amount_cents||0),0);
    const paid=valid.filter(x=>x.kind==='expense').reduce((s,x)=>s+Number(x.paid_amount_cents||0),0);
    const expectedIncome=valid.filter(x=>x.kind==='income').reduce((s,x)=>s+Number(x.expected_amount_cents||0),0);
    const expectedExpense=valid.filter(x=>x.kind==='expense').reduce((s,x)=>s+Number(x.expected_amount_cents||0),0);
    const overdue=valid.filter(x=>x.status!=='paid'&&x.due_date&&daysUntil(x.due_date)<0).reduce((s,x)=>s+Math.max(0,Number(x.expected_amount_cents||0)-Number(x.paid_amount_cents||0)),0);
    return {received,paid,balance:received-paid,expectedIncome,expectedExpense,overdue};
  }

  function attentionItems(d) {
    const list=[];
    d.maint.filter(activeMaintenance).forEach(x=>{const n=daysUntil(x.next_date);if(n!==null&&n<=7)list.push({kind:'Manutenção',title:x.title,condo:x.condominium_id,date:x.next_date,rank:n<0?0:n<=2?1:2,label:n<0?`Vencida há ${Math.abs(n)}d`:n===0?'Hoje':`Em ${n}d`,href:`#/condominio/${x.condominium_id}/manutencoes`})});
    d.calls.filter(openCall).filter(x=>['urgent','high'].includes(x.priority)).forEach(x=>list.push({kind:'Chamado',title:x.title,condo:x.condominium_id,date:String(x.created_at).slice(0,10),rank:x.priority==='urgent'?0:1,label:x.priority==='urgent'?'Urgente':'Alta prioridade',href:`#/condominio/${x.condominium_id}/chamados`}));
    d.docs.filter(x=>x.expiry_date).forEach(x=>{const n=daysUntil(x.expiry_date);if(n!==null&&n<=30)list.push({kind:'Documento',title:x.title,condo:x.condominium_id,date:x.expiry_date,rank:n<0?0:n<=7?1:2,label:n<0?'Vencido':`Vence em ${n}d`,href:`#/condominio/${x.condominium_id}/documentos`})});
    d.finance.filter(x=>x.status!=='paid'&&x.status!=='cancelled'&&x.due_date&&daysUntil(x.due_date)<0).forEach(x=>list.push({kind:'Financeiro',title:x.description,condo:x.condominium_id,date:x.due_date,rank:0,label:'Pagamento vencido',href:`#/condominio/${x.condominium_id}/financeiro`}));
    return list.sort((a,b)=>a.rank-b.rank||String(a.date).localeCompare(String(b.date))).slice(0,10);
  }

  function dashboardCardsByCondo(d) {
    const name=new Map(d.condos.map(c=>[c.id,c.name]));
    return d.ids.map(cid=>{
      const calls=d.calls.filter(x=>x.condominium_id===cid&&openCall(x)).length;
      const maint=d.maint.filter(x=>x.condominium_id===cid&&activeMaintenance(x)&&daysUntil(x.next_date)!==null&&daysUntil(x.next_date)<=7).length;
      const docs=d.docs.filter(x=>x.condominium_id===cid&&x.expiry_date&&daysUntil(x.expiry_date)!==null&&daysUntil(x.expiry_date)<=30).length;
      const units=d.units.filter(x=>x.condominium_id===cid).length;
      const fs=financeStats(d.finance.filter(x=>x.condominium_id===cid));
      return `<a class="condo-card" href="#/condominio/${cid}"><div class="condo-top"><div class="condo-id"><div class="building">🏢</div><div><strong>${safe(name.get(cid)||'Condomínio')}</strong><small>${units} unidade(s)</small></div></div></div><div class="mini-stats"><div class="mini"><strong>${calls}</strong><span>Chamados</span></div><div class="mini"><strong>${maint}</strong><span>Manut. 7d</span></div><div class="mini"><strong>${docs}</strong><span>Docs 30d</span></div></div>${canFinance(cid)?`<div class="muted small" style="margin-top:10px">Saldo realizado: <strong>${brl(fs.balance)}</strong></div>`:''}</a>`;
    }).join('');
  }

  async function dashboardPage() {
    const snapshot=window.CondoAccess?.getSnapshot();
    if(!snapshot?.loadedAt){await window.CondoAccess?.refresh?.();}
    $('#app').innerHTML=shell(`${topbar('Visão geral','Carregando indicadores da sua gestão.','Painel do Síndico','<button class="btn" onclick="location.hash=\'#/relatorios\'">Relatórios</button>')}<article class="panel"><div class="panel-body"><div class="empty">Carregando dashboard...</div></div></article>`,'dashboard');
    try{
      const d=await loadScope(); const fs=financeStats(d.finance); const open=d.calls.filter(openCall).length;
      const maint7=d.maint.filter(x=>activeMaintenance(x)&&daysUntil(x.next_date)!==null&&daysUntil(x.next_date)<=7).length;
      const overdueMaint=d.maint.filter(x=>activeMaintenance(x)&&daysUntil(x.next_date)!==null&&daysUntil(x.next_date)<0).length;
      const docs30=d.docs.filter(x=>x.expiry_date&&daysUntil(x.expiry_date)!==null&&daysUntil(x.expiry_date)<=30).length;
      const upcomingAsm=d.assemblies.filter(x=>!['held','cancelled'].includes(x.status)&&new Date(x.scheduled_at)>=new Date()).length;
      const attention=attentionItems(d);const cn=new Map(d.condos.map(c=>[c.id,c.name]));
      const attHtml=attention.length?attention.map(x=>`<a class="alert-card ${x.rank===0?'critical':x.rank===1?'soon':'watch'}" href="${x.href}" style="display:block;text-decoration:none"><div class="alert-head"><div><strong>${safe(x.title)}</strong><p>${safe(x.kind)} • ${safe(cn.get(x.condo)||'Condomínio')} • ${date(x.date)}</p></div><span class="badge ${x.rank===0?'bad':x.rank===1?'warn':'attention'}">${safe(x.label)}</span></div></a>`).join(''):'<div class="empty">Nenhuma pendência crítica encontrada.</div>';
      const financeMetric=d.financeIds.length?`<article class="metric"><div class="metric-top"><div><span>Saldo realizado</span><strong>${brl(fs.balance)}</strong><small>${d.financeIds.length===d.ids.length?'Todos os condomínios':'Somente condomínios autorizados'}</small></div><div class="icon green">$</div></div></article>`:`<article class="metric"><div class="metric-top"><div><span>Financeiro</span><strong>Restrito</strong><small>Seu perfil não possui acesso financeiro.</small></div><div class="icon blue">🔒</div></div></article>`;
      $('#app').innerHTML=shell(`${topbar('Visão geral','Indicadores consolidados da operação em tempo real.','Painel de Gestão','<button class="btn" onclick="location.hash=\'#/relatorios\'">Relatórios</button>')}<section class="metrics"><article class="metric"><div class="metric-top"><div><span>Condomínios</span><strong>${d.ids.length}</strong><small>${d.units.length} unidades cadastradas</small></div><div class="icon blue">🏢</div></div></article><article class="metric"><div class="metric-top"><div><span>Chamados abertos</span><strong>${open}</strong></div><div class="icon orange">🎫</div></div></article><article class="metric"><div class="metric-top"><div><span>Manutenções em 7 dias</span><strong>${maint7}</strong><small>${overdueMaint} vencida(s)</small></div><div class="icon red">⚒</div></div></article><article class="metric"><div class="metric-top"><div><span>Documentos em 30 dias</span><strong>${docs30}</strong></div><div class="icon orange">📄</div></div></article>${financeMetric}<article class="metric"><div class="metric-top"><div><span>Assembleias futuras</span><strong>${upcomingAsm}</strong></div><div class="icon blue">🏛️</div></div></article></section><section class="grid-2" style="margin-top:18px"><div><article class="panel"><div class="panel-head"><div><h2>Condomínios</h2><div class="muted small">Resumo rápido por operação.</div></div></div><div class="panel-body"><div class="condo-grid">${dashboardCardsByCondo(d)||'<div class="empty">Nenhum condomínio disponível.</div>'}</div></div></article></div><aside><article class="panel"><div class="panel-head"><div><h2>Atenção necessária</h2><div class="muted small">Itens vencidos, urgentes ou próximos do prazo.</div></div></div><div class="panel-body">${attHtml}</div></article></aside></section>`,'dashboard');
    }catch(err){flash(err.message||'Não foi possível carregar o dashboard.')}
  }

  async function condoDashboard(cid){
    if(!window.CondoAccess?.canAccessCondo(cid))return;
    const c=condo(cid);if(!c)return;
    $('#app').innerHTML=shell(`${topbar(safe(c.name),'Carregando resumo do condomínio.','Workspace','')}<article class="panel"><div class="panel-body"><div class="empty">Carregando...</div></div></article>`,'condo-overview',cid);
    try{
      const d=await loadScope(cid), fs=financeStats(d.finance); const open=d.calls.filter(openCall).length; const urgent=d.calls.filter(x=>openCall(x)&&x.priority==='urgent').length;
      const maint7=d.maint.filter(x=>activeMaintenance(x)&&daysUntil(x.next_date)!==null&&daysUntil(x.next_date)<=7).length; const docs30=d.docs.filter(x=>x.expiry_date&&daysUntil(x.expiry_date)!==null&&daysUntil(x.expiry_date)<=30).length;
      const nextMaint=d.maint.filter(activeMaintenance).sort((a,b)=>String(a.next_date).localeCompare(String(b.next_date))).slice(0,5);
      const nextAsm=d.assemblies.filter(x=>!['held','cancelled'].includes(x.status)).sort((a,b)=>String(a.scheduled_at).localeCompare(String(b.scheduled_at))).slice(0,3);
      const actions=`<button class="btn" onclick="location.hash='#/condominio/${cid}/relatorios'">Relatório</button>${canFinance(cid)?`<button class="btn" onclick="location.hash='#/condominio/${cid}/financeiro'">Financeiro</button>`:''}`;
      $('#app').innerHTML=shell(`${topbar(safe(c.name),'Resumo operacional do condomínio.','Workspace',actions)}<section class="metrics"><article class="metric"><div class="metric-top"><div><span>Unidades</span><strong>${d.units.length}</strong></div><div class="icon blue">🏠</div></div></article><article class="metric"><div class="metric-top"><div><span>Chamados abertos</span><strong>${open}</strong><small>${urgent} urgente(s)</small></div><div class="icon orange">🎫</div></div></article><article class="metric"><div class="metric-top"><div><span>Manutenções em 7 dias</span><strong>${maint7}</strong></div><div class="icon red">⚒</div></div></article><article class="metric"><div class="metric-top"><div><span>Documentos em 30 dias</span><strong>${docs30}</strong></div><div class="icon orange">📄</div></div></article>${canFinance(cid)?`<article class="metric"><div class="metric-top"><div><span>Saldo realizado</span><strong>${brl(fs.balance)}</strong><small>Em atraso ${brl(fs.overdue)}</small></div><div class="icon green">$</div></div></article>`:''}</section><section class="grid-2" style="margin-top:18px"><article class="panel"><div class="panel-head"><h2>Próximas manutenções</h2></div><div class="panel-body">${nextMaint.length?nextMaint.map(x=>`<a class="alert-card ${daysUntil(x.next_date)<0?'critical':daysUntil(x.next_date)<=2?'soon':'watch'}" href="#/condominio/${cid}/manutencoes" style="display:block;text-decoration:none"><div class="alert-head"><div><strong>${safe(x.title)}</strong><p>${safe(x.category||'Manutenção')} • ${date(x.next_date)}</p></div></div></a>`).join(''):'<div class="empty">Nenhuma manutenção cadastrada.</div>'}</div></article><article class="panel"><div class="panel-head"><h2>Próximas assembleias</h2></div><div class="panel-body">${nextAsm.length?nextAsm.map(x=>`<a class="card" href="#/condominio/${cid}/assembleias/${x.id}" style="display:block;text-decoration:none;margin-bottom:10px"><strong>${safe(x.title)}</strong><p class="muted">${dateTime(x.scheduled_at)} • ${safe(x.location||'Local a definir')}</p></a>`).join(''):'<div class="empty">Nenhuma assembleia futura.</div>'}</div></article></section>`,'condo-overview',cid);
    }catch(err){flash(err.message||'Não foi possível carregar o resumo.')}
  }

  function rangeRow(dateValue,start,end){if(!dateValue)return false;const v=String(dateValue).slice(0,10);return v>=start&&v<=end}
  function csvCell(v){const s=String(v??'');return `"${s.replace(/"/g,'""')}"`}

  async function reportsPage(cid=null,start=firstDay(),end=today()){
    const ids=cid?[cid]:accessIds(); if(cid&&!window.CondoAccess?.canAccessCondo(cid))return;
    const title=cid?`Relatório • ${safe(condo(cid)?.name||'Condomínio')}`:'Relatórios';
    $('#app').innerHTML=shell(`${topbar(title,'Carregando informações do período.','Gestão','')}<article class="panel"><div class="panel-body"><div class="empty">Carregando relatório...</div></div></article>`,'reports',cid);
    try{
      const d=await loadScope(cid); const cn=new Map(d.condos.map(c=>[c.id,c.name]));
      const calls=d.calls.filter(x=>rangeRow(x.created_at,start,end));
      const occ=d.occ.filter(x=>rangeRow(x.completed_at||x.scheduled_for,start,end));
      const docs=d.docs.filter(x=>x.expiry_date&&rangeRow(x.expiry_date,start,end));
      const asm=d.assemblies.filter(x=>rangeRow(x.scheduled_at,start,end));
      const ann=d.ann.filter(x=>rangeRow(x.published_at,start,end));
      const finExpected=d.finance.filter(x=>x.status!=='cancelled'&&rangeRow(x.due_date,start,end));
      const finRealized=d.finance.filter(x=>x.status!=='cancelled'&&x.paid_date&&rangeRow(x.paid_date,start,end));
      const received=finRealized.filter(x=>x.kind==='income').reduce((s,x)=>s+Number(x.paid_amount_cents||0),0), paid=finRealized.filter(x=>x.kind==='expense').reduce((s,x)=>s+Number(x.paid_amount_cents||0),0);
      const expectedIncome=finExpected.filter(x=>x.kind==='income').reduce((s,x)=>s+Number(x.expected_amount_cents||0),0),expectedExpense=finExpected.filter(x=>x.kind==='expense').reduce((s,x)=>s+Number(x.expected_amount_cents||0),0);
      const openCreated=calls.filter(openCall).length, resolved=calls.filter(x=>x.status==='resolved').length;
      const condoOptions=cid?'':`<select id="report-condo"><option value="">Todos os condomínios</option>${d.condos.map(c=>`<option value="${c.id}">${safe(c.name)}</option>`).join('')}</select>`;
      const operations=`<div class="table-wrap"><table class="table"><thead><tr><th>Indicador</th><th>Total</th><th>Observação</th></tr></thead><tbody><tr><td>Chamados criados</td><td><strong>${calls.length}</strong></td><td>${openCreated} ainda abertos • ${resolved} resolvidos</td></tr><tr><td>Manutenções concluídas</td><td><strong>${occ.length}</strong></td><td>Histórico de ocorrências no período</td></tr><tr><td>Documentos com vencimento</td><td><strong>${docs.length}</strong></td><td>Vencimentos dentro do período</td></tr><tr><td>Assembleias</td><td><strong>${asm.length}</strong></td><td>${asm.filter(x=>x.status==='held').length} realizada(s)</td></tr><tr><td>Comunicados publicados</td><td><strong>${ann.length}</strong></td><td>Publicações no período</td></tr></tbody></table></div>`;
      const finance=d.financeIds.length?`<section class="metrics" style="margin-top:14px"><article class="metric"><div class="metric-top"><div><span>Receitas previstas</span><strong>${brl(expectedIncome)}</strong></div></div></article><article class="metric"><div class="metric-top"><div><span>Despesas previstas</span><strong>${brl(expectedExpense)}</strong></div></div></article><article class="metric"><div class="metric-top"><div><span>Recebido</span><strong>${brl(received)}</strong></div></div></article><article class="metric"><div class="metric-top"><div><span>Pago</span><strong>${brl(paid)}</strong></div></div></article><article class="metric"><div class="metric-top"><div><span>Saldo realizado</span><strong>${brl(received-paid)}</strong></div></div></article></section>`:`<div class="database-explainer" style="margin-top:14px"><div class="database-icon">🔒</div><div><strong>Financeiro restrito.</strong><p>O relatório operacional está disponível, mas seu perfil não possui permissão para consultar valores financeiros.</p></div></div>`;
      const detail=[...calls.map(x=>({type:'Chamado',cid:x.condominium_id,dt:String(x.created_at).slice(0,10),title:x.title,status:x.status,amount:''})),...occ.map(x=>({type:'Manutenção concluída',cid:x.condominium_id,dt:String(x.completed_at||x.scheduled_for).slice(0,10),title:x.notes||'Ocorrência de manutenção',status:x.completion_type||'concluída',amount:''})),...docs.map(x=>({type:'Documento',cid:x.condominium_id,dt:x.expiry_date,title:x.title,status:'vencimento',amount:''})),...asm.map(x=>({type:'Assembleia',cid:x.condominium_id,dt:String(x.scheduled_at).slice(0,10),title:x.title,status:x.status,amount:''})),...ann.map(x=>({type:'Comunicado',cid:x.condominium_id,dt:String(x.published_at).slice(0,10),title:x.title,status:x.priority||'normal',amount:''})),...finExpected.map(x=>({type:x.kind==='income'?'Receita':'Despesa',cid:x.condominium_id,dt:x.due_date,title:x.description,status:x.status,amount:brl(x.expected_amount_cents)}))].sort((a,b)=>String(a.dt).localeCompare(String(b.dt)));
      window.__GC_REPORT_EXPORT__={start,end,rows:detail.map(x=>({...x,condo:cn.get(x.cid)||'Condomínio'}))};
      const rows=detail.length?detail.slice(0,200).map(x=>`<tr><td>${date(x.dt)}</td><td>${safe(cn.get(x.cid)||'Condomínio')}</td><td>${safe(x.type)}</td><td><strong>${safe(x.title)}</strong></td><td>${safe(x.status)}</td><td>${safe(x.amount)}</td></tr>`).join(''):'<tr><td colspan="6"><div class="empty">Nenhum registro no período.</div></td></tr>';
      $('#app').innerHTML=shell(`${topbar(title,`Período de ${date(start)} até ${date(end)}.`,'Relatórios','<button class="btn" onclick="exportManagementReportCsv()">Exportar CSV</button><button class="btn" onclick="window.print()">Imprimir</button>')}<article class="panel"><div class="panel-head"><div><h2>Filtros</h2><div class="muted small">O relatório usa as mesmas permissões do sistema.</div></div><div class="row-actions">${condoOptions}<input id="report-start" type="date" value="${safe(start)}"><input id="report-end" type="date" value="${safe(end)}"><button class="btn btn-primary" id="report-apply">Aplicar</button></div></div></article><section class="metrics" style="margin-top:14px"><article class="metric"><div class="metric-top"><div><span>Chamados criados</span><strong>${calls.length}</strong></div></div></article><article class="metric"><div class="metric-top"><div><span>Manutenções concluídas</span><strong>${occ.length}</strong></div></div></article><article class="metric"><div class="metric-top"><div><span>Documentos vencendo</span><strong>${docs.length}</strong></div></div></article><article class="metric"><div class="metric-top"><div><span>Assembleias</span><strong>${asm.length}</strong></div></div></article></section><article class="panel" style="margin-top:14px"><div class="panel-head"><h2>Resumo operacional</h2></div><div class="panel-body">${operations}${finance}</div></article><article class="panel" style="margin-top:14px"><div class="panel-head"><div><h2>Registros do período</h2><div class="muted small">Exibindo até 200 linhas na tela. O CSV leva todos os registros carregados.</div></div></div><div class="panel-body"><div class="table-wrap"><table class="table"><thead><tr><th>Data</th><th>Condomínio</th><th>Tipo</th><th>Descrição</th><th>Status</th><th>Valor</th></tr></thead><tbody>${rows}</tbody></table></div></div></article>`,'reports',cid);
      $('#report-apply').onclick=()=>{const s=$('#report-start').value,e=$('#report-end').value,target=cid||$('#report-condo')?.value||null;if(!s||!e||s>e)return flash('Revise o período informado.');location.hash=target?`#/condominio/${target}/relatorios?start=${s}&end=${e}`:`#/relatorios?start=${s}&end=${e}`};
    }catch(err){flash(err.message||'Não foi possível gerar o relatório.')}
  }

  window.exportManagementReportCsv=function(){
    const r=window.__GC_REPORT_EXPORT__;if(!r)return flash('Gere o relatório antes de exportar.');
    const header=['Data','Condomínio','Tipo','Descrição','Status','Valor'];
    const body=r.rows.map(x=>[x.dt,x.condo,x.type,x.title,x.status,x.amount].map(csvCell).join(';'));
    const blob=new Blob(['\uFEFF'+[header.map(csvCell).join(';'),...body].join('\n')],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`relatorio-condominial-${r.start}-${r.end}.csv`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  };

  function reportParams(){const raw=(location.hash||'').split('?')[1]||'';const p=new URLSearchParams(raw);return {start:p.get('start')||firstDay(),end:p.get('end')||today()}}

  const previousShell=window.shell||shell;
  window.shell=shell=function(content,active='dashboard',cid=null){
    let out=previousShell(content,active,cid);
    if(!cid&&!out.includes('href="#/relatorios"')){
      const anchor='<a href="#/calendario"';
      out=out.replace(anchor,`<a href="#/relatorios" class="${active==='reports'?'active':''}"><span>▤</span>Relatórios</a>`+anchor);
    }
    if(cid&&!out.includes(`/condominio/${cid}/relatorios`)){
      const anchor=`<a href="#/condominio/${cid}/historico"`;
      out=out.replace(anchor,`<a href="#/condominio/${cid}/relatorios" class="${active==='reports'?'active':''}"><span>▤</span>Relatório</a>`+anchor);
    }
    return out;
  };

  window.managementDashboard=dashboardPage;
  window.condoManagementDashboard=condoDashboard;
  window.managementReportsPage=reportsPage;
  try { dashboard=dashboardPage; } catch(_) { window.dashboard=dashboardPage; }
  try { condoOverview=condoDashboard; } catch(_) { window.condoOverview=condoDashboard; }
})();