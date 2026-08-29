(() => {
  'use strict';
  if (!window.supabase || typeof shell !== 'function') return;

  const client = window.supabase.createClient(
    'https://tckvzlizcqdxzgavjwie.supabase.co',
    'sb_publishable_MRtiWP-ErwVKXqNbGFrW_g_FwEHsob3'
  );
  const safe=s=>typeof esc==='function'?esc(s):String(s??'');
  const brl=c=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format((Number(c)||0)/100);
  const date=v=>v?new Intl.DateTimeFormat('pt-BR').format(new Date(`${String(v).slice(0,10)}T12:00:00`)):'—';
  const monthValue=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`};
  const reviewableCondos=()=>{
    const access=window.CondoAccess;
    if(!access)return [];
    return (data.condos||[]).filter(c=>access.can('finance.review',c.id));
  };
  const computedStatus=t=>{
    if(['cancelled','paid','partial'].includes(t.status))return t.status;
    const now=new Date();now.setHours(0,0,0,0);
    return new Date(`${t.due_date}T00:00:00`)<now?'overdue':'pending';
  };
  const badge=t=>{const m={paid:['good','Pago'],partial:['warn','Parcial'],cancelled:['attention','Cancelado'],overdue:['bad','Vencido'],pending:['attention','Pendente']};const [c,l]=m[computedStatus(t)]||['attention','Pendente'];return `<span class="badge ${c}">${l}</span>`};

  async function financeOverviewPage(month=monthValue()){
    const condos=reviewableCondos();
    if(!condos.length)return location.hash='#/';
    $('#app').innerHTML=shell(`${topbar('Financeiro','Visão consolidada dos condomínios que você pode consultar.','Gestão')}<article class="panel"><div class="panel-body"><div class="empty">Carregando consolidação...</div></div></article>`,'finance');
    const first=`${month}-01`;const [y,m]=month.split('-').map(Number);const next=new Date(y,m,1);const nextIso=`${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}-01`;
    const {data:tx,error}=await client.from('finance_transactions').select('*').gte('competence_month',first).lt('competence_month',nextIso).order('due_date',{ascending:true});
    if(error)return flash(error.message);
    const rows=tx||[];
    const income=rows.filter(t=>t.kind==='income'&&t.status!=='cancelled').reduce((s,t)=>s+Number(t.paid_amount_cents||0),0);
    const expense=rows.filter(t=>t.kind==='expense'&&t.status!=='cancelled').reduce((s,t)=>s+Number(t.paid_amount_cents||0),0);
    const overdue=rows.filter(t=>computedStatus(t)==='overdue').reduce((s,t)=>s+Math.max(0,Number(t.expected_amount_cents)-Number(t.paid_amount_cents)),0);
    const expected=rows.filter(t=>t.status!=='cancelled').reduce((s,t)=>s+(t.kind==='income'?1:-1)*Number(t.expected_amount_cents||0),0);
    const body=rows.length?rows.map(t=>{const c=condo(t.condominium_id);return `<tr data-search="${safe([t.description,t.counterparty,c?.name].filter(Boolean).join(' ').toLowerCase())}"><td><strong>${safe(t.description)}</strong><div class="list-sub">${safe(t.counterparty||'')}</div></td><td><a href="#/condominio/${t.condominium_id}/financeiro">${safe(c?.name||'Condomínio')}</a></td><td>${t.kind==='income'?'Receita':'Despesa'}</td><td>${date(t.due_date)}</td><td><strong>${brl(t.expected_amount_cents)}</strong></td><td>${badge(t)}</td></tr>`}).join(''):'<tr><td colspan="6"><div class="empty">Nenhum lançamento nesta competência.</div></td></tr>';
    $('#app').innerHTML=shell(`${topbar('Financeiro','Visão consolidada dos condomínios que você pode consultar.','Gestão')}<section class="metrics" style="margin-bottom:18px"><article class="metric"><div class="metric-top"><div><span>Recebido</span><strong>${brl(income)}</strong></div><div class="icon green">↗</div></div></article><article class="metric"><div class="metric-top"><div><span>Pago</span><strong>${brl(expense)}</strong></div><div class="icon orange">↘</div></div></article><article class="metric"><div class="metric-top"><div><span>Saldo realizado</span><strong>${brl(income-expense)}</strong><small>Previsto líquido ${brl(expected)}</small></div><div class="icon blue">$</div></div></article><article class="metric"><div class="metric-top"><div><span>Em atraso</span><strong>${brl(overdue)}</strong></div><div class="icon red">!</div></div></article></section><article class="panel"><div class="panel-head"><div><h2>Todos os lançamentos</h2><div class="muted small">Abra um condomínio para cadastrar ou baixar lançamentos.</div></div><div class="row-actions"><input id="finance-global-month" type="month" value="${safe(month)}"><input id="finance-global-search" placeholder="Buscar..." style="max-width:220px"></div></div><div class="panel-body"><div class="table-wrap"><table class="table"><thead><tr><th>Lançamento</th><th>Condomínio</th><th>Tipo</th><th>Vencimento</th><th>Valor</th><th>Status</th></tr></thead><tbody id="finance-global-body">${body}</tbody></table></div></div></article>`,'finance');
    $('#finance-global-month').onchange=e=>financeOverviewPage(e.target.value||monthValue());
    $('#finance-global-search').oninput=e=>{const q=e.target.value.trim().toLowerCase();$$('#finance-global-body tr').forEach(tr=>tr.style.display=!q||String(tr.dataset.search||'').includes(q)?'':'none')};
  }

  const previousShell=window.shell||shell;
  window.shell=shell=function(content,active='dashboard',cid=null){
    let out=previousShell(content,active,cid);
    if(reviewableCondos().length&& !out.includes('href="#/financeiro"')){
      const anchor='<a href="#/calendario"';
      const link=`<a href="#/financeiro" class="${active==='finance'?'active':''}"><span>$</span>Financeiro</a>`;
      out=out.replace(anchor,link+anchor);
    }
    return out;
  };

  window.financeOverviewPage=financeOverviewPage;
  const previousRoute=typeof route==='function'?route:null;
  if(previousRoute){
    route=function(){
      const p=(location.hash||'#/').replace(/^#\//,'').split('/').filter(Boolean);
      if(p[0]==='financeiro')return financeOverviewPage();
      return previousRoute();
    };
  }
})();